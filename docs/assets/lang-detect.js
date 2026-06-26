(function () {
  var DONE_KEY = 'qfk-lang-auto-done';
  var PREF_KEY = 'qfk-lang';

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_error) {
      /* ignore private mode / blocked storage */
    }
  }

  function markLanguageChoice(lang) {
    storageSet(DONE_KEY, '1');
    if (lang === 'en' || lang === 'es') {
      storageSet(PREF_KEY, lang);
    }
  }

  var html = document.documentElement;
  var current = html.lang === 'es' ? 'es' : 'en';
  var paths = {
    en: html.dataset.langEn || './',
    es: html.dataset.langEs || 'es/'
  };

  function redirectTo(lang) {
    if (lang === current) {
      return;
    }

    var target = paths[lang];
    if (target) {
      window.location.replace(target);
    }
  }

  function browserPrefersSpanish() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];

    return list.some(function (lang) {
      return String(lang).toLowerCase().indexOf('es') === 0;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-lang-choice]').forEach(function (link) {
      link.addEventListener('click', function () {
        markLanguageChoice(link.getAttribute('data-lang-choice'));
      });
    });
  });

  var params = new URLSearchParams(window.location.search);
  var queryLang = params.get('lang');

  if (queryLang === 'en' || queryLang === 'es') {
    markLanguageChoice(queryLang);
    redirectTo(queryLang);
    return;
  }

  if (params.has('no-lang-redirect')) {
    markLanguageChoice(current);
    return;
  }

  if (storageGet(DONE_KEY)) {
    return;
  }

  var detected = browserPrefersSpanish() ? 'es' : 'en';
  markLanguageChoice(detected);
  redirectTo(detected);
})();
