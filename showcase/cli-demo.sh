#!/usr/bin/env bash
# IRYS CLI end-to-end showcase: auth -> governance -> scope -> deploy.
# Proves the CLI authenticates and picks up governance defined by the provider org.
set -euo pipefail
cd "$(dirname "$0")/.."
NODE=/Users/snyco/.workbuddy-ai/binaries/node/versions/22.22.2-6/bin/node
CLI="$NODE cli/irys.js"
BASE="${IRYS_BASE:-http://localhost:4000}"

hr(){ echo; echo "──────────────────────────────────────────────"; echo " $1"; echo "──────────────────────────────────────────────"; }

hr "1 · Auth — store credentials (~/.irys/credentials.json)"
$CLI login --email admin@irys.dev --password demo1234

hr "2 · Identity — who am I?"
$CLI whoami

hr "3 · Projects"
$CLI projects

hr "4 · Governance files generated from the provider's rules"
$CLI governance atlas-platform --file AGENTS.md

hr "5 · Scope — who & which servers can reach this project"
$CLI scope atlas-platform

hr "6 · Servers"
$CLI servers

hr "7 · Deployment procedure + guideline"
$CLI deploy atlas-platform

hr "8 · Audit log"
$CLI audit

hr "Done"
echo "CLI demonstrated: authenticated, pulled provider-defined governance,"
echo "enumerated scope + servers, and fetched the deployment guideline."
