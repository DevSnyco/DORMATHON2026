const { useState, useEffect, useCallback, useMemo } = React;

/* ---------------- api helper ---------------- */
function makeApi(token) {
  return async (method, path, body) => {
    const res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  };
}

/* ---------------- UI primitives (uwitz design system) ---------------- */
function Card({ children, className = '' }) {
  return <div className={`u-card p-5 ${className}`}>{children}</div>;
}
function Btn({ children, onClick, kind = 'primary', className = '', disabled, title }) {
  const styles = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'h-[38px] px-4 rounded-full text-sm font-semibold border border-[#B8210F]/40 text-[#F17A6A] bg-[#B8210F]/12 hover:bg-[#B8210F]/22 transition',
    ok: 'h-[38px] px-4 rounded-full text-sm font-semibold border border-[#46C95F]/40 text-[#46C95F] bg-[#46C95F]/12 hover:bg-[#46C95F]/22 transition'
  };
  return <button title={title} disabled={disabled} onClick={onClick}
    className={`${styles[kind]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
    {children}</button>;
}
function Input({ label, ...p }) {
  return <label className="block mb-3"><span className="text-[11px] uppercase tracking-[.04em] text-fg2 block mb-1.5 font-medium">{label}</span>
    <input {...p} className="w-full bg-ink border border-line3 rounded-md9 px-3 py-2 text-sm font-medium shadow-inset outline-none focus:border-brand transition" /></label>;
}
function Textarea({ label, ...p }) {
  return <label className="block mb-3"><span className="text-[11px] uppercase tracking-[.04em] text-fg2 block mb-1.5 font-medium">{label}</span>
    <textarea {...p} className="w-full bg-ink border border-line3 rounded-md9 px-3 py-2 text-sm font-mono shadow-inset outline-none focus:border-brand transition" /></label>;
}
function Badge({ children, tone = 'brand' }) {
  const t = {
    brand: 'bg-[#DA2A1C]/12 text-brand300 shadow-[inset_0_0_0_1px_rgba(218,42,28,.34)]',
    ok: 'bg-[#46C95F]/12 text-ok shadow-[inset_0_0_0_1px_rgba(70,201,95,.34)]',
    warn: 'bg-[#E9B23C]/12 text-warn shadow-[inset_0_0_0_1px_rgba(233,178,60,.34)]',
    bad: 'bg-[#B8210F]/16 text-[#F17A6A] shadow-[inset_0_0_0_1px_rgba(184,33,15,.4)]',
    slate: 'bg-white/[.04] text-fg1 shadow-[inset_0_0_0_1px_#2C2C30]'
  };
  return <span className={`u-chip ${t[tone]}`}>{children}</span>;
}
function Toggle({ checked, onChange }) {
  return <button onClick={() => onChange(!checked)} type="button"
    className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? 'bg-brand' : 'bg-line3'}`}>
    <span className={`block w-5 h-5 rounded-full bg-white transition ${checked ? 'translate-x-4' : ''}`} /></button>;
}
function Modal({ title, onClose, children, wide }) {
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
    <div className={`u-card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-auto glow fade`} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-line">
        <h3 className="font-semibold text-lg">{title}</h3>
        <button onClick={onClose} className="text-fg2 hover:text-fg0 text-xl leading-none">×</button>
      </div>
      <div className="p-4">{children}</div>
    </div></div>;
}
function Tabs({ tabs, active, setActive }) {
  return <div className="flex gap-1 border-b border-line mb-4 flex-wrap">
    {tabs.map(t => <button key={t} onClick={() => setActive(t)}
      className={`px-3 py-2 text-sm font-semibold rounded-t-md9 -mb-px transition ${active === t ? 'text-brand300 border-b-2 border-brand' : 'text-fg2 hover:text-fg0'}`}>{t}</button>)}
  </div>;
}
function Eyebrow({ children }) {
  return <span className="u-eyebrow mb-2">{children}</span>;
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); } catch {} }
function download(name, text) {
  const b = new Blob([text], { type: 'text/plain' }); const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}

/* ---------------- Auth / Login ---------------- */
function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@irys.dev');
  const [password, setPassword] = useState('demo1234');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const api = makeApi(null);
      const r = await api('POST', '/auth/login', { email, password });
      onLogin(r.token, r.provider);
    } catch (e) { setErr(e.message); }
  };
  return <div className="min-h-screen flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-fg0">
          <Logo /> IRYS
        </div>
        <p className="u-eyebrow mt-3 justify-center">AI governance · server access</p>
      </div>
      <Card className="glow">
        <form onSubmit={submit}>
          <Input label="Provider email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {err && <p className="text-brand300 text-sm mb-3">{err}</p>}
          <Btn className="w-full" kind="primary">Sign in</Btn>
        </form>
        <p className="text-xs text-fg3 mt-4 text-center font-mono">demo tenant · admin@irys.dev / demo1234</p>
      </Card>
    </div></div>;
}
function Logo() {
  return <span className="inline-grid place-items-center w-9 h-9 rounded-md9 bg-brand shadow-accent" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 0 18px -4px rgba(218,42,28,.45)' }}>
    <span className="w-4 h-4 bg-white" style={{ WebkitMask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 604 669'%3E%3Cpath d='M139.09 460.17 226.13 340.44 85.56 294.26 114.16 205.59 255.14 251.77 254.32 103.43 348.72 103.43 347.90 251.77 489.29 206.00 518.30 294.67 377.73 340.44 463.54 460.17 388.35 514.93 301.72 394.79 214.28 514.52Z'/%3E%3C/svg%3E\") center/contain no-repeat", mask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 604 669'%3E%3Cpath d='M139.09 460.17 226.13 340.44 85.56 294.26 114.16 205.59 255.14 251.77 254.32 103.43 348.72 103.43 347.90 251.77 489.29 206.00 518.30 294.67 377.73 340.44 463.54 460.17 388.35 514.93 301.72 394.79 214.28 514.52Z'/%3E%3C/svg%3E\") center/contain no-repeat" }} /></span>;
}

/* ---------------- Shell ---------------- */
function Shell({ token, provider, onLogout }) {
  const api = useMemo(() => makeApi(token), [token]);
  const [view, setView] = useState('dashboard');
  const [selected, setSelected] = useState(null); // selected project object
  const [projects, setProjects] = useState([]);
  const reloadProjects = useCallback(async () => { setProjects(await api('GET', '/projects')); }, [api]);

  useEffect(() => { reloadProjects(); }, [reloadProjects]);

  const nav = [
    ['dashboard', 'Dashboard'], ['projects', 'Projects'], ['members', 'Members'],
    ['servers', 'Servers'], ['audit', 'Audit']
  ];
  return <div className="flex min-h-screen">
    <aside className="w-60 shrink-0 border-r border-line2 glass p-4 flex flex-col">
      <div className="flex items-center gap-2 font-extrabold text-xl mb-6 px-1 text-fg0"><Logo />IRYS</div>
      <nav className="flex flex-col gap-1">
        {nav.map(([k, label]) => <button key={k} onClick={() => setView(k)}
          className={`text-left px-3 py-2 rounded-md9 text-sm font-semibold transition ${view === k ? 'nav-active' : 'text-fg2 hover:text-fg0 hover:bg-hover'}`}>{label}</button>)}
      </nav>
      <div className="mt-auto pt-4 border-t border-line2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <span className="online-dot"></span>
          <p className="text-xs text-fg2 truncate">{provider.orgName}</p>
        </div>
        <Btn kind="ghost" className="w-full" onClick={onLogout}>Sign out</Btn>
      </div>
    </aside>
    <main className="flex-1 p-6 max-w-6xl">
      {view === 'dashboard' && <Dashboard api={api} projects={projects} setView={setView} setSelected={setSelected} />}
      {view === 'projects' && <Projects api={api} projects={projects} reload={reloadProjects} selected={selected} setSelected={setSelected} />}
      {view === 'members' && <Members api={api} projects={projects} />}
      {view === 'servers' && <Servers api={api} projects={projects} />}
      {view === 'audit' && <Audit api={api} />}
    </main>
  </div>;
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ api, projects, setView, setSelected }) {
  const [stats, setStats] = useState({ users: 0, servers: 0, keys: 0 });
  const [audit, setAudit] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [users, servers, keys, a] = await Promise.all([
          api('GET', '/users'), api('GET', '/servers'), api('GET', '/ssh-keys'), api('GET', '/audit')
        ]);
        setStats({ users: users.length, servers: servers.length, keys: keys.length });
        setAudit(a.slice(0, 6));
      } catch {}
    })();
  }, [api]);
  const tiles = [
    ['Projects', projects.length, 'brand'],
    ['Members', stats.users, 'ok'],
    ['Servers in scope', stats.servers, 'warn'],
    ['SSH keys managed', stats.keys, 'brand2']
  ];
  return <div className="fade">
    <Eyebrow>Control plane</Eyebrow>
    <h1 className="text-2xl font-bold mb-1">Welcome back 👋</h1>
    <p className="text-fg2 mb-6 text-sm">Govern AI behaviour and server access for your organisation — project by project.</p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {tiles.map(([l, v, t]) => <Card key={l}><div className="text-3xl font-extrabold font-hero text-fg0">{v}</div><div className="text-fg2 text-[11px] uppercase tracking-[.04em] mt-1 font-medium">{l}</div></Card>)}
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <h2 className="font-semibold mb-3">Your projects</h2>
        {projects.length === 0 && <p className="text-fg3 text-sm">No projects yet. Create one to start governing AI + servers.</p>}
        <div className="flex flex-col gap-2">
          {projects.map(p => <button key={p.id} onClick={() => { setSelected(p); setView('projects'); }}
            className="text-left px-3 py-2 rounded-md9 bg-ink border border-line hover:border-brand transition">
            <div className="font-semibold">{p.name}</div><div className="text-xs text-fg2">{p.description || '—'}</div></button>)}
        </div>
        <Btn className="mt-3" onClick={() => setView('projects')}>Manage projects →</Btn>
      </Card>
      <Card>
        <h2 className="font-semibold mb-3">Recent activity</h2>
        {audit.length === 0 && <p className="text-fg3 text-sm">No activity yet.</p>}
        <ul className="text-xs space-y-2">
          {audit.map((a, i) => <li key={i} className="flex gap-2"><span className="text-fg3 font-mono">{new Date(a.at).toLocaleTimeString()}</span><span className="text-brand300 font-semibold">{a.action}</span><span className="text-fg2 truncate">— {a.detail}</span></li>)}
        </ul>
      </Card>
    </div>
  </div>;
}

/* ---------------- Projects ---------------- */
function Projects({ api, projects, reload, selected, setSelected }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const create = async () => {
    await api('POST', '/projects', { name, description: desc });
    setName(''); setDesc(''); setShowNew(false); reload();
  };
  const del = async (p) => {
    if (!confirm('Delete project ' + p.name + '? This also removes its scope from servers, keys and governance.')) return;
    await api('DELETE', '/projects/' + p.id); if (selected?.id === p.id) setSelected(null); reload();
  };
  return <div className="fade">
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-2xl font-bold">Projects</h1>
      <Btn onClick={() => setShowNew(true)}>+ New project</Btn>
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(p => <Card key={p.id} className={selected?.id === p.id ? 'border-brand glow' : ''}>
        <div className="flex justify-between items-start">
          <div className="font-bold text-lg">{p.name}</div>
          <button onClick={() => del(p)} className="text-fg3 hover:text-bad text-sm">🗑</button>
        </div>
        <p className="text-fg2 text-sm mt-1 mb-3 min-h-[2rem]">{p.description || 'No description.'}</p>
        <Btn kind="ghost" onClick={() => setSelected(p)}>Open →</Btn>
      </Card>)}
    </div>
    {showNew && <Modal title="New project" onClose={() => setShowNew(false)}>
      <Input label="Project name" value={name} onChange={e => setName(e.target.value)} placeholder="atlas-platform" />
      <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="flex gap-2 justify-end"><Btn kind="ghost" onClick={() => setShowNew(false)}>Cancel</Btn><Btn onClick={create}>Create</Btn></div>
    </Modal>}
    {selected && <ProjectDetail api={api} project={selected} projects={projects} onChanged={reload} />}
  </div>;
}

function ProjectDetail({ api, project, projects, onChanged }) {
  const [tab, setTab] = useState('Governance');
  const tabs = ['Governance', 'Deployment', 'Sync', 'Servers', 'SSH keys'];
  return <Card className="mt-6 glow">
    <div className="flex items-center gap-2 mb-2"><Badge>PROJECT</Badge><span className="font-bold text-lg">{project.name}</span></div>
    <Tabs tabs={tabs} active={tab} setActive={setTab} />
    {tab === 'Governance' && <Governance api={api} project={project} />}
    {tab === 'Deployment' && <Deployment api={api} project={project} projects={projects} />}
    {tab === 'Sync' && <SyncPanel api={api} project={project} />}
    {tab === 'Servers' && <ProjectServers api={api} project={project} projects={projects} />}
    {tab === 'SSH keys' && <ProjectKeys api={api} project={project} projects={projects} />}
  </Card>;
}

/* ---------------- Governance (describe / manual) ---------------- */
function Governance({ api, project }) {
  const [toggles, setToggles] = useState([]);
  const [mode, setMode] = useState('describe');
  const [description, setDescription] = useState('');
  const [compliance, setCompliance] = useState('');
  const [quality, setQuality] = useState('');
  const [manual, setManual] = useState({ agents: '', commandcode: '', irys: '' });
  const [gen, setGen] = useState(null);
  const [fileTab, setFileTab] = useState('AGENTS.md');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const t = await api('GET', '/toggles'); setToggles(t);
        const g = await api('GET', '/projects/' + project.id + '/governance');
        setMode(g.mode || 'describe');
        setDescription(g.description || '');
        setCompliance((g.complianceChecklist || []).join('\n'));
        setQuality((g.qualityControls || []).join('\n'));
        setManual(g.manualSections || { agents: '', commandcode: '', irys: '' });
        if (g.generated) setGen(g.generated);
      } catch {}
    })();
  }, [api, project.id]);

  const save = async () => {
    const cfg = {
      mode,
      description,
      toggles: Object.fromEntries(toggles.map(t => [t.key, !!document.getElementById('tg-' + t.key)?.checked])),
      complianceChecklist: compliance.split('\n').map(s => s.trim()).filter(Boolean),
      qualityControls: quality.split('\n').map(s => s.trim()).filter(Boolean),
      manualSections: manual
    };
    const r = await api('POST', '/projects/' + project.id + '/governance', cfg);
    setGen(r.generated); setSaved('Saved · pushed to synced clients (rev ' + (r.revision ?? '?') + ') ' + new Date().toLocaleTimeString());
    setTimeout(() => setSaved(''), 3500);
  };

  const fileMap = { 'AGENTS.md': gen?.agentsMd, 'COMMANDCODE.md': gen?.commandcodeMd, 'IRYS.md': gen?.irysMd };

  return <div className="fade">
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm text-fg2">Authoring mode:</span>
      <button onClick={() => setMode('describe')} className={`px-3 py-1.5 rounded-md9 text-sm font-semibold ${mode === 'describe' ? 'bg-brand text-white' : 'bg-panel border border-line'}`}>Describe</button>
      <button onClick={() => setMode('manual')} className={`px-3 py-1.5 rounded-md9 text-sm font-semibold ${mode === 'manual' ? 'bg-brand text-white' : 'bg-panel border border-line'}`}>Manual</button>
    </div>

    {mode === 'describe' ? (
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <Textarea label="Describe how this project works (plain language)" rows={6} value={description}
            onChange={e => setDescription(e.target.value)} placeholder="Atlas is a Node + Postgres analytics API. Agents may read code and run tests, but must route infra + deploy through IRYS-scoped servers." />
          <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">Compliance checklist (one per line)</span>
            <textarea rows={4} value={compliance} onChange={e => setCompliance(e.target.value)} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm outline-none focus:border-brand font-mono" /></label>
          <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">Quality controls (one per line)</span>
            <textarea rows={4} value={quality} onChange={e => setQuality(e.target.value)} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm outline-none focus:border-brand font-mono" /></label>
        </div>
        <div>
          <p className="text-xs text-fg2 mb-2">Governance toggles → enforced as AI rules</p>
          <div className="space-y-2">
            {toggles.map(t => <label key={t.key} className="flex items-start gap-3 bg-ink border border-line rounded-md9 p-3 cursor-pointer">
              <input id={'tg-' + t.key} type="checkbox" defaultChecked className="mt-1 accent-[#DA2A1C] w-4 h-4" />
              <span><span className="font-semibold text-sm block">{t.label}</span><span className="text-xs text-fg2">{t.rule}</span></span></label>)}
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <Textarea label="AGENTS.md" rows={5} value={manual.agents} onChange={e => setManual({ ...manual, agents: e.target.value })} />
        <Textarea label="COMMANDCODE.md" rows={5} value={manual.commandcode} onChange={e => setManual({ ...manual, commandcode: e.target.value })} />
        <Textarea label="IRYS.md" rows={5} value={manual.irys} onChange={e => setManual({ ...manual, irys: e.target.value })} />
        <p className="text-xs text-fg2">Tip: toggle "Describe" to let IRYS generate these from your rules instead.</p>
      </div>
    )}

    <div className="flex items-center gap-3 mt-4">
      <Btn onClick={save}>Generate & sync AI files</Btn>
      {saved && <span className="text-ok text-sm">{saved}</span>}
    </div>

    {gen && <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-fg1">Generated harness files</p>
        <div className="flex gap-2">
          {Object.keys(fileMap).map(f => <button key={f} onClick={() => setFileTab(f)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${fileTab === f ? 'bg-brand text-white' : 'bg-panel border border-line'}`}>{f}</button>)}
          <Btn kind="ghost" onClick={() => copyText(fileMap[fileTab] || '')}>Copy</Btn>
          <Btn kind="ghost" onClick={() => download(fileTab, fileMap[fileTab] || '')}>Download</Btn>
        </div>
      </div>
      <pre className="bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 max-h-80 overflow-auto">{fileMap[fileTab]}</pre>
    </div>}
  </div>;
}

/* ---------------- Sync (autosync clients) ---------------- */
function SyncPanel({ api, project }) {
  const [state, setState] = useState({ revision: 0, clients: [] });
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try { setState(await api('GET', '/projects/' + project.id + '/sync-clients')); } catch {}
  }, [api, project.id]);
  useEffect(() => { reload(); const t = setInterval(reload, 4000); return () => clearInterval(t); }, [reload]);
  const force = async () => { setBusy(true); await api('POST', '/projects/' + project.id + '/sync/force'); await reload(); setBusy(false); };
  const remove = async (c) => { await api('DELETE', '/sync/register', { clientId: c.clientId, projectId: project.id }); reload(); };
  const ago = (t) => t ? new Date(t).toLocaleTimeString() : '—';
  return <div className="fade">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <p className="text-sm text-fg2">Clients that follow this project's governance. When you edit governance, deployment or scope, IRYS pushes the change and they force-sync automatically.</p>
        <p className="text-xs text-fg3 font-mono mt-1">current revision · {state.revision}</p>
      </div>
      <Btn onClick={force} disabled={busy} title="Broadcast a revision bump so every synced client re-pulls now">{busy ? 'Forcing…' : 'Force sync now'}</Btn>
    </div>
    {state.clients.length === 0 && <p className="text-fg3 text-sm">No clients synced yet. Run <code className="text-brand300 font-mono">irys sync {project.name} --watch</code>, or have a harness call the IRYS MCP on this project.</p>}
    <div className="flex flex-col gap-2">
      {state.clients.map((c) => <div key={c.clientId + (c.dir || '')} className="flex items-center gap-3 bg-ink border border-line rounded-md9 p-3">
        <Badge tone={c.type === 'mcp' ? 'brand' : 'ok'}>{c.type}</Badge>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs text-fg1 truncate">{c.dir || c.label || String(c.clientId).slice(0, 18)}</div>
          <div className="text-[11px] text-fg3 font-mono">client {String(c.clientId).slice(0, 14)} · last synced {ago(c.lastSyncAt)}</div>
        </div>
        {c.behind ? <Badge tone="warn">behind · rev {c.lastSyncedRevision ?? 0}</Badge> : <Badge tone="ok">in sync</Badge>}
        <button onClick={() => remove(c)} className="text-fg3 hover:text-bad text-sm">Remove</button>
      </div>)}
    </div>
    <p className="text-xs text-fg3 mt-4">A CLI watcher reconnects automatically; a harness re-syncs whenever its IRYS MCP server is running.</p>
  </div>;
}

/* ---------------- Deployment ---------------- */
function Deployment({ api, project, projects }) {
  const [cfg, setCfg] = useState({ repo: '', branch: 'main', runtime: 'node', steps: [], pipeline: [], guideline: '', build: { tool: '', location: '', artifacts: '' } });
  const [script, setScript] = useState(''); const [unit, setUnit] = useState('');
  const [artifact, setArtifact] = useState('script');
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    (async () => { try { const d = await api('GET', '/projects/' + project.id + '/deployment'); setCfg(d); } catch {} })();
  }, [api, project.id]);

  const save = async () => { await api('POST', '/projects/' + project.id + '/deployment', cfg); alert('Deployment procedure saved.'); };
  const gen = async () => {
    const [s, u] = await Promise.all([
      api('GET', '/projects/' + project.id + '/deployment/script'),
      api('GET', '/projects/' + project.id + '/deployment/unit')
    ]);
    setScript(s); setUnit(u); setShowScript(true);
  };
  const addStep = () => setCfg({ ...cfg, steps: [...cfg.steps, { title: '', kind: 'command', command: '' }] });
  const setStep = (i, patch) => setCfg({ ...cfg, steps: cfg.steps.map((s, j) => j === i ? { ...s, ...patch } : s) });
  const delStep = (i) => setCfg({ ...cfg, steps: cfg.steps.filter((_, j) => j !== i) });

  return <div className="fade">
    <div className="grid md:grid-cols-3 gap-3 mb-4">
      <Input label="Git repo" value={cfg.repo} onChange={e => setCfg({ ...cfg, repo: e.target.value })} placeholder="git@github.com:org/repo.git" />
      <Input label="Branch" value={cfg.branch} onChange={e => setCfg({ ...cfg, branch: e.target.value })} />
      <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">Runtime</span>
        <select value={cfg.runtime} onChange={e => setCfg({ ...cfg, runtime: e.target.value })} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm outline-none focus:border-brand">
          <option value="node">Node</option><option value="python">Python</option><option value="docker">Docker</option><option value="static">Static</option>
        </select></label>
    </div>

    <div className="grid md:grid-cols-3 gap-3 mb-4">
      <Input label="Build tool" value={cfg.build?.tool || ''} onChange={e => setCfg({ ...cfg, build: { ...cfg.build, tool: e.target.value } })} placeholder="Docker / GitHub Actions" />
      <Input label="Compile location" value={cfg.build?.location || ''} onChange={e => setCfg({ ...cfg, build: { ...cfg.build, location: e.target.value } })} placeholder="CI runner (ubuntu-22.04)" />
      <Input label="Artifacts" value={cfg.build?.artifacts || ''} onChange={e => setCfg({ ...cfg, build: { ...cfg.build, artifacts: e.target.value } })} placeholder="image irys/atlas + /services/..." />
    </div>
    <Textarea label="Deployment guideline — what to use & where to compile (general, not just commands)" rows={4}
      value={cfg.guideline || ''} onChange={e => setCfg({ ...cfg, guideline: e.target.value })}
      placeholder="Build the API on the CI runner with Node 20. Compile the frontend with Vite and bundle into the image; never build on the prod host. Runtime artifact is a single Node service at /services/atlas-platform supervised by systemd." />
    <p className="text-sm font-semibold text-fg1 mb-2 mt-1">Deployment steps (command-by-command, optional)</p>
    <div className="space-y-2 mb-3">
      {cfg.steps.map((s, i) => <div key={i} className="flex gap-2 items-center bg-ink border border-line rounded-md9 p-2">
        <input value={s.title} onChange={e => setStep(i, { title: e.target.value })} placeholder="Step title" className="flex-1 bg-transparent text-sm outline-none px-1" />
        <select value={s.kind} onChange={e => setStep(i, { kind: e.target.value })} className="bg-ink border border-line rounded-md9 text-xs px-2 py-1">
          <option value="command">command</option><option value="systemd">systemd</option><option value="manual">manual</option>
        </select>
        <input value={s.command} onChange={e => setStep(i, { command: e.target.value })} placeholder="$SERVICE_DIR/..." className="flex-1 bg-transparent text-sm font-mono outline-none px-1" />
        <button onClick={() => delStep(i)} className="text-fg3 hover:text-bad">×</button>
      </div>)}
      <Btn kind="ghost" onClick={addStep}>+ Add step</Btn>
    </div>

    <div className="flex gap-2">
      <Btn onClick={save}>Save procedure</Btn>
      <Btn kind="ok" onClick={gen}>Generate deploy script + systemd</Btn>
    </div>

    {showScript && <Modal title={`Deploy artifacts — /services/${project.name}`} onClose={() => setShowScript(false)} wide>
      <Tabs tabs={['deploy.sh', 'systemd unit']} active={artifact === 'unit' ? 'systemd unit' : 'deploy.sh'} setActive={t => setArtifact(t === 'systemd unit' ? 'unit' : 'script')} />
      <pre className="bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 max-h-[55vh] overflow-auto">{artifact === 'unit' ? unit : script}</pre>
      <p className="text-xs text-fg2 mt-2">Service dir: <code className="text-brand300">/services/{project.name}</code> · unit: <code className="text-brand300">irys-{project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</code></p>
      <div className="flex gap-2 mt-3"><Btn kind="ghost" onClick={() => download('deploy-' + project.name + '.sh', script)}>Download script</Btn><Btn kind="ghost" onClick={() => download('irys-' + project.name + '.service', unit)}>Download unit</Btn></div>
    </Modal>}
  </div>;
}

/* ---------------- Project Servers (scoped) ---------------- */
function ProjectServers({ api, project, projects }) {
  const [servers, setServers] = useState([]);
  const [all, setAll] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pick, setPick] = useState('');
  const reload = useCallback(async () => {
    const a = await api('GET', '/servers');
    setAll(a); setServers(a.filter(s => s.projectId === project.id && s.inScope));
  }, [api]);
  useEffect(() => { reload(); }, [reload]);

  const addScope = async () => { if (!pick) return; await api('POST', '/servers/' + pick + '/scope', { inScope: true, projectId: project.id }); setPick(''); setShowAdd(false); reload(); };
  const removeScope = async (s) => { await api('POST', '/servers/' + s.id + '/scope', { inScope: false }); reload(); };
  const sync = async (s) => { const r = await api('POST', '/servers/' + s.id + '/sync'); alert((r.status || 'done') + ': ' + r.note); reload(); };
  const available = all.filter(s => s.projectId !== project.id || !s.inScope);

  return <div className="fade">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-fg2">IRYS-enabled servers in scope for <b>{project.name}</b>. SSH keys are provisioned automatically.</p>
      <Btn onClick={() => setShowAdd(true)}>+ Add server to scope</Btn>
    </div>
    {servers.length === 0 && <p className="text-fg3 text-sm">No servers in scope. Add one to start provisioning keys.</p>}
    <div className="space-y-2">
      {servers.map(s => <div key={s.id} className="bg-ink border border-line rounded-md9 p-3 flex items-center justify-between">
        <div><div className="font-semibold">{s.label} <Badge tone="ok">{s.status || s.lastStatus || 'scoped'}</Badge></div>
          <div className="text-xs text-fg2 font-mono">{s.user}@{s.host}:{s.port} · {s.keyCount} key(s) · {s.inScopeUsers} user(s)</div></div>
        <div className="flex gap-2">
          <Btn kind="ok" onClick={() => sync(s)}>Sync keys</Btn>
          <Btn kind="danger" onClick={() => removeScope(s)}>Remove scope</Btn>
        </div></div>)}
    </div>
    {showAdd && <Modal title="Add server to scope" onClose={() => setShowAdd(false)}>
      <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">Server</span>
        <select value={pick} onChange={e => setPick(e.target.value)} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm">
          <option value="">Select...</option>{available.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host})</option>)}</select></label>
      <div className="flex gap-2 justify-end"><Btn kind="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn><Btn onClick={addScope} disabled={!pick}>Add to scope</Btn></div>
    </Modal>}
  </div>;
}

/* ---------------- Project SSH keys ---------------- */
function ProjectKeys({ api, project, projects }) {
  const [keys, setKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState(''); const [pub, setPub] = useState(''); const [label, setLabel] = useState('');
  const reload = useCallback(async () => {
    const [k, u] = await Promise.all([api('GET', '/ssh-keys'), api('GET', '/users')]);
    setKeys(k.filter(x => x.projectId === project.id)); setUsers(u);
  }, [api, project.id]);
  useEffect(() => { reload(); }, [reload]);
  const add = async () => { await api('POST', '/ssh-keys', { userId, projectId: project.id, publicKey: pub, label }); setPub(''); setLabel(''); setShowAdd(false); reload(); };
  const del = async (k) => { await api('DELETE', '/ssh-keys/' + k.id); reload(); };

  return <div className="fade">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-fg2">SSH public keys provisioned into <b>{project.name}</b> scope.</p>
      <Btn onClick={() => setShowAdd(true)}>+ Add key</Btn>
    </div>
    {keys.length === 0 && <p className="text-fg3 text-sm">No keys yet.</p>}
    <div className="space-y-2">
      {keys.map(k => { const u = users.find(x => x.id === k.userId); return <div key={k.id} className="bg-ink border border-line rounded-md9 p-3">
        <div className="flex justify-between items-center mb-1">
          <div className="font-semibold text-sm">{u?.name || k.userId} {k.label && <Badge tone="slate">{k.label}</Badge>}</div>
          <button onClick={() => del(k)} className="text-fg3 hover:text-bad text-sm">remove</button>
        </div>
        <code className="text-xs text-fg2 break-all block">{k.publicKey}</code></div>; })}
    </div>
    {showAdd && <Modal title="Add SSH key" onClose={() => setShowAdd(false)}>
      <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">User</span>
        <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm">
          <option value="">Select...</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></label>
      <Input label="Key label" value={label} onChange={e => setLabel(e.target.value)} placeholder="laptop" />
      <Textarea label="Public key" rows={3} value={pub} onChange={e => setPub(e.target.value)} placeholder="ssh-ed25519 AAAA..." />
      <div className="flex gap-2 justify-end"><Btn kind="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn><Btn onClick={add} disabled={!userId || !pub}>Add key</Btn></div>
    </Modal>}
  </div>;
}

/* ---------------- Members ---------------- */
function Members({ api, projects }) {
  const [users, setUsers] = useState([]); const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'member', scopes: [] });
  const reload = useCallback(async () => { setUsers(await api('GET', '/users')); }, [api]);
  useEffect(() => { reload(); }, [reload]);
  const create = async () => { await api('POST', '/users', form); setForm({ name: '', email: '', role: 'member', scopes: [] }); setShowNew(false); reload(); };
  const del = async (u) => { if (!confirm('Remove ' + u.name + '?')) return; await api('DELETE', '/users/' + u.id); reload(); };
  const toggleScope = async (u, pid) => {
    const scopes = (u.scopes || []).includes(pid) ? u.scopes.filter(x => x !== pid) : [...u.scopes, pid];
    await api('PUT', '/users/' + u.id, { scopes }); reload();
  };

  return <div className="fade">
    <div className="flex items-center justify-between mb-5"><h1 className="text-2xl font-bold">Members & scopes</h1><Btn onClick={() => setShowNew(true)}>+ Add member</Btn></div>
    <div className="space-y-3">
      {users.map(u => <Card key={u.id}>
        <div className="flex items-center justify-between mb-2">
          <div><div className="font-semibold">{u.name} <Badge tone="slate">{u.role}</Badge></div><div className="text-xs text-fg2">{u.email} · {u.keyCount} key(s)</div></div>
          <button onClick={() => del(u)} className="text-fg3 hover:text-bad">🗑</button>
        </div>
        <p className="text-xs text-fg2 mb-1">Project scopes:</p>
        <div className="flex flex-wrap gap-2">
          {projects.map(p => { const on = (u.scopes || []).includes(p.id); return <button key={p.id} onClick={() => toggleScope(u, p.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? 'bg-brand/20 text-brand300 border-brand/40' : 'bg-panel text-fg2 border-line'}`}>{p.name}</button>; })}
          {projects.length === 0 && <span className="text-xs text-fg3">Create a project first.</span>}
        </div></Card>)}
    </div>
    {showNew && <Modal title="Add member" onClose={() => setShowNew(false)}>
      <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">Role</span>
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm">
          <option value="member">member</option><option value="developer">developer</option><option value="lead">lead</option><option value="admin">admin</option></select></label>
      <p className="text-xs text-fg2 mb-1">Initial scopes:</p>
      <div className="flex flex-wrap gap-2 mb-3">{projects.map(p => { const on = form.scopes.includes(p.id); return <button key={p.id} onClick={() => setForm({ ...form, scopes: on ? form.scopes.filter(x => x !== p.id) : [...form.scopes, p.id] })}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? 'bg-brand/20 text-brand300 border-brand/40' : 'bg-panel text-fg2 border-line'}`}>{p.name}</button>; })}</div>
      <div className="flex gap-2 justify-end"><Btn kind="ghost" onClick={() => setShowNew(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name || !form.email}>Add</Btn></div>
    </Modal>}
  </div>;
}

/* ---------------- Servers (global) ---------------- */
function Servers({ api, projects }) {
  const [servers, setServers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ label: '', host: '', port: 22, user: 'irys', projectId: '', authKeysPath: '~/.ssh/authorized_keys' });
  const [authView, setAuthView] = useState(null);
  const [boot, setBoot] = useState(null);
  const reload = useCallback(async () => { setServers(await api('GET', '/servers')); }, [api]);
  useEffect(() => { reload(); }, [reload]);
  const create = async () => { await api('POST', '/servers', form); setForm({ label: '', host: '', port: 22, user: 'irys', projectId: '', authKeysPath: '~/.ssh/authorized_keys' }); setShowNew(false); reload(); };
  const del = async (s) => { if (!confirm('Delete server ' + s.label + '?')) return; await api('DELETE', '/servers/' + s.id); reload(); };
  const setScope = async (s, pid) => { await api('POST', '/servers/' + s.id + '/scope', { inScope: !!pid, projectId: pid || null }); reload(); };
  const sync = async (s) => { const r = await api('POST', '/servers/' + s.id + '/sync'); setAuthView({ s, r }); };
  const openBoot = async (s) => { const d = await api('GET', '/servers/' + s.id + '/bootstrap'); setBoot({ s, d }); };

  return <div className="fade">
    <div className="flex items-center justify-between mb-5"><h1 className="text-2xl font-bold">IRYS-enabled servers</h1><Btn onClick={() => setShowNew(true)}>+ Register server</Btn></div>
    <div className="space-y-3">
      {servers.map(s => <Card key={s.id}>
        <div className="flex items-center justify-between">
          <div><div className="font-semibold">{s.label} {s.inScope ? <Badge tone="ok">in scope</Badge> : <Badge tone="warn">unscoped</Badge>} {s.linked && <Badge tone="brand">linked</Badge>}</div>
            <div className="text-xs text-fg2 font-mono">{s.user}@{s.host}:{s.port}</div></div>
          <div className="flex gap-2">
            <Btn kind="ok" onClick={() => sync(s)} disabled={!s.inScope}>Sync keys</Btn>
            <Btn kind="ghost" onClick={() => openBoot(s)}>Bootstrap</Btn>
            <button onClick={() => del(s)} className="text-fg3 hover:text-bad px-2">🗑</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-fg2">Scope:</span>
          <select value={s.projectId || ''} onChange={e => setScope(s, e.target.value)} className="bg-ink border border-line rounded-md9 text-sm px-2 py-1">
            <option value="">— none —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <span className="text-xs text-fg3 ml-2">{s.keyCount} key(s) · {s.inScopeUsers} user(s)</span>
          {s.linked && <span className="text-xs text-ok ml-2">● linked {s.hostInfo?.ip || ''}</span>}
        </div></Card>)}
    </div>
    {showNew && <Modal title="Register IRYS-enabled server" onClose={() => setShowNew(false)}>
      <Input label="Label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="prod-edge-01" />
      <Input label="Host" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="app-prod.irys.dev" />
      <div className="grid grid-cols-2 gap-3"><Input label="Port" type="number" value={form.port} onChange={e => setForm({ ...form, port: +e.target.value })} /><Input label="SSH user" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} /></div>
      <label className="block mb-3"><span className="text-xs text-fg2 block mb-1">Initial project scope</span>
        <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm">
          <option value="">— none —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <Input label="authorized_keys path" value={form.authKeysPath} onChange={e => setForm({ ...form, authKeysPath: e.target.value })} />
      <div className="flex gap-2 justify-end"><Btn kind="ghost" onClick={() => setShowNew(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.label || !form.host}>Register</Btn></div>
    </Modal>}
    {authView && <Modal title={`authorized_keys — ${authView.s.label}`} onClose={() => setAuthView(null)} wide>
      <Badge tone={authView.r.status === 'deployed' ? 'ok' : authView.r.status === 'failed' ? 'bad' : 'warn'}>{authView.r.status}</Badge>
      <p className="text-xs text-fg2 mt-2 mb-2">{authView.r.note}</p>
      <pre className="bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 max-h-[55vh] overflow-auto">{authView.r.authorizedKeys}</pre>
      <Btn kind="ghost" className="mt-3" onClick={() => copyText(authView.r.authorizedKeys)}>Copy</Btn>
    </Modal>}
    {boot && <Modal title={`Link ${boot.s.label} to IRYS`} onClose={() => setBoot(null)} wide>
      <p className="text-sm text-fg1 mb-2">Run this on the host to create the <code className="text-brand300">irys</code> user, link it via the one-time token, and install the key-pull timer:</p>
      <pre className="bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 overflow-auto">{boot.d.command}</pre>
      <div className="flex gap-2 mt-3">
        <Btn kind="ghost" onClick={() => copyText(boot.d.command)}>Copy command</Btn>
        <Btn kind="ghost" onClick={() => { download('irys-agent.sh', 'see http://localhost:4000/irys-agent.sh'); }}>Download agent</Btn>
      </div>
      <div className="mt-3 text-xs text-fg2">
        Status: <Badge tone={boot.d.linked ? 'ok' : 'warn'}>{boot.d.linked ? 'linked' : 'not linked'}</Badge>
        {boot.d.hostInfo && <> · {boot.d.hostInfo.hostname} ({boot.d.hostInfo.ip})</>}
      </div>
      <p className="text-xs text-fg3 mt-3">Agent script: <code className="text-brand300">http://localhost:4000/irys-agent.sh</code> — it pulls authorized_keys every 60s, so IRYS never needs outbound SSH.</p>
    </Modal>}
  </div>;
}

/* ---------------- Audit ---------------- */
function Audit({ api }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { (async () => { try { setRows(await api('GET', '/audit')); } catch {} })(); }, [api]);
  return <div className="fade">
    <h1 className="text-2xl font-bold mb-5">Audit log</h1>
    <Card><ul className="text-sm divide-y divide-line">
      {rows.length === 0 && <li className="text-fg3 py-3">No events.</li>}
      {rows.map((r, i) => <li key={i} className="py-2 flex gap-3"><span className="text-fg3 font-mono text-xs w-40 shrink-0">{new Date(r.at).toLocaleString()}</span><span className="text-brand300 font-semibold w-36 shrink-0">{r.action}</span><span className="text-fg1 truncate">{r.detail}</span></li>)}
    </ul></Card>
  </div>;
}

/* ---------------- App ---------------- */
function App() {
  const [token, setToken] = useState(localStorage.getItem('irys_token') || '');
  const [provider, setProvider] = useState(null);
  useEffect(() => {
    if (token && !provider) {
      makeApi(token)('GET', '/me').then(p => setProvider(p.provider)).catch(() => { setToken(''); localStorage.removeItem('irys_token'); });
    }
  }, [token]);
  const onLogin = (t, p) => { localStorage.setItem('irys_token', t); setToken(t); setProvider(p); };
  const onLogout = () => { localStorage.removeItem('irys_token'); setToken(''); setProvider(null); };
  if (!token || !provider) return <Login onLogin={onLogin} />;
  return <Shell token={token} provider={provider} onLogout={onLogout} />;
}

ReactDOM.render(<App />, document.getElementById('root'));
