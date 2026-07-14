(function () {
  'use strict';

  var STORAGE_KEY = 'bif-theme';
  var THEMES = { light: true, dark: true };

  function normalize(theme) {
    return THEMES[theme] ? theme : 'light';
  }

  function read() {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return 'light';
    }
  }

  function updateThemeColor(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', theme === 'light' ? '#f4f1e8' : '#0d1b2a');
  }

  function apply(theme, persist) {
    var nextTheme = normalize(theme);
    document.documentElement.setAttribute('data-bif-theme', nextTheme);
    document.documentElement.style.colorScheme = nextTheme;

    if (persist !== false) {
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (error) {
        // O tema continua funcionando mesmo quando o navegador bloqueia o armazenamento.
      }
    }

    if (document.head) updateThemeColor(nextTheme);

    window.dispatchEvent(new CustomEvent('bif-theme-change', {
      detail: { theme: nextTheme }
    }));

    return nextTheme;
  }

  window.BIFTheme = {
    get: read,
    set: function (theme) { return apply(theme, true); },
    toggle: function () { return apply(read() === 'dark' ? 'light' : 'dark', true); },
    apply: function () { return apply(read(), false); }
  };

  apply(read(), false);

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) apply(event.newValue, false);
  });

  document.addEventListener('DOMContentLoaded', function () {
    apply(read(), false);
  });
}());
