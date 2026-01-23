# RPM Package Check (Mock, Read-Only)

rpm-package-check/README.md

Ansible playbook that validates required RPM packages across inventory groups.

- Inventory: `projects/hosts.ini` (clusters/dev/qa/staging/prod/tools)
- Mock mode: CI generates per-host `rpm -qa` outputs
- Output: report uploaded as a GitHub Actions artifact

## What it produces

- `artifacts/rpm-check-report.txt`

## Run (CI)

See `.github/workflows/rpm-package-check.yml`

```bash
cd projects/rpm-package-check
ansible-playbook -i ../hosts.ini rpm_check.yml
