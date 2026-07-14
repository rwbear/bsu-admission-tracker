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

1. Waits ~270s on the runner
2. Checks for an already-queued / other in-progress run (skip if so)
3. Runs `gh workflow run "Scrape admission tables" --ref main`

Permissions required on the job: `actions: write` (for dispatch) and
`contents: write` (for publishing snapshots).

No personal access token secret is required for the chain.

## Kill switch

Disable the workflow in the Actions tab, or cancel the in-progress run
during its arm sleep — the next dispatch will not fire.
