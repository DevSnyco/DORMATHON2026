#!/usr/bin/env node
// cli/irys.js — IRYS command line tool.
// Usage: node cli/irys.js <command> [options]
// Commands: login, logout, whoami, projects, servers, governance, sync, deploy, scope, audit, mcp-config
import * as irys from '../client/irys-client.js';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const C = { reset: '\x1b[0m', dim: '\x1b[2m', cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', bold: '\x1b[1m' };
const log = (...a) => console.log(...a);
const ok = (m) => log(C.green + '✓ ' + C.reset + m);
const bad = (m) => log(C.red + '✗ ' + C.reset + m);
const info = (m) => log(C.cyan + '• ' + C.reset + m);

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const positionals = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) { flags[k] = next; i++; } else flags[k] = true;
    } else positionals.push(a);
  }
  return { cmd, positionals, flags };
}

async function promptHidden(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(q, (ans) => { rl.close(); resolve(ans); });
  });
}

function writeFileSafe(dir, name, content) {
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, name);
  fs.writeFileSync(fp, content);
  return fp;
}

// Auto-discover local SSH public key(s) and register them with IRYS for the
// logged-in identity's scoped projects, then re-sync in-scope servers.
async function autoSyncKey(label) {
  const found = irys.discoverSshKeys();
  if (!found.length) {
    info('No local SSH public keys found (~/.ssh/id_ed25519.pub etc.). Skipping key auto-sync.');
    return;
  }
  found.forEach((k) => info(`Found ${k.type} key  ${C.dim}${k.fingerprint}${C.reset}`));
  const r = await irys.syncSelfSshKey(label);
  if (!r.synced) { info(r.reason || 'no keys synced'); return; }
  for (const res of r.results) {
    const u = res.user;
    if (u && u.created) info(`Created member record for ${u.email} — assign project scopes in the dashboard.`);
    const n = (res.registered || []).length;
    const existed = (res.registered || []).filter((x) => x.existed).length;
    ok(`Key ${res.fingerprint} → ${n} project(s) (${existed} already present)`);
    (res.synced || []).forEach((s) => info(`  server ${s.server}: ${s.status}`));
    if (!n) info('  no project scopes on this account yet — add scopes in the dashboard to provision keys.');
  }
}

async function main() {
  const { cmd, positionals, flags } = parseArgs(process.argv.slice(2));

  if (!cmd || cmd === 'help') {
    log(`${C.bold}IRYS CLI${C.reset} — AI governance & server access control\n`);
    log('Commands:');
    log('  login [--email E] [--password P] [--url U] [--no-sync-key]   Authenticate (stores ~/.irys/credentials.json)');
    log('  logout                                      Forget credentials');
    log('  whoami                                       Show current provider');
    log('  sync-key [--label L]                        Discover ~/.ssh keys and register them with IRYS');
    log('  projects                                     List projects');
    log('  servers [--project P]                         List IRYS-enabled servers');
    log('  governance <project> [--file F] [--dir D] [--write]   Show/write AGENTS.md etc.');
    log('  sync <project> [--dir D] [--ssh] [--no-gov] [--watch]   Sync governance files (register autosync)');
    log('  unsync <project> [--dir D]                   Stop autosyncing a project');
    log('  syncs                                        Show local + server sync clients');
    log('  deploy <project> [--script|--unit] [--write] [--dir D]   Show/write deployment artifacts');
    log('  scope <project>                              Show users + servers in scope');
    log('  audit                                        Show audit log');
    log('  mcp-config                                   Print MCP server config snippet');
    log('');
    log('On login, IRYS auto-discovers your local SSH public key(s) and registers them');
    log('for every project your account is scoped to (then re-syncs in-scope servers).');
    return;
  }

  try {
    switch (cmd) {
      case 'login': {
        if (flags.url) irys.setApiUrl(flags.url);
        const email = flags.email || (await promptHidden('email: '));
        const password = flags.password || process.env.IRYS_PASSWORD || (await promptHidden('password: '));
        const r = await irys.login(email, password);
        ok(`Logged in as ${r.provider.orgName} (${r.provider.email})`);
        info(`API: ${irys.apiBase()}`);
        if (!flags['no-sync-key']) await autoSyncKey();
        else info('SSH auto-sync skipped (--no-sync-key).');
        return;
      }
      case 'logout': irys.clearCreds(); ok('Logged out.'); return;
      case 'sync-key': await autoSyncKey(flags.label); return;
      case 'whoami': {
        const me = await irys.call('GET', '/me');
        info(`Provider: ${me.provider.orgName} <${me.provider.email}>`);
        return;
      }
      case 'projects': {
        const ps = await irys.call('GET', '/projects');
        info(`${ps.length} project(s):`);
        ps.forEach((p) => log(`  ${C.bold}${p.name}${C.reset}  ${C.dim}${p.description || ''}${C.reset}`));
        return;
      }
      case 'servers': {
        const servers = await irys.call('GET', '/servers');
        let list = servers;
        if (flags.project) { const p = await irys.resolveProject(flags.project); list = servers.filter((s) => s.projectId === p.id); }
        info(`${list.length} server(s):`);
        list.forEach((s) => log(`  ${C.bold}${s.label}${C.reset} ${s.inScope ? C.green + '[in scope]' : C.yellow + '[unscoped]'}${C.reset} ${C.dim}${s.user}@${s.host}:${s.port} · ${s.keyCount} keys${C.reset}`));
        return;
      }
      case 'governance': {
        const name = positionals[0]; if (!name) throw new Error('usage: irys governance <project> [--file F] [--write] [--dir D]');
        const p = await irys.resolveProject(name);
        const files = await irys.governanceFiles(p.id);
        const dir = flags.dir || process.cwd();
        if (flags.file) {
          const f = files[flags.file]; if (!f) throw new Error('no file: ' + flags.file);
          if (flags.write) { const fp = writeFileSafe(dir, flags.file, f); ok('wrote ' + fp); } else log(f);
          return;
        }
        for (const [name, content] of Object.entries(files)) {
          if (!content) continue;
          if (flags.write) { const fp = writeFileSafe(dir, name, content); ok('wrote ' + fp); }
          else { log(C.bold + '\n=== ' + name + ' ===' + C.reset); log(content); }
        }
        return;
      }
      case 'sync': {
        const name = positionals[0]; if (!name) throw new Error('usage: irys sync <project> [--ssh] [--dir D] [--no-gov] [--watch]');
        const p = await irys.resolveProject(name);
        const dir = path.resolve(flags.dir || process.cwd());

        const writeGov = async () => {
          if (flags['no-gov']) return 0;
          const files = await irys.governanceFiles(p.id);
          return irys.writeGovernanceFiles(dir, files).length;
        };
        const pushSsh = async () => {
          if (!flags.ssh) return;
          const servers = (await irys.call('GET', '/servers')).filter((s) => s.projectId === p.id && s.inScope);
          if (!servers.length) info('No in-scope servers to sync.');
          for (const s of servers) { const r = await irys.call('POST', `/servers/${s.id}/sync`); info(`SSH sync ${s.label}: ${r.status} — ${r.note}`); }
        };

        const n = await writeGov();
        if (n) ok(`Synced ${n} governance file(s) into ${dir} (project "${p.name}")`);
        await pushSsh();

        // Register this directory as an autosync target, on the server and locally.
        let rev = (await irys.getRevision(p.id)).revision;
        await irys.registerSync({ projectId: p.id, type: 'cli', dir, label: flags.label || '', revision: rev });
        irys.saveLocalSync({ projectId: p.id, projectName: p.name, dir, type: 'cli', clientId: irys.clientId(), lastSyncedRevision: rev });
        await irys.ackSync({ projectId: p.id, revision: rev });
        await irys.call('POST', '/audit', { action: 'cli.sync', detail: `project=${p.name} ssh=${!!flags.ssh} rev=${rev}` });
        info(`Autosync registered (revision ${rev}) — dashboard edits will push here.`);

        if (flags.watch) {
          const ac = new AbortController();
          process.on('SIGINT', () => { ac.abort(); info('Stopped watching.'); process.exit(0); });
          info(`Watching ${p.name} for dashboard updates… (Ctrl-C to stop)`);
          await irys.watchRevisions({
            projectId: p.id, since: rev, signal: ac.signal,
            onOpen: () => info('Connected to IRYS revision stream.'),
            onError: (e) => bad('watch: ' + e.message),
            onEvent: async (ev) => {
              info(`Update detected (${ev.kind}) → revision ${ev.revision}; force syncing…`);
              const n2 = await writeGov();
              if (n2) ok(`Re-synced ${n2} file(s) into ${dir}`);
              await pushSsh();
              await irys.ackSync({ projectId: p.id, revision: ev.revision });
              irys.saveLocalSync({ projectId: p.id, projectName: p.name, dir, type: 'cli', clientId: irys.clientId(), lastSyncedRevision: ev.revision });
              ok(`Autosynced to revision ${ev.revision} at ${new Date().toLocaleTimeString()}`);
            }
          });
        }
        return;
      }
      case 'unsync': {
        const name = positionals[0]; if (!name) throw new Error('usage: irys unsync <project> [--dir D]');
        const p = await irys.resolveProject(name);
        await irys.unregisterSync(p.id);
        irys.removeLocalSync(p.id, flags.dir ? path.resolve(flags.dir) : undefined);
        ok(`Autosync disabled for "${p.name}".`);
        return;
      }
      case 'syncs': {
        const local = irys.loadLocalSyncs();
        info(`${local.length} local autosync target(s) on this machine (client ${irys.clientId()}):`);
        local.forEach((s) => log(`  ${C.bold}${s.projectName || s.projectId}${C.reset} → ${s.dir} ${C.dim}[${s.type} rev ${s.lastSyncedRevision ?? '?'}]${C.reset}`));
        const ps = await irys.call('GET', '/projects');
        for (const p of ps) {
          const r = await irys.listSyncClients(p.id);
          info(`Server "${p.name}" rev ${r.revision} · ${r.clients.length} client(s):`);
          r.clients.forEach((c) => log(`  - ${c.type} ${C.dim}${String(c.clientId).slice(0, 16)}${C.reset} rev ${c.lastSyncedRevision ?? '-'}${c.behind ? C.yellow + ' (behind)' + C.reset : C.green + ' (in sync)' + C.reset}${c.dir ? ' ' + C.dim + c.dir + C.reset : ''}`));
        }
        return;
      }
      case 'deploy': {
        const name = positionals[0]; if (!name) throw new Error('usage: irys deploy <project> [--script|--unit] [--write] [--dir D]');
        const p = await irys.resolveProject(name);
        const artifact = flags.script ? 'script' : flags.unit ? 'unit' : 'procedure';
        if (artifact === 'procedure') {
          const d = await irys.call('GET', `/projects/${p.id}/deployment`);
          log(JSON.stringify(d, null, 2)); return;
        }
        const text = await irys.callText('GET', `/projects/${p.id}/deployment/${artifact}`);
        const fname = artifact === 'script' ? `deploy-${p.name}.sh` : `irys-${p.name}.service`;
        if (flags.write) { const fp = writeFileSafe(flags.dir || process.cwd(), fname, text); ok('wrote ' + fp); }
        else log(text);
        return;
      }
      case 'scope': {
        const name = positionals[0]; if (!name) throw new Error('usage: irys scope <project>');
        const p = await irys.resolveProject(name);
        const [users, servers] = await Promise.all([irys.call('GET', '/users'), irys.call('GET', '/servers')]);
        const su = users.filter((u) => (u.scopes || []).includes(p.id));
        const ss = servers.filter((s) => s.projectId === p.id && s.inScope);
        info(`Scope for "${p.name}":`);
        log(C.bold + 'Users:' + C.reset); su.forEach((u) => log('  - ' + u.name + ' <' + u.email + '> (' + u.role + ')'));
        log(C.bold + 'Servers:' + C.reset); ss.forEach((s) => log('  - ' + s.label + ' ' + s.user + '@' + s.host + ' (' + s.keyCount + ' keys)'));
        return;
      }
      case 'audit': {
        const a = await irys.call('GET', '/audit');
        a.slice(0, 30).forEach((r) => log(`${C.dim}${new Date(r.at).toLocaleString()}${C.reset}  ${C.cyan}${r.action}${C.reset}  ${r.detail}`));
        return;
      }
      case 'mcp-config': {
        const abs = path.resolve('mcp/irys-mcp.js');
        const cfg = { mcpServers: { irys: { command: process.execPath, args: [abs], env: { IRYS_API_URL: irys.apiBase() } } } };
        log(JSON.stringify(cfg, null, 2));
        info('Add this to your harness mcp.json. Run `irys login` first so the MCP server picks up the token.');
        return;
      }
      default: bad('Unknown command: ' + cmd); process.exitCode = 1;
    }
  } catch (e) {
    bad(e.message);
    process.exitCode = 1;
  }
}

main();
