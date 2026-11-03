/* CB Prod — applique le contenu du dossier « contenu » (textes, photos, FAQ) à la page.
   Utilisé par le site et par l'outil modifier-mon-site.html. Rien à modifier ici. */
(function () {
  var CB = window.CB = window.CB || {};
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function pick(o, L) {
    if (o == null) return '';
    if (typeof o !== 'object') return String(o);
    var v = o[L];
    return (v == null || v === '') ? (o.fr || '') : v;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* *mot* → italique doré ; retour à la ligne → saut de ligne */
  function md(s) { return esc(s).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>'); }
  function src(u, root) { if (!u) return ''; return /^(https?:|data:|blob:|\/)/.test(u) ? u : (root || '') + u; }
  function paras(s) { return String(s || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean); }
  CB.tr = pick; CB.md = md; CB.esc = esc; CB.src = src; CB.paras = paras;

  CB.appliquer = function (doc, L, root) {
    var T = CB.textes || {}, I = CB.images || {};
    function t(k) { return Object.prototype.hasOwnProperty.call(T, k) ? pick(T[k], L) : null; }
    each(doc.querySelectorAll('[data-t]'), function (el) {
      var v = t(el.getAttribute('data-t')); if (v != null) el.innerHTML = md(v);
    });
    each(doc.querySelectorAll('[data-tn]'), function (el) {
      var parts = el.getAttribute('data-tn').split('|'), nodes = el.childNodes;
      parts.forEach(function (p) {
        var i = p.indexOf(':'); if (i < 0) return;
        var n = nodes[+p.slice(0, i)], v = t(p.slice(i + 1));
        if (n && n.nodeType === 3 && v != null) n.nodeValue = v;
      });
    });
    each(doc.querySelectorAll('[data-ta]'), function (el) {
      el.getAttribute('data-ta').split('|').forEach(function (p) {
        var i = p.indexOf(':'); if (i < 0) return;
        var v = t(p.slice(i + 1)); if (v != null) el.setAttribute(p.slice(0, i), v);
      });
    });
    each(doc.querySelectorAll('img[data-img]'), function (el) {
      var o = I[el.getAttribute('data-img')]; if (o && o.image) el.setAttribute('src', src(o.image, root));
    });
    /* Chiffres animés : la valeur suit le texte (ex : « 30+ ») */
    each(doc.querySelectorAll('[data-count][data-t]'), function (el) {
      var m = el.textContent.match(/^(\d+)(.*)$/);
      if (m) { el.setAttribute('data-count', m[1]); if (m[2]) el.setAttribute('data-suf', m[2]); else el.removeAttribute('data-suf'); }
      else el.removeAttribute('data-count');
    });
    /* Type de projet : la valeur envoyée par e-mail suit le libellé */
    each(doc.querySelectorAll('label.type'), function (l) {
      var i = l.querySelector('input'), s = l.querySelector('span'); if (i && s) i.setAttribute('value', s.textContent.trim());
    });
    /* FAQ */
    var fl = doc.getElementById('faqList');
    if (fl && CB.faq) {
      fl.innerHTML = CB.faq.map(function (f, i) {
        return '<details' + (i ? '' : ' open') + '><summary>' + esc(pick(f.question, L)) + '</summary><div class="ans">' +
          paras(pick(f.reponse, L)).map(function (p) { return '<p>' + md(p) + '</p>'; }).join('') + '</div></details>';
      }).join('');
      each(doc.querySelectorAll('script[type="application/ld+json"]'), function (s) {
        if (s.textContent.indexOf('"FAQPage"') < 0) return;
        s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: CB.faq.map(function (f) {
          return { '@type': 'Question', name: pick(f.question, L), acceptedAnswer: { '@type': 'Answer', text: paras(pick(f.reponse, L)).join(' ').replace(/\*/g, '') } };
        }) });
      });
    }
    /* Titre et description (moteurs de recherche, partage) */
    var v;
    if ((v = t('seo.titre'))) doc.title = v;
    function meta(sel, val) { var m = doc.querySelector(sel); if (m && val) m.setAttribute('content', val); }
    meta('meta[name="description"]', t('seo.description'));
    meta('meta[property="og:title"]', t('seo.partage-titre'));
    meta('meta[property="og:description"]', t('seo.partage-description'));
  };
})();
