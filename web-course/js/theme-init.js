(function () {
  let key = "web-course-theme";
  let themes = ["dark", "light"];
  let stored = localStorage.getItem(key);
  let theme = themes.indexOf(stored) >= 0 ? stored : "dark";
  document.documentElement.setAttribute("data-theme", theme);
})();
