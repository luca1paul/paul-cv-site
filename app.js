// app.js
// General site JavaScript
// ========================= */
// app.js

/* Enable "lite" effects on desktop Chrome to avoid white flashing + scroll jank */
(function enableChromeLiteFx() {
  const ua = navigator.userAgent;
  const isChrome = /Chrome\/\d+/.test(ua) && !/Edg\/|OPR\//.test(ua);

  // Also enable lite mode if user prefers reduced motion (extra stability)
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (isChrome || prefersReduced) {
    document.documentElement.classList.add("fx-lite");
  }
})();

/* Footer year (safe even if you don't have a footer element) */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* Force full mode attribute (safe) */
document.documentElement.setAttribute("data-mode", "full");

/* Hide project links that are still set to "#" */
(function hideUnsetProjectLinks() {
  const links = [...document.querySelectorAll("[data-project-link]")];
  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").trim();
    a.style.display = !href || href === "#" ? "none" : "inline-block";
  });
})();

/* =========================
   Terminal typewriter
   - Fast typing
   - Finish instantly if user scrolls past OR clicks Copy
   - Hard cap
   ========================= */
const terminalTextEl = document.getElementById("terminalText");
const terminalCopyBtn = document.getElementById("terminalCopy");

const TYPE_MS = 7;
const LINE_PAUSE_MS = 110;

function readTerminalLines() {
  const el = document.getElementById("terminalLines");
  if (!el) return [];
  try {
    const parsed = JSON.parse(el.textContent || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const lines = readTerminalLines();
let fullText = "";

let typingAborted = false;
let typingFinished = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function finishTerminalInstant() {
  if (!terminalTextEl || typingFinished) return;

  typingAborted = true;

  const done = lines.join("\n");
  terminalTextEl.textContent = done;

  fullText = done;
  typingFinished = true;
}

async function typeTerminal() {
  if (!terminalTextEl || lines.length === 0) return;

  terminalTextEl.textContent = "";
  fullText = "";

  for (let i = 0; i < lines.length; i++) {
    if (typingAborted) return;

    const line = lines[i];

    for (let c = 0; c < line.length; c++) {
      if (typingAborted) return;

      terminalTextEl.textContent += line[c];
      fullText += line[c];

      await sleep(TYPE_MS + Math.floor(Math.random() * 8));
    }

    if (i !== lines.length - 1) {
      terminalTextEl.textContent += "\n";
      fullText += "\n";
      await sleep(LINE_PAUSE_MS);
    }
  }

  typingFinished = true;
}

typeTerminal();

/* Skip typing once user scrolls past the terminal */
(function terminalSkipOnScrollPast() {
  const terminalWrap = document.querySelector(".terminal");
  if (!terminalWrap) return;

  if (!("IntersectionObserver" in window)) {
    setTimeout(() => {
      if (!typingFinished) finishTerminalInstant();
    }, 2200);
    return;
  }

  let seen = false;

  const io = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          seen = true;
        } else if (seen && !typingFinished) {
          finishTerminalInstant();
          io.disconnect();
        }
      }
    },
    { threshold: 0.12 }
  );

  io.observe(terminalWrap);

  setTimeout(() => {
    if (!typingFinished) {
      finishTerminalInstant();
      io.disconnect();
    }
  }, 2200);
})();

/* Copy button copies the final text */
if (terminalCopyBtn) {
  terminalCopyBtn.addEventListener("click", async () => {
    if (!typingFinished) finishTerminalInstant();

    const textToCopy = (
      fullText || (terminalTextEl ? terminalTextEl.textContent : "")
    ).trim();

    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      terminalCopyBtn.textContent = "Copied";
      setTimeout(() => (terminalCopyBtn.textContent = "Copy"), 1100);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();

      terminalCopyBtn.textContent = "Copied";
      setTimeout(() => (terminalCopyBtn.textContent = "Copy"), 1100);
    }
  });
}

/* =========================
   Reveal on scroll
   ========================= */
(function setupReveal() {
  const els = [...document.querySelectorAll(".reveal")];
  if (els.length === 0) return;

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          ent.target.classList.add("is-visible");
          io.unobserve(ent.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
})();

/* =========================
   Levels (FULL page)
   ========================= */
const levelsFull = {
  core: [
    "QA Testing: story, system, compatibility (risk-based)",
    "Defect Triage: repro, evidence, root cause correlation",
    "Linux: services, processes, logs, troubleshooting",
    "Git/GitHub: branches, PRs, merges (daily workflow)",
    "Ansible: inventory, targeting, playbook execution",
    "Puppet: runs, troubleshooting, data awareness",
    "Scripting: Python/Bash automation helpers",
    "Networking: HTTP/S, DNS, TCP/IP debugging",
  ],
  strong: [
    "CI/CD: GitHub Actions + Jenkins usage",
    "Investigations: client + server log correlation",
    "Documentation: handoffs, knowledge sharing",
    "Monitoring: Grafana dashboards, alert tuning",
    "IaC basics: YAML templating, config versioning",
    "Cloud Platforms: AWS & Azure (EC2, IAM, pipelines basics)",
    "API testing: Postman request/response validation",
    "Agile: Scrum/Kanban delivery in sprints",
  ],
  familiar: [
    "Docker: images, containers, compose-level usage",
    "Terraform: reading plans, small changes with guidance",
    "Security: firewalls/VPN/encryption fundamentals",
    "Load balancing: health checks, routing concepts",
    "RabbitMQ: queues/consumers, basic troubleshooting",
    "Wireshark: captures, filters, common network issues",
    "SQL: simple SELECT/WHERE/JOIN understanding",
    "Performance testing: concepts + tooling awareness",
    "Kubernetes: Deployments, Services, Probes, Resource Limits",
    "Helm: Chart creation, values templating, release management",
    "Security: NetworkPolicies, Firewalls, VPN fundamentals",
  ],
};

function fillList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map((x) => `<li>${x}</li>`).join("");
}

fillList("levelCore", levelsFull.core);
fillList("levelStrong", levelsFull.strong);
fillList("levelFamiliar", levelsFull.familiar);
