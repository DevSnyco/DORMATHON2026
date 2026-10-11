// server/seed.js — demo data for the hackathon MVP
import crypto from 'node:crypto';
import db from './db.js';
import { hashPassword } from './auth.js';
import { generateGovernanceFiles } from './lib/aiFiles.js';

if (db.all('providers').length > 0) {
  console.log('IRYS already seeded — skipping.');
  process.exit(0);
}

const tok = () => crypto.randomBytes(18).toString('hex');

const prov = db.insert('providers', {
  orgName: 'IRYS Demo Provider',
  email: 'admin@irys.dev',
  passwordHash: hashPassword('demo1234')
});

const project = db.insert('projects', {
  providerId: prov.id,
  name: 'atlas-platform',
  description: 'Customer-facing analytics platform.',
  revision: 1,
  createdAt: new Date().toISOString()
});

const user = db.insert('users', {
  providerId: prov.id,
  name: 'Ada Lovelace',
  email: 'ada@irys.dev',
  role: 'developer',
  scopes: [project.id],
  createdAt: new Date().toISOString()
});

const user2 = db.insert('users', {
  providerId: prov.id,
  name: 'Grace Hopper',
  email: 'grace@irys.dev',
  role: 'lead',
  scopes: [project.id],
  createdAt: new Date().toISOString()
});

// The org admin is also a project member so that CLI/MCP login auto-syncs their
// local SSH key straight to the in-scope servers (see POST /api/ssh-keys/self).
const adminMember = db.insert('users', {
  providerId: prov.id,
  name: 'IRYS Admin',
  email: 'admin@irys.dev',
  role: 'admin',
  scopes: [project.id],
  createdAt: new Date().toISOString()
});
db.insert('sshKeys', {
  userId: adminMember.id,
  projectId: project.id,
  publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDemoKEYforIRYSplatformAdminOrg00000000000000000000000 sample-admin@irys',
  label: 'admin-laptop',
  active: true,
  createdAt: new Date().toISOString()
});

db.insert('sshKeys', {
  userId: user.id,
  projectId: project.id,
  publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDemoKEYforIRYSplatformAdaLovelace000000000000000000000 sample-ada@irys',
  label: 'laptop',
  active: true,
  createdAt: new Date().toISOString()
});
db.insert('sshKeys', {
  userId: user2.id,
  projectId: project.id,
  publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDemoKEYforIRYSplatformGraceHopper0000000000000000000000 sample-grace@irys',
  label: 'workstation',
  active: true,
  createdAt: new Date().toISOString()
});

// --- Realistic IRYS-enabled servers (showcase) ---
const staging = db.insert('servers', {
  providerId: prov.id,
  label: 'staging-01',
  host: '10.4.2.11',
  port: 22,
  user: 'irys',
  projectId: project.id,
  inScope: true,
  authKeysPath: '~/.ssh/authorized_keys',
  bootstrapToken: tok(),
  linked: true,
  hostInfo: { hostname: 'staging-01', ip: '10.4.2.11', sshPort: 22, fingerprint: 'SHA256:stagingDEMOkeyfingerprint', linkedAt: new Date().toISOString() },
  createdAt: new Date().toISOString()
});
const prod = db.insert('servers', {
  providerId: prov.id,
  label: 'prod-edge-01',
  host: 'app-prod.irys.dev',
  port: 22,
  user: 'irys',
  projectId: project.id,
  inScope: true,
  authKeysPath: '~/.ssh/authorized_keys',
  bootstrapToken: tok(),
  linked: true,
  hostInfo: { hostname: 'prod-edge-01', ip: '203.0.113.24', sshPort: 22, fingerprint: 'SHA256:prodDEMOkeyfingerprint', linkedAt: new Date().toISOString() },
  createdAt: new Date().toISOString()
});
const runner = db.insert('servers', {
  providerId: prov.id,
  label: 'build-runner',
  host: 'ci.atlas.internal',
  port: 22,
  user: 'irys',
  projectId: null,
  inScope: false,
  authKeysPath: '~/.ssh/authorized_keys',
  bootstrapToken: tok(),
  linked: false,
  createdAt: new Date().toISOString()
});

const govCfg = {
  projectId: project.id,
  mode: 'describe',
  description: 'Atlas is a Node + Postgres analytics API. Agents may read code and run tests locally, but must route all infra and deploy actions through IRYS-scoped servers and the reviewed deployment procedure.',
  toggles: { codeReview: true, requireTests: true, linting: true, piiCompliance: true, secretsScan: true, prApproval: true, auditLog: true },
  complianceChecklist: [
    'GDPR: PII columns must be encrypted at rest',
    'SOC2: all prod access logged via IRYS',
    'No secrets committed — use the IRYS vault'
  ],
  qualityControls: [
    'Unit coverage >= 80% on services/',
    'Bundle size budget enforced in CI',
    'Type-check must pass with strict mode'
  ]
};
db.insert('governance', { ...govCfg, generated: generateGovernanceFiles(govCfg, project) });

db.insert('deployments', {
  projectId: project.id,
  repo: 'git@github.com:irys/atlas-platform.git',
  branch: 'main',
  runtime: 'node',
  guideline: 'Build the API on the CI runner (GitHub Actions, ubuntu-22.04) with Node 20 + pnpm. Compile the frontend with Vite and bundle it into the service image; never build on the production host. The runtime artifact is a single Node service placed at /services/atlas-platform and supervised by systemd. Migrations run before the unit restarts. Staging is promoted to prod only after the IRYS audit shows a green pipeline.',
  build: { tool: 'GitHub Actions + Docker', location: 'CI runner (ubuntu-22.04, Node 20)', artifacts: 'container image irys/atlas + /services/atlas-platform/dist' },
  steps: [
    { title: 'Install dependencies', kind: 'command', command: 'cd $SERVICE_DIR && npm ci' },
    { title: 'Build', kind: 'command', command: 'cd $SERVICE_DIR && npm run build' },
    { title: 'Run migrations', kind: 'command', command: 'cd $SERVICE_DIR && npm run migrate' },
    { title: 'Restart systemd unit', kind: 'systemd', command: '' }
  ],
  pipeline: [
    { stage: 'dev', serverId: null },
    { stage: 'staging', serverId: staging.id },
    { stage: 'prod', serverId: prod.id }
  ]
});

db.log('seed', 'Demo provider + project + members + servers + governance + deployment');

console.log('IRYS seeded.');
console.log('  Login: admin@irys.dev / demo1234');
console.log('  Servers: staging-01 (linked), prod-edge-01 (linked), build-runner (unscoped)');
