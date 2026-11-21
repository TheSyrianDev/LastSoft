/* Theme: light and dark only. No system auto; the user chooses.
   Applied before first paint so the page never flashes the wrong theme.
   Preference is saved to localStorage under "lastai-site-theme". */
(function () {
  var root = document.documentElement;
  var button = document.querySelector('[data-theme-open]');
  if (!button) return;

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function paint() {
    var t = current();
    button.setAttribute('aria-label', 'Theme: ' + t + ' (click for the other one)');
    button.setAttribute('title', 'Theme: ' + t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', t === 'light' ? '#f7f3e8' : '#0b120e');
  }

  button.addEventListener('click', function () {
    var next = current() === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('lastai-site-theme', next); } catch (e) {}
    paint();
  });

  // Apply saved choice before paint. Default is light; flip to dark only
  // when the user picks it.
  var saved = localStorage.getItem('lastai-site-theme');
  if (saved === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }
  paint();
})();
