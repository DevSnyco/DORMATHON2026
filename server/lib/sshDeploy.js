// server/lib/sshDeploy.js
// Aggregates SSH authorized_keys for an IRYS-enabled server based on project scope,
// and deploys them. Real SSH deploy is attempted only when IRYS_SSH_DEPLOY=1 and a
// reachable target is configured; otherwise it runs in "simulation" mode so the MVP
// is fully demonstrable without live infrastructure.
import { spawnSync } from 'node:child_process';
import db from '../db.js';

const REAL_DEPLOY = process.env.IRYS_SSH_DEPLOY === '1';

// Keys that are in scope for a given project:
//  - the server must be scoped to the project
//  - the user must have the project in their scopes
export function authorizedKeysForServer(server) {
  const projectId = server.projectId;
  const users = db.filter('users', (u) => (u.scopes || []).includes(projectId));
  const lines = ['# === IRYS managed — do not edit by hand ==='];
  for (const u of users) {
    const keys = db.filter('sshKeys', (k) => k.userId === u.id && k.projectId === projectId && k.active !== false);
    for (const k of keys) {
      lines.push(`${k.publicKey} irys:${u.email}:${projectId}`);
    }
  }
  return lines.join('\n') + (lines.length === 1 ? '' : '\n');
}

export function computeServerStatus(server) {
  const users = db.filter('users', (u) => (u.scopes || []).includes(server.projectId));
  let keyCount = 0;
  for (const u of users) keyCount += db.filter('sshKeys', (k) => k.userId === u.id && k.projectId === server.projectId && k.active !== false).length;
  return { inScopeUsers: users.length, keyCount };
}

export function tryDeploy(server, authorizedKeys) {
  const target = `${server.user || 'irys'}@${server.host}`;
  const dest = server.authKeysPath || '~/.ssh/authorized_keys';
  if (!REAL_DEPLOY) {
    return {
      deployed: false,
      simulated: true,
      note: `Simulation mode — would write ${authorizedKeys.split('\n').filter(Boolean).length - 1} key line(s) to ${target}:${dest}`
    };
  }
  try {
    const r = spawnSync('ssh', [
      '-p', String(server.port || 22),
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=8',
      target,
      `mkdir -p $(dirname ${dest}) && cat > ${dest}`
    ], { input: authorizedKeys, encoding: 'utf8', timeout: 15000 });
    if (r.status === 0) return { deployed: true, simulated: false, note: `Deployed to ${target}:${dest}` };
    return { deployed: false, simulated: false, note: (r.stderr || 'ssh failed').toString().slice(0, 200) };
  } catch (e) {
    return { deployed: false, simulated: false, note: String(e).slice(0, 200) };
  }
}

// Re-sync a single server: recompute authorized_keys and (attempt to) deploy.
export function syncServer(server) {
  const authorizedKeys = authorizedKeysForServer(server);
  const res = tryDeploy(server, authorizedKeys);
  const status = computeServerStatus(server);
  return {
    serverId: server.id,
    authorizedKeys,
    status: res.deployed ? 'deployed' : (res.simulated ? 'simulated' : 'failed'),
    note: res.note,
    ...status
  };
}
