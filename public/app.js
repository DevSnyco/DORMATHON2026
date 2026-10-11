var IRYSApp = (() => {
  // public/app.jsx
  var { useState, useEffect, useCallback, useMemo } = React;
  function makeApi(token) {
    return async (method, path, body) => {
      const res = await fetch("/api" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...token ? { Authorization: "Bearer " + token } : {}
        },
        body: body ? JSON.stringify(body) : void 0
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      return data;
    };
  }
  function Card({ children, className = "" }) {
    return /* @__PURE__ */ React.createElement("div", { className: `u-card p-5 ${className}` }, children);
  }
  function Btn({ children, onClick, kind = "primary", className = "", disabled, title }) {
    const styles = {
      primary: "btn-primary",
      ghost: "btn-ghost",
      danger: "h-[38px] px-4 rounded-full text-sm font-semibold border border-[#B8210F]/40 text-[#F17A6A] bg-[#B8210F]/12 hover:bg-[#B8210F]/22 transition",
      ok: "h-[38px] px-4 rounded-full text-sm font-semibold border border-[#46C95F]/40 text-[#46C95F] bg-[#46C95F]/12 hover:bg-[#46C95F]/22 transition"
    };
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        title,
        disabled,
        onClick,
        className: `${styles[kind]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`
      },
      children
    );
  }
  function Input({ label, ...p }) {
    return /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] uppercase tracking-[.04em] text-fg2 block mb-1.5 font-medium" }, label), /* @__PURE__ */ React.createElement("input", { ...p, className: "w-full bg-ink border border-line3 rounded-md9 px-3 py-2 text-sm font-medium shadow-inset outline-none focus:border-brand transition" }));
  }
  function Textarea({ label, ...p }) {
    return /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] uppercase tracking-[.04em] text-fg2 block mb-1.5 font-medium" }, label), /* @__PURE__ */ React.createElement("textarea", { ...p, className: "w-full bg-ink border border-line3 rounded-md9 px-3 py-2 text-sm font-mono shadow-inset outline-none focus:border-brand transition" }));
  }
  function Badge({ children, tone = "brand" }) {
    const t = {
      brand: "bg-[#DA2A1C]/12 text-brand300 shadow-[inset_0_0_0_1px_rgba(218,42,28,.34)]",
      ok: "bg-[#46C95F]/12 text-ok shadow-[inset_0_0_0_1px_rgba(70,201,95,.34)]",
      warn: "bg-[#E9B23C]/12 text-warn shadow-[inset_0_0_0_1px_rgba(233,178,60,.34)]",
      bad: "bg-[#B8210F]/16 text-[#F17A6A] shadow-[inset_0_0_0_1px_rgba(184,33,15,.4)]",
      slate: "bg-white/[.04] text-fg1 shadow-[inset_0_0_0_1px_#2C2C30]"
    };
    return /* @__PURE__ */ React.createElement("span", { className: `u-chip ${t[tone]}` }, children);
  }
  function Modal({ title, onClose, children, wide }) {
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: `u-card w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[88vh] overflow-auto glow fade`, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 border-b border-line" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-lg" }, title), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "text-fg2 hover:text-fg0 text-xl leading-none" }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, children)));
  }
  function Tabs({ tabs, active, setActive }) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 border-b border-line mb-4 flex-wrap" }, tabs.map((t) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t,
        onClick: () => setActive(t),
        className: `px-3 py-2 text-sm font-semibold rounded-t-md9 -mb-px transition ${active === t ? "text-brand300 border-b-2 border-brand" : "text-fg2 hover:text-fg0"}`
      },
      t
    )));
  }
  function Eyebrow({ children }) {
    return /* @__PURE__ */ React.createElement("span", { className: "u-eyebrow mb-2" }, children);
  }
  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
    }
  }
  function download(name, text) {
    const b = new Blob([text], { type: "text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    URL.revokeObjectURL(u);
  }
  function Login({ onLogin }) {
    const [email, setEmail] = useState("admin@irys.dev");
    const [password, setPassword] = useState("demo1234");
    const [err, setErr] = useState("");
    const submit = async (e) => {
      e.preventDefault();
      setErr("");
      try {
        const api = makeApi(null);
        const r = await api("POST", "/auth/login", { email, password });
        onLogin(r.token, r.provider);
      } catch (e2) {
        setErr(e2.message);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center p-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "inline-flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-fg0" }, /* @__PURE__ */ React.createElement(Logo, null), " IRYS"), /* @__PURE__ */ React.createElement("p", { className: "u-eyebrow mt-3 justify-center" }, "AI governance \xB7 server access")), /* @__PURE__ */ React.createElement(Card, { className: "glow" }, /* @__PURE__ */ React.createElement("form", { onSubmit: submit }, /* @__PURE__ */ React.createElement(Input, { label: "Provider email", value: email, onChange: (e) => setEmail(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value) }), err && /* @__PURE__ */ React.createElement("p", { className: "text-brand300 text-sm mb-3" }, err), /* @__PURE__ */ React.createElement(Btn, { className: "w-full", kind: "primary" }, "Sign in")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg3 mt-4 text-center font-mono" }, "demo tenant \xB7 admin@irys.dev / demo1234"))));
  }
  function Logo() {
    return /* @__PURE__ */ React.createElement("span", { className: "inline-grid place-items-center w-9 h-9 rounded-md9 bg-brand shadow-accent", style: { boxShadow: "inset 0 1px 0 rgba(255,255,255,.25), 0 0 18px -4px rgba(218,42,28,.45)" } }, /* @__PURE__ */ React.createElement("span", { className: "w-4 h-4 bg-white", style: { WebkitMask: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 604 669'%3E%3Cpath d='M139.09 460.17 226.13 340.44 85.56 294.26 114.16 205.59 255.14 251.77 254.32 103.43 348.72 103.43 347.90 251.77 489.29 206.00 518.30 294.67 377.73 340.44 463.54 460.17 388.35 514.93 301.72 394.79 214.28 514.52Z'/%3E%3C/svg%3E") center/contain no-repeat`, mask: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 604 669'%3E%3Cpath d='M139.09 460.17 226.13 340.44 85.56 294.26 114.16 205.59 255.14 251.77 254.32 103.43 348.72 103.43 347.90 251.77 489.29 206.00 518.30 294.67 377.73 340.44 463.54 460.17 388.35 514.93 301.72 394.79 214.28 514.52Z'/%3E%3C/svg%3E") center/contain no-repeat` } }));
  }
  function Shell({ token, provider, onLogout }) {
    const api = useMemo(() => makeApi(token), [token]);
    const [view, setView] = useState("dashboard");
    const [selected, setSelected] = useState(null);
    const [projects, setProjects] = useState([]);
    const reloadProjects = useCallback(async () => {
      setProjects(await api("GET", "/projects"));
    }, [api]);
    useEffect(() => {
      reloadProjects();
    }, [reloadProjects]);
    const nav = [
      ["dashboard", "Dashboard"],
      ["projects", "Projects"],
      ["members", "Members"],
      ["servers", "Servers"],
      ["audit", "Audit"]
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "flex min-h-screen" }, /* @__PURE__ */ React.createElement("aside", { className: "w-60 shrink-0 border-r border-line2 glass p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 font-extrabold text-xl mb-6 px-1 text-fg0" }, /* @__PURE__ */ React.createElement(Logo, null), "IRYS"), /* @__PURE__ */ React.createElement("nav", { className: "flex flex-col gap-1" }, nav.map(([k, label]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: k,
        onClick: () => setView(k),
        className: `text-left px-3 py-2 rounded-md9 text-sm font-semibold transition ${view === k ? "nav-active" : "text-fg2 hover:text-fg0 hover:bg-hover"}`
      },
      label
    ))), /* @__PURE__ */ React.createElement("div", { className: "mt-auto pt-4 border-t border-line2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-1 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "online-dot" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2 truncate" }, provider.orgName)), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", className: "w-full", onClick: onLogout }, "Sign out"))), /* @__PURE__ */ React.createElement("main", { className: "flex-1 p-6 max-w-6xl" }, view === "dashboard" && /* @__PURE__ */ React.createElement(Dashboard, { api, projects, setView, setSelected }), view === "projects" && /* @__PURE__ */ React.createElement(Projects, { api, projects, reload: reloadProjects, selected, setSelected }), view === "members" && /* @__PURE__ */ React.createElement(Members, { api, projects }), view === "servers" && /* @__PURE__ */ React.createElement(Servers, { api, projects }), view === "audit" && /* @__PURE__ */ React.createElement(Audit, { api })));
  }
  function Dashboard({ api, projects, setView, setSelected }) {
    const [stats, setStats] = useState({ users: 0, servers: 0, keys: 0 });
    const [audit, setAudit] = useState([]);
    useEffect(() => {
      (async () => {
        try {
          const [users, servers, keys, a] = await Promise.all([
            api("GET", "/users"),
            api("GET", "/servers"),
            api("GET", "/ssh-keys"),
            api("GET", "/audit")
          ]);
          setStats({ users: users.length, servers: servers.length, keys: keys.length });
          setAudit(a.slice(0, 6));
        } catch {
        }
      })();
    }, [api]);
    const tiles = [
      ["Projects", projects.length, "brand"],
      ["Members", stats.users, "ok"],
      ["Servers in scope", stats.servers, "warn"],
      ["SSH keys managed", stats.keys, "brand2"]
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement(Eyebrow, null, "Control plane"), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold mb-1" }, "Welcome back \u{1F44B}"), /* @__PURE__ */ React.createElement("p", { className: "text-fg2 mb-6 text-sm" }, "Govern AI behaviour and server access for your organisation \u2014 project by project."), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" }, tiles.map(([l, v, t]) => /* @__PURE__ */ React.createElement(Card, { key: l }, /* @__PURE__ */ React.createElement("div", { className: "text-3xl font-extrabold font-hero text-fg0" }, v), /* @__PURE__ */ React.createElement("div", { className: "text-fg2 text-[11px] uppercase tracking-[.04em] mt-1 font-medium" }, l)))), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("h2", { className: "font-semibold mb-3" }, "Your projects"), projects.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-fg3 text-sm" }, "No projects yet. Create one to start governing AI + servers."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, projects.map((p) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.id,
        onClick: () => {
          setSelected(p);
          setView("projects");
        },
        className: "text-left px-3 py-2 rounded-md9 bg-ink border border-line hover:border-brand transition"
      },
      /* @__PURE__ */ React.createElement("div", { className: "font-semibold" }, p.name),
      /* @__PURE__ */ React.createElement("div", { className: "text-xs text-fg2" }, p.description || "\u2014")
    ))), /* @__PURE__ */ React.createElement(Btn, { className: "mt-3", onClick: () => setView("projects") }, "Manage projects \u2192")), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("h2", { className: "font-semibold mb-3" }, "Recent activity"), audit.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-fg3 text-sm" }, "No activity yet."), /* @__PURE__ */ React.createElement("ul", { className: "text-xs space-y-2" }, audit.map((a, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-fg3 font-mono" }, new Date(a.at).toLocaleTimeString()), /* @__PURE__ */ React.createElement("span", { className: "text-brand300 font-semibold" }, a.action), /* @__PURE__ */ React.createElement("span", { className: "text-fg2 truncate" }, "\u2014 ", a.detail)))))));
  }
  function Projects({ api, projects, reload, selected, setSelected }) {
    const [showNew, setShowNew] = useState(false);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const create = async () => {
      await api("POST", "/projects", { name, description: desc });
      setName("");
      setDesc("");
      setShowNew(false);
      reload();
    };
    const del = async (p) => {
      if (!confirm("Delete project " + p.name + "? This also removes its scope from servers, keys and governance.")) return;
      await api("DELETE", "/projects/" + p.id);
      if (selected?.id === p.id) setSelected(null);
      reload();
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-5" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold" }, "Projects"), /* @__PURE__ */ React.createElement(Btn, { onClick: () => setShowNew(true) }, "+ New project")), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4" }, projects.map((p) => /* @__PURE__ */ React.createElement(Card, { key: p.id, className: selected?.id === p.id ? "border-brand glow" : "" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-lg" }, p.name), /* @__PURE__ */ React.createElement("button", { onClick: () => del(p), className: "text-fg3 hover:text-bad text-sm" }, "\u{1F5D1}")), /* @__PURE__ */ React.createElement("p", { className: "text-fg2 text-sm mt-1 mb-3 min-h-[2rem]" }, p.description || "No description."), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => setSelected(p) }, "Open \u2192")))), showNew && /* @__PURE__ */ React.createElement(Modal, { title: "New project", onClose: () => setShowNew(false) }, /* @__PURE__ */ React.createElement(Input, { label: "Project name", value: name, onChange: (e) => setName(e.target.value), placeholder: "atlas-platform" }), /* @__PURE__ */ React.createElement(Textarea, { label: "Description", value: desc, onChange: (e) => setDesc(e.target.value) }), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => setShowNew(false) }, "Cancel"), /* @__PURE__ */ React.createElement(Btn, { onClick: create }, "Create"))), selected && /* @__PURE__ */ React.createElement(ProjectDetail, { api, project: selected, projects, onChanged: reload }));
  }
  function ProjectDetail({ api, project, projects, onChanged }) {
    const [tab, setTab] = useState("Governance");
    const tabs = ["Governance", "Deployment", "Sync", "Servers", "SSH keys"];
    return /* @__PURE__ */ React.createElement(Card, { className: "mt-6 glow" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Badge, null, "PROJECT"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-lg" }, project.name)), /* @__PURE__ */ React.createElement(Tabs, { tabs, active: tab, setActive: setTab }), tab === "Governance" && /* @__PURE__ */ React.createElement(Governance, { api, project }), tab === "Deployment" && /* @__PURE__ */ React.createElement(Deployment, { api, project, projects }), tab === "Sync" && /* @__PURE__ */ React.createElement(SyncPanel, { api, project }), tab === "Servers" && /* @__PURE__ */ React.createElement(ProjectServers, { api, project, projects }), tab === "SSH keys" && /* @__PURE__ */ React.createElement(ProjectKeys, { api, project, projects }));
  }
  function Governance({ api, project }) {
    const [toggles, setToggles] = useState([]);
    const [mode, setMode] = useState("describe");
    const [description, setDescription] = useState("");
    const [compliance, setCompliance] = useState("");
    const [quality, setQuality] = useState("");
    const [manual, setManual] = useState({ agents: "", commandcode: "", irys: "" });
    const [gen, setGen] = useState(null);
    const [fileTab, setFileTab] = useState("AGENTS.md");
    const [saved, setSaved] = useState("");
    useEffect(() => {
      (async () => {
        try {
          const t = await api("GET", "/toggles");
          setToggles(t);
          const g = await api("GET", "/projects/" + project.id + "/governance");
          setMode(g.mode || "describe");
          setDescription(g.description || "");
          setCompliance((g.complianceChecklist || []).join("\n"));
          setQuality((g.qualityControls || []).join("\n"));
          setManual(g.manualSections || { agents: "", commandcode: "", irys: "" });
          if (g.generated) setGen(g.generated);
        } catch {
        }
      })();
    }, [api, project.id]);
    const save = async () => {
      const cfg = {
        mode,
        description,
        toggles: Object.fromEntries(toggles.map((t) => [t.key, !!document.getElementById("tg-" + t.key)?.checked])),
        complianceChecklist: compliance.split("\n").map((s) => s.trim()).filter(Boolean),
        qualityControls: quality.split("\n").map((s) => s.trim()).filter(Boolean),
        manualSections: manual
      };
      const r = await api("POST", "/projects/" + project.id + "/governance", cfg);
      setGen(r.generated);
      setSaved("Saved \xB7 pushed to synced clients (rev " + (r.revision ?? "?") + ") " + (/* @__PURE__ */ new Date()).toLocaleTimeString());
      setTimeout(() => setSaved(""), 3500);
    };
    const fileMap = { "AGENTS.md": gen?.agentsMd, "COMMANDCODE.md": gen?.commandcodeMd, "IRYS.md": gen?.irysMd };
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-fg2" }, "Authoring mode:"), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("describe"), className: `px-3 py-1.5 rounded-md9 text-sm font-semibold ${mode === "describe" ? "bg-brand text-white" : "bg-panel border border-line"}` }, "Describe"), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("manual"), className: `px-3 py-1.5 rounded-md9 text-sm font-semibold ${mode === "manual" ? "bg-brand text-white" : "bg-panel border border-line"}` }, "Manual")), mode === "describe" ? /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-2 gap-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      Textarea,
      {
        label: "Describe how this project works (plain language)",
        rows: 6,
        value: description,
        onChange: (e) => setDescription(e.target.value),
        placeholder: "Atlas is a Node + Postgres analytics API. Agents may read code and run tests, but must route infra + deploy through IRYS-scoped servers."
      }
    ), /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "Compliance checklist (one per line)"), /* @__PURE__ */ React.createElement("textarea", { rows: 4, value: compliance, onChange: (e) => setCompliance(e.target.value), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm outline-none focus:border-brand font-mono" })), /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "Quality controls (one per line)"), /* @__PURE__ */ React.createElement("textarea", { rows: 4, value: quality, onChange: (e) => setQuality(e.target.value), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm outline-none focus:border-brand font-mono" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2 mb-2" }, "Governance toggles \u2192 enforced as AI rules"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, toggles.map((t) => /* @__PURE__ */ React.createElement("label", { key: t.key, className: "flex items-start gap-3 bg-ink border border-line rounded-md9 p-3 cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { id: "tg-" + t.key, type: "checkbox", defaultChecked: true, className: "mt-1 accent-[#DA2A1C] w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-sm block" }, t.label), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2" }, t.rule))))))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(Textarea, { label: "AGENTS.md", rows: 5, value: manual.agents, onChange: (e) => setManual({ ...manual, agents: e.target.value }) }), /* @__PURE__ */ React.createElement(Textarea, { label: "COMMANDCODE.md", rows: 5, value: manual.commandcode, onChange: (e) => setManual({ ...manual, commandcode: e.target.value }) }), /* @__PURE__ */ React.createElement(Textarea, { label: "IRYS.md", rows: 5, value: manual.irys, onChange: (e) => setManual({ ...manual, irys: e.target.value }) }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2" }, 'Tip: toggle "Describe" to let IRYS generate these from your rules instead.')), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mt-4" }, /* @__PURE__ */ React.createElement(Btn, { onClick: save }, "Generate & sync AI files"), saved && /* @__PURE__ */ React.createElement("span", { className: "text-ok text-sm" }, saved)), gen && /* @__PURE__ */ React.createElement("div", { className: "mt-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-fg1" }, "Generated harness files"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, Object.keys(fileMap).map((f) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: f,
        onClick: () => setFileTab(f),
        className: `px-2.5 py-1 rounded-lg text-xs font-semibold ${fileTab === f ? "bg-brand text-white" : "bg-panel border border-line"}`
      },
      f
    )), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => copyText(fileMap[fileTab] || "") }, "Copy"), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => download(fileTab, fileMap[fileTab] || "") }, "Download"))), /* @__PURE__ */ React.createElement("pre", { className: "bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 max-h-80 overflow-auto" }, fileMap[fileTab])));
  }
  function SyncPanel({ api, project }) {
    const [state, setState] = useState({ revision: 0, clients: [] });
    const [busy, setBusy] = useState(false);
    const reload = useCallback(async () => {
      try {
        setState(await api("GET", "/projects/" + project.id + "/sync-clients"));
      } catch {
      }
    }, [api, project.id]);
    useEffect(() => {
      reload();
      const t = setInterval(reload, 4e3);
      return () => clearInterval(t);
    }, [reload]);
    const force = async () => {
      setBusy(true);
      await api("POST", "/projects/" + project.id + "/sync/force");
      await reload();
      setBusy(false);
    };
    const remove = async (c) => {
      await api("DELETE", "/sync/register", { clientId: c.clientId, projectId: project.id });
      reload();
    };
    const ago = (t) => t ? new Date(t).toLocaleTimeString() : "\u2014";
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3 mb-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-fg2" }, "Clients that follow this project's governance. When you edit governance, deployment or scope, IRYS pushes the change and they force-sync automatically."), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg3 font-mono mt-1" }, "current revision \xB7 ", state.revision)), /* @__PURE__ */ React.createElement(Btn, { onClick: force, disabled: busy, title: "Broadcast a revision bump so every synced client re-pulls now" }, busy ? "Forcing\u2026" : "Force sync now")), state.clients.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-fg3 text-sm" }, "No clients synced yet. Run ", /* @__PURE__ */ React.createElement("code", { className: "text-brand300 font-mono" }, "irys sync ", project.name, " --watch"), ", or have a harness call the IRYS MCP on this project."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, state.clients.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.clientId + (c.dir || ""), className: "flex items-center gap-3 bg-ink border border-line rounded-md9 p-3" }, /* @__PURE__ */ React.createElement(Badge, { tone: c.type === "mcp" ? "brand" : "ok" }, c.type), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-mono text-xs text-fg1 truncate" }, c.dir || c.label || String(c.clientId).slice(0, 18)), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-fg3 font-mono" }, "client ", String(c.clientId).slice(0, 14), " \xB7 last synced ", ago(c.lastSyncAt))), c.behind ? /* @__PURE__ */ React.createElement(Badge, { tone: "warn" }, "behind \xB7 rev ", c.lastSyncedRevision ?? 0) : /* @__PURE__ */ React.createElement(Badge, { tone: "ok" }, "in sync"), /* @__PURE__ */ React.createElement("button", { onClick: () => remove(c), className: "text-fg3 hover:text-bad text-sm" }, "Remove")))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg3 mt-4" }, "A CLI watcher reconnects automatically; a harness re-syncs whenever its IRYS MCP server is running."));
  }
  function Deployment({ api, project, projects }) {
    const [cfg, setCfg] = useState({ repo: "", branch: "main", runtime: "node", steps: [], pipeline: [], guideline: "", build: { tool: "", location: "", artifacts: "" } });
    const [script, setScript] = useState("");
    const [unit, setUnit] = useState("");
    const [artifact, setArtifact] = useState("script");
    const [showScript, setShowScript] = useState(false);
    useEffect(() => {
      (async () => {
        try {
          const d = await api("GET", "/projects/" + project.id + "/deployment");
          setCfg(d);
        } catch {
        }
      })();
    }, [api, project.id]);
    const save = async () => {
      await api("POST", "/projects/" + project.id + "/deployment", cfg);
      alert("Deployment procedure saved.");
    };
    const gen = async () => {
      const [s, u] = await Promise.all([
        api("GET", "/projects/" + project.id + "/deployment/script"),
        api("GET", "/projects/" + project.id + "/deployment/unit")
      ]);
      setScript(s);
      setUnit(u);
      setShowScript(true);
    };
    const addStep = () => setCfg({ ...cfg, steps: [...cfg.steps, { title: "", kind: "command", command: "" }] });
    const setStep = (i, patch) => setCfg({ ...cfg, steps: cfg.steps.map((s, j) => j === i ? { ...s, ...patch } : s) });
    const delStep = (i) => setCfg({ ...cfg, steps: cfg.steps.filter((_, j) => j !== i) });
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-3 gap-3 mb-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Git repo", value: cfg.repo, onChange: (e) => setCfg({ ...cfg, repo: e.target.value }), placeholder: "git@github.com:org/repo.git" }), /* @__PURE__ */ React.createElement(Input, { label: "Branch", value: cfg.branch, onChange: (e) => setCfg({ ...cfg, branch: e.target.value }) }), /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "Runtime"), /* @__PURE__ */ React.createElement("select", { value: cfg.runtime, onChange: (e) => setCfg({ ...cfg, runtime: e.target.value }), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm outline-none focus:border-brand" }, /* @__PURE__ */ React.createElement("option", { value: "node" }, "Node"), /* @__PURE__ */ React.createElement("option", { value: "python" }, "Python"), /* @__PURE__ */ React.createElement("option", { value: "docker" }, "Docker"), /* @__PURE__ */ React.createElement("option", { value: "static" }, "Static")))), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-3 gap-3 mb-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Build tool", value: cfg.build?.tool || "", onChange: (e) => setCfg({ ...cfg, build: { ...cfg.build, tool: e.target.value } }), placeholder: "Docker / GitHub Actions" }), /* @__PURE__ */ React.createElement(Input, { label: "Compile location", value: cfg.build?.location || "", onChange: (e) => setCfg({ ...cfg, build: { ...cfg.build, location: e.target.value } }), placeholder: "CI runner (ubuntu-22.04)" }), /* @__PURE__ */ React.createElement(Input, { label: "Artifacts", value: cfg.build?.artifacts || "", onChange: (e) => setCfg({ ...cfg, build: { ...cfg.build, artifacts: e.target.value } }), placeholder: "image irys/atlas + /services/..." })), /* @__PURE__ */ React.createElement(
      Textarea,
      {
        label: "Deployment guideline \u2014 what to use & where to compile (general, not just commands)",
        rows: 4,
        value: cfg.guideline || "",
        onChange: (e) => setCfg({ ...cfg, guideline: e.target.value }),
        placeholder: "Build the API on the CI runner with Node 20. Compile the frontend with Vite and bundle into the image; never build on the prod host. Runtime artifact is a single Node service at /services/atlas-platform supervised by systemd."
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-fg1 mb-2 mt-1" }, "Deployment steps (command-by-command, optional)"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mb-3" }, cfg.steps.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex gap-2 items-center bg-ink border border-line rounded-md9 p-2" }, /* @__PURE__ */ React.createElement("input", { value: s.title, onChange: (e) => setStep(i, { title: e.target.value }), placeholder: "Step title", className: "flex-1 bg-transparent text-sm outline-none px-1" }), /* @__PURE__ */ React.createElement("select", { value: s.kind, onChange: (e) => setStep(i, { kind: e.target.value }), className: "bg-ink border border-line rounded-md9 text-xs px-2 py-1" }, /* @__PURE__ */ React.createElement("option", { value: "command" }, "command"), /* @__PURE__ */ React.createElement("option", { value: "systemd" }, "systemd"), /* @__PURE__ */ React.createElement("option", { value: "manual" }, "manual")), /* @__PURE__ */ React.createElement("input", { value: s.command, onChange: (e) => setStep(i, { command: e.target.value }), placeholder: "$SERVICE_DIR/...", className: "flex-1 bg-transparent text-sm font-mono outline-none px-1" }), /* @__PURE__ */ React.createElement("button", { onClick: () => delStep(i), className: "text-fg3 hover:text-bad" }, "\xD7"))), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: addStep }, "+ Add step")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Btn, { onClick: save }, "Save procedure"), /* @__PURE__ */ React.createElement(Btn, { kind: "ok", onClick: gen }, "Generate deploy script + systemd")), showScript && /* @__PURE__ */ React.createElement(Modal, { title: `Deploy artifacts \u2014 /services/${project.name}`, onClose: () => setShowScript(false), wide: true }, /* @__PURE__ */ React.createElement(Tabs, { tabs: ["deploy.sh", "systemd unit"], active: artifact === "unit" ? "systemd unit" : "deploy.sh", setActive: (t) => setArtifact(t === "systemd unit" ? "unit" : "script") }), /* @__PURE__ */ React.createElement("pre", { className: "bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 max-h-[55vh] overflow-auto" }, artifact === "unit" ? unit : script), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2 mt-2" }, "Service dir: ", /* @__PURE__ */ React.createElement("code", { className: "text-brand300" }, "/services/", project.name), " \xB7 unit: ", /* @__PURE__ */ React.createElement("code", { className: "text-brand300" }, "irys-", project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-3" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => download("deploy-" + project.name + ".sh", script) }, "Download script"), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => download("irys-" + project.name + ".service", unit) }, "Download unit"))));
  }
  function ProjectServers({ api, project, projects }) {
    const [servers, setServers] = useState([]);
    const [all, setAll] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [pick, setPick] = useState("");
    const reload = useCallback(async () => {
      const a = await api("GET", "/servers");
      setAll(a);
      setServers(a.filter((s) => s.projectId === project.id && s.inScope));
    }, [api]);
    useEffect(() => {
      reload();
    }, [reload]);
    const addScope = async () => {
      if (!pick) return;
      await api("POST", "/servers/" + pick + "/scope", { inScope: true, projectId: project.id });
      setPick("");
      setShowAdd(false);
      reload();
    };
    const removeScope = async (s) => {
      await api("POST", "/servers/" + s.id + "/scope", { inScope: false });
      reload();
    };
    const sync = async (s) => {
      const r = await api("POST", "/servers/" + s.id + "/sync");
      alert((r.status || "done") + ": " + r.note);
      reload();
    };
    const available = all.filter((s) => s.projectId !== project.id || !s.inScope);
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-fg2" }, "IRYS-enabled servers in scope for ", /* @__PURE__ */ React.createElement("b", null, project.name), ". SSH keys are provisioned automatically."), /* @__PURE__ */ React.createElement(Btn, { onClick: () => setShowAdd(true) }, "+ Add server to scope")), servers.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-fg3 text-sm" }, "No servers in scope. Add one to start provisioning keys."), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, servers.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, className: "bg-ink border border-line rounded-md9 p-3 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold" }, s.label, " ", /* @__PURE__ */ React.createElement(Badge, { tone: "ok" }, s.status || s.lastStatus || "scoped")), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-fg2 font-mono" }, s.user, "@", s.host, ":", s.port, " \xB7 ", s.keyCount, " key(s) \xB7 ", s.inScopeUsers, " user(s)")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ok", onClick: () => sync(s) }, "Sync keys"), /* @__PURE__ */ React.createElement(Btn, { kind: "danger", onClick: () => removeScope(s) }, "Remove scope"))))), showAdd && /* @__PURE__ */ React.createElement(Modal, { title: "Add server to scope", onClose: () => setShowAdd(false) }, /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "Server"), /* @__PURE__ */ React.createElement("select", { value: pick, onChange: (e) => setPick(e.target.value), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select..."), available.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.label, " (", s.host, ")")))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => setShowAdd(false) }, "Cancel"), /* @__PURE__ */ React.createElement(Btn, { onClick: addScope, disabled: !pick }, "Add to scope"))));
  }
  function ProjectKeys({ api, project, projects }) {
    const [keys, setKeys] = useState([]);
    const [users, setUsers] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [userId, setUserId] = useState("");
    const [pub, setPub] = useState("");
    const [label, setLabel] = useState("");
    const reload = useCallback(async () => {
      const [k, u] = await Promise.all([api("GET", "/ssh-keys"), api("GET", "/users")]);
      setKeys(k.filter((x) => x.projectId === project.id));
      setUsers(u);
    }, [api, project.id]);
    useEffect(() => {
      reload();
    }, [reload]);
    const add = async () => {
      await api("POST", "/ssh-keys", { userId, projectId: project.id, publicKey: pub, label });
      setPub("");
      setLabel("");
      setShowAdd(false);
      reload();
    };
    const del = async (k) => {
      await api("DELETE", "/ssh-keys/" + k.id);
      reload();
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-fg2" }, "SSH public keys provisioned into ", /* @__PURE__ */ React.createElement("b", null, project.name), " scope."), /* @__PURE__ */ React.createElement(Btn, { onClick: () => setShowAdd(true) }, "+ Add key")), keys.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-fg3 text-sm" }, "No keys yet."), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, keys.map((k) => {
      const u = users.find((x) => x.id === k.userId);
      return /* @__PURE__ */ React.createElement("div", { key: k.id, className: "bg-ink border border-line rounded-md9 p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-sm" }, u?.name || k.userId, " ", k.label && /* @__PURE__ */ React.createElement(Badge, { tone: "slate" }, k.label)), /* @__PURE__ */ React.createElement("button", { onClick: () => del(k), className: "text-fg3 hover:text-bad text-sm" }, "remove")), /* @__PURE__ */ React.createElement("code", { className: "text-xs text-fg2 break-all block" }, k.publicKey));
    })), showAdd && /* @__PURE__ */ React.createElement(Modal, { title: "Add SSH key", onClose: () => setShowAdd(false) }, /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "User"), /* @__PURE__ */ React.createElement("select", { value: userId, onChange: (e) => setUserId(e.target.value), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select..."), users.map((u) => /* @__PURE__ */ React.createElement("option", { key: u.id, value: u.id }, u.name, " (", u.email, ")")))), /* @__PURE__ */ React.createElement(Input, { label: "Key label", value: label, onChange: (e) => setLabel(e.target.value), placeholder: "laptop" }), /* @__PURE__ */ React.createElement(Textarea, { label: "Public key", rows: 3, value: pub, onChange: (e) => setPub(e.target.value), placeholder: "ssh-ed25519 AAAA..." }), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => setShowAdd(false) }, "Cancel"), /* @__PURE__ */ React.createElement(Btn, { onClick: add, disabled: !userId || !pub }, "Add key"))));
  }
  function Members({ api, projects }) {
    const [users, setUsers] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", role: "member", scopes: [] });
    const reload = useCallback(async () => {
      setUsers(await api("GET", "/users"));
    }, [api]);
    useEffect(() => {
      reload();
    }, [reload]);
    const create = async () => {
      await api("POST", "/users", form);
      setForm({ name: "", email: "", role: "member", scopes: [] });
      setShowNew(false);
      reload();
    };
    const del = async (u) => {
      if (!confirm("Remove " + u.name + "?")) return;
      await api("DELETE", "/users/" + u.id);
      reload();
    };
    const toggleScope = async (u, pid) => {
      const scopes = (u.scopes || []).includes(pid) ? u.scopes.filter((x) => x !== pid) : [...u.scopes, pid];
      await api("PUT", "/users/" + u.id, { scopes });
      reload();
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-5" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold" }, "Members & scopes"), /* @__PURE__ */ React.createElement(Btn, { onClick: () => setShowNew(true) }, "+ Add member")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, users.map((u) => /* @__PURE__ */ React.createElement(Card, { key: u.id }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold" }, u.name, " ", /* @__PURE__ */ React.createElement(Badge, { tone: "slate" }, u.role)), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-fg2" }, u.email, " \xB7 ", u.keyCount, " key(s)")), /* @__PURE__ */ React.createElement("button", { onClick: () => del(u), className: "text-fg3 hover:text-bad" }, "\u{1F5D1}")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2 mb-1" }, "Project scopes:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, projects.map((p) => {
      const on = (u.scopes || []).includes(p.id);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: p.id,
          onClick: () => toggleScope(u, p.id),
          className: `px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? "bg-brand/20 text-brand300 border-brand/40" : "bg-panel text-fg2 border-line"}`
        },
        p.name
      );
    }), projects.length === 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg3" }, "Create a project first."))))), showNew && /* @__PURE__ */ React.createElement(Modal, { title: "Add member", onClose: () => setShowNew(false) }, /* @__PURE__ */ React.createElement(Input, { label: "Name", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) }), /* @__PURE__ */ React.createElement(Input, { label: "Email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }) }), /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "Role"), /* @__PURE__ */ React.createElement("select", { value: form.role, onChange: (e) => setForm({ ...form, role: e.target.value }), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm" }, /* @__PURE__ */ React.createElement("option", { value: "member" }, "member"), /* @__PURE__ */ React.createElement("option", { value: "developer" }, "developer"), /* @__PURE__ */ React.createElement("option", { value: "lead" }, "lead"), /* @__PURE__ */ React.createElement("option", { value: "admin" }, "admin"))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2 mb-1" }, "Initial scopes:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" }, projects.map((p) => {
      const on = form.scopes.includes(p.id);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: p.id,
          onClick: () => setForm({ ...form, scopes: on ? form.scopes.filter((x) => x !== p.id) : [...form.scopes, p.id] }),
          className: `px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? "bg-brand/20 text-brand300 border-brand/40" : "bg-panel text-fg2 border-line"}`
        },
        p.name
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => setShowNew(false) }, "Cancel"), /* @__PURE__ */ React.createElement(Btn, { onClick: create, disabled: !form.name || !form.email }, "Add"))));
  }
  function Servers({ api, projects }) {
    const [servers, setServers] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState({ label: "", host: "", port: 22, user: "irys", projectId: "", authKeysPath: "~/.ssh/authorized_keys" });
    const [authView, setAuthView] = useState(null);
    const [boot, setBoot] = useState(null);
    const reload = useCallback(async () => {
      setServers(await api("GET", "/servers"));
    }, [api]);
    useEffect(() => {
      reload();
    }, [reload]);
    const create = async () => {
      await api("POST", "/servers", form);
      setForm({ label: "", host: "", port: 22, user: "irys", projectId: "", authKeysPath: "~/.ssh/authorized_keys" });
      setShowNew(false);
      reload();
    };
    const del = async (s) => {
      if (!confirm("Delete server " + s.label + "?")) return;
      await api("DELETE", "/servers/" + s.id);
      reload();
    };
    const setScope = async (s, pid) => {
      await api("POST", "/servers/" + s.id + "/scope", { inScope: !!pid, projectId: pid || null });
      reload();
    };
    const sync = async (s) => {
      const r = await api("POST", "/servers/" + s.id + "/sync");
      setAuthView({ s, r });
    };
    const openBoot = async (s) => {
      const d = await api("GET", "/servers/" + s.id + "/bootstrap");
      setBoot({ s, d });
    };
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-5" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold" }, "IRYS-enabled servers"), /* @__PURE__ */ React.createElement(Btn, { onClick: () => setShowNew(true) }, "+ Register server")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, servers.map((s) => /* @__PURE__ */ React.createElement(Card, { key: s.id }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold" }, s.label, " ", s.inScope ? /* @__PURE__ */ React.createElement(Badge, { tone: "ok" }, "in scope") : /* @__PURE__ */ React.createElement(Badge, { tone: "warn" }, "unscoped"), " ", s.linked && /* @__PURE__ */ React.createElement(Badge, { tone: "brand" }, "linked")), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-fg2 font-mono" }, s.user, "@", s.host, ":", s.port)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ok", onClick: () => sync(s), disabled: !s.inScope }, "Sync keys"), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => openBoot(s) }, "Bootstrap"), /* @__PURE__ */ React.createElement("button", { onClick: () => del(s), className: "text-fg3 hover:text-bad px-2" }, "\u{1F5D1}"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2" }, "Scope:"), /* @__PURE__ */ React.createElement("select", { value: s.projectId || "", onChange: (e) => setScope(s, e.target.value), className: "bg-ink border border-line rounded-md9 text-sm px-2 py-1" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 none \u2014"), projects.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.id, value: p.id }, p.name))), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg3 ml-2" }, s.keyCount, " key(s) \xB7 ", s.inScopeUsers, " user(s)"), s.linked && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-ok ml-2" }, "\u25CF linked ", s.hostInfo?.ip || ""))))), showNew && /* @__PURE__ */ React.createElement(Modal, { title: "Register IRYS-enabled server", onClose: () => setShowNew(false) }, /* @__PURE__ */ React.createElement(Input, { label: "Label", value: form.label, onChange: (e) => setForm({ ...form, label: e.target.value }), placeholder: "prod-edge-01" }), /* @__PURE__ */ React.createElement(Input, { label: "Host", value: form.host, onChange: (e) => setForm({ ...form, host: e.target.value }), placeholder: "app-prod.irys.dev" }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(Input, { label: "Port", type: "number", value: form.port, onChange: (e) => setForm({ ...form, port: +e.target.value }) }), /* @__PURE__ */ React.createElement(Input, { label: "SSH user", value: form.user, onChange: (e) => setForm({ ...form, user: e.target.value }) })), /* @__PURE__ */ React.createElement("label", { className: "block mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fg2 block mb-1" }, "Initial project scope"), /* @__PURE__ */ React.createElement("select", { value: form.projectId, onChange: (e) => setForm({ ...form, projectId: e.target.value }), className: "w-full bg-ink border border-line rounded-md9 px-3 py-2 text-sm" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 none \u2014"), projects.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.id, value: p.id }, p.name)))), /* @__PURE__ */ React.createElement(Input, { label: "authorized_keys path", value: form.authKeysPath, onChange: (e) => setForm({ ...form, authKeysPath: e.target.value }) }), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => setShowNew(false) }, "Cancel"), /* @__PURE__ */ React.createElement(Btn, { onClick: create, disabled: !form.label || !form.host }, "Register"))), authView && /* @__PURE__ */ React.createElement(Modal, { title: `authorized_keys \u2014 ${authView.s.label}`, onClose: () => setAuthView(null), wide: true }, /* @__PURE__ */ React.createElement(Badge, { tone: authView.r.status === "deployed" ? "ok" : authView.r.status === "failed" ? "bad" : "warn" }, authView.r.status), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg2 mt-2 mb-2" }, authView.r.note), /* @__PURE__ */ React.createElement("pre", { className: "bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 max-h-[55vh] overflow-auto" }, authView.r.authorizedKeys), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", className: "mt-3", onClick: () => copyText(authView.r.authorizedKeys) }, "Copy")), boot && /* @__PURE__ */ React.createElement(Modal, { title: `Link ${boot.s.label} to IRYS`, onClose: () => setBoot(null), wide: true }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-fg1 mb-2" }, "Run this on the host to create the ", /* @__PURE__ */ React.createElement("code", { className: "text-brand300" }, "irys"), " user, link it via the one-time token, and install the key-pull timer:"), /* @__PURE__ */ React.createElement("pre", { className: "bg-ink border border-line rounded-md9 p-4 text-xs text-fg1 overflow-auto" }, boot.d.command), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-3" }, /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => copyText(boot.d.command) }, "Copy command"), /* @__PURE__ */ React.createElement(Btn, { kind: "ghost", onClick: () => {
      download("irys-agent.sh", "see http://localhost:4000/irys-agent.sh");
    } }, "Download agent")), /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-xs text-fg2" }, "Status: ", /* @__PURE__ */ React.createElement(Badge, { tone: boot.d.linked ? "ok" : "warn" }, boot.d.linked ? "linked" : "not linked"), boot.d.hostInfo && /* @__PURE__ */ React.createElement(React.Fragment, null, " \xB7 ", boot.d.hostInfo.hostname, " (", boot.d.hostInfo.ip, ")")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-fg3 mt-3" }, "Agent script: ", /* @__PURE__ */ React.createElement("code", { className: "text-brand300" }, "http://localhost:4000/irys-agent.sh"), " \u2014 it pulls authorized_keys every 60s, so IRYS never needs outbound SSH.")));
  }
  function Audit({ api }) {
    const [rows, setRows] = useState([]);
    useEffect(() => {
      (async () => {
        try {
          setRows(await api("GET", "/audit"));
        } catch {
        }
      })();
    }, [api]);
    return /* @__PURE__ */ React.createElement("div", { className: "fade" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold mb-5" }, "Audit log"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("ul", { className: "text-sm divide-y divide-line" }, rows.length === 0 && /* @__PURE__ */ React.createElement("li", { className: "text-fg3 py-3" }, "No events."), rows.map((r, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "py-2 flex gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-fg3 font-mono text-xs w-40 shrink-0" }, new Date(r.at).toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "text-brand300 font-semibold w-36 shrink-0" }, r.action), /* @__PURE__ */ React.createElement("span", { className: "text-fg1 truncate" }, r.detail))))));
  }
  function App() {
    const [token, setToken] = useState(localStorage.getItem("irys_token") || "");
    const [provider, setProvider] = useState(null);
    useEffect(() => {
      if (token && !provider) {
        makeApi(token)("GET", "/me").then((p) => setProvider(p.provider)).catch(() => {
          setToken("");
          localStorage.removeItem("irys_token");
        });
      }
    }, [token]);
    const onLogin = (t, p) => {
      localStorage.setItem("irys_token", t);
      setToken(t);
      setProvider(p);
    };
    const onLogout = () => {
      localStorage.removeItem("irys_token");
      setToken("");
      setProvider(null);
    };
    if (!token || !provider) return /* @__PURE__ */ React.createElement(Login, { onLogin });
    return /* @__PURE__ */ React.createElement(Shell, { token, provider, onLogout });
  }
  ReactDOM.render(/* @__PURE__ */ React.createElement(App, null), document.getElementById("root"));
})();
