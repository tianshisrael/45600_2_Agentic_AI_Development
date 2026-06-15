(function () {
  const LECTURES = [
    {
      title: "AI Agents",
      description:
        "Introduction to AI agents — architecture, workflows, and agentic development patterns.",
      url: "https://gamma.app/docs/AI-Agents-hlgj38btkim0stw?mode=present#card-a5abmjga0u18ily",
      tag: "Lecture 1",
      gradient: ["#1a2a3a", "#2d4a5e", "#6ee7b7"],
      icon: "agent",
    },
    {
      title: "MCP vs Skills",
      description:
        "Compare Model Context Protocol (MCP) with Cursor Skills — when to use each and how they fit together.",
      url: "https://gamma.app/docs/MCP-vs-Skills-ajmej0v6tyu3yde",
      tag: "Lecture 2",
      gradient: ["#1e1a2e", "#3d2d5c", "#a78bfa"],
      icon: "compare",
    },
  ];

  const PREREQUISITES = [
    {
      name: "Cursor",
      icon: "⌨",
      blurb: "AI-powered code editor used for agentic development in this course.",
      items: [
        {
          html: 'Download: <a href="https://cursor.com" target="_blank" rel="noopener noreferrer">cursor.com</a>',
        },
        { text: "Install the app for your OS (macOS, Windows, or Linux)" },
        { text: "Sign in and complete setup when you first open Cursor" },
      ],
    },
    {
      name: "Node.js",
      icon: "⬢",
      blurb: "JavaScript runtime for running scripts, package managers, and local dev servers.",
      items: [
        {
          html: 'Download: <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (LTS recommended)',
        },
        {
          html: 'Or use a version manager: <strong>macOS/Linux:</strong> <a href="https://github.com/nvm-sh/nvm" target="_blank" rel="noopener noreferrer">nvm</a> · <strong>Windows:</strong> <a href="https://github.com/coreybutler/nvm-windows" target="_blank" rel="noopener noreferrer">nvm-windows</a>',
        },
      ],
      verify: ["node --version", "npm --version"],
    },
    {
      name: "Docker",
      icon: "🐳",
      blurb: "Container platform for running services and reproducible environments.",
      items: [
        {
          html: 'Download: <a href="https://www.docker.com/products/docker-desktop" target="_blank" rel="noopener noreferrer">Docker Desktop</a>',
        },
        { text: "Install Docker Desktop (macOS/Windows) or Docker Engine (Linux)" },
        { text: "Start Docker Desktop (or the Docker daemon) before using containers" },
      ],
      verify: ["docker --version", "docker compose version"],
    },
    {
      name: "Git",
      icon: "⎇",
      blurb: "Version control for cloning repos, branches, and commits.",
      items: [
        {
          html: 'Download: <a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer">git-scm.com/downloads</a>',
        },
        { text: "macOS: often pre-installed; upgrade via Homebrew: brew install git" },
      ],
      verify: ["git --version"],
    },
  ];

  function lectureSvg(lecture) {
    const c0 = lecture.gradient[0];
    const c1 = lecture.gradient[1];
    const c2 = lecture.gradient[2];
    const isAgent = lecture.icon === "agent";
    const shapes = isAgent
      ? `
        <circle cx="200" cy="100" r="36" fill="${c2}" opacity="0.9"/>
        <circle cx="120" cy="140" r="22" fill="${c2}" opacity="0.5"/>
        <circle cx="280" cy="140" r="22" fill="${c2}" opacity="0.5"/>
        <path d="M200 136 L200 175" stroke="${c2}" stroke-width="3" opacity="0.7"/>
        <rect x="175" y="175" width="50" height="8" rx="4" fill="${c2}" opacity="0.6"/>
        <path d="M80 80 Q200 40 320 80" stroke="${c2}" stroke-width="2" fill="none" opacity="0.4"/>
      `
      : `
        <rect x="70" y="70" width="100" height="120" rx="12" fill="${c2}" opacity="0.25" stroke="${c2}" stroke-width="2"/>
        <rect x="230" y="70" width="100" height="120" rx="12" fill="${c2}" opacity="0.15" stroke="${c2}" stroke-width="2"/>
        <text x="120" y="135" text-anchor="middle" fill="${c2}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">MCP</text>
        <text x="280" y="135" text-anchor="middle" fill="${c2}" font-family="system-ui,sans-serif" font-size="18" font-weight="700">Skills</text>
        <path d="M175 130 L225 130" stroke="${c2}" stroke-width="2" marker-end="url(#arrow)"/>
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${c2}"/></marker></defs>
      `;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" role="img" aria-label="' +
      lecture.title +
      '">' +
      "<defs><linearGradient id=\"bg\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">" +
      '<stop offset="0%" style="stop-color:' +
      c0 +
      '"/>' +
      '<stop offset="50%" style="stop-color:' +
      c1 +
      '"/>' +
      '<stop offset="100%" style="stop-color:' +
      c0 +
      '"/>' +
      "</linearGradient></defs>" +
      '<rect width="400" height="225" fill="url(#bg)"/>' +
      shapes +
      "</svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function renderLectures() {
    const grid = document.getElementById("lecture-grid");
    if (!grid) return;

    grid.innerHTML = LECTURES.map(function (lec) {
      return (
        '<article class="lecture-panel">' +
        '<a class="lecture-panel__link" href="' +
        lec.url +
        '" target="_blank" rel="noopener noreferrer">Open ' +
        lec.title +
        " on Gamma</a>" +
        '<img class="lecture-panel__image" src="' +
        lectureSvg(lec) +
        '" alt="' +
        lec.title +
        ' — lecture cover" width="400" height="225" loading="lazy" />' +
        '<div class="lecture-panel__body">' +
        '<span class="lecture-panel__tag">' +
        lec.tag +
        "</span>" +
        '<h3 class="lecture-panel__title">' +
        lec.title +
        "</h3>" +
        '<p class="lecture-panel__desc">' +
        lec.description +
        "</p>" +
        '<span class="lecture-panel__cta">View presentation</span>' +
        "</div></article>"
      );
    }).join("");
  }

  function renderCodeBlock(lines, id) {
    const code = lines.join("\n");
    return (
      '<div class="code-block">' +
      '<div class="code-block__header"><span>bash</span>' +
      '<button type="button" data-copy="' +
      id +
      '" aria-label="Copy commands">Copy</button></div>' +
      '<pre id="' +
      id +
      '"><code>' +
      code.replace(/</g, "&lt;") +
      "</code></pre></div>"
    );
  }

  function renderPrerequisites() {
    const list = document.getElementById("prereq-list");
    if (!list) return;

    list.innerHTML = PREREQUISITES.map(function (tool, i) {
      const itemsHtml = tool.items
        .map(function (item) {
          return item.html ? "<li>" + item.html + "</li>" : "<li>" + item.text + "</li>";
        })
        .join("");
      const verifyHtml =
        tool.verify && tool.verify.length ? renderCodeBlock(tool.verify, "verify-" + i) : "";
      return (
        '<article class="prereq-card">' +
        '<h3><span class="icon" aria-hidden="true">' +
        tool.icon +
        "</span> " +
        tool.name +
        "</h3>" +
        "<p>" +
        tool.blurb +
        "</p>" +
        "<ul>" +
        itemsHtml +
        "</ul>" +
        verifyHtml +
        "</article>"
      );
    }).join("");
  }

  function initCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const pre = document.getElementById(btn.getAttribute("data-copy"));
        if (!pre) return;
        const text = pre.textContent;
        navigator.clipboard
          .writeText(text)
          .then(function () {
            btn.textContent = "Copied";
            btn.classList.add("copied");
            setTimeout(function () {
              btn.textContent = "Copy";
              btn.classList.remove("copied");
            }, 2000);
          })
          .catch(function () {
            btn.textContent = "Failed";
          });
      });
    });
  }

  function init() {
    if (window.WebCourseTheme) {
      window.WebCourseTheme.initTheme();
    }
    renderLectures();
    renderPrerequisites();
    initCopyButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
