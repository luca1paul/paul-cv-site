// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/**
 * FULL ONLY:
 * - No chooser overlay
 * - No QA/DevOps filtering
 * - No theme switching
 */

// Force full mode attribute (safe)
document.documentElement.setAttribute("data-mode", "full");

// Hide project links that are still set to "#"
(function hideUnsetProjectLinks() {
  const links = [...document.querySelectorAll("[data-project-link]")];
  links.forEach(a => {
    const href = (a.getAttribute("href") || "").trim();
    a.style.display = (!href || href === "#") ? "none" : "inline-block";
  });
})();

/* =========================
   Terminal typewriter
   ========================= */

const terminalTextEl = document.getElementById("terminalText");
const terminalCopyBtn = document.getElementById("terminalCopy");

// #comment: speed tuning
const TYPE_MS = 14;          // per character
const LINE_PAUSE_MS = 260;   // pause after each line

const lines = Array.isArray(window.TERMINAL_LINES) ? window.TERMINAL_LINES : [];
let fullText = ""; // used for copy

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function typeTerminal() {
  if (!terminalTextEl || lines.length === 0) return;

  // Clear any existing content
  terminalTextEl.textContent = "";
  fullText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Type line char-by-char
    for (let c = 0; c < line.length; c++) {
      terminalTextEl.textContent += line[c];
      fullText += line[c];
      await sleep(TYPE_MS + Math.floor(Math.random() * 18));
    }

    // Newline (except optionally last)
    if (i !== lines.length - 1) {
      terminalTextEl.textContent += "\n";
      fullText += "\n";
      await sleep(LINE_PAUSE_MS);
    }
  }
}

// Start typing once page loads
typeTerminal();

/* Copy button copies the final text (even if typing is still in progress) */
if (terminalCopyBtn) {
  terminalCopyBtn.addEventListener("click", async () => {
    const textToCopy = (fullText || (terminalTextEl ? terminalTextEl.textContent : "")).trim();
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


/* Reveal on scroll */
(function setupReveal() {
  const els = [...document.querySelectorAll(".reveal")];
  if (els.length === 0) return;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    els.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        ent.target.classList.add("is-visible");
        io.unobserve(ent.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
})();

/* =========================
   Levels (FULL page)
   =========================
   #comment: edit these lists to match your real comfort level
*/
const levelsFull = {
  core: [
    "Manual QA (Exploratory / Regression / System)",
    "Bug reporting and triage (evidence-first)",
    "Linux basics + troubleshooting",
    "Ansible automation (safe runs / targeted checks)",
  ],
  strong: [
    "CI/CD concepts (GitHub Actions, Jenkins usage)",
    "Log-driven investigation (client/server)",
    "Documentation and runbooks",
    "Python/Bash for small tooling",
  ],
  familiar: [
    "Docker and Nginx basics",
    "RabbitMQ basics",
    "Cloud foundations (Azure AZ-900 prep)",
    "Networking fundamentals (Wireshark)",
  ]
};

function fillList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(x => `<li>${x}</li>`).join("");
}

fillList("levelCore", levelsFull.core);
fillList("levelStrong", levelsFull.strong);
fillList("levelFamiliar", levelsFull.familiar);
