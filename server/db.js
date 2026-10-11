// server/db.js
// Lightweight JSON-file persistence layer for the IRYS MVP.
// Swappable for SQLite/Postgres later — every collection is just an array.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
  providers: [],   // provider organisations (the "admin" tenant)
  projects: [],    // projects owned by a provider
  users: [],       // member users with project scopes
  servers: [],     // IRYS-enabled servers (SSH targets)
  sshKeys: [],     // ssh public keys owned by users
  governance: [],  // AI governance config per project (describe/manual)
  deployments: [], // deployment procedures per project
  syncClients: [], // registered autosync clients (CLI/MCP) per project
  audit: []        // audit log of sensitive actions
};

let cache = null;

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
    cache = structuredClone(EMPTY);
  } else if (!cache) {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of Object.keys(EMPTY)) if (!cache[k]) cache[k] = [];
  }
  return cache;
}

function persist() {
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
}

export const db = {
  all(collection) {
    ensure();
    return cache[collection];
  },
  find(collection, predicate) {
    ensure();
    return cache[collection].find(predicate);
  },
  filter(collection, predicate) {
    ensure();
    return cache[collection].filter(predicate);
  },
  insert(collection, doc) {
    ensure();
    const item = { id: 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36), ...doc };
    cache[collection].push(item);
    persist();
    return item;
  },
  update(collection, id, patch) {
    ensure();
    const idx = cache[collection].findIndex((x) => x.id === id);
    if (idx === -1) return null;
    cache[collection][idx] = { ...cache[collection][idx], ...patch, updatedAt: new Date().toISOString() };
    persist();
    return cache[collection][idx];
  },
  remove(collection, id) {
    ensure();
    const before = cache[collection].length;
    cache[collection] = cache[collection].filter((x) => x.id !== id);
    persist();
    return before !== cache[collection].length;
  },
  log(action, detail) {
    ensure();
    cache.audit.unshift({ at: new Date().toISOString(), action, detail });
    if (cache.audit.length > 500) cache.audit.length = 500;
    persist();
  },
  raw() {
    ensure();
    return cache;
  }
};

export default db;
