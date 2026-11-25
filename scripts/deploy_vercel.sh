#!/usr/bin/env bash
#
# Deploy Hatsi360 to Vercel.
#
# Usage:
#   VERCEL_TOKEN=... ./scripts/deploy_vercel.sh            # production deploy of main
#   VERCEL_TOKEN=... TEAM_SLUG=baiitax ./scripts/deploy_vercel.sh
#   VERCEL_TOKEN=... PROJECT=hatsi360 BRANCH=main ./scripts/deploy_vercel.sh
#
# The token must belong to the team that owns the project (the `hatsi360`
# project lives under baiitax; the token used on 25 Nov belonged to
# baiita-x-degen-s-projects and could only read a different project, so it
# could not create or deploy anything — the script fails loudly on that).
#
# Environment:
#   VERCEL_TOKEN   required — a token with deploy rights on the project's team
#   PROJECT        optional — default hatsi360
#   TEAM_SLUG      optional — team slug, when the project is team-owned
#   BRANCH         optional — default main
#   REPO           optional — default baiitax/Hatsi360_V2
set -euo pipefail

API="https://api.vercel.com"
PROJECT="${PROJECT:-hatsi360}"
BRANCH="${BRANCH:-main}"
REPO="${REPO:-baiitax/Hatsi360_V2}"
TEAM_SLUG="${TEAM_SLUG:-}"

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN to a token with deploy rights}"

Q=""
[ -n "$TEAM_SLUG" ] && Q="?slug=${TEAM_SLUG}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }

py() { python3 -c "$@"; }

say "1/5  Token check"
WHO=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API/v2/user")
if grep -q '"code":"not_found"' <<<"$WHO"; then
  fail "The token is not a personal token (GET /v2/user returned 'User not found'). Use a token from the account that owns the project — see docs/DEPLOYMENT.md."
fi
ok "token accepted"

say "2/5  Project: $PROJECT"
PROJ=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API/v9/projects/${PROJECT}${Q}")
if grep -q '"code":"not_found"' <<<"$PROJ" || grep -q '"code":"forbidden"' <<<"$PROJ"; then
  say "     project not visible to this token — creating it, linked to $REPO"
  PROJ=$(curl -s -X POST "$API/v11/projects" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$PROJECT\",\"framework\":\"nextjs\",\"gitRepository\":{\"type\":\"github\",\"repo\":\"$REPO\"}}")
  if grep -q '"error"' <<<"$PROJ"; then
    fail "Could not create the project: $(py 'import json,sys;d=json.load(sys.stdin);print(d["error"].get("message"))' <<<"$PROJ"). Give the token the team's 'Member' role or create the project in the dashboard."
  fi
  ok "project created and linked to $REPO"
else
  PROJ_ID=$(py 'import json,sys;print(json.load(sys.stdin)["id"])' <<<"$PROJ")
  ok "project found ($PROJ_ID)"
fi

PROJ_ID=$(py 'import json,sys;print(json.load(sys.stdin)["id"])' <<<"$PROJ")

say "3/5  Environment"
# Only the public pair is required for the site to render. The service-role key
# and the notification secrets are optional and belong in the dashboard.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for key in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS; do
  [ -f "$ROOT/.env.local" ] || continue
  val=$(grep -m1 "^${key}=" "$ROOT/.env.local" | cut -d= -f2- || true)
  [ -z "$val" ] && continue
  curl -s -X POST "$API/v10/projects/${PROJ_ID}/env${Q:+\?slug=$TEAM_SLUG}&upsert=true" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
    -d "$(py 'import json,os;print(json.dumps({"key":os.environ["K"],"value":os.environ["V"],"type":"plain","target":["production","preview","development"]}))' 2>/dev/null \
        || printf '{"key":"%s","value":"%s","type":"plain","target":["production","preview","development"]}' "$key" "$val")" \
    >/dev/null
  ok "$key set"
done
say "     (SUPABASE_SERVICE_ROLE_KEY, JOB_RUNNER_SECRET and the notification keys are not in .env.local — add them in the dashboard if the cron jobs are to run)"

say "4/5  Deploying $BRANCH"
DEP=$(curl -s -X POST "$API/v13/deployments${Q:+\?slug=$TEAM_SLUG}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"$PROJECT\",\"project\":\"$PROJ_ID\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"ref\":\"$BRANCH\"}}")
if grep -q '"error"' <<<"$DEP"; then
  fail "Deployment refused: $(py 'import json,sys;d=json.load(sys.stdin);print(d["error"].get("message"))' <<<"$DEP")"
fi
DEP_ID=$(py 'import json,sys;print(json.load(sys.stdin)["id"])' <<<"$DEP")
URL=$(py 'import json,sys;d=json.load(sys.stdin);print("https://"+d.get("url",""))' <<<"$DEP")
ok "queued ${DEP_ID}"

say "5/5  Waiting for the build"
for i in $(seq 1 120); do
  sleep 5
  ST=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API/v13/deployments/${DEP_ID}${Q:+\?slug=$TEAM_SLUG}")
  STATE=$(py 'import json,sys;print(json.load(sys.stdin).get("readyState",""))' <<<"$ST")
  printf '     %-12s %s\n' "$STATE" "$(date +%H:%M:%S)"
  case "$STATE" in
    READY) ok "live at $URL"; exit 0 ;;
    ERROR|CANCELED) fail "build $STATE — inspect at https://vercel.com/deployments/${DEP_ID}" ;;
  esac
done
fail "timed out waiting for the build — check https://vercel.com/deployments/${DEP_ID}"
