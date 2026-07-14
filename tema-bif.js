(function () {
  'use strict';

  var STORAGE_KEY = 'bif-theme';
  var THEMES = { light: true, dark: true };
  var TITLE_STYLE_ID = 'bif-page-title-standardizer';

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

  function ensureTitleStyleTag() {
    if (!document.head || document.getElementById(TITLE_STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = TITLE_STYLE_ID;
    style.textContent = '' +
      'html[data-bif-theme="light"] [data-bif-page-title]{' +
        'margin:0!important;' +
        'font-family:"Poppins",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;' +
        'font-size:clamp(1.7rem,1.28rem + 1.12vw,2.45rem)!important;' +
        'font-weight:800!important;' +
        'line-height:1.02!important;' +
        'letter-spacing:-0.035em!important;' +
        'color:#223650!important;' +
        'text-shadow:none!important;' +
      '}' +
      'html[data-bif-theme="light"] [data-bif-page-title] .bif-title-accent{' +
        'color:#b48718!important;' +
      '}' +
      'html[data-bif-theme="light"] [data-bif-page-subtitle]{' +
        'margin-top:8px!important;' +
        'color:#6d7a8f!important;' +
        'font-family:"DM Sans",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;' +
        'font-size:clamp(.9rem,.84rem + .15vw,1rem)!important;' +
        'line-height:1.55!important;' +
        'text-shadow:none!important;' +
      '}' +
      'html[data-bif-theme="light"] [data-bif-page-title-wrap]{' +
        'display:block!important;' +
      '}' +
      'html[data-bif-theme="light"] [data-bif-page-title-wrap] > [data-bif-page-title]{' +
        'max-width:18ch!important;' +
      '}' +
      '@media (max-width: 760px){' +
        'html[data-bif-theme="light"] [data-bif-page-title]{font-size:clamp(1.45rem,1.12rem + 1.35vw,2rem)!important;}' +
        'html[data-bif-theme="light"] [data-bif-page-subtitle]{font-size:.9rem!important;line-height:1.5!important;}' +
      '}' +
      'html[data-bif-theme="dark"] [data-bif-page-title]{text-shadow:none!important;}' +
      'html[data-bif-theme="dark"] [data-bif-page-title] .bif-title-accent{color:var(--gold-light,#e8c97a)!important;}';

    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isHiddenTitle(el) {
    if (!el || !el.isConnected) return true;
    if (el.closest('template, script, style, noscript, svg, defs')) return true;
    if (el.closest('[hidden], .modal[aria-hidden="true"], .hidden')) return true;
    var rect = el.getBoundingClientRect();
    return rect.width === 0 || rect.height === 0;
  }

  function markSubtitle(titleEl) {
    if (!titleEl || !titleEl.parentElement) return;

    var subtitle = null;
    var next = titleEl.nextElementSibling;

    while (next) {
      if (/^(P|DIV|SMALL)$/i.test(next.tagName)) {
        subtitle = next;
        break;
      }
      next = next.nextElementSibling;
    }

    if (!subtitle && titleEl.parentElement) {
      var paragraphs = titleEl.parentElement.querySelectorAll('p, .subtitle, .h-sub');
      if (paragraphs.length) subtitle = paragraphs[0];
    }

    if (subtitle) subtitle.setAttribute('data-bif-page-subtitle', '');
  }

  function wrapTitleText(titleEl) {
    if (!titleEl) return;

    titleEl.setAttribute('data-bif-page-title', '');
    if (titleEl.parentElement) titleEl.parentElement.setAttribute('data-bif-page-title-wrap', '');

    var spanChildren = titleEl.querySelectorAll(':scope > span');
    if (spanChildren.length) {
      spanChildren[spanChildren.length - 1].classList.add('bif-title-accent');
      markSubtitle(titleEl);
      return;
    }

    var plain = titleEl.getAttribute('data-bif-title-plain');
    if (!plain) {
      plain = (titleEl.textContent || '').replace(/\s+/g, ' ').trim();
      titleEl.setAttribute('data-bif-title-plain', plain);
    }

    if (!plain) {
      markSubtitle(titleEl);
      return;
    }

    var words = plain.split(' ');
    if (words.length < 2) {
      titleEl.textContent = plain;
      markSubtitle(titleEl);
      return;
    }

    var accent = words.pop();
    var lead = words.join(' ');
    titleEl.innerHTML = escapeHtml(lead) + ' <span class="bif-title-accent">' + escapeHtml(accent) + '</span>';
    markSubtitle(titleEl);
  }

  function findCandidateTitles() {
    var all = Array.prototype.slice.call(document.querySelectorAll('h1'));
    var visibleNearTop = all.filter(function (el) {
      if (isHiddenTitle(el)) return false;
      if (el.closest('.modal, dialog')) return false;
      var rect = el.getBoundingClientRect();
      return rect.top < 360;
    });

    if (visibleNearTop.length) return visibleNearTop;
    return all.filter(function (el) { return !isHiddenTitle(el); }).slice(0, 1);
  }

  function standardizePageTitles() {
    ensureTitleStyleTag();
    findCandidateTitles().forEach(wrapTitleText);
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

  window.addEventListener('bif-theme-change', function () {
    standardizePageTitles();
  });

  document.addEventListener('DOMContentLoaded', function () {
    apply(read(), false);
    standardizePageTitles();
    setTimeout(standardizePageTitles, 120);
    setTimeout(standardizePageTitles, 600);
  });

  window.addEventListener('load', function () {
    standardizePageTitles();
  });
}());
