(function (global) {
  const THEME_STORAGE_KEY = "web-course-theme";
  const THEMES = ["dark", "light"];

  function getStoredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored) ? stored : "dark";
  }

  function updateToggleUi(theme) {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    const isDark = theme === "dark";
    const icon = btn.querySelector(".theme-toggle__icon");
    const label = btn.querySelector(".theme-toggle__label");

    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (label) label.textContent = isDark ? "Light" : "Dark";
    btn.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
    btn.setAttribute("title", isDark ? "Switch to light theme" : "Switch to dark theme");
  }

  function applyTheme(theme) {
    const next = THEMES.includes(theme) ? theme : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    updateToggleUi(next);
    return next;
  }

  function initTheme() {
    applyTheme(getStoredTheme());

    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    btn.addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  global.WebCourseTheme = {
    getStoredTheme: getStoredTheme,
    applyTheme: applyTheme,
    initTheme: initTheme,
  };
})(window);
