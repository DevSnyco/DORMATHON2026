// server/lib/deployGen.js
// Generates an executable deploy script and a systemd unit file for a project,
// honouring /services/{project} layout and the IRYS deployment procedure.
export function serviceName(project) {
  return 'irys-' + project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function buildUnit(deployment, project) {
  const svc = serviceName(project);
  const work = `/services/${project.name}`;
  const exec = (deployment.unit && deployment.unit.execStart) ||
    (deployment.runtime === 'docker' ? `docker compose -f ${work}/docker-compose.yml up -d`
      : deployment.runtime === 'python' ? `python3 -m gunicorn app:app`
        : deployment.runtime === 'static' ? `npx serve -s ${work}/dist -l 8080`
          : `node ${work}/dist/index.js`);
  const user = (deployment.unit && deployment.unit.user) || 'irys';
  return `[Unit]
Description=IRYS managed service: ${project.name}
After=network.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${work}
ExecStart=${exec}
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
}

export function buildScript(deployment, project) {
  const svc = serviceName(project);
  const work = `/services/${project.name}`;
  const branch = deployment.branch || 'main';
  const repo = deployment.repo || 'git@github.com:your-org/your-repo.git';
  const lines = [
    '#!/usr/bin/env bash',
    '# IRYS-generated deployment script — project: ' + project.name,
    'set -euo pipefail',
    ''
  ];
  // Guideline header: the "what to use / where to compile" narrative.
  if (deployment.guideline || (deployment.build && (deployment.build.tool || deployment.build.location || deployment.build.artifacts))) {
    lines.push('# === IRYS deployment guideline ===');
    if (deployment.build && deployment.build.tool) lines.push('# Build tool:    ' + deployment.build.tool);
    if (deployment.build && deployment.build.location) lines.push('# Compile at:    ' + deployment.build.location);
    if (deployment.build && deployment.build.artifacts) lines.push('# Artifacts:     ' + deployment.build.artifacts);
    if (deployment.guideline) deployment.guideline.split('\n').forEach((l) => lines.push('# ' + l));
    lines.push('# ===============================', '');
  }
  lines.push(
    `SERVICE_DIR="${work}"`,
    `SERVICE_NAME="${svc}"`,
    `BRANCH="${branch}"`,
    `REPO="${repo}"`,
    '',
    'echo ">> [IRYS] preparing service directory"',
    'if [ "$(id -u)" -ne 0 ]; then echo "run as root (or with sudo)"; exit 1; fi',
    `mkdir -p "$SERVICE_DIR"`,
    'if [ ! -d "$SERVICE_DIR/.git" ]; then',
    '  git clone --branch "$BRANCH" "$REPO" "$SERVICE_DIR"',
    'else',
    '  git -C "$SERVICE_DIR" fetch --all',
    '  git -C "$SERVICE_DIR" reset --hard "origin/$BRANCH"',
    'fi',
    ''
  );
  for (const step of deployment.steps || []) {
    if (step.kind === 'command' && step.command) {
      lines.push('echo ">> [IRYS] step: ' + (step.title || step.command) + '"');
      lines.push(step.command.replace(/\$SERVICE_DIR/g, work));
      lines.push('');
    }
  }
  lines.push('echo ">> [IRYS] installing systemd unit"');
  lines.push('cat > /etc/systemd/system/' + svc + '.service <<\'UNIT\'');
  lines.push(buildUnit(deployment, project));
  lines.push('UNIT');
  lines.push('systemctl daemon-reload');
  lines.push('systemctl enable ' + svc);
  lines.push('systemctl restart ' + svc);
  lines.push('systemctl status --no-pager ' + svc);
  lines.push('');
  lines.push('echo ">> [IRYS] deploy complete"');
  return lines.join('\n') + '\n';
}
