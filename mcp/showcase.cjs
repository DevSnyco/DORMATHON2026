// MCP showcase — speaks the MCP stdio JSON-RPC protocol to mcp/irys-mcp.js.
// Proves the MCP server: initializes, lists tools, and returns provider-defined
// governance (AGENTS.md) via irys_get_governance.
const { spawn } = require('child_process');
const path = require('path');

const NODE = '/Users/snyco/.workbuddy-ai/binaries/node/versions/22.22.2-6/bin/node';
const MCP = path.resolve('mcp/irys-mcp.js');

const child = spawn(NODE, [MCP], {
  env: { ...process.env, IRYS_API_URL: 'http://localhost:4000' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buf = '';
const pending = new Map();
let nextId = 1;

child.stdout.on('data', (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  }
});
child.stderr.on('data', (d) => process.stderr.write('[mcp stderr] ' + d));

function rpc(method, params) {
  const id = nextId++;
  const payload = { jsonrpc: '2.0', id, method, params };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify(payload) + '\n');
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

async function main() {
  const init = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'irys-showcase', version: '1.0.0' }
  });
  console.log('✓ initialize -> server:', init.serverInfo.name, init.serverInfo.version);
  notify('notifications/initialized', {});

  const tools = await rpc('tools/list', {});
  console.log('✓ tools/list ->', tools.tools.length, 'tools:');
  tools.tools.forEach(t => console.log('   -', t.name));

  const gov = await rpc('tools/call', { name: 'irys_get_governance', arguments: { project: 'atlas-platform' } });
  const text = gov.content && gov.content[0] && gov.content[0].text;
  console.log('\n✓ tools/call irys_get_governance ->', text ? 'received' : 'EMPTY', '(' + (text ? text.length : 0) + ' chars)');
  console.log('--- first 600 chars of AGENTS.md governance ---');
  console.log((text || '').slice(0, 600));

  // Also demonstrate scope + deployment tools
  const scope = await rpc('tools/call', { name: 'irys_get_scope', arguments: { project: 'atlas-platform' } });
  console.log('\n✓ irys_get_scope ->', scope.content[0].text);

  const deploy = await rpc('tools/call', { name: 'irys_get_deployment', arguments: { project: 'atlas-platform', artifact: 'script' } });
  const dtext = deploy.content[0].text || '';
  console.log('\n✓ irys_get_deployment (script) -> contains "IRYS deployment guideline":', dtext.includes('IRYS deployment guideline'));

  const auth = await rpc('tools/call', { name: 'irys_auth_status', arguments: {} });
  console.log('\n✓ irys_auth_status ->', auth.content[0].text.split('\n')[0]);

  child.kill();
  const ok = text && text.includes('AGENTS.md') && tools.tools.length > 0;
  console.log('\nMCP SHOWCASE:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error('MCP error:', e.message); child.kill(); process.exit(1); });
