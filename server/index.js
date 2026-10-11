// server/index.js
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, providerId } from './auth.js';
import { generateGovernanceFiles, TOGGLE_DEFS } from './lib/aiFiles.js';
import { syncServer, computeServerStatus, authorizedKeysForServer } from './lib/sshDeploy.js';
import { buildScript, buildUnit, serviceName } from './lib/deployGen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json({ limit: '2mb' }));

function ownProjects(req) {
  return db.filter('projects', (p) => p.providerId === providerId(req));
}
function getProject(req, res, id) {
  const p = db.find('projects', (x) => x.id === id && x.providerId === providerId(req));
  if (!p) { res.status(404).json({ error: 'Project not found' }); return null; }
  return p;
}

// OpenSSH-style SHA256 fingerprint of an SSH public key.
function fingerprintOfPublicKey(publicKey) {
  const b64 = (publicKey || '').trim().split(/\s+/)[1] || '';
  if (!b64) return '';
  return 'SHA256:' + crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('base64').replace(/=+$/, '');
}

// ---------------- AUTOSYNC: revisions + SSE fan-out ----------------
// Every governed change to a project bumps its revision. Connected sync clients
// (CLI `--watch`, MCP watchers) subscribe to /api/sync/stream and force-sync when
// they see a revision they have not acknowledged yet.
const sseClients = new Set();

function broadcastRevision(providerId, projectId, revision, kind) {
  const payload = JSON.stringify({ projectId, revision, kind, at: new Date().toISOString() });
  for (const c of sseClients) {
    if (c.providerId !== providerId) continue;
    try { c.res.write(`event: revision\ndata: ${payload}\n\n`); } catch { /* client gone */ }
  }
}

function revisionOf(project) { return (project && project.revision) || 0; }

function bumpRevision(projectId, kind) {
  const p = db.find('projects', (x) => x.id === projectId);
  if (!p) return 0;
  const revision = revisionOf(p) + 1;
  db.update('projects', p.id, { revision, revisionKind: kind, revisionAt: new Date().toISOString() });
  broadcastRevision(p.providerId, p.id, revision, kind);
  return revision;
}

function bumpProjects(projectIds, kind) {
  for (const id of new Set((projectIds || []).filter(Boolean))) bumpRevision(id, kind);
}

// ---------------- AUTH ----------------
app.post('/api/auth/register', (req, res) => {
  const { orgName, email, password } = req.body || {};
  if (!orgName || !email || !password) return res.status(400).json({ error: 'orgName, email and password required' });
  if (db.find('providers', (p) => p.email === email)) return res.status(409).json({ error: 'Provider already exists' });
  const prov = db.insert('providers', { orgName, email, passwordHash: hashPassword(password) });
  db.log('provider.register', orgName);
  res.json({ token: signToken({ providerId: prov.id, email }), provider: prov });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const prov = db.find('providers', (p) => p.email === email);
  if (!prov || !verifyPassword(password || '', prov.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: signToken({ providerId: prov.id, email }), provider: { id: prov.id, orgName: prov.orgName, email: prov.email } });
});

app.get('/api/me', requireAuth, (req, res) => {
  const prov = db.find('providers', (p) => p.id === providerId(req));
  res.json({ provider: { id: prov.id, orgName: prov.orgName, email: prov.email } });
});

// ---------------- PROJECTS ----------------
app.get('/api/projects', requireAuth, (req, res) => {
  res.json(ownProjects(req));
});
app.post('/api/projects', requireAuth, (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const p = db.insert('projects', { providerId: providerId(req), name, description: description || '', revision: 1, createdAt: new Date().toISOString() });
  db.log('project.create', name);
  res.json(p);
});
app.put('/api/projects/:id', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const upd = db.update('projects', p.id, { name: req.body.name ?? p.name, description: req.body.description ?? p.description });
  bumpRevision(p.id, 'project');
  res.json(upd);
});
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  db.remove('projects', p.id);
  // cascade scope cleanup
  db.filter('users', (u) => u.providerId === providerId(req)).forEach((u) => {
    if ((u.scopes || []).includes(p.id)) db.update('users', u.id, { scopes: u.scopes.filter((s) => s !== p.id) });
  });
  db.filter('servers', (s) => s.projectId === p.id).forEach((s) => db.update('servers', s.id, { inScope: false, projectId: null }));
  const g = db.find('governance', (x) => x.projectId === p.id); if (g) db.remove('governance', g.id);
  const d = db.find('deployments', (x) => x.projectId === p.id); if (d) db.remove('deployments', d.id);
  db.log('project.delete', p.name);
  res.json({ ok: true });
});

// ---------------- USERS (with project scopes) ----------------
app.get('/api/users', requireAuth, (req, res) => {
  const users = db.filter('users', (u) => u.providerId === providerId(req))
    .map((u) => ({ ...u, keyCount: db.filter('sshKeys', (k) => k.userId === u.id).length }));
  res.json(users);
});
app.post('/api/users', requireAuth, (req, res) => {
  const { name, email, role, scopes } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const u = db.insert('users', {
    providerId: providerId(req), name, email, role: role || 'member',
    scopes: Array.isArray(scopes) ? scopes : [], createdAt: new Date().toISOString()
  });
  db.log('user.create', `${name} -> scopes:${(scopes || []).length}`);
  bumpProjects(u.scopes, 'members');
  res.json(u);
});
app.put('/api/users/:id', requireAuth, (req, res) => {
  const u = db.find('users', (x) => x.id === req.params.id && x.providerId === providerId(req));
  if (!u) return res.status(404).json({ error: 'User not found' });
  const upd = db.update('users', u.id, {
    name: req.body.name ?? u.name, email: req.body.email ?? u.email,
    role: req.body.role ?? u.role, scopes: Array.isArray(req.body.scopes) ? req.body.scopes : u.scopes
  });
  bumpProjects([...(u.scopes || []), ...(upd.scopes || [])], 'members');
  res.json(upd);
});
app.delete('/api/users/:id', requireAuth, (req, res) => {
  const u = db.find('users', (x) => x.id === req.params.id && x.providerId === providerId(req));
  if (!u) return res.status(404).json({ error: 'User not found' });
  db.remove('users', u.id);
  db.filter('sshKeys', (k) => k.userId === u.id).forEach((k) => db.remove('sshKeys', k.id));
  bumpProjects(u.scopes, 'members');
  db.log('user.delete', u.email);
  res.json({ ok: true });
});

// ---------------- SSH KEYS ----------------
app.get('/api/ssh-keys', requireAuth, (req, res) => {
  const userIds = db.filter('users', (u) => u.providerId === providerId(req)).map((u) => u.id);
  res.json(db.filter('sshKeys', (k) => userIds.includes(k.userId)));
});
app.post('/api/ssh-keys', requireAuth, (req, res) => {
  const { userId, projectId, publicKey, label } = req.body || {};
  if (!userId || !projectId || !publicKey) return res.status(400).json({ error: 'userId, projectId and publicKey required' });
  const u = db.find('users', (x) => x.id === userId && x.providerId === providerId(req));
  if (!u) return res.status(404).json({ error: 'User not found' });
  const k = db.insert('sshKeys', { userId, projectId, publicKey: publicKey.trim(), label: label || '', active: true, createdAt: new Date().toISOString() });
  db.log('sshkey.add', `${u.email} -> ${projectId}`);
  bumpRevision(projectId, 'keys');
  res.json(k);
});
app.delete('/api/ssh-keys/:id', requireAuth, (req, res) => {
  const k = db.find('sshKeys', (x) => x.id === req.params.id);
  if (!k) return res.status(404).json({ error: 'Key not found' });
  const u = db.find('users', (x) => x.id === k.userId && x.providerId === providerId(req));
  db.remove('sshKeys', k.id);
  bumpRevision(k.projectId, 'keys');
  db.log('sshkey.remove', u ? u.email : k.userId);
  res.json({ ok: true });
});

// Self-service SSH key sync — used by the CLI / MCP on login.
// Registers the authenticated identity's local public key for every project that
// user is scoped to, then re-syncs the affected in-scope servers. If no member
// record exists for the login email, one is created (role: member) so the key has
// an owner; scopes are then managed from the dashboard as usual.
app.post('/api/ssh-keys/self', requireAuth, (req, res) => {
  const { publicKey, label } = req.body || {};
  if (!publicKey || !publicKey.trim()) return res.status(400).json({ error: 'publicKey required' });
  const email = req.auth.email;
  const pid = providerId(req);

  let user = db.find('users', (x) => x.providerId === pid && x.email === email);
  let createdUser = false;
  if (!user) {
    user = db.insert('users', {
      providerId: pid, name: email.split('@')[0], email, role: 'member',
      scopes: [], createdAt: new Date().toISOString()
    });
    createdUser = true;
  }

  const pk = publicKey.trim();
  const fingerprint = fingerprintOfPublicKey(pk);
  const scopes = user.scopes || [];
  const registered = [];

  for (const projectId of scopes) {
    const dup = db.find('sshKeys', (k) => k.userId === user.id && k.projectId === projectId && k.publicKey === pk);
    if (dup) { registered.push({ projectId, keyId: dup.id, existed: true }); continue; }
    const k = db.insert('sshKeys', {
      userId: user.id, projectId, publicKey: pk,
      label: label || 'cli-auto', active: true, createdAt: new Date().toISOString()
    });
    registered.push({ projectId, keyId: k.id, existed: false });
  }

  // Re-sync any in-scope servers that belong to the projects we just touched.
  const projectIds = [...new Set(registered.map((r) => r.projectId))];
  const servers = db.filter('servers', (s) => s.inScope && projectIds.includes(s.projectId));
  const synced = servers.map((s) => {
    const r = syncServer(s);
    db.update('servers', s.id, { lastSync: new Date().toISOString(), lastStatus: r.status });
    return { server: s.label, status: r.status };
  });

  db.log('sshkey.selfsync', `${email} -> ${registered.length} project(s), ${synced.length} server(s)`);
  bumpProjects(projectIds, 'keys');
  res.json({
    user: { id: user.id, email: user.email, created: createdUser },
    fingerprint, publicKey: pk, label: label || 'cli-auto',
    projectsInScope: scopes.length, registered, synced
  });
});

// ---------------- SERVERS (IRYS-enabled, scoped) ----------------
app.get('/api/servers', requireAuth, (req, res) => {
  const servers = db.filter('servers', (s) => s.providerId === providerId(req)).map((s) => {
    const { bootstrapToken, ...rest } = s; // never leak the bootstrap token to the list
    return { ...rest, ...computeServerStatus(rest) };
  });
  res.json(servers);
});
app.post('/api/servers', requireAuth, (req, res) => {
  const { label, host, port, user, projectId, authKeysPath } = req.body || {};
  if (!label || !host) return res.status(400).json({ error: 'label and host required' });
  const s = db.insert('servers', {
    providerId: providerId(req), label, host, port: port || 22, user: user || 'irys',
    projectId: projectId || null, inScope: !!projectId, authKeysPath: authKeysPath || '~/.ssh/authorized_keys',
    bootstrapToken: crypto.randomBytes(18).toString('hex'), linked: false,
    createdAt: new Date().toISOString()
  });
  db.log('server.add', `${label} (${host})`);
  const { bootstrapToken, ...rest } = s;
  res.json({ ...rest, ...computeServerStatus(rest) });
});
// add/remove server from project scope
app.post('/api/servers/:id/scope', requireAuth, (req, res) => {
  const s = db.find('servers', (x) => x.id === req.params.id && x.providerId === providerId(req));
  if (!s) return res.status(404).json({ error: 'Server not found' });
  const inScope = !!req.body.inScope;
  const upd = db.update('servers', s.id, { projectId: inScope ? (req.body.projectId || s.projectId) : null, inScope });
  db.log('server.scope', `${s.label} -> ${inScope ? 'in scope ' + upd.projectId : 'removed'}`);
  bumpProjects([s.projectId, upd.projectId], 'scope');
  res.json({ ...upd, ...computeServerStatus(upd) });
});
app.delete('/api/servers/:id', requireAuth, (req, res) => {
  const s = db.find('servers', (x) => x.id === req.params.id && x.providerId === providerId(req));
  if (!s) return res.status(404).json({ error: 'Server not found' });
  db.remove('servers', s.id);
  bumpRevision(s.projectId, 'scope');
  db.log('server.delete', s.label);
  res.json({ ok: true });
});
// sync one server (recompute authorized_keys + deploy)
app.post('/api/servers/:id/sync', requireAuth, (req, res) => {
  const s = db.find('servers', (x) => x.id === req.params.id && x.providerId === providerId(req));
  if (!s) return res.status(404).json({ error: 'Server not found' });
  if (!s.inScope || !s.projectId) return res.status(400).json({ error: 'Server is not in scope' });
  const result = syncServer(s);
  db.update('servers', s.id, { lastSync: new Date().toISOString(), lastStatus: result.status });
  db.log('server.sync', `${s.label} -> ${result.status}`);
  res.json(result);
});

// One-time bootstrap link from an IRYS agent running on the host.
app.post('/api/servers/link', (req, res) => {
  const { token, hostname, ip, sshPort, fingerprint } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  const s = db.find('servers', (x) => x.bootstrapToken === token);
  if (!s) return res.status(404).json({ error: 'Invalid or unknown bootstrap token' });
  const authorizedKeys = authorizedKeysForServer(s);
  db.update('servers', s.id, {
    linked: true,
    hostInfo: { hostname: hostname || '', ip: ip || '', sshPort: sshPort || 22, fingerprint: fingerprint || '', linkedAt: new Date().toISOString() }
  });
  db.log('server.link', `${s.label} linked from ${hostname || ip || 'host'}`);
  bumpRevision(s.projectId, 'scope');
  res.json({ ok: true, serverId: s.id, projectId: s.projectId, authorizedKeys });
});

// Agent pull: return current authorized_keys for a linked server (token auth).
app.get('/api/servers/keys', (req, res) => {
  const { serverId, token } = req.query;
  const s = db.find('servers', (x) => x.id === serverId && x.bootstrapToken === token);
  if (!s) return res.status(403).json({ error: 'unauthorized' });
  res.setHeader('Content-Type', 'text/plain');
  res.send(authorizedKeysForServer(s));
});

// Provider view: bootstrap command + token for a server (used by the dashboard).
app.get('/api/servers/:id/bootstrap', requireAuth, (req, res) => {
  const s = db.find('servers', (x) => x.id === req.params.id && x.providerId === providerId(req));
  if (!s) return res.status(404).json({ error: 'Server not found' });
  const url = process.env.IRYS_PUBLIC_URL || (req.protocol + '://' + req.get('host'));
  const command = `curl -sSL ${url}/irys-agent.sh | sudo bash -s -- --url ${url} --token ${s.bootstrapToken}`;
  res.json({ token: s.bootstrapToken, command, linked: !!s.linked, hostInfo: s.hostInfo || null });
});

// ---------------- GOVERNANCE (AI files) ----------------
app.get('/api/toggles', (req, res) => res.json(TOGGLE_DEFS));
app.get('/api/projects/:id/governance', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const g = db.find('governance', (x) => x.projectId === p.id) || { projectId: p.id, mode: 'describe', toggles: {}, complianceChecklist: [], qualityControls: [], description: '', manualSections: {} };
  res.json(g);
});
app.post('/api/projects/:id/governance', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const cfg = { ...req.body, projectId: p.id };
  const generated = generateGovernanceFiles(cfg, p);
  const existing = db.find('governance', (x) => x.projectId === p.id);
  const doc = existing
    ? db.update('governance', existing.id, { ...cfg, generated })
    : db.insert('governance', { ...cfg, generated });
  db.log('governance.save', `${p.name} (${cfg.mode})`);
  const revision = bumpRevision(p.id, 'governance');
  res.json({ ...doc, revision });
});
app.get('/api/projects/:id/governance/file/:name', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const key = { agents: 'agentsMd', commandcode: 'commandcodeMd', irys: 'irysMd' }[req.params.name];
  if (!key) return res.status(404).json({ error: 'Unknown file' });
  const g = db.find('governance', (x) => x.projectId === p.id);
  if (!g || !g.generated || !g.generated[key]) return res.status(404).json({ error: 'Not generated yet' });
  res.setHeader('Content-Type', 'text/plain');
  res.send(g.generated[key]);
});

// ---------------- DEPLOYMENT ----------------
app.get('/api/projects/:id/deployment', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const d = db.find('deployments', (x) => x.projectId === p.id) ||
    { projectId: p.id, repo: '', branch: 'main', runtime: 'node', steps: [], pipeline: [] };
  res.json(d);
});
app.post('/api/projects/:id/deployment', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const cfg = { ...req.body, projectId: p.id };
  const existing = db.find('deployments', (x) => x.projectId === p.id);
  const doc = existing ? db.update('deployments', existing.id, cfg) : db.insert('deployments', cfg);
  db.log('deployment.save', p.name);
  const revision = bumpRevision(p.id, 'deployment');
  res.json({ ...doc, revision });
});
app.get('/api/projects/:id/deployment/script', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const d = db.find('deployments', (x) => x.projectId === p.id);
  if (!d) return res.status(404).json({ error: 'No deployment config' });
  res.setHeader('Content-Type', 'text/plain');
  res.send(buildScript(d, p));
});
app.get('/api/projects/:id/deployment/unit', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const d = db.find('deployments', (x) => x.projectId === p.id);
  if (!d) return res.status(404).json({ error: 'No deployment config' });
  res.setHeader('Content-Type', 'text/plain');
  res.send(buildUnit(d, p));
});

// ---------------- AUTOSYNC: revision stream + sync-client registry ----------------
// Server-Sent Events stream of project revision bumps for the logged-in provider.
// Clients (CLI --watch / MCP watchers) hold this open and force-sync on change.
app.get('/api/sync/stream', requireAuth, (req, res) => {
  const pid = providerId(req);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(': irys sync stream connected\n\n');
  const client = { res, providerId: pid };
  sseClients.add(client);
  const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* gone */ } }, 25000);
  req.on('close', () => { clearInterval(hb); sseClients.delete(client); });
});

// Current revision of a project (clients compare this to their last synced value).
app.get('/api/projects/:id/revision', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  res.json({ projectId: p.id, projectName: p.name, revision: revisionOf(p), kind: p.revisionKind || null, updatedAt: p.revisionAt || p.createdAt });
});

// Register (or refresh) a sync client for a project. Called by the CLI and MCP
// when they sync a project — this is what makes the dashboard aware of "N clients synced".
app.post('/api/sync/register', requireAuth, (req, res) => {
  const { clientId, projectId, type, dir, label, revision } = req.body || {};
  if (!clientId || !projectId) return res.status(400).json({ error: 'clientId and projectId required' });
  const p = getProject(req, res, projectId); if (!p) return;
  const existing = db.find('syncClients', (c) => c.clientId === clientId && c.projectId === projectId);
  const base = {
    providerId: providerId(req), clientId, projectId, type: type || 'cli',
    dir: dir || '', label: label || '', lastSeenAt: new Date().toISOString()
  };
  let doc = existing
    ? db.update('syncClients', existing.id, base)
    : db.insert('syncClients', { ...base, createdAt: new Date().toISOString(), lastSyncedRevision: null, lastSyncAt: null });
  if (revision != null) doc = db.update('syncClients', doc.id, { lastSyncedRevision: revision, lastSyncAt: new Date().toISOString() });
  if (!existing) db.log('sync.register', `${type || 'cli'} ${String(clientId).slice(0, 10)} -> ${p.name}`);
  res.json({ registration: doc, revision: revisionOf(p) });
});

// Acknowledge that a client has synced up to `revision` (clears "behind" state).
app.post('/api/sync/ack', requireAuth, (req, res) => {
  const { clientId, projectId, revision } = req.body || {};
  const existing = db.find('syncClients', (c) => c.clientId === clientId && c.projectId === projectId && c.providerId === providerId(req));
  if (!existing) return res.status(404).json({ error: 'registration not found' });
  const doc = db.update('syncClients', existing.id, {
    lastSyncedRevision: revision ?? revisionOf(db.find('projects', (x) => x.id === projectId)),
    lastSyncAt: new Date().toISOString(), lastSeenAt: new Date().toISOString()
  });
  res.json({ registration: doc });
});

// Remove a client's registration (used by `irys unsync` and the dashboard).
app.delete('/api/sync/register', requireAuth, (req, res) => {
  const clientId = req.body?.clientId || req.query.clientId;
  const projectId = req.body?.projectId || req.query.projectId;
  const existing = db.find('syncClients', (c) => c.clientId === clientId && c.projectId === projectId && c.providerId === providerId(req));
  if (existing) { db.remove('syncClients', existing.id); db.log('sync.unregister', `${String(clientId).slice(0, 10)} <- ${projectId}`); }
  res.json({ ok: true });
});

// Provider view: which clients are synced to a project and whether they are behind.
app.get('/api/projects/:id/sync-clients', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const rev = revisionOf(p);
  const clients = db.filter('syncClients', (c) => c.projectId === p.id && c.providerId === providerId(req))
    .map((c) => ({ ...c, behind: (c.lastSyncedRevision || 0) < rev }));
  res.json({ projectId: p.id, projectName: p.name, revision: rev, clients });
});

// Force all synced clients to re-sync immediately (dashboard "Force sync now").
app.post('/api/projects/:id/sync/force', requireAuth, (req, res) => {
  const p = getProject(req, res, req.params.id); if (!p) return;
  const revision = bumpRevision(p.id, 'forced');
  db.log('sync.force', p.name);
  res.json({ ok: true, projectId: p.id, revision });
});

// ---------------- AUDIT ----------------
app.get('/api/audit', requireAuth, (req, res) => {
  res.json(db.filter('audit', (a) => true).slice(0, 100));
});
// Allow governed clients (CLI / MCP / harness) to record an action to the audit log.
app.post('/api/audit', requireAuth, (req, res) => {
  const { action, detail } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action required' });
  db.log('client.' + String(action).slice(0, 60), detail || '');
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'IRYS', time: new Date().toISOString() }));

// IRYS host agent bootstrap script (run on a server to link it to IRYS)
app.get('/irys-agent.sh', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(path.join(__dirname, '..', 'scripts', 'irys-agent.sh'));
});

// static frontend
app.use(express.static(PUBLIC));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

app.listen(PORT, () => console.log(`IRYS running on http://localhost:${PORT}`));
