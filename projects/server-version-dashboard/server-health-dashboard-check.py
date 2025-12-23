#!/usr/bin/env python3
"""
server_version_report.py

Features:
- Reads shared inventory from repo/projects/hosts.ini by default.
- Collects per-host data via:
  - SSH mode (default): runs one remote command and parses tagged output.
  - Mock mode (--mock or SVR_MOCK=1): reads local fixture files instead of SSH.
- Maintains a TSV snapshot so OFFLINE hosts show last-known values.
- Generates a simple grouped HTML dashboard (with ONLINE/OFFLINE badges).
"""

from __future__ import annotations

import argparse
import csv
import logging
import os
import re
import subprocess
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo

# ============================== LOGGING ==============================

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ============================== PATHS (REPO-SAFE DEFAULTS) ==============================

SCRIPT_PATH = Path(__file__).resolve()
SCRIPT_DIR = SCRIPT_PATH.parent  # repo/projects/server-version-dashboard
PROJECTS_DIR = SCRIPT_DIR.parent  # repo/projects
DEFAULT_INVENTORY = PROJECTS_DIR / "hosts.ini"  # shared inventory for multiple scripts

DEFAULT_OUTPUT_HTML = SCRIPT_DIR / "server_version_report.html"
DEFAULT_SNAPSHOT_FILE = SCRIPT_DIR / "server_version_snapshot.tsv"

# ============================== CONFIG (PLACEHOLDERS) ==============================

SSH_USER = os.getenv("SVR_SSH_USER", "automation")

PLATFORM_FACT_PATH = os.getenv("SVR_PLATFORM_FACT_PATH", "/etc/example/facts/platform.txt")
SYS_CONFIG_PATH = os.getenv("SVR_SYS_CONFIG_PATH", "/etc/example-app/sys.config")

DEFAULT_MAX_WORKERS = int(os.getenv("SVR_MAX_WORKERS", "15"))
STRICT_MODE = os.getenv("SVR_STRICT", "0") == "1"

SKIP_GROUPS = {"patch_targets:children"}

SNAPSHOT_FIELDS = [
    "FQDN",
    "Group",
    "Status",
    "Environment",
    "IP Address",
    "Port",
    "Proxy",
    "Last Snapshot",
]

OFFLINE_ROW_TEMPLATE = {
    "Status": "OFFLINE",
    "Environment": "",
    "IP Address": "",
    "Port": "",
    "Proxy": "",
    "Last Snapshot": "",
}

# ============================== SYSCONFIG PARSING ==============================

SYSCONFIG_PORT_PATTERN = re.compile(r"\{external_access_additional_fields,\s*\[(.*?)\]\}", re.S)
SYSCONFIG_PORT_VALUE_PATTERN = re.compile(r"\{port,\s*([0-9]+)\}")

PROXY_KEYWORDS = {
    "proxy.alpha": "proxy.alpha",
    "proxy.beta": "proxy.beta",
}

# Optional: cluster name collapse for display (generic)
CLUSTER_FQDN_PATTERN = re.compile(r"^([^.]+?)(?:-[0-9]+|[0-9]+)(\..+)$")

# ============================== RUNNERS ==============================


@dataclass(frozen=True)
class RunnerConfig:
    ssh_user: str
    platform_fact_path: str
    sys_config_path: str
    ssh_timeout_s: int = 30


class BaseRunner:
    def collect_tagged_snapshot(self, host: str) -> str:
        raise NotImplementedError


class SshRunner(BaseRunner):
    def __init__(self, cfg: RunnerConfig) -> None:
        self.cfg = cfg

    def _run_ssh(self, host: str, remote_cmd: str) -> str:
        full_host = f"{self.cfg.ssh_user}@{host}"
        cmd = [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=no",
            full_host,
            remote_cmd,
        ]
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=self.cfg.ssh_timeout_s,
            )
        except subprocess.TimeoutExpired:
            log.error("SSH timeout for host %s", host)
            return "ERROR: SSH command timed out"

        if result.returncode != 0:
            err = (result.stderr or "").strip()
            log.error("SSH error on %s: %s", host, err)
            return f"ERROR: {err or 'ssh failed'}"

        return (result.stdout or "").strip()

    def collect_tagged_snapshot(self, host: str) -> str:
        remote_cmd = (
            "env_line=$(grep -Ev '^[[:space:]]*#|^[[:space:]]*$' "
            f"{self.cfg.platform_fact_path} 2>/dev/null | head -n 1 || echo '') ; "
            "ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo '') ; "
            "echo 'ENV_LINE:'\"$env_line\" ; "
            "echo 'IP:'\"$ip\" ; "
            "echo 'SYSCONFIG_BEGIN' ; "
            f"cat {self.cfg.sys_config_path} 2>/dev/null || echo '' ; "
            "echo 'SYSCONFIG_END'"
        )
        return self._run_ssh(host, remote_cmd)


class MockRunner(BaseRunner):
    def __init__(self, fixtures_dir: Path) -> None:
        self.fixtures_dir = fixtures_dir

    def _host_dir(self, host: str) -> Path:
        return self.fixtures_dir / "hosts" / host

    def _read_first_line(self, candidates: Iterable[Path]) -> str:
        for p in candidates:
            if p.exists():
                for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                    s = line.strip()
                    if not s or s.startswith("#"):
                        continue
                    return s
        return ""

    def _read_all_text(self, candidates: Iterable[Path]) -> str:
        for p in candidates:
            if p.exists():
                return p.read_text(encoding="utf-8", errors="ignore")
        return ""

    def collect_tagged_snapshot(self, host: str) -> str:
        hdir = self._host_dir(host)
        if not hdir.exists() or (hdir / "offline").exists():
            return "ERROR: host offline (mock)"

        env_line = self._read_first_line(
            [hdir / "platform.txt", hdir / "env_line.txt", hdir / "facts_platform.txt"]
        )

        ip = self._read_first_line([hdir / "ip.txt", hdir / "hostname_I.txt"])
        ip = (ip.split() or [""])[0]

        sysconfig = self._read_all_text([hdir / "sys.config", hdir / "sysconfig.txt", hdir / "app.config"])

        lines = [
            f"ENV_LINE:{env_line}",
            f"IP:{ip}",
            "SYSCONFIG_BEGIN",
            sysconfig.rstrip("\n"),
            "SYSCONFIG_END",
        ]
        return "\n".join([x for x in lines if x != ""])


# ============================== HELPERS ==============================


def parse_sysconfig(sysconfig: str) -> dict[str, str]:
    result: dict[str, str] = {"Port": "", "Proxy": ""}
    if not sysconfig:
        return result

    block_match = SYSCONFIG_PORT_PATTERN.search(sysconfig)
    if block_match:
        block = block_match.group(1)
        port_match = SYSCONFIG_PORT_VALUE_PATTERN.search(block)
        if port_match:
            result["Port"] = port_match.group(1)

    lowered = sysconfig.lower()
    for keyword, value in PROXY_KEYWORDS.items():
        if keyword in lowered:
            result["Proxy"] = value
            break

    return result


def parse_env_from_line(env_line: str) -> str:
    s = (env_line or "").strip()
    if "=" in s:
        return s.split("=", 1)[1].strip()
    return s


def compute_display_fqdn(fqdn: str, group: str) -> str:
    if group != "clusters":
        return fqdn
    m = CLUSTER_FQDN_PATTERN.match(fqdn)
    if not m:
        return fqdn
    return m.group(1) + m.group(2)


# ============================== INVENTORY PARSER ==============================


def parse_hosts_ini(path: Path) -> tuple[list[str], dict[str, str]]:
    if not path.exists():
        raise SystemExit(f"hosts.ini file not found at {path}")

    text = path.read_text(encoding="utf-8", errors="ignore")
    hosts: list[str] = []
    host_to_group: dict[str, str] = {}

    current_group = "UNGROUPED"
    skip_current_group = False

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("[") and line.endswith("]"):
            group_name = line[1:-1].strip()
            current_group = group_name
            if (
                group_name in SKIP_GROUPS
                or group_name.endswith(":children")
                or group_name.endswith(":vars")
            ):
                skip_current_group = True
            else:
                skip_current_group = False
            continue

        if skip_current_group:
            continue

        hostname = line.split()[0]
        hosts.append(hostname)
        host_to_group[hostname] = current_group

    return hosts, host_to_group


# ============================== SNAPSHOT COLLECTION ==============================


def parse_tagged_snapshot_output(out: str) -> dict:
    if out.startswith("ERROR:"):
        return {"error": out}

    env_line = ""
    ip = ""
    sys_lines: list[str] = []
    in_sys = False

    for line in out.splitlines():
        if line.startswith("ENV_LINE:"):
            env_line = line[len("ENV_LINE:") :].strip()
        elif line.startswith("IP:"):
            ip = line[len("IP:") :].strip()
        elif line.strip() == "SYSCONFIG_BEGIN":
            in_sys = True
        elif line.strip() == "SYSCONFIG_END":
            in_sys = False
        elif in_sys:
            sys_lines.append(line)

    return {
        "env_line": env_line,
        "ip": ip,
        "sysconfig": "\n".join(sys_lines),
    }


def collect_host_info(runner: BaseRunner, host: str, group: str, strict: bool) -> dict:
    tagged = runner.collect_tagged_snapshot(host)
    snapshot = parse_tagged_snapshot_output(tagged)
    if "error" in snapshot:
        return {"FQDN": host, "Group": group, **OFFLINE_ROW_TEMPLATE}

    env = parse_env_from_line(snapshot.get("env_line", ""))
    ip = (snapshot.get("ip") or "").strip()
    sys_info = parse_sysconfig(snapshot.get("sysconfig", ""))

    row = {
        "FQDN": host,
        "Group": group,
        "Status": "ONLINE",
        "Environment": env,
        "IP Address": ip,
        "Port": sys_info["Port"],
        "Proxy": sys_info["Proxy"],
        "Last Snapshot": "",
    }

    if strict:
        assert row["Environment"], f"{host}: Environment missing"
        assert row["IP Address"], f"{host}: IP missing"
        assert row["Port"], f"{host}: Port missing"
        assert row["Proxy"], f"{host}: Proxy missing"
    else:
        for k in ("Environment", "IP Address", "Port", "Proxy"):
            if not row.get(k):
                log.warning("%s: %s missing (non-strict)", host, k)

    return row


# ============================== HTML ==============================


def generate_html(rows: list[dict], last_run: str) -> str:
    total_hosts = len(rows)
    online_count = sum(1 for r in rows if r.get("Status") == "ONLINE")
    offline_count = total_hosts - online_count

    def rows_to_html(table_rows: list[dict]) -> str:
        html_rows: list[str] = []
        for r in table_rows:
            display_fqdn = r.get("DisplayFQDN", r["FQDN"])
            status = r.get("Status", "UNKNOWN")
            last_snapshot = r.get("Last Snapshot", "")

            if status == "OFFLINE" and last_snapshot:
                fqdn_cell = f"{display_fqdn} (Last snapshot: {last_snapshot})"
            else:
                fqdn_cell = display_fqdn

            badge_class = "badge--online" if status == "ONLINE" else "badge--offline"
            status_html = f'<span class="badge {badge_class}">{escape(str(status))}</span>'
            row_class = "" if status == "ONLINE" else "is-offline"

            html_rows.append(
                f'<tr class="{row_class}">'
                f"<td>{escape(str(fqdn_cell))}</td>"
                f"<td>{status_html}</td>"
                f"<td>{escape(str(r.get('Environment','')))}</td>"
                f"<td>{escape(str(r.get('IP Address','')))}</td>"
                f"<td>{escape(str(r.get('Port','')))}</td>"
                f"<td>{escape(str(r.get('Proxy','')))}</td>"
                "</tr>"
            )
        return "\n".join(html_rows)

    group_to_rows: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        group_to_rows[r.get("Group", "UNGROUPED")].append(r)

    group_sections: list[str] = []
    for group_name in sorted(group_to_rows.keys()):
        raw_rows = group_to_rows[group_name]

        for r in raw_rows:
            r["DisplayFQDN"] = compute_display_fqdn(r["FQDN"], group_name)

        by_display: dict[str, dict] = {}
        for r in raw_rows:
            key = r["DisplayFQDN"]
            existing = by_display.get(key)
            if existing is None:
                by_display[key] = r
            else:
                if existing.get("Status") != "ONLINE" and r.get("Status") == "ONLINE":
                    by_display[key] = r

        merged_rows = list(by_display.values())
        merged_rows.sort(
            key=lambda rr: (0 if rr.get("Status") == "ONLINE" else 1, rr.get("DisplayFQDN", rr["FQDN"]))
        )

        section = f"""
    <h2>Group: {escape(group_name)}</h2>
    <table>
        <thead>
            <tr>
                <th>FQDN</th>
                <th>Status</th>
                <th>Platform</th>
                <th>IP Address</th>
                <th>Port</th>
                <th>Proxy</th>
            </tr>
        </thead>
        <tbody>
            {rows_to_html(merged_rows)}
        </tbody>
    </table>
"""
        group_sections.append(section)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Server Dashboard</title>
    <style>
        body {{
            font-family: system-ui, -apple-system, sans-serif;
            margin: 20px;
            background-color: #111;
            color: #eee;
        }}

        h1, h2 {{ margin-bottom: 0.4em; }}

        table {{
            border-collapse: collapse;
            margin-top: 1em;
            font-size: 13px;
            width: 100%;
        }}

        th, td {{
            border: 1px solid #444;
            padding: 4px 6px;
            text-align: left;
            white-space: nowrap;
        }}

        th {{ background: #222; position: sticky; top: 0; }}

        tr:nth-child(even) td {{ background: #1b1b1b; }}
        tr:nth-child(odd) td {{ background: #151515; }}

        .summary {{
            margin-bottom: 1em;
            padding: 0.5em 0.75em;
            background: #181818;
            border-radius: 4px;
            font-size: 14px;
        }}

        .badge {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: .02em;
        }}
        .badge--online {{
            background: rgba(34, 197, 94, .18);
            border: 1px solid rgba(34, 197, 94, .35);
            color: #9ae6b4;
        }}
        .badge--offline {{
            background: rgba(239, 68, 68, .18);
            border: 1px solid rgba(239, 68, 68, .35);
            color: #fecaca;
        }}

        tr.is-offline td {{ opacity: .78; }}
        tr.is-offline td:first-child {{ text-decoration: line-through; }}

        footer {{
            margin-top: 2em;
            font-size: 12px;
            color: #aaa;
            text-align: right;
        }}
    </style>
</head>
<body>
    <h1>Server Dashboard</h1>
    <div class="summary">
        <strong>Total hosts:</strong> {total_hosts}
        &nbsp;|&nbsp;
        <strong>Online:</strong> {online_count}
        &nbsp;|&nbsp;
        <strong>Offline:</strong> {offline_count}
    </div>
    {''.join(group_sections)}
    <footer>Last run: {escape(last_run)}</footer>
</body>
</html>
"""


# ============================== SNAPSHOT PERSISTENCE ==============================


def load_previous_snapshot(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    rows_by_fqdn: dict[str, dict] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            fqdn = row.get("FQDN")
            if fqdn:
                rows_by_fqdn[fqdn] = row
    return rows_by_fqdn


def save_snapshot(path: Path, rows_by_fqdn: dict[str, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=SNAPSHOT_FIELDS, delimiter="\t")
        writer.writeheader()
        for fqdn in sorted(rows_by_fqdn.keys()):
            row = rows_by_fqdn[fqdn]
            writer.writerow({field: row.get(field, "") for field in SNAPSHOT_FIELDS})


# ============================== CLI / MAIN ==============================


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="SSH-into-fleet -> snapshot -> HTML dashboard (portfolio-safe)")
    p.add_argument("--inventory", type=str, default=os.getenv("SVR_HOSTS_INI", str(DEFAULT_INVENTORY)))
    p.add_argument("--output", type=str, default=os.getenv("SVR_OUTPUT_HTML", str(DEFAULT_OUTPUT_HTML)))
    p.add_argument("--snapshot", type=str, default=os.getenv("SVR_SNAPSHOT_FILE", str(DEFAULT_SNAPSHOT_FILE)))
    p.add_argument("--max-workers", type=int, default=int(os.getenv("SVR_MAX_WORKERS", str(DEFAULT_MAX_WORKERS))))
    p.add_argument("--timezone", type=str, default=os.getenv("SVR_TIMEZONE", "UTC"))

    p.add_argument("--mock", action="store_true", default=os.getenv("SVR_MOCK", "0") == "1")
    p.add_argument(
        "--fixtures-dir",
        type=str,
        default=os.getenv("SVR_FIXTURES_DIR", str(SCRIPT_DIR / "fixtures")),
        help="Used only in --mock mode.",
    )
    return p


def resolve_path(value: str) -> Path:
    p = Path(value)
    return p if p.is_absolute() else (Path.cwd() / p).resolve()


def main() -> None:
    args = build_arg_parser().parse_args()

    inventory_path = Path(args.inventory)
    if not inventory_path.is_absolute():
        inventory_path = (Path.cwd() / inventory_path).resolve()

    output_html = resolve_path(args.output)
    snapshot_file = resolve_path(args.snapshot)

    tz = ZoneInfo(args.timezone)
    last_run_str = datetime.now(tz).strftime("%H:%M %d.%m.%Y")

    log.info("Inventory: %s", inventory_path)
    hosts, host_to_group = parse_hosts_ini(inventory_path)
    if not hosts:
        raise SystemExit("No hosts found in inventory after parsing.")

    previous_rows = load_previous_snapshot(snapshot_file)

    if args.mock:
        runner: BaseRunner = MockRunner(Path(args.fixtures_dir))
        strict = False
        log.info("Mode: MOCK (fixtures=%s)", args.fixtures_dir)
    else:
        cfg = RunnerConfig(
            ssh_user=SSH_USER,
            platform_fact_path=PLATFORM_FACT_PATH,
            sys_config_path=SYS_CONFIG_PATH,
        )
        runner = SshRunner(cfg)
        strict = STRICT_MODE
        log.info("Mode: SSH (user=%s)", SSH_USER)

    rows: list[dict] = []
    log.info("Collecting host data with max_workers=%d ...", args.max_workers)

    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        future_to_host = {
            executor.submit(
                collect_host_info,
                runner,
                host,
                host_to_group.get(host, "UNGROUPED"),
                strict,
            ): host
            for host in hosts
        }
        for future in as_completed(future_to_host):
            host = future_to_host[future]
            try:
                info = future.result()
            except Exception as e:
                log.exception("Failed to collect info for %s: %s", host, e)
                continue
            rows.append(info)
            log.info("Done: %s", host)

    rows_by_fqdn = {r["FQDN"]: r for r in rows}
    final_rows: list[dict] = []
    snapshot_rows: dict[str, dict] = {}

    for fqdn, current in rows_by_fqdn.items():
        status = current.get("Status", "UNKNOWN")

        if status == "ONLINE":
            now_str = datetime.now(tz).strftime("%d-%m-%Y %H:%M")
            current["Last Snapshot"] = now_str
            final_row = current
            snapshot_rows[fqdn] = current
        else:
            prev = previous_rows.get(fqdn)
            if prev:
                merged = prev.copy()
                merged["Status"] = "OFFLINE"
                if "Group" in current:
                    merged["Group"] = current["Group"]
                final_row = merged
                snapshot_rows[fqdn] = prev
            else:
                final_row = current

        final_rows.append(final_row)

    final_rows.sort(key=lambda r: r["FQDN"])

    log.info("Building HTML report ...")
    html = generate_html(final_rows, last_run_str)

    output_html.parent.mkdir(parents=True, exist_ok=True)
    log.info("Writing report to %s ...", output_html)
    output_html.write_text(html, encoding="utf-8")

    log.info("Writing snapshot to %s ...", snapshot_file)
    save_snapshot(snapshot_file, snapshot_rows)

    log.info("Done. Report: %s", output_html)


if __name__ == "__main__":
    main()
