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

// Terminal copy button
const terminalBody = document.getElementById("terminalBody");
const terminalCopy = document.getElementById("terminalCopy");

if (terminalCopy && terminalBody) {
  terminalCopy.addEventListener("click", async () => {
    const text = terminalBody.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      terminalCopy.textContent = "Copied";
      setTimeout(() => (terminalCopy.textContent = "Copy"), 1100);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      terminalCopy.textContent = "Copied";
      setTimeout(() => (terminalCopy.textContent = "Copy"), 1100);
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
