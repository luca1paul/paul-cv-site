// app.js

/* =========================
   Footer year (safe even if you don't have a footer element)
   ========================= */
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
   - Faster typing
   - Finish instantly if user scrolls past
   - Hard cap (never keeps recruiters waiting)
   ========================= */

const terminalTextEl = document.getElementById("terminalText");
const terminalCopyBtn = document.getElementById("terminalCopy");

// Speed tuning
const TYPE_MS = 8; // per character (faster)
const LINE_PAUSE_MS = 120; // pause after each line (faster)

const lines = Array.isArray(window.TERMINAL_LINES) ? window.TERMINAL_LINES : [];
let fullText = ""; // used for copy

let typingAborted = false;
let typingFinished = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Instantly prints the full terminal output.
 * Why: Recruiters scroll; don't make them wait for a typewriter effect.
 */
function finishTerminalInstant() {
  if (!terminalTextEl || typingFinished) return;

  typingAborted = true;

  const done = lines.join("\n");
  terminalTextEl.textContent = done;

  fullText = done;
  typingFinished = true;
}

/**
 * Types terminal output char-by-char unless aborted.
 * Why: Visual flair, but still respects speed/skip conditions.
 */
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

      // small randomness so it looks natural, but still fast
      await sleep(TYPE_MS + Math.floor(Math.random() * 10));
    }

    if (i !== lines.length - 1) {
      terminalTextEl.textContent += "\n";
      fullText += "\n";
      await sleep(LINE_PAUSE_MS);
    }
  }

  typingFinished = true;
}

// Start typing once page loads
typeTerminal();

/**
 * Skip typing once user scrolls past the terminal.
 * Why: Most people won't wait; this preserves the info.
 */
(function terminalSkipOnScrollPast() {
  const terminalWrap = document.querySelector(".terminal");
  if (!terminalWrap) return;

  // If IntersectionObserver isn't available, just hard-cap
  if (!("IntersectionObserver" in window)) {
    setTimeout(() => {
      if (!typingFinished) finishTerminalInstant();
    }, 2500);
    return;
  }

  let seen = false;

  const io = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          // Terminal entered viewport at least once
          seen = true;
        } else if (seen && !typingFinished) {
          // User has scrolled past it
          finishTerminalInstant();
          io.disconnect();
        }
      }
    },
    { threshold: 0.12 }
  );

  io.observe(terminalWrap);

  // Hard cap: always finish quickly even if user doesn't scroll
  setTimeout(() => {
    if (!typingFinished) {
      finishTerminalInstant();
      io.disconnect();
    }
  }, 2500);
})();

/* Copy button copies the final text (even if typing is still in progress) */
if (terminalCopyBtn) {
  terminalCopyBtn.addEventListener("click", async () => {
    const textToCopy = (
      fullText || (terminalTextEl ? terminalTextEl.textContent : "")
    ).trim();

    try {
      await navigator.clipboard.writeText(textToCopy);
      terminalCopyBtn.textContent = "Copied";
      setTimeout(() => (terminalCopyBtn.textContent = "Copy"), 1100);
    } catch {
      // Fallback for older browsers
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

  if (reduce) {
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
    "Manual QA: story, system, compatibility",
    "Defects: clear repro, evidence, prioritization",
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
    "Monitoring: Grafana dashboards",
    "Cloud: AWS/Azure fundamentals",
    "API testing: Postman request/response validation",
    "Agile: Scrum/Kanban delivery in sprints",
  ],
  familiar: [
    "Docker: images, containers, compose-level usage",
    "Terraform: reading plans, small changes with guidance",
    "RabbitMQ: queues/consumers, basic troubleshooting",
    "Wireshark: captures, filters, common network issues",
    "SQL: simple SELECT/WHERE/JOIN understanding",
    "Load balancing: health checks, routing concepts",
    "Security: firewalls/VPN/encryption fundamentals",
    "Performance testing: concepts + tooling awareness",
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