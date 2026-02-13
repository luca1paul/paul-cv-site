# Paul Luca — DevOps Engineer Portfolio

Personal CV and portfolio site showcasing DevOps and QA engineering skills, with live demo projects powered by GitHub Actions.

**Live site:** [luca1paul.github.io/paul-cv-site](https://luca1paul.github.io/paul-cv-site/)

---

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript — no frameworks, no build step
- **Dashboard:** Python 3 (stdlib only)
- **Automation:** Ansible
- **CI/CD:** GitHub Actions
- **Hosting:** GitHub Pages

## Demo Projects

### Patching Workflow
Ansible playbook demonstrating a safe OS patching pattern with serial execution, fail-fast behavior, and safe-by-default targeting.

[View workflow runs](https://github.com/luca1paul/paul-cv-site/actions/workflows/patching-workflow.yml)

### RPM Package Check
Read-only Ansible compliance check that validates required packages are installed across all hosts.

[View workflow runs](https://github.com/luca1paul/paul-cv-site/actions/workflows/rpm-package-check.yml)

### Server Version Dashboard
Python script that collects system information from 30+ hosts and generates an HTML dashboard with grouped tables, online/offline status badges, and snapshot retention for offline hosts.

[View live dashboard](https://luca1paul.github.io/paul-cv-site/server-version-dashboard/) | [View workflow runs](https://github.com/luca1paul/paul-cv-site/actions/workflows/server-version-dashboard.yml)

> All projects run in **mock mode** — no real servers are contacted. Fixtures provide realistic data for portfolio demonstration.

## Run Locally

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## License

This is a personal portfolio. All rights reserved.
