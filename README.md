# IRYS — AI Governance & Server Access Control Plane

> Built for a hackathon MVP: a working, good-looking control plane for **provider organisations** to govern AI agent behaviour and provision scoped server access — project by project.

IRYS lets a provider organisation:

1. **Login & manage members** — create user accounts and assign **project-by-project scopes** (which projects each user may touch).
2. **Sync AI guideline files** — `AGENTS.md`, `COMMANDCODE.md`, `IRYS.md` are generated from the provider's own **compliance checklists, quality controls and governance toggles**, kept in sync through the dashboard.
3. **Scope-based SSH key management** — store member SSH public keys and have IRYS provision them into **IRYS-enabled servers** that are added/removed from a project's scope through the admin dashboard. `authorized_keys` is recomputed and deployed per scope.
4. **Deployment procedures & pipeline** — define deployment steps, pipeline stages (dev/staging/prod) and generate a real **bash deploy script + systemd unit** that lays the service out at `/services/{project}`.
5. **Describe / Manual authoring** — the governance editor supports a **"Describe" mode** (explain in plain language → IRYS turns it into structured AI files) and a **"Manual" mode** (write your own instructions + toggles).
6. **Audit log** — every sensitive action (user/scope/server/key/governance/deploy) is recorded.

---

## Quick start

```bash
npm install
npm run seed      # create a demo provider + project + member + server + governance
npm start         # serves API + dashboard on http://localhost:4000
```

Open **http://localhost:4000** and sign in with the seeded tenant:

```
email:    admin@irys.dev
password: demo1234
```

> The seed creates one project (`atlas-platform`), two members (`Ada Lovelace`, `Grace Hopper`, both in scope),
> two SSH keys, three IRYS-enabled servers (`staging-01` + `prod-edge-01` linked & in scope, `build-runner` unscoped),
> a describe-mode governance config and a deployment procedure — so the whole flow is demoable immediately.

### Design

The dashboard is styled after **[uwitz.org](https://uwitz.org)**'s design system — a near-black
"security-ops terminal" aesthetic: surfaces ramp from `#09090A` to `#222225`, a signature **red accent**
(`#DA2A1C`, hover `#E8543F`, press `#B8210F`), hairline borders, small radii, and Geist / Geist Mono type.
The body carries uwitz's faint red hairline grid, top vignette and scanline texture. Tokens live in
`public/index.html` (Tailwind config + CSS variables).

### Real SSH deploy (optional)

By default key deployment runs in **simulation mode** (it records the computed `authorized_keys`
and marks the server `simulated`). To actually push keys over SSH, set:

```bash
IRYS_SSH_DEPLOY=1 npm start
```

IRYS will then `ssh` to each scoped server and write the aggregated `authorized_keys`.

### Linking a real server (IRYS host agent)

For a real host, register the server in the dashboard and hit **Bootstrap** — IRYS issues a one-time
token and a single command to run on the host:

```bash
curl -sSL http://localhost:4000/irys-agent.sh | sudo bash -s -- --url http://localhost:4000 --token <token>
```

The agent (`scripts/irys-agent.sh`) creates the `irys` user, links to IRYS with the token, writes the
initial `authorized_keys`, then installs a 60s timer that **pulls** keys from IRYS. IRYS never needs
outbound SSH to the host.

---

## Architecture

```
IRYS_HACKATHON/
├─ package.json
├─ server/
│  ├─ index.js            # Express API + static hosting
│  ├─ db.js               # JSON-file persistence (swap for SQLite/Postgres later)
│  ├─ auth.js             # JWT + bcrypt auth
│  ├─ seed.js             # demo tenant
│  └─ lib/
│     ├─ aiFiles.js       # describe/manual -> AGENTS.md / COMMANDCODE.md / IRYS.md
│     ├─ sshDeploy.js     # scope-aware authorized_keys aggregation + deploy
│     └─ deployGen.js     # bash script + systemd unit generator (/services/{project})
├─ public/
│  ├─ index.html          # React + Tailwind (CDN) shell
│  └─ app.jsx             # full dashboard SPA
└─ data/db.json           # created at runtime (gitignored)
```

**Stack:** Node + Express, JSON persistence, JWT auth, React 18 + Tailwind (CDN) SPA. No build step — runs with `node`.

### API surface (all under `/api`, Bearer JWT)

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /me` |
| Projects | `GET/POST /projects`, `PUT/DELETE /projects/:id` |
| Members | `GET/POST /users`, `PUT/DELETE /users/:id` |
| SSH keys | `GET/POST /ssh-keys`, `DELETE /ssh-keys/:id` |
| Servers | `GET/POST /servers`, `POST /servers/:id/scope`, `POST /servers/:id/sync`, `DELETE /servers/:id` |
| Governance | `GET /toggles`, `GET/POST /projects/:id/governance`, `GET /projects/:id/governance/file/:name` |
| Deployment | `GET/POST /projects/:id/deployment`, `.../deployment/script`, `.../deployment/unit` |
| Audit | `GET /audit`, `POST /audit` (governed clients log actions) |

---

## MCP server (for AI coding harnesses)

IRYS ships an **MCP server** so any harness that speaks MCP (Claude Code, CodeBuddy, Cursor, etc.)
can connect and govern itself through IRYS — read project rules, inspect scope, sync SSH keys, fetch
deployment artifacts, and record actions to the audit log.

```bash
npm run mcp          # starts the stdio MCP server
```

Add it to your harness `mcp.json` (run `irys login` first so the token is picked up from `~/.irys/`):

```json
{
  "mcpServers": {
    "irys": {
      "command": "node",
      "args": ["/absolute/path/to/IRYS_HACKATHON/mcp/irys-mcp.js"],
      "env": { "IRYS_API_URL": "http://localhost:4000" }
    }
  }
}
```

**Tools exposed:** `irys_auth_status`, `irys_list_projects`, `irys_get_project`, `irys_get_governance`,
`irys_get_scope`, `irys_list_servers`, `irys_sync_ssh_keys`, `irys_sync_my_ssh_key`, `irys_get_deployment`, `irys_log_action`.
**Resources:** `irys://governance/{project}/{AGENTS.md|COMMANDCODE.md|IRYS.md}` (harness can mount the
rules as virtual files).

## CLI (`irys`)

A command-line client for terminals and CI — auth, sync governance files into a repo, push SSH keys,
and inspect scope/deployments.

```bash
node cli/irys.js login --email admin@irys.dev --password demo1234   # also auto-syncs your SSH key
node cli/irys.js sync-key                                           # re-run the SSH key auto-sync
node cli/irys.js projects
node cli/irys.js sync atlas-platform --ssh        # write AGENTS.md/COMMANDCODE.md/IRYS.md + push keys
node cli/irys.js deploy atlas-platform --script --write
node cli/irys.js scope atlas-platform
node cli/irys.js mcp-config                        # print the mcp.json snippet above
```

Credentials are stored at `~/.irys/credentials.json` (mode 600) and shared with the MCP server.
Both the CLI and MCP server use the shared client in `client/irys-client.js`.

### Auth flow (CLI & MCP)

`irys login` authenticates against the IRYS API and writes `~/.irys/credentials.json` (JWT + api URL +
provider id). The **MCP server reads the same file**, so a harness connects with no separate config —
run `irys login` once and both the CLI and any MCP harness are authenticated. For headless/CI, set
`IRYS_API_URL` + `IRYS_PASSWORD` and the client re-authenticates on demand (`ensureToken`).

### SSH key auto-sync on login

On `irys login` (and via the MCP `irys_sync_my_ssh_key` tool), IRYS **auto-discovers your local SSH
public key(s)** from `~/.ssh` (`id_ed25519.pub`, `id_ecdsa.pub`, `id_rsa.pub`, `id_dsa.pub`) and
registers them for **every project your account is scoped to**, then re-syncs the affected in-scope
servers. If no member record exists for your login email, one is created (assign scopes in the
dashboard afterwards). It's idempotent — repeat logins never duplicate keys.

- Skip it on login with `--no-sync-key`.
- Re-run it any time with `irys sync-key`.
- Override the key location with `IRYS_SSH_DIR` (dir to scan) or `IRYS_SSH_KEY` (single file).
- From a harness, call the MCP tool `irys_sync_my_ssh_key` (optional `label`).

Backed by `POST /api/ssh-keys/self`, which computes an OpenSSH-style `SHA256:` fingerprint and logs
each sync to the audit trail.

### Showcase (proves governance is picked up)

```bash
# CLI end-to-end: auth -> governance -> scope -> servers -> deploy -> audit
npm run showcase:cli        # runs showcase/cli-demo.sh

# MCP end-to-end over the stdio JSON-RPC protocol:
# initialize -> tools/list -> irys_get_governance (provider's AGENTS.md)
#            -> irys_get_scope -> irys_get_deployment -> irys_auth_status
npm run showcase:mcp        # runs mcp/showcase.cjs

# Agent bootstrap/link/pull smoke test (create server -> bootstrap -> link -> pull keys)
npm run smoke
```

Both showcases assert that the **governance defined by the provider organisation in the dashboard**
(toggles, compliance checklist, quality bar) is what the CLI and MCP return — i.e. the AI files an
agent reads are exactly the ones the provider authored.

---

## How the pieces connect

- A **user** is added to a **project scope** → their SSH key becomes eligible for that project's servers.
- A **server** is put **in scope** of a project → IRYS aggregates the in-scope users' keys into `authorized_keys` and **Sync keys** pushes them.
- **Governance** (describe or manual) generates the harness files that an agent operating in that project should follow.
- **Deployment** generates the script + systemd unit that places the service at `/services/{project}` and wires the pipeline stages to scoped servers.

## Notes for production

This MVP uses a JSON file store and bcrypt-js for zero-friction setup. For production swap `server/db.js`
for SQLite/Postgres, add real SSH agent credentials, and wire an LLM into `describe` mode (the template
generator in `lib/aiFiles.js` is the integration point).

## License

Released under the **PolyForm Noncommercial License 1.0.0** — free to use, modify and redistribute for
noncommercial purposes; you may not use it to build a revenue-earning product or service without a separate
commercial license from the licensor. See [LICENSE](./LICENSE).

SPDX: `Polyform-Noncommercial-1.0.0`

## Autosync (dashboard ↔ CLI ↔ MCP)

- **Server push (SSE) + watchers**: every governed change (projects/users/keys/servers/governance/deployment) bumps the project `revision`. The server broadcasts to active clients over `GET /api/sync/stream` (EventSource).
- **Register sync on server**: CLI `irys sync <project> [--dir <dir>] [--label <label>]` and MCP autosync register a `syncClient` on the server and write a local target into `~/.irys/syncs.json`. Registration includes `revision` and `lastSyncedRevision`.
- **CLI**:
  - `irys sync <project> [--watch] [--dir <dir>] [--no-gov] [--ssh] [--label <label>]` — sync governance (and optionally SSH) to `<dir>`, register autosync, ack current revision; if `--watch`, tail the SSE stream and force-resync on any update.
  - `irys syncs` — list local sync targets and server-side registered clients (with `in sync`/`behind`).
  - `irys unsync <project>` — unregister the local+server sync client for that project.
- **MCP**:
  - On startup, MCP loads `~/.irys/syncs.json` and starts watching those projects via SSE. On any change, it force-pulls the latest governance for those directories, rewrites `AGENTS.md`/`COMMANDCODE.md`/`IRYS.md`, acks the new revision, and logs a notification (if the client supports logging).
  - Tools: `irys_sync_status`, `irys_autosync` (start/stop watching and register/unsync), `irys_watch_project`.
- **Dashboard**: Project Detail → `Sync` tab shows revision, "Force sync now" (POST `/api/projects/:id/sync/force`), and server-side sync clients with in-sync/behind status.
