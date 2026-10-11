#!/usr/bin/env bash
# irys-agent.sh — IRYS host agent bootstrap
#
# Run on a server you want to link to IRYS. It:
#   1. creates the `irys` user and prepares its ~/.ssh/authorized_keys
#   2. links the host to IRYS with a one-time bootstrap token
#   3. installs a systemd timer that periodically PULLS the latest
#      IRYS-managed authorized_keys (so IRYS never needs outbound SSH)
#
# Usage:
#   curl -sSL https://<irys>/irys-agent.sh | sudo bash -s -- --url https://<irys> --token <TOKEN>
#   irys-agent.sh link   --url ... --token ...
#   irys-agent.sh pull
#   irys-agent.sh status
set -euo pipefail

CONF=/etc/irys-agent.conf
IRYS_USER=irys
SSH_DIR=""
MARK_BEGIN="# === IRYS managed — do not edit by hand ==="
MARK_END="# === end IRYS managed ==="

log() { echo "[irys-agent] $*"; }

usage() {
  cat <<'EOF'
irys-agent.sh — IRYS host agent

  install   Create the irys user, link to IRYS, install the pull timer (default when piped)
  link      One-shot: link this host to IRYS using --url and --token
  pull      Fetch the latest IRYS-managed authorized_keys and merge them in
  status    Show linking status

Options:
  --url URL      Base URL of the IRYS control plane (e.g. https://irys.example.com)
  --token TOKEN One-time bootstrap token shown in the IRYS dashboard
EOF
}

# --- JSON parsing without jq (python3, else node) -------------------------
json_get() {
  local key="$1" input="$2"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$input" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$key',''))" 2>/dev/null
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$input" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).'$key'||'')}catch(e){}})" 2>/dev/null
  else
    echo ""; return 1
  fi
}

ensure_user() {
  if ! id "$IRYS_USER" >/dev/null 2>&1; then
    log "creating user $IRYS_USER"
    useradd -m -s /bin/bash "$IRYS_USER" 2>/dev/null || adduser -D -s /bin/bash "$IRYS_USER" 2>/dev/null || true
  fi
  SSH_DIR=$(getent passwd "$IRYS_USER" | cut -d: -f6)/.ssh
  mkdir -p "$SSH_DIR"
  chmod 700 "$SSH_DIR"
  touch "$SSH_DIR/authorized_keys"
  chmod 600 "$SSH_DIR/authorized_keys"
  chown -R "$IRYS_USER:$IRYS_USER" "$SSH_DIR"
}

write_keys() {
  local keys="$1"
  ensure_user
  local tmp; tmp=$(mktemp)
  # keep any pre-existing, non-IRYS-managed lines
  awk -v b="$MARK_BEGIN" -v e="$MARK_END" '
    $0==b { skip=1; next }
    $0==e { skip=0; next }
    skip==0 { print }
  ' "$SSH_DIR/authorized_keys" > "$tmp" || true
  {
    echo "$MARK_BEGIN"
    printf '%s\n' "$keys"
    echo "$MARK_END"
  } >> "$tmp"
  # strip the IRYS block if it ended up empty (only the header/footer)
  cat "$tmp" > "$SSH_DIR/authorized_keys"
  chmod 600 "$SSH_DIR/authorized_keys"
  chown "$IRYS_USER:$IRYS_USER" "$SSH_DIR/authorized_keys"
  rm -f "$tmp"
}

cmd_link() {
  [[ -n "${IRYS_URL:-}" ]] || { echo "error: --url is required"; exit 1; }
  [[ -n "${TOKEN:-}" ]] || { echo "error: --token is required"; exit 1; }
  ensure_user
  local hostname ip sshPort fingerprint
  hostname=$(hostname)
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  sshPort=$( (grep -iE '^Port ' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}') || echo 22)
  fingerprint=$(ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub 2>/dev/null || true)
  log "linking $hostname ($ip) to $IRYS_URL"
  local resp
  resp=$(curl -fsS -X POST "$IRYS_URL/api/servers/link" \
    -H 'Content-Type: application/json' \
    -d "$(printf '{"token":"%s","hostname":"%s","ip":"%s","sshPort":%s,"fingerprint":"%s"}' "$TOKEN" "$hostname" "$ip" "$sshPort" "$fingerprint")")
  local serverId projectId keys
  serverId=$(json_get serverId "$resp")
  projectId=$(json_get projectId "$resp")
  keys=$(json_get authorizedKeys "$resp")
  {
    echo "IRYS_URL=$IRYS_URL"
    echo "TOKEN=$TOKEN"
    echo "SERVER_ID=$serverId"
    echo "PROJECT_ID=$projectId"
  } > "$CONF"
  chmod 600 "$CONF"
  log "linked as server $serverId (project $projectId)"
  if [[ -n "$keys" ]]; then write_keys "$keys"; log "provisioned authorized_keys"; fi
  setup_timer
}

cmd_pull() {
  [[ -f "$CONF" ]] || { echo "error: not linked yet (run link first)"; exit 1; }
  # shellcheck disable=SC1090
  source "$CONF"
  local keys
  keys=$(curl -fsS "$IRYS_URL/api/servers/keys?serverId=$SERVER_ID&token=$TOKEN")
  write_keys "$keys"
  log "pulled authorized_keys ($(printf '%s' "$keys" | grep -c ssh-) key line(s))"
}

setup_timer() {
  if command -v systemctl >/dev/null 2>&1; then
    cat > /etc/systemd/system/irys-agent.service <<UNIT
[Unit]
Description=IRYS host agent — pull authorized_keys
After=network.target

[Service]
Type=oneshot
ExecStart=$0 pull
UNIT
    cat > /etc/systemd/system/irys-agent.timer <<TIMER
[Unit]
Description=IRYS host agent pull timer

[Timer]
OnBootSec=30s
OnUnitActiveSec=60s
Unit=irys-agent.service

[Install]
WantedBy=timers.target
TIMER
    systemctl daemon-reload
    systemctl enable --now irys-agent.timer
    log "systemd timer installed (irys-agent.timer)"
  else
    # fall back to cron if no systemd
    ( crontab -l 2>/dev/null | grep -v irys-agent; echo "* * * * * $0 pull >/dev/null 2>&1" ) | crontab -
    log "cron entry installed (no systemd)"
  fi
}

cmd_status() {
  if [[ -f "$CONF" ]]; then
    # shellcheck disable=SC1090
    source "$CONF"
    echo "IRYS agent: linked"
    echo "  URL:        $IRYS_URL"
    echo "  Server ID:  $SERVER_ID"
    echo "  Project ID: $PROJECT_ID"
    echo "  User:       $IRYS_USER ($SSH_DIR/authorized_keys)"
  else
    echo "IRYS agent: NOT linked (run install/link)"
  fi
}

# --- arg parsing -----------------------------------------------------------
ACTION=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) IRYS_URL="$2"; shift 2;;
    --token) TOKEN="$2"; shift 2;;
    link|pull|status|install) ACTION="$1"; shift;;
    -h|--help|help) usage; exit 0;;
    *) echo "unknown arg: $1"; usage; exit 1;;
  esac
done

ACTION="${ACTION:-install}"   # default when piped via curl | bash
case "$ACTION" in
  install) ensure_user; cmd_link;;
  link) cmd_link;;
  pull) cmd_pull;;
  status) cmd_status;;
  *) usage; exit 1;;
esac
