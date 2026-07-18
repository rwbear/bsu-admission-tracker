# Admission scrape cadence

## Why data went stale

Three things stacked:

1. **GitHub `schedule` cron is unreliable** on this repo — it can skip for
   30+ minutes even with `*/5 * * * *`. Observed: hours between fires.
2. **`GITHUB_TOKEN` pushes never re-trigger workflows.** The old “arm” step
   committed `data/.scrape-tick` and pushed it. The commit landed; **no new
   run started**. That is GitHub’s recursion guard for `push` events.
3. Scrapes only re-started when someone pushed code / merged a PR. Between
   those events, snapshots froze — the site looked “late.”

The client is not the bottleneck: it polls every ~3 minutes and loads by
commit SHA when possible. If Actions stops publishing, the UI can only show
the last committed `updatedAt`.

## Fix: self-arm via `workflow_dispatch`

`workflow_dispatch` (and `repository_dispatch`) **always** create a workflow
run — even when triggered with `GITHUB_TOKEN`. Official exception to the
recursion rule.

After each scrape the workflow:

1. Waits ~180s on the runner
2. Checks for an already-queued / other in-progress run (skip if so)
3. Runs `gh workflow run "Scrape admission tables" --ref <Pages branch>`

**Watchdog** (`scrape-watchdog.yml`): every ~15 minutes, if tip
`publishedAt` / `updatedAt` is older than 15 minutes and no scrape is
running, dispatch a scrape. Safety net when the arm chain dies mid-sleep.

Permissions required on the job: `actions: write` (for dispatch) and
`contents: write` (for publishing snapshots).

No personal access token secret is required for the chain.

## Stable proxy (required on Actions)

Cloud / GitHub runner IPs cannot TLS to `abit.bsu.by` (connection reset).
Set repository secret **`SCRAPE_PROXY`** (`http://user:pass@host:port`).

On Actions:

- scrape **fails closed** if `SCRAPE_PROXY` is missing
- public ProxyScrape lists are **off** (`SCRAPE_ALLOW_PUBLIC_PROXIES=0`)
- truncated public proxies previously wiped tables with empty shells

Locally, without `SCRAPE_PROXY`, discovery may still run for development.
Override with `SCRAPE_ALLOW_PUBLIC_PROXIES=0|1`.

Client stale window is **12 minutes** (above normal scrape cadence) so a
healthy pipeline does not look broken. Chase poll is 30s when past that.

Empty monitoring shells are treated as **form failures** (prior rows retained)
so a truncated proxy response cannot wipe a live table silently.

## Kill switch

Disable the workflow in the Actions tab, or cancel the in-progress run
during its arm sleep — the next dispatch will not fire. Watchdog may
restart the chain within ~15 minutes unless also disabled.
