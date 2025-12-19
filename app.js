// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/**
 * Mode gating + filtering + content swapping
 * - Modal on first visit (no saved mode)
 * - Saves selection to localStorage
 * - Applies:
 *    1) Theme via <html data-mode="qa|devops|full">
 *    2) Content filter via [data-domain]
 *    3) Balanced hero content via swapping stats + terminal lines
 */
const MODE_KEY = "paul_cv_mode";

const overlay = document.getElementById("modeOverlay");
const changeModeBtn = document.getElementById("changeMode");
const modePill = document.getElementById("modePill");

// Terminal elements
const terminalTitle = document.getElementById("terminalTitle");
const terminalBody = document.getElementById("terminalBody");

// Stats elements
const statsEls = [
  { num: document.getElementById("stat1Num"), label: document.getElementById("stat1Label") },
  { num: document.getElementById("stat2Num"), label: document.getElementById("stat2Label") },
  { num: document.getElementById("stat3Num"), label: document.getElementById("stat3Label") },
  { num: document.getElementById("stat4Num"), label: document.getElementById("stat4Label") },
];

// Filterables: any element with data-domain
const filterables = [...document.querySelectorAll("[data-domain]")];

function setHtmlMode(mode) {
  document.documentElement.setAttribute("data-mode", mode);
}

function setPillText(mode) {
  if (!modePill) return;

  if (mode === "qa") modePill.textContent = "QA Focus • Testing & Quality";
  else if (mode === "devops") modePill.textContent = "DevOps Focus • Automation & Reliability";
  else modePill.textContent = "Full Spectrum • QA + DevOps";
}

/**
 * Filtering rule:
 * - full: show all
 * - qa/devops: show elements that include that domain OR are shared ("qa devops")
 */
function applyFilter(mode) {
  if (mode === "full") {
    filterables.forEach(el => el.classList.remove("is-hidden"));
    return;
  }

  filterables.forEach(el => {
    const domains = (el.dataset.domain || "").split(" ").filter(Boolean);
    const isShared = domains.includes("qa") && domains.includes("devops");
    const show = domains.includes(mode) || isShared;
    el.classList.toggle("is-hidden", !show);
  });
}

/**
 * Balanced content: same layout, different text per mode.
 */
function updateModeContent(mode) {
  const terminalByMode = {
    qa: {
      title: "paul@qa:~",
      body: [
        "$ adb logcat | grep -i crash",
        "$ postman run regression_collection.json",
        "$ jira issues \"project = XYZ AND status != Done\"",
        "$ reproduce → evidence → expected vs actual",
        "$ verify fix → regression pass → ready"
      ].join("\n")
    },
    devops: {
      title: "paul@ops:~",
      body: [
        "$ ansible-playbook ops/server-health-check.yml -l prod",
        "$ ansible-playbook ops/service-presence-check.yml -l staging",
        "$ ansible-playbook ops/safe-patching.yml -l app_nodes --serial 1",
        "$ python tools/server-inventory-dashboard.py --inventory hosts.ini",
        "$ gh run list --limit 5"
      ].join("\n")
    },
    full: {
      title: "paul@fullstack-ish:~",
      body: [
        "$ adb logcat | grep -i crash",
        "$ ansible-playbook ops/server-health-check.yml -l prod",
        "$ jira issues \"project = XYZ AND status != Done\"",
        "$ python tools/server-inventory-dashboard.py --inventory hosts.ini",
        "$ ship boring releases ✅"
      ].join("\n")
    }
  };

  const t = terminalByMode[mode] || terminalByMode.full;
  if (terminalTitle) terminalTitle.textContent = t.title;
  if (terminalBody) terminalBody.textContent = t.body;

  const statsByMode = {
    qa: [
      { num: "8+", label: "Years QA" },
      { num: "Mobile", label: "Android testing" },
      { num: "Triage", label: "Log-driven" },
      { num: "Agile", label: "Collaboration" },
    ],
    devops: [
      { num: "1+", label: "Years DevOps" },
      { num: "Linux", label: "Ops support" },
      { num: "Ansible", label: "Automation" },
      { num: "CI/CD", label: "Release hygiene" },
    ],
    full: [
      { num: "8+ / 1+", label: "QA / DevOps" },
      { num: "Linux", label: "Ops-ready QA" },
      { num: "Automation", label: "Less toil" },
      { num: "Clear", label: "Communication" },
    ],
  };

  const s = statsByMode[mode] || statsByMode.full;
  statsEls.forEach((el, i) => {
    if (!el.num || !el.label) return;
    el.num.textContent = s[i].num;
    el.label.textContent = s[i].label;
  });
}

function openOverlay() {
  if (!overlay) return;
  overlay.classList.add("is-open");
  document.body.classList.add("is-locked");
  overlay.setAttribute("aria-hidden", "false");
}

function closeOverlay() {
  if (!overlay) return;
  overlay.classList.remove("is-open");
  document.body.classList.remove("is-locked");
  overlay.setAttribute("aria-hidden", "true");
}

function chooseMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  setHtmlMode(mode);
  setPillText(mode);
  applyFilter(mode);
  updateModeContent(mode);
  closeOverlay();
}

// Modal button clicks
if (overlay) {
  overlay.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    chooseMode(btn.dataset.mode);
  });
}

// Change path button
if (changeModeBtn) {
  changeModeBtn.addEventListener("click", () => openOverlay());
}

// Initial load
const saved = localStorage.getItem(MODE_KEY);
if (!saved) {
  setHtmlMode("full");
  setPillText("full");
  applyFilter("full");
  updateModeContent("full");
  openOverlay();
} else {
  setHtmlMode(saved);
  setPillText(saved);
  applyFilter(saved);
  updateModeContent(saved);
}

// Terminal copy
const copyBtn = document.getElementById("terminalCopy");
if (copyBtn && terminalBody) {
  copyBtn.addEventListener("click", async () => {
    const text = terminalBody.textContent.trim();

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();

      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    }
  });
}
