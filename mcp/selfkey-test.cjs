// Test the irys_sync_my_ssh_key MCP tool over stdio JSON-RPC.
const { spawn } = require('child_process');
const path = require('path');
const NODE = '/Users/snyco/.workbuddy-ai/binaries/node/versions/22.22.2-6/bin/node';
const child = spawn(NODE, [path.resolve('mcp/irys-mcp.js')], {
  env: { ...process.env, IRYS_API_URL: 'http://localhost:4000', IRYS_SSH_DIR: '/tmp/irys-test-ssh' },
  stdio: ['pipe', 'pipe', 'pipe']
});
let buf = ''; const pending = new Map(); let id = 1;
child.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!l) continue; let m; try { m = JSON.parse(l); } catch { continue; } if (m.id != null && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } } });
child.stderr.on('data', () => {});
const rpc = (method, params) => new Promise((res, rej) => { const rid = id++; pending.set(rid, { resolve: res, reject: rej }); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: rid, method, params }) + '\n'); });
const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
(async () => {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  notify('notifications/initialized', {});
  const tools = await rpc('tools/list', {});
  const has = tools.tools.some(t => t.name === 'irys_sync_my_ssh_key');
  console.log('✓ irys_sync_my_ssh_key tool present:', has, '(total tools:', tools.tools.length + ')');
  const r = await rpc('tools/call', { name: 'irys_sync_my_ssh_key', arguments: {} });
  const text = r.content[0].text;
  console.log('✓ irys_sync_my_ssh_key result:');
  console.log(text);
  child.kill();
  const ok = has && text.includes('"synced": true') && text.includes('staging-01') && text.includes('SHA256:');
  console.log('\nMCP SELF-KEY SYNC:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('err', e.message); child.kill(); process.exit(1); });
