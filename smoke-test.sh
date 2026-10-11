#!/usr/bin/env bash
# IRYS agent-flow smoke test
set -euo pipefail
BASE="${IRYS_BASE:-http://localhost:4000}"
PASS=0; FAIL=0
ok(){ echo "  [PASS] $1"; PASS=$((PASS+1)); }
bad(){ echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "== 1. login =="
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@irys.dev","password":"demo1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
[ -n "$TOKEN" ] && ok "got JWT" || bad "no JWT"
AUTH="Authorization: Bearer $TOKEN"

echo "== 2. seeded servers linked status =="
curl -s "$BASE/api/servers" -H "$AUTH" | python3 -c '
import sys,json
s=json.load(sys.stdin)
for x in s:
  print("   ", x["label"], "linked=",x["linked"], "scope=",x.get("inScope"))
  if "bootstrapToken" in x: print("   !! token leaked in list"); sys.exit(2)
print("   OK no bootstrap token leaked")
'

echo "== 3. create temp server =="
SID=$(curl -s -X POST "$BASE/api/servers" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"label":"smoke-srv","host":"10.9.9.9","projectId":null}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["id"])')
[ -n "$SID" ] && ok "created server $SID" || bad "create failed"

echo "== 4. bootstrap command for temp server =="
BOOT=$(curl -s "$BASE/api/servers/$SID/bootstrap" -H "$AUTH")
echo "$BOOT" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert "curl" in d["command"] and "irys-agent.sh" in d["command"];print("   command:",d["command"])'
BTOKEN=$(echo "$BOOT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

echo "== 5. link (simulates agent on host) =="
LINK=$(curl -s -X POST "$BASE/api/servers/link" -H 'Content-Type: application/json' \
  -d "{\"token\":\"$BTOKEN\",\"hostname\":\"smoke-srv\",\"ip\":\"10.9.9.9\",\"sshPort\":22,\"fingerprint\":\"SHA256:smoke\"}")
echo "$LINK" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d["ok"];print("   linked projectId=",d.get("projectId"));print("   authorizedKeys lines:",len([l for l in d["authorizedKeys"].splitlines() if l.strip()]))'
ok "link returned authorized_keys"

echo "== 6. agent pull keys =="
KEYS=$(curl -s "$BASE/api/servers/keys?serverId=$SID&token=$BTOKEN")
[ -n "$KEYS" ] && ok "pulled $(echo "$KEYS" | wc -l | tr -d ' ') line(s) of keys" || bad "pull empty"

echo "== 7. bad token rejected =="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/servers/keys?serverId=$SID&token=wrong")
[ "$CODE" = "403" ] && ok "403 on bad token" || bad "expected 403 got $CODE"

echo "== 8. irys-agent.sh served =="
AG=$(curl -s "$BASE/irys-agent.sh")
echo "$AG" | head -3
echo "$AG" | grep -q "IRYS" && ok "agent script served ($(echo "$AG" | wc -l | tr -d ' ') lines)" || bad "agent script empty"

echo "== 9. deployment script carries guideline =="
PID=$(curl -s "$BASE/api/projects" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
SCRIPT=$(curl -s "$BASE/api/projects/$PID/deployment/script" -H "$AUTH")
echo "$SCRIPT" | grep -q "IRYS deployment guideline" && ok "guideline header present" || bad "no guideline header"
echo "$SCRIPT" | grep -q "Build tool:" && ok "build tool line present" || bad "no build tool line"

echo "== 10. cleanup temp server =="
curl -s -X DELETE "$BASE/api/servers/$SID" -H "$AUTH" >/dev/null && ok "temp server removed" || bad "cleanup failed"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
