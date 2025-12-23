# Server Version Dashboard (Portfolio-safe)

A small “SSH into fleet → parse config → keep snapshot → generate HTML dashboard” project.

It reads an Ansible-style inventory, collects a few simple facts per host, and generates a static HTML report grouped by inventory group.  
It supports **real SSH mode** (for private use) and a **mock mode** (safe to run in GitHub Actions and publish on GitHub Pages).

---

## What it shows

For every host in the inventory:

- **Status:** `ONLINE` / `OFFLINE`
- **Platform/Environment:** from a small fact file (example: `/etc/example/facts/platform.txt`)
- **Primary IP:** from `hostname -I`
- **App Port:** parsed from an Erlang-style `sys.config`
- **Proxy:** detected from keywords inside `sys.config`
- **Grouping:** hosts are displayed under their inventory section (`[dev]`, `[staging]`, `[prod]`, etc.)
- **Snapshot retention:** if a host is offline, the dashboard shows its **last-known values** from a TSV snapshot
