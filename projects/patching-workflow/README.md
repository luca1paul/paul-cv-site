# Patching Workflow (Mock)

Portfolio demo of a safe patching pattern:
- safe-by-default targeting (`SAFE_DEFAULT`)
- serial execution (`serial: 1`)
- stop on first failure (`any_errors_fatal: true`)
- human-readable summaries + controller-side failure logs
- run report generated under `artifacts/<run_id>/patch-report.txt`

No SSH, no yum, no secrets. CI generates mock results per host.

## Run in CI
See `.github/workflows/patching-workflow.yml`

## Run locally (optional)
```bash
cd projects/patching-workflow
ansible-playbook -i ../hosts.ini patch_mock.yml -e target=dev --tags apply
