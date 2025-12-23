# Server Version Dashboard (Mock data pack)

This pack adds **richer mock fixtures**, **multiple inventory groups**, and a **GitHub Pages** workflow.
It does **NOT** include `server_version_report.py` (you already have it).

## Where to copy these files
Copy the zip contents into your repo root, so you get:
- `projects/hosts.ini`
- `projects/server-version-dashboard/fixtures/...`
- `.github/workflows/server-version-dashboard-pages.yml`
- `projects/server-version-dashboard/STYLING_SNIPPET.md` (optional nicer status styling)
- `projects/server-version-dashboard/styling_patch.diff` (optional patch)

## Run locally (mock)
```bash
python projects/server-version-dashboard/server_version_report.py   --mock   --inventory projects/hosts.ini   --fixtures-dir projects/server-version-dashboard/fixtures   --snapshot projects/server-version-dashboard/fixtures/server_version_snapshot.tsv   --output site/index.html
```

## GitHub Pages (one-time)
Repo → Settings → Pages → Source: **GitHub Actions**.
