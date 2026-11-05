/* CB Prod : petit fonctionnement des pages dédiées (menu mobile, barre du haut). Technique. */
(function () {
  'use strict';
  var nav = document.getElementById('nav'), burger = document.getElementById('burger'), links = document.getElementById('navLinks'), bar = document.getElementById('mBar');
  var open0 = burger ? burger.getAttribute('aria-label') : '', close0 = burger ? burger.getAttribute('data-close') : '';
  function setOpen(o) {
    links.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? close0 : open0);
    document.body.classList.toggle('menu-open', o);
    ['main', 'footer', '#mBar'].forEach(function (s) { var el = document.querySelector(s); if (el) el.inert = o; });
    if (o) setTimeout(function () { var a = links.querySelector('a'); if (a) a.focus(); }, 60);
  }
  if (burger && links) {
    burger.addEventListener('click', function () { setOpen(!links.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); burger.focus(); } });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }
  function onScroll() {
    var y = window.scrollY || 0;
    if (nav) nav.classList.toggle('solid', y > 40);
    if (bar) bar.classList.toggle('on', y > window.innerHeight * 0.5);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
