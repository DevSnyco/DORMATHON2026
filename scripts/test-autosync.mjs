#!/usr/bin/env node
// scripts/test-autosync.mjs
// End-to-end check of dashboard-triggered autosync:
//   register a sync client -> open the revision SSE stream -> trigger a governed
//   change -> assert a revision event arrives -> force-pull governance -> ack.
// Requires a running IRYS server + credentials (~/.irys) or IRYS_PASSWORD.
import * as irys from '../client/irys-client.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fail = (m) => { console.error('  [FAIL] ' + m); process.exitCode = 1; };
const pass = (m) => console.log('  [PASS] ' + m);

async function main() {
  console.log('== IRYS autosync test ==');

  const me = await irys.call('GET', '/me');
  pass(`authenticated as ${me.provider.email}`);

  const project = await irys.resolveProject('atlas-platform');
  const start = (await irys.getRevision(project.id)).revision;
  console.log(`   project ${project.name} starting revision=${start}`);

  // 1. sync into a temp dir + register (like `irys sync --watch`)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'irys-autosync-'));
  const files = await irys.governanceFiles(project.id);
  const written = irys.writeGovernanceFiles(dir, files);
  written.length === 3 ? pass(`wrote ${written.length} governance file(s) to ${dir}`) : fail(`expected 3 files, got ${written.length}`);

  const reg = await irys.registerSync({ projectId: project.id, type: 'cli', dir, label: 'autosync-test', revision: start });
  reg.registration && reg.registration.clientId ? pass('registered sync client on server') : fail('registerSync did not return a registration');

  // 2. open the SSE stream and wait for a revision > start
  const ac = new AbortController();
  const eventP = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for revision event')), 8000);
    irys.watchRevisions({
      projectId: project.id, since: start, signal: ac.signal,
      onOpen: () => console.log('   SSE stream connected'),
      onEvent: (ev) => { clearTimeout(t); resolve(ev); }
    }).catch(() => {});
  });

  await new Promise((r) => setTimeout(r, 400)); // let the stream subscribe

  // 3. trigger a governed change from the "dashboard" (governance save)
  const current = await irys.call('GET', `/projects/${project.id}/governance`);
  const saved = await irys.call('POST', `/projects/${project.id}/governance`, {
    mode: current.mode || 'describe', description: current.description || '',
    toggles: current.toggles || {}, complianceChecklist: current.complianceChecklist || [],
    qualityControls: current.qualityControls || [], manualSections: current.manualSections || {}
  });
  saved.revision > start ? pass(`dashboard save bumped revision ${start} -> ${saved.revision}`) : fail('governance save did not bump revision');

  // 4. the watcher should observe the push
  let ev;
  try { ev = await eventP; pass(`autosync event received: rev ${ev.revision} (${ev.kind})`); }
  catch (e) { fail(e.message); }
  ac.abort();

  // 5. force-pull + ack, then confirm "in sync" server-side
  if (ev) {
    const files2 = await irys.governanceFiles(project.id);
    irys.writeGovernanceFiles(dir, files2);
    await irys.ackSync({ projectId: project.id, revision: ev.revision });
    const after = await irys.listSyncClients(project.id);
    const mine = after.clients.find((c) => c.clientId === irys.clientId());
    mine && !mine.behind ? pass('client acknowledged — server reports in sync') : fail('client still behind after ack');
    after.revision === ev.revision ? pass(`server revision matches (${after.revision})`) : fail('revision mismatch');
  }

  // cleanup
  await irys.unregisterSync(project.id);
  fs.rmSync(dir, { recursive: true, force: true });
  pass('cleaned up registration + temp dir');

  console.log(process.exitCode ? '\nAUTOSYNC: FAIL' : '\nAUTOSYNC: PASS');
}

main().catch((e) => { console.error('fatal: ' + e.message); process.exit(1); });
