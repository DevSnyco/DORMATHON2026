// client/irys-client.js
// Shared IRYS client for the CLI and the MCP server.
// Talks to the IRYS HTTP API and persists credentials at ~/.irys/credentials.json
// (so `irys login` is automatically picked up by the MCP server).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const CREDS_PATH = path.join(os.homedir(), '.irys', 'credentials.json');

export function credsPath() { return CREDS_PATH; }
export function loadCreds() {
  try { return JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')); } catch { return {}; }
}
export function saveCreds(patch) {
  const next = { ...loadCreds(), ...patch };
  fs.mkdirSync(path.dirname(CREDS_PATH), { recursive: true });
  fs.writeFileSync(CREDS_PATH, JSON.stringify(next, null, 2));
  fs.chmodSync(CREDS_PATH, 0o600);
  return next;
}
export function clearCreds() {
  try { fs.unlinkSync(CREDS_PATH); } catch {}
}
export function apiBase() {
  return process.env.IRYS_API_URL || loadCreds().apiUrl || 'http://localhost:4000';
}
export function setApiUrl(url) { saveCreds({ apiUrl: url }); }

async function raw(method, path, body, token) {
  const res = await fetch(apiBase() + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) { const err = new Error(data.error || ('HTTP ' + res.status)); err.status = res.status; throw err; }
  return data;
}

export async function login(email, password) {
  const r = await raw('POST', '/auth/login', { email, password });
  saveCreds({ apiUrl: apiBase(), token: r.token, providerId: r.provider.id, email });
  return r;
}

// ---------------- Local SSH key discovery + self-sync ----------------
const KEY_TYPES = ['id_ed25519', 'id_ecdsa', 'id_rsa', 'id_dsa'];

// Discover local SSH public keys from ~/.ssh (respects IRYS_SSH_KEY env override).
// Returns an array of { file, publicKey, type, fingerprint }.
export function discoverSshKeys() {
  const dir = process.env.IRYS_SSH_DIR || path.join(os.homedir(), '.ssh');
  const out = [];
  const candidates = [];
  if (process.env.IRYS_SSH_KEY) {
    candidates.push(process.env.IRYS_SSH_KEY);
  } else {
    for (const t of KEY_TYPES) candidates.push(path.join(dir, t + '.pub'));
  }
  for (const f of candidates) {
    try {
      const publicKey = fs.readFileSync(f, 'utf8').trim().split('\n')[0].trim();
      if (!publicKey || !/^(ssh-|ecdsa-|sk-)/.test(publicKey)) continue;
      const b64 = publicKey.split(/\s+/)[1] || '';
      const fingerprint = b64
        ? 'SHA256:' + crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('base64').replace(/=+$/, '')
        : '';
      out.push({ file: f, publicKey, type: publicKey.split(/\s+/)[0], fingerprint });
    } catch { /* key file not present — skip */ }
  }
  return out;
}

// Push the caller's local public key(s) to IRYS for their scoped projects.
// Returns a summary; throws on auth/network errors.
export async function syncSelfSshKey(label) {
  const keys = discoverSshKeys();
  if (!keys.length) return { synced: false, keys: [], results: [], reason: 'no local SSH public keys found' };
  const results = [];
  for (const k of keys) {
    const r = await call('POST', '/ssh-keys/self', { publicKey: k.publicKey, label: label || (k.file.split('/').pop()) });
    results.push({ ...r, type: k.type, file: k.file });
  }
  return { synced: true, keys, results };
}

// Resolve a valid bearer token, re-authenticating from env if needed.
export async function ensureToken() {
  const c = loadCreds();
  if (c.token) return c.token;
  if (c.email && process.env.IRYS_PASSWORD) return (await login(c.email, process.env.IRYS_PASSWORD)).token;
  throw new Error('Not authenticated. Run `irys login` (or set IRYS_API_URL + IRYS_PASSWORD).');
}

// Authenticated API call (JSON).
export async function call(method, p, body) {
  const token = await ensureToken();
  return raw(method, p, body, token);
}

// Authenticated API call returning raw text (for file/script endpoints).
export async function callText(method, p, body) {
  const token = await ensureToken();
  const res = await fetch(apiBase() + '/api' + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { msg = JSON.parse(text).error || msg; } catch {}
    const e = new Error(msg); e.status = res.status; throw e;
  }
  return text;
}

export async function resolveProject(nameOrId) {
  const ps = await call('GET', '/projects');
  if (!ps.length) throw new Error('No projects exist for this provider.');
  const p = ps.find((x) => x.id === nameOrId || x.name === nameOrId);
  if (!p) throw new Error(`Project "${nameOrId}" not found. Available: ${ps.map((x) => x.name).join(', ')}`);
  return p;
}

// Returns the three generated governance files for a project (plain text).
export async function governanceFiles(projectId) {
  const map = { agents: 'AGENTS.md', commandcode: 'COMMANDCODE.md', irys: 'IRYS.md' };
  const out = {};
  for (const [key, name] of Object.entries(map)) {
    try { out[name] = await callText('GET', `/projects/${projectId}/governance/file/${key}`); }
    catch { out[name] = null; }
  }
  return out;
}

// ---------------- Autosync: revisions, registry, watchers ----------------
// A stable per-machine id so the dashboard can recognise this client across runs.
export function clientId() {
  const c = loadCreds();
  if (c.clientId) return c.clientId;
  const id = 'client_' + crypto.randomBytes(6).toString('hex');
  saveCreds({ clientId: id });
  return id;
}

// Local registry of synced project -> directory (shared by CLI and MCP, so an MCP
// server can force-rewrite the files a CLI previously synced).
const SYNCS_PATH = path.join(os.homedir(), '.irys', 'syncs.json');
export function syncsPath() { return SYNCS_PATH; }
export function loadLocalSyncs() {
  try { return JSON.parse(fs.readFileSync(SYNCS_PATH, 'utf8')).syncs || []; } catch { return []; }
}
function writeLocalSyncs(syncs) {
  fs.mkdirSync(path.dirname(SYNCS_PATH), { recursive: true });
  fs.writeFileSync(SYNCS_PATH, JSON.stringify({ syncs }, null, 2));
  return syncs;
}
export function saveLocalSync(entry) {
  const all = loadLocalSyncs();
  const i = all.findIndex((s) => s.projectId === entry.projectId && s.dir === entry.dir);
  if (i >= 0) all[i] = { ...all[i], ...entry }; else all.push(entry);
  return writeLocalSyncs(all);
}
export function removeLocalSync(projectId, dir) {
  return writeLocalSyncs(loadLocalSyncs().filter((s) => !(s.projectId === projectId && (dir ? s.dir === dir : true))));
}

export async function getRevision(projectId) { return call('GET', `/projects/${projectId}/revision`); }
export async function registerSync(body) { return call('POST', '/sync/register', { clientId: clientId(), ...body }); }
export async function ackSync({ projectId, revision }) { return call('POST', '/sync/ack', { clientId: clientId(), projectId, revision }); }
export async function unregisterSync(projectId) { return call('DELETE', '/sync/register', { clientId: clientId(), projectId }); }
export async function listSyncClients(projectId) { return call('GET', `/projects/${projectId}/sync-clients`); }
export async function forceSync(projectId) { return call('POST', `/projects/${projectId}/sync/force`); }

// Pull current governance files and force-write them into a directory.
export function writeGovernanceFiles(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const [name, content] of Object.entries(files)) {
    if (!content) continue;
    const fp = path.join(dir, name);
    fs.writeFileSync(fp, content);
    written.push(fp);
  }
  return written;
}

// Subscribe to the provider's revision stream. Reconnects automatically with
// backoff until `signal` is aborted. Calls onEvent({ projectId, revision, kind }).
export async function watchRevisions({ projectId, since, signal, onEvent, onError, onOpen } = {}) {
  let backoff = 1000;
  while (!(signal && signal.aborted)) {
    try {
      const token = await ensureToken();
      const res = await fetch(apiBase() + '/api/sync/stream', {
        headers: { Authorization: 'Bearer ' + token, Accept: 'text/event-stream' },
        signal
      });
      if (!res.ok || !res.body) throw new Error('stream HTTP ' + res.status);
      backoff = 1000;
      try { onOpen && onOpen(); } catch {}
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
          let data = '';
          for (const line of chunk.split('\n')) if (line.startsWith('data:')) data += line.slice(5).trim();
          if (!data) continue;
          let ev; try { ev = JSON.parse(data); } catch { continue; }
          if (projectId && ev.projectId !== projectId) continue;
          if (since != null && ev.revision <= since) continue;
          try { onEvent && onEvent(ev); } catch (e) { try { onError && onError(e); } catch {} }
        }
      }
    } catch (e) {
      if (signal && signal.aborted) return;
      try { onError && onError(e); } catch {}
    }
    if (signal && signal.aborted) return;
    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(backoff * 2, 15000);
  }
}
