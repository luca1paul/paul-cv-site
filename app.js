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
let targetText = "";

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
  targetText = done;
  typingFinished = true;
}

async function typeTerminal() {
  if (!terminalTextEl || lines.length === 0) return;

  terminalTextEl.textContent = "";
  fullText = "";
  targetText = "";

  // Optimization: Decouple logic from rendering for smoother mobile performance
  const renderLoop = () => {
    if (typingFinished) return;
    if (terminalTextEl.textContent !== targetText) {
      terminalTextEl.textContent = targetText;
    }
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  for (let i = 0; i < lines.length; i++) {
    if (typingAborted) return;

    const line = lines[i];

    for (let c = 0; c < line.length; c++) {
      if (typingAborted) return;

      targetText += line[c];
      fullText += line[c];

      await sleep(TYPE_MS + Math.floor(Math.random() * 8));
    }

    if (i !== lines.length - 1) {
      targetText += "\n";
      fullText += "\n";
      await sleep(LINE_PAUSE_MS);
    }
  }

  typingFinished = true;
  terminalTextEl.textContent = fullText;
}

typeTerminal();

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

  // Stagger reveal for cards inside sections
  function staggerCards(el) {
    const cards = el.querySelectorAll('.card');
    cards.forEach((card, index) => {
      card.style.setProperty('--delay', `${index * 0.05}s`);
    });
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          ent.target.classList.add("is-visible");
          staggerCards(ent.target);
          io.unobserve(ent.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -60px 0px" }
  );

  els.forEach((el) => io.observe(el));
})();

/* =========================
   Stats Counter Animation
   ========================= */
(function setupStatsCounter() {
  const statsBar = document.querySelector(".statsBar");
  if (!statsBar) return;

  const animateValue = (obj, start, end, duration, isFloat, suffix) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease out quart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      const current = start + (end - start) * ease;
      
      obj.textContent = isFloat 
        ? current.toFixed(1) + suffix 
        : Math.floor(current) + suffix;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Animate numbers
        const nums = entry.target.querySelectorAll(".stat__num");
        nums.forEach(el => {
          const text = el.textContent.trim();
          const match = text.match(/([\d\.]+)(.*)/); // Capture number and suffix (e.g. "1.8" and "+")
          
          if (match) {
            const val = parseFloat(match[1]);
            const suffix = match[2] || "";
            const isFloat = match[1].includes(".");
            animateValue(el, 0, val, 2000, isFloat, suffix);
          }
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(statsBar);
})();

/* =========================
   Scroll Spy (Nav Highlight)
   ========================= */
(function scrollSpy() {
  const sections = document.querySelectorAll("section[id], header[id]");
  const navLinks = document.querySelectorAll(".nav__links a");

  function updateActiveLink() {
    let currentId = "";
    
    // Scanline at 120px from top (nav height + some buffer)
    const scanline = window.scrollY + 120;

    // Special case: Very bottom of the page
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
      currentId = "contact";
    } else {
      sections.forEach((sec) => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        if (scanline >= top && scanline < top + height) {
          currentId = sec.getAttribute("id");
        }
      });
    }

    if (currentId) {
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${currentId}`);
      });
    }
  }

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  // Initial check
  updateActiveLink();
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

/* =========================
   Mobile Menu Toggle
   ========================= */
(function setupMobileMenu() {
  const nav = document.querySelector(".nav");
  const toggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const links = navLinks?.querySelectorAll("a");

  if (!toggle || !navLinks) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle("nav--open");
    toggle.setAttribute("aria-expanded", isOpen);
  });

  // Close menu when clicking a link
  links?.forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("nav--open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Close menu on scroll
  window.addEventListener("scroll", () => {
    if (nav.classList.contains("nav--open")) {
      nav.classList.remove("nav--open");
      toggle.setAttribute("aria-expanded", "false");
    }
  }, { passive: true });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("nav--open") && !nav.contains(e.target)) {
      nav.classList.remove("nav--open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
})();

/* =========================
   Analytics: Resume Download
   ========================= */
(function setupResumeTracking() {
  const links = document.querySelectorAll('a[href*="Paul_Luca_DevOps_Eng_Resume.pdf"]');

  links.forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof gtag === "function") {
        let location = "Other";
        if (link.closest(".nav")) location = "Navigation";
        else if (link.closest(".hero")) location = "Hero";

        gtag("event", "download_resume", {
          event_category: "Engagement",
          event_label: location,
        });
      }
    });
  });
})();
