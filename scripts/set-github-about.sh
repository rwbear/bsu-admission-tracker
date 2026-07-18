#!/usr/bin/env bash
# Sets GitHub repo About (description + homepage + topics).
# Needs a personal token with `repo` scope — the Cursor GitHub App token
# cannot update repository Administration fields.
set -euo pipefail

REPO="${REPO:-rwbear/bsu-admission-tracker}"
DESC='Введи балл и отследи своё место в Конкурсе БГУ по live-таблицам и графикам.'
HOME_URL='https://rwbear.github.io/bsu-admission-tracker/'

if [[ -z "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]] && ! gh auth status >/dev/null 2>&1; then
  echo "Log in first: gh auth login -h github.com -s repo" >&2
  exit 1
fi

gh api -X PATCH "repos/${REPO}" \
  -f description="${DESC}" \
  -f homepage="${HOME_URL}" \
  --jq '{description,homepage}'

gh api -X PUT "repos/${REPO}/topics" \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON' | jq '{names}'
{"names":["bsu","belarus","admission","github-pages","live"]}
JSON

echo "Done. Check https://github.com/${REPO}"
