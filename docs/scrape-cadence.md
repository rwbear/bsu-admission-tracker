# Admission scrape cadence

## Why scrapes go stale
GitHub Actions `schedule` (cron) is **not reliable** on this repo — it can skip
for 30+ minutes even with `*/5 * * * *`.

Pushing `data/.scrape-tick` with the default `GITHUB_TOKEN` also **does not**
start a new workflow run (GitHub blocks recursive triggers).

## Fix: add secret `SCRAPE_PAT`
1. GitHub → Settings → Developer settings → Fine-grained personal access token
2. Resource owner: this repo’s owner, repository access: only this repo
3. Permissions: **Contents: Read and write**, **Actions: Read and write**
4. Repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `SCRAPE_PAT`
   - Value: the token

The scrape workflow waits ~4.5 minutes after each run, then
`gh workflow run "Scrape admission tables" --ref main` with that PAT.
That keeps a ~5-minute cadence without trusting GitHub cron.
