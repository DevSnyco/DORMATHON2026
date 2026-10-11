#!/usr/bin/env node
// mcp/irys-mcp.js
// IRYS MCP server (stdio transport) for AI coding harnesses.
// Exposes IRYS capabilities as tools + governance files as resources so a harness
// can authenticate, read project governance rules, inspect scope/servers, sync SSH
// keys, fetch deployment artifacts and record governed actions to the audit log.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import * as irys from '../client/irys-client.js';

const server = new McpServer({ name: 'irys', version: '1.0.0' }, { capabilities: { logging: {} } });

function txt(s) { return { content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] }; }
function errMsg(e) { return { content: [{ type: 'text', text: 'IRYS error: ' + e.message }], isError: true }; }

// ---- Autosync ----------------------------------------------------------
// The MCP becomes "synced" to a project the first time the agent touches it, and
// then watches the IRYS revision stream. When the provider edits the project in
// the dashboard, we force-pull the new governance, rewrite any locally-synced
// directories, acknowledge the revision, and notify the harness.
const watched = new Set();

function notify(level, data) {
  try {
    const p = server.server?.sendLoggingMessage?.({ level, data: typeof data === 'string' ? data : JSON.stringify(data) });
    return Promise.resolve(p).catch(() => { /* harness may not subscribe */ });
  } catch { return Promise.resolve(); }
}

async function forceSyncProject(projectId, projectName, reason) {
  const { revision } = await irys.getRevision(projectId);
  const files = await irys.governanceFiles(projectId);
  const written = [];
  for (const s of irys.loadLocalSyncs().filter((x) => x.projectId === projectId)) {
    written.push(...irys.writeGovernanceFiles(s.dir, files));
    irys.saveLocalSync({ ...s, lastSyncedRevision: revision });
  }
  await irys.ackSync({ projectId, revision });
  return { projectId, projectName, revision, reason, filesWritten: written.length, dirs: [...new Set(written.map((f) => path.dirname(f)))] };
}

async function startWatch(projectId, projectName) {
  if (watched.has(projectId)) return;
  watched.add(projectId);
  try { await irys.registerSync({ projectId, type: 'mcp', label: 'mcp', revision: (await irys.getRevision(projectId)).revision }); } catch { /* offline/auth — retry on reconnect */ }
  (async () => {
    await irys.watchRevisions({
      projectId,
      onError: () => { /* transient; watchRevisions reconnects */ },
      onEvent: async (ev) => {
        try {
          const r = await forceSyncProject(projectId, projectName, `dashboard ${ev.kind} → rev ${ev.revision}`);
          await notify('info', `IRYS autosync: "${projectName}" changed (${ev.kind}); force-synced to revision ${ev.revision}` + (r.filesWritten ? `, rewrote ${r.filesWritten} file(s) in ${r.dirs.join(', ')}` : '') + '.');
        } catch (e) { await notify('warning', `IRYS autosync failed for "${projectName}": ${e.message}`); }
      }
    });
  })();
}

async function syncAndWatch(project) {
  try { await startWatch(project.id, project.name); } catch { /* non-fatal */ }
  return project;
}


// ---- Tools -------------------------------------------------------------
server.tool('irys_auth_status', 'Check IRYS connection / auth status', {}, async () => {
  try {
    const me = await irys.call('GET', '/me');
    return txt(`Connected as provider "${me.provider.orgName}" (${me.provider.email}).\nAPI: ${irys.apiBase()}`);
  } catch (e) { return errMsg(e); }
});

server.tool('irys_list_projects', 'List IRYS projects for the connected provider', {}, async () => {
  try { return txt(await irys.call('GET', '/projects')); } catch (e) { return errMsg(e); }
});

server.tool('irys_get_project', 'Get one project by name or id', { project: z.string() }, async ({ project }) => {
  try { return txt(await irys.resolveProject(project)); } catch (e) { return errMsg(e); }
});

server.tool('irys_get_governance', 'Return the generated AGENTS.md / COMMANDCODE.md / IRYS.md for a project', { project: z.string() }, async ({ project }) => {
  try {
    const p = await irys.resolveProject(project);
    await syncAndWatch(p);
    const files = await irys.governanceFiles(p.id);
    const out = Object.values(files).filter(Boolean).join('\n\n');
    return txt(out || 'No governance files generated yet. Open the project in the IRYS dashboard and click "Generate & sync AI files".');
  } catch (e) { return errMsg(e); }
});

server.tool('irys_get_scope', 'Show which users and servers are in scope for a project', { project: z.string() }, async ({ project }) => {
  try {
    const p = await irys.resolveProject(project);
    await syncAndWatch(p);
    const [users, servers] = await Promise.all([irys.call('GET', '/users'), irys.call('GET', '/servers')]);
    const scopedUsers = users.filter((u) => (u.scopes || []).includes(p.id));
    const scopedServers = servers.filter((s) => s.projectId === p.id && s.inScope);
    return txt({
      project: p.name,
      inScopeUsers: scopedUsers.map((u) => ({ name: u.name, email: u.email, role: u.role })),
      inScopeServers: scopedServers.map((s) => ({ label: s.label, host: s.host, user: s.user, keyCount: s.keyCount }))
    });
  } catch (e) { return errMsg(e); }
});

server.tool('irys_list_servers', 'List IRYS-enabled servers (optionally for a project)', { project: z.string().optional() }, async ({ project }) => {
  try {
    const servers = await irys.call('GET', '/servers');
    let filtered = servers;
    if (project) { const p = await irys.resolveProject(project); filtered = servers.filter((s) => s.projectId === p.id); }
    return txt(filtered);
  } catch (e) { return errMsg(e); }
});

server.tool('irys_sync_ssh_keys', 'Provision/re-sync in-scope SSH keys to a server (by label/id) or all servers in a project',
  { target: z.string().describe('server label/id, or project name when scope=project'), scope: z.enum(['server', 'project']).default('server') },
  async ({ target, scope }) => {
    try {
      const servers = await irys.call('GET', '/servers');
      let targets = [];
      if (scope === 'project') {
        const p = await irys.resolveProject(target);
        targets = servers.filter((s) => s.projectId === p.id && s.inScope);
      } else {
        const s = servers.find((x) => x.id === target || x.label === target);
        if (!s) throw new Error('Server not found: ' + target);
        targets = [s];
      }
      const results = [];
      for (const s of targets) {
        const r = await irys.call('POST', `/servers/${s.id}/sync`);
        results.push({ server: s.label, status: r.status, note: r.note, keys: r.keyCount });
      }
      return txt(results);
    } catch (e) { return errMsg(e); }
  });

server.tool('irys_sync_my_ssh_key',
  'Discover local SSH public key(s) (~/.ssh) and register them with IRYS for every project the connected identity is scoped to, then re-sync in-scope servers',
  { label: z.string().optional().describe('Optional label for the key(s)') },
  async ({ label }) => {
    try {
      const found = irys.discoverSshKeys();
      if (!found.length) return txt('No local SSH public keys found in ~/.ssh — nothing to sync.');
      const r = await irys.syncSelfSshKey(label);
      return txt({
        synced: r.synced,
        localKeys: found.map((k) => ({ type: k.type, fingerprint: k.fingerprint, file: k.file })),
        results: (r.results || []).map((res) => ({
          fingerprint: res.fingerprint,
          user: res.user,
          projectsInScope: res.projectsInScope,
          registered: res.registered,
          synced: res.synced
        }))
      });
    } catch (e) { return errMsg(e); }
  });

server.tool('irys_get_deployment', 'Get a project deployment procedure + generated bash script and systemd unit',
  { project: z.string(), artifact: z.enum(['procedure', 'script', 'unit']).default('procedure') },
  async ({ project, artifact }) => {
    try {
      const p = await irys.resolveProject(project);
      await syncAndWatch(p);
      if (artifact === 'procedure') return txt(await irys.call('GET', `/projects/${p.id}/deployment`));
      const text = await irys.callText('GET', `/projects/${p.id}/deployment/${artifact}`);
      return txt(text);
    } catch (e) { return errMsg(e); }
  });

server.tool('irys_log_action', 'Record a governed action to the IRYS audit log (use for server/deploy/key actions)',
  { action: z.string(), detail: z.string().optional() }, async ({ action, detail }) => {
    try { await irys.call('POST', '/audit', { action, detail: detail || '' }); return txt('logged: ' + action); } catch (e) { return errMsg(e); }
  });

server.tool('irys_sync_status', 'Show autosync state: project revisions, this client, and all synced clients',
  { project: z.string().optional() },
  async ({ project }) => {
    try {
      const me = irys.clientId();
      const local = irys.loadLocalSyncs();
      const projects = project ? [await irys.resolveProject(project)] : await irys.call('GET', '/projects');
      const out = [];
      for (const p of projects) {
        const r = await irys.listSyncClients(p.id);
        out.push({
          project: p.name,
          revision: r.revision,
          watching: watched.has(p.id),
          clients: r.clients.map((c) => ({ type: c.type, clientId: c.clientId, isMe: c.clientId === me, dir: c.dir || undefined, lastSyncedRevision: c.lastSyncedRevision, behind: c.behind }))
        });
      }
      return txt({ thisClient: me, localSyncTargets: local.map((s) => ({ project: s.projectName || s.projectId, dir: s.dir, lastSyncedRevision: s.lastSyncedRevision })), projects: out });
    } catch (e) { return errMsg(e); }
  });

server.tool('irys_autosync', 'Force an immediate re-pull of governance for synced project(s) and rewrite local files; also (re)starts watching',
  { project: z.string().optional() },
  async ({ project }) => {
    try {
      const targets = project ? [await irys.resolveProject(project)] : await irys.call('GET', '/projects');
      const results = [];
      for (const p of targets) {
        await startWatch(p.id, p.name);
        results.push(await forceSyncProject(p.id, p.name, 'manual irys_autosync'));
      }
      return txt(results);
    } catch (e) { return errMsg(e); }
  });

server.tool('irys_watch_project', 'Register this MCP as a synced client for a project and watch the dashboard revision stream',
  { project: z.string() },
  async ({ project }) => {
    try {
      const p = await irys.resolveProject(project);
      await startWatch(p.id, p.name);
      const r = await irys.listSyncClients(p.id);
      return txt({ watching: p.name, revision: r.revision, clients: r.clients.length });
    } catch (e) { return errMsg(e); }
  });

// ---- Governance resources (harness can read rules as virtual files) -----
server.resource(
  'irys-governance',
  'irys://governance/{project}/{file}',
  { project: z.string(), file: z.enum(['AGENTS.md', 'COMMANDCODE.md', 'IRYS.md']) },
  async (uri, vars) => {
    try {
      const p = await irys.resolveProject(vars.project);
      await syncAndWatch(p);
      const key = { 'AGENTS.md': 'agents', 'COMMANDCODE.md': 'commandcode', 'IRYS.md': 'irys' }[vars.file];
      const text = await irys.callText('GET', `/projects/${p.id}/governance/file/${key}`);
      return { contents: [{ uri: uri.href, text }] };
    } catch (e) {
      return { contents: [{ uri: uri.href, text: '# IRYS error: ' + e.message }] };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stderr only — stdout is reserved for MCP protocol.
  console.error(`[irys-mcp] stdio server ready · API ${irys.apiBase()}`);
  // Resume watching any projects this machine previously synced (CLI or MCP).
  for (const s of irys.loadLocalSyncs()) {
    try { await startWatch(s.projectId, s.projectName || s.projectId); } catch { /* offline — tools will (re)register */ }
  }
  if (irys.loadLocalSyncs().length) console.error(`[irys-mcp] resuming autosync for ${irys.loadLocalSyncs().length} synced project(s)`);
}
main().catch((e) => { console.error('[irys-mcp] fatal', e); process.exit(1); });
