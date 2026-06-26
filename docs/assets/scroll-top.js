(function () {
  var button = document.querySelector('.scroll-top');
  if (!button) {
    return;
  }

  var threshold = 480;

  function toggleVisibility() {
    var visible = window.scrollY > threshold;
    button.classList.toggle('is-visible', visible);
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.tabIndex = visible ? 0 : -1;
  }

  button.addEventListener('click', function () {
    var behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior: behavior });
  });

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();
})();
