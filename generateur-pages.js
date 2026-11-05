/* CB Prod : générateur des pages dédiées (SEO).
   Technique, ne pas modifier sans aide. Les textes de ces pages se changent dans
   contenu/pages.js (ou avec modifier-mon-site.html, rubrique « Pages Google »).
   Ce fichier fabrique, à partir du dossier « contenu », toutes les pages
   (matériaux, gammes, usages, entreprise, zones) en FR, EN et PT, ainsi que sitemap.xml.
   Il est utilisé par modifier-mon-site.html (bouton Enregistrer) et par
   outils/generer-pages.js (ligne de commande, pour le développeur). */
(function (root) {
  'use strict';
  var LANGS = ['fr', 'en', 'pt'];
  var LOCALE = { fr: 'fr_FR', en: 'en_GB', pt: 'pt_PT' };
  var INLINE_JS = "document.documentElement.classList.add('js')";
  var MARK_A = '<!-- pages-seo:debut (généré automatiquement) -->';
  var MARK_B = '<!-- pages-seo:fin -->';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tr(o, L) { if (o == null) return ''; if (typeof o !== 'object') return String(o); return (o[L] != null && String(o[L]).trim() !== '') ? String(o[L]) : String(o.fr || ''); }
  function strip(s) { return String(s || '').replace(/\*/g, ''); }
  function inline(s) { return esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>'); }
  function rich(txt) {
    var out = [];
    String(txt || '').split(/\n\s*\n/).forEach(function (block) {
      block = block.trim(); if (!block) return;
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^\s*-\s+/.test(l); })) {
        out.push('<ul class="pg-list">' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*-\s+/, '')) + '</li>'; }).join('') + '</ul>');
      } else {
        var paras = [], list = [];
        lines.forEach(function (l) {
          if (/^\s*-\s+/.test(l)) list.push('<li>' + inline(l.replace(/^\s*-\s+/, '')) + '</li>');
          else { if (list.length) { paras.push('<ul class="pg-list">' + list.join('') + '</ul>'); list = []; } paras.push(inline(l)); }
        });
        var html = '', buf = [];
        paras.forEach(function (p) { if (p.indexOf('<ul') === 0) { if (buf.length) html += '<p>' + buf.join('<br>') + '</p>'; buf = []; html += p; } else buf.push(p); });
        if (buf.length) html += '<p>' + buf.join('<br>') + '</p>';
        if (list.length) html += '<ul class="pg-list">' + list.join('') + '</ul>';
        out.push(html);
      }
    });
    return out.join('\n');
  }
  function slugify(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function trunc(s, n) { s = strip(s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; s = s.slice(0, n - 1); return s.slice(0, s.lastIndexOf(' ')) + '…'; }

  function slugGamme(g) { return { fr: 'plan-de-travail-' + slugify(tr(g.titre, 'fr')), en: slugify(tr(g.titre, 'en')) + '-worktops', pt: 'bancadas-' + slugify(tr(g.titre, 'pt')) }; }

  function genererPages(D, opts) {
    opts = opts || {};
    var P = D.pages || {};
    var SITE = (P.site || 'https://www.cbproducao.com').replace(/\/+$/, '');
    var LB = P.libelles || {};
    function lb(k, L) { return tr(LB[k], L) || k; }
    var T = D.textes || {};
    function tx(k, L) { return strip(tr(T[k], L)); }
    var today = opts.date || new Date().toISOString().slice(0, 10);
    var cat = D.catalogue || [];
    var catById = {}; cat.forEach(function (g) { catById[g.id] = g; });

    /* ── Registre de toutes les pages ── */
    var reg = []; var byId = {};
    function add(pg) { reg.push(pg); byId[pg.id] = pg; }
    function prefix(L) { return L === 'fr' ? '' : L + '/'; }
    function relPath(pg, L) { return prefix(L) + pg.slug[L] + '/'; }

    var hub = P.hub || {}; hub.id = 'materiaux';
    add({ id: 'materiaux', kind: 'hub', slug: hub.slug, data: hub, parent: null });

    var famIds = {}; var inFam = {};
    (P.familles || []).forEach(function (f) {
      var gs = (f.gammes || []).filter(function (id) { return catById[id]; });
      gs.forEach(function (id) { inFam[id] = f.id; });
      famIds[f.id] = true;
      add({ id: 'famille:' + f.id, kind: 'famille', slug: f.slug, data: f, gammes: gs, parent: 'materiaux' });
    });
    var GM = P.gammes || {};
    cat.forEach(function (g) {
      var d = GM[g.id] || {};
      var slug = d.slug || slugGamme(g);
      add({ id: 'gamme:' + g.id, kind: 'gamme', slug: slug, data: d, g: g, parent: inFam[g.id] ? 'famille:' + inFam[g.id] : 'materiaux' });
    });
    (P.pages || []).forEach(function (p) {
      add({ id: p.id, kind: p.type || 'page', slug: p.slug, data: p, parent: p.parent || null });
    });

    function url(pg, L) { return SITE + '/' + relPath(pg, L); }
    function href(fromPg, fromL, toPg, toL, hash) {
      var depth = (fromL === 'fr' ? 1 : 2);
      var up = new Array(depth + 1).join('../');
      if (toPg === 'home') return up + prefix(toL || fromL) + (hash || '');
      return up + relPath(toPg, toL || fromL) + (hash || '');
    }
    function rootRel(L) { return L === 'fr' ? '../' : '../../'; }
    function img(src, L) { if (!src) return ''; return /^(https?:|data:)/.test(src) ? src : rootRel(L) + src.replace(/^\.?\//, ''); }
    function absImg(src) { if (!src) return ''; return /^https?:/.test(src) ? src : SITE + '/' + src.replace(/^\.?\//, ''); }

    function name(pg, L) {
      if (pg.kind === 'gamme') return strip(tr(pg.g.titre, L));
      return strip(tr(pg.data.nom, L)) || strip(tr(pg.data.h1, L));
    }
    function chain(pg) { var c = []; var p = pg; while (p) { c.unshift(p); p = p.parent ? byId[p.parent] : null; } return c; }

    /* ── Morceaux communs ── */
    function header(pg, L) {
      var H = function (id, hash) { return byId[id] ? href(pg, L, byId[id]) : href(pg, L, 'home', L, hash); };
      var items = [
        ['menu.04', H('materiaux'), 'materiaux'], ['menu.05', H('guide'), 'guide'], ['menu.06', H('realisations'), 'realisations'],
        ['menu.07', H('usine'), 'usine'], ['menu.08', H('professionnels'), 'professionnels'], ['menu.09', H('faq'), 'faq'], ['menu.10', H('contact'), 'contact']
      ];
      var cur = chain(pg).map(function (x) { return x.id; });
      var li = items.map(function (it) { return '<li><a href="' + it[1] + '"' + (cur.indexOf(it[2]) >= 0 ? ' aria-current="true"' : '') + '>' + esc(tx(it[0], L)) + '</a></li>'; }).join('\n');
      var devis = href(pg, L, 'home', L, '#devis');
      var langs = LANGS.map(function (l) {
        return '<a href="' + href(pg, L, pg, l) + '" hreflang="' + l + '" lang="' + l + '"' + (l === L ? ' aria-current="page"' : '') + ' title="' + esc(lb('langue', l)) + '">' + l.toUpperCase() + '</a>';
      }).join('');
      return '<a class="skip" href="#main">' + esc(tx('divers.01', L)) + '</a>\n' +
        '<header class="nav" id="nav">\n<div class="wrap">\n' +
        '<a class="logo" href="' + href(pg, L, 'home', L) + '" aria-label="' + esc(lb('accueil_aria', L)) + '">CB<em>.</em>PROD</a>\n' +
        '<nav aria-label="' + esc(lb('nav_aria', L)) + '" style="margin-left:auto;display:contents">\n<ul class="nav-links" id="navLinks">\n' + li +
        '\n<li class="m-only"><a class="btn btn-gold" href="' + devis + '">' + esc(tx('menu.11', L)) + ' <span aria-hidden="true" class="ar">→</span></a></li>\n</ul>\n</nav>\n' +
        '<nav aria-label="' + esc(lb('langue_aria', L)) + '" class="lang">' + langs + '</nav>\n' +
        '<a class="btn btn-sm nav-cta" href="' + devis + '">' + esc(tx('menu.12', L)) + '</a>\n' +
        '<button aria-controls="navLinks" aria-expanded="false" aria-label="' + esc(lb('menu_ouvrir', L)) + '" data-close="' + esc(lb('menu_fermer', L)) + '" class="burger" id="burger"><span></span><span></span><span></span></button>\n' +
        '</div>\n</header>\n';
    }
    function crumbs(pg, L) {
      var c = chain(pg);
      var items = ['<li><a href="' + href(pg, L, 'home', L) + '">' + esc(lb('accueil', L)) + '</a></li>'];
      c.forEach(function (p, i) {
        if (i === c.length - 1) items.push('<li aria-current="page">' + esc(name(p, L)) + '</li>');
        else items.push('<li><a href="' + href(pg, L, p) + '">' + esc(name(p, L)) + '</a></li>');
      });
      return '<nav class="pg-crumbs" aria-label="' + esc(lb('fil_aria', L)) + '"><ol>' + items.join('') + '</ol></nav>';
    }
    function crumbsLd(pg, L) {
      var c = chain(pg);
      var list = [{ '@type': 'ListItem', position: 1, name: lb('accueil', L), item: SITE + '/' + prefix(L) }];
      c.forEach(function (p, i) { list.push({ '@type': 'ListItem', position: i + 2, name: name(p, L), item: url(p, L) }); });
      return { '@type': 'BreadcrumbList', itemListElement: list };
    }
    function hero(pg, L, d, bg) {
      var devis = href(pg, L, 'home', L, '#devis');
      var tel = L === 'pt' ? ['tel:+351219672216', '+351 219 672 216'] : ['tel:+33188326449', '+33 (1) 88 32 64 49'];
      var eyebrow = pg.kind === 'gamme' ? strip(tr(pg.g.fournisseur, L)).replace(/^[◈\s]+/, '') : (strip(tr(d.surtitre, L)) || lb('surtitre_' + pg.kind, L));
      return '<section class="pg-hero dark"' + (bg ? ' style="--pg-bg:url(\'' + esc(bg) + '\')"' : '') + '>\n<div class="wrap">\n' + crumbs(pg, L) +
        '\n<p class="eyebrow">' + esc(eyebrow) + '</p>\n<h1 class="pg-h1">' + inline(tr(d.h1, L) || name(pg, L)) + '</h1>\n' +
        (tr(d.intro, L) ? '<p class="lead pg-intro">' + inline(tr(d.intro, L)) + '</p>\n' : '') +
        '<div class="btn-row"><a class="btn btn-gold" href="' + devis + '">' + esc(lb('cta_devis', L)) + ' <span aria-hidden="true" class="ar">→</span></a>' +
        '<a class="btn btn-ghost-w" href="' + tel[0] + '">' + esc(lb('appeler', L)) + ' ' + esc(tel[1]) + '</a></div>\n</div>\n</section>\n';
    }
    function sections(d, L, from) {
      var s = (d.sections || []).filter(function (x) { return strip(tr(x.texte, L)).trim(); });
      if (!s.length) return '';
      return '<section class="sec pg-sec"><div class="wrap pg-prose">\n' + s.map(function (x) {
        return '<div class="pg-block"><h2 class="h3">' + inline(tr(x.titre, L)) + '</h2>\n' + rich(tr(x.texte, L)) + '</div>';
      }).join('\n') + '\n</div></section>\n';
    }
    function faqHtml(list, L, title) {
      list = (list || []).filter(function (q) { return tr(q.question, L); });
      if (!list.length) return '';
      return '<section class="sec pg-faq" style="background:var(--white)"><div class="wrap">\n<h2 class="h2" style="text-align:center">' + inline(title || lb('faq_titre', L)) + '</h2>\n<div class="faq">\n' +
        list.map(function (q) { return '<details><summary>' + esc(strip(tr(q.question, L))) + '</summary><div class="ans">' + rich(tr(q.reponse, L)) + '</div></details>'; }).join('\n') +
        '\n</div>\n</div></section>\n';
    }
    function faqLd(list, L) {
      list = (list || []).filter(function (q) { return tr(q.question, L) && tr(q.reponse, L); });
      if (!list.length) return null;
      return { '@type': 'FAQPage', mainEntity: list.map(function (q) { return { '@type': 'Question', name: strip(tr(q.question, L)), acceptedAnswer: { '@type': 'Answer', text: strip(tr(q.reponse, L)).replace(/\n+/g, ' ') } }; }) };
    }
    function gammeImage(g) {
      var p = (g.photos || [])[0]; if (p && p.image) return p.image;
      var c = (g.coloris || []).filter(function (x) { return x.image; })[0]; return c ? c.image : '';
    }
    function famImage(pg) {
      var d = pg.data; if (d.image) return d.image;
      for (var i = 0; i < (pg.gammes || []).length; i++) { var im = gammeImage(catById[pg.gammes[i]]); if (im) return im; }
      return '';
    }
    function card(from, L, to) {
      var t, sub, im, count = '';
      if (to.kind === 'gamme') { t = strip(tr(to.g.titre, L)); sub = trunc(tr(to.g.description, L), 130); im = gammeImage(to.g); count = (to.g.coloris || []).length; }
      else if (to.kind === 'famille') { t = name(to, L); sub = trunc(tr(to.data.intro, L), 130); im = famImage(to); count = to.gammes.reduce(function (n, id) { return n + (catById[id].coloris || []).length; }, 0); }
      else { t = name(to, L); sub = trunc(tr(to.data.intro, L), 130); im = to.data.image || ''; }
      return '<a class="pg-card" href="' + href(from, L, to) + '">' +
        (im ? '<span class="pg-card-ph"><img src="' + esc(img(im, L)) + '" alt="" loading="lazy" decoding="async"></span>' : '<span class="pg-card-ph pg-card-ph-empty"></span>') +
        '<span class="pg-card-tx"><span class="pg-card-t">' + esc(t) + '</span>' + (count ? '<span class="pg-card-n">' + count + ' ' + esc(lb('coloris', L)) + '</span>' : '') +
        '<span class="pg-card-d">' + esc(sub) + '</span><span class="pg-card-go">' + esc(lb('decouvrir', L)) + ' <span aria-hidden="true">→</span></span></span></a>';
    }
    function cards(from, L, list, title, intro) {
      list = list.filter(Boolean); if (!list.length) return '';
      return '<section class="sec pg-cards-sec" style="background:var(--cream2)"><div class="wrap">\n' +
        (title ? '<h2 class="h2">' + inline(title) + '</h2>\n' : '') + (intro ? '<p class="lead">' + inline(intro) + '</p>\n' : '') +
        '<div class="pg-cards">' + list.map(function (x) { return card(from, L, x); }).join('\n') + '</div>\n</div></section>\n';
    }
    function related(pg, L) {
      var ids = (pg.data.liens || []).slice();
      if (pg.kind === 'gamme' && pg.parent && byId[pg.parent] && byId[pg.parent].gammes) {
        byId[pg.parent].gammes.forEach(function (id) { if ('gamme:' + id !== pg.id) ids.push('gamme:' + id); });
      }
      var defaults = { usage: ['guide', 'entretien', 'realisations', 'devis'], gamme: ['guide', 'entretien', 'realisations'], famille: ['guide', 'entretien', 'realisations'], hub: ['guide', 'entretien', 'cuisine', 'salle-de-bain'], page: ['materiaux', 'guide', 'realisations', 'contact'], zone: ['materiaux', 'usine', 'realisations', 'devis'] };
      ids = ids.concat(defaults[pg.kind] || defaults.page);
      var seen = {}; var out = [];
      ids.forEach(function (id) { if (byId[id] && id !== pg.id && !seen[id]) { seen[id] = 1; out.push(byId[id]); } });
      out = out.slice(0, 8);
      if (!out.length) return '';
      return '<section class="sec pg-links-sec"><div class="wrap"><h2 class="h3">' + esc(lb('voir_aussi', L)) + '</h2><ul class="pg-links">' +
        out.map(function (p) { return '<li><a href="' + href(pg, L, p) + '">' + esc(name(p, L)) + ' <span aria-hidden="true">→</span></a></li>'; }).join('') + '</ul></div></section>\n';
    }
    function ctaBand(pg, L) {
      return '<section class="sec dark pg-cta"><div class="wrap" style="text-align:center">\n<h2 class="h2">' + inline(lb('cta_titre', L)) + '</h2>\n<p class="lead">' + inline(lb('cta_texte', L)) + '</p>\n' +
        '<div class="btn-row" style="justify-content:center"><a class="btn btn-gold" href="' + href(pg, L, 'home', L, '#devis') + '">' + esc(lb('cta_devis', L)) + ' <span aria-hidden="true" class="ar">→</span></a>' +
        (byId.usine ? '<a class="btn btn-ghost-w" href="' + href(pg, L, byId.usine) + '">' + esc(lb('cta_usine', L)) + '</a>' : '') + '</div>\n</div></section>\n';
    }
    function footerLinks(from, L) {
      var cols = [
        [lb('pied_materiaux', L), reg.filter(function (p) { return p.kind === 'famille' || p.kind === 'hub' || (p.kind === 'gamme' && !inFam[p.g.id]); })],
        [lb('pied_gammes', L), reg.filter(function (p) { return p.kind === 'gamme' && inFam[p.g.id]; })],
        [lb('pied_projets', L), reg.filter(function (p) { return p.kind === 'usage'; })],
        [lb('pied_entreprise', L), reg.filter(function (p) { return p.kind === 'page' || p.kind === 'zone'; })]
      ];
      var link = function (p) { return from ? href(from, L, p) : relPath(p, L).slice(prefix(L).length); };
      return '<nav class="ft-seo" aria-label="' + esc(lb('plan_aria', L)) + '">' + cols.map(function (c) {
        return '<div><p class="ft-h">' + esc(c[0]) + '</p><ul>' + c[1].map(function (p) { return '<li><a href="' + link(p) + '">' + esc(name(p, L)) + '</a></li>'; }).join('') + '</ul></div>';
      }).join('') + '</nav>';
    }
    function footer(pg, L) {
      var H = href(pg, L, 'home', L);
      return '<footer class="ft">\n<div class="wrap">\n<div class="ft-top">\n' +
        '<div class="ft-brand"><a class="logo" href="' + H + '">CB<em>.</em>PROD</a><p>' + esc(tx('pied.02', L)) + '</p><a class="btn btn-gold btn-sm ft-cta" href="' + href(pg, L, 'home', L, '#devis') + '">' + esc(tx('pied.03', L)) + '</a></div>\n' +
        '<div><p class="ft-h">' + esc(tx('pied.17', L)) + '</p><ul>' +
        '<li><a href="tel:+33188326449">+33 (1) 88 32 64 49</a></li><li><a href="tel:+351219672216">+351 219 672 216</a></li>' +
        '<li><a href="mailto:direction@cbproducao.com">direction@cbproducao.com</a></li><li>' + esc(tx('contact.16', L)) + '</li></ul></div>\n</div>\n' +
        footerLinks(pg, L) + '\n<div class="ft-bot"><p>© ' + today.slice(0, 4) + ' CB Prod · ' + esc(lb('droits', L)) + '</p><span class="ft-legal"><span>' + esc(tx('pied.25', L)) + '</span>' + (tx('pied.26', L) ? '<a class="ext" href="https://www.livroreclamacoes.pt/Inicio/" rel="noopener" target="_blank">' + esc(tx('pied.26', L)) + '</a>' : '') + '</span></div>\n</div>\n</footer>\n' +
        '<div class="m-bar" id="mBar"><a class="btn btn-ghost" href="' + (L === 'pt' ? 'tel:+351219672216' : 'tel:+33188326449') + '">' + esc(tx('divers.03', L)) + '</a><a class="btn btn-gold" href="' + href(pg, L, 'home', L, '#devis') + '">' + esc(tx('divers.04', L)) + '</a></div>\n';
    }

    /* ── Blocs propres à chaque type de page ── */
    function blocGamme(pg, L) {
      var g = pg.g, h = '';
      var kc = (g.chiffres_cles || []).filter(function (k) { return tr(k.valeur, L); });
      h += '<section class="sec pg-sec" style="background:var(--white)"><div class="wrap pg-grid2">\n<div class="pg-prose"><h2 class="h3">' + esc(lb('presentation', L)) + ' ' + esc(strip(tr(g.titre, L))) + '</h2>' + rich(tr(g.description, L)) +
        (tr(g.note, L) ? '<p class="pg-note">' + inline(tr(g.note, L)) + '</p>' : '') +
        (g.caracteristiques && tr(g.caracteristiques.texte, L) ? '<h3 class="pg-h4">' + esc(strip(tr(g.caracteristiques.titre, L))) + '</h3><ul class="pg-list">' + strip(tr(g.caracteristiques.texte, L)).split(/\s*·\s*/).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>\n<div>' + (kc.length ? '<dl class="pg-kpis">' + kc.map(function (k) { return '<div><dt>' + esc(strip(tr(k.legende, L))) + '</dt><dd>' + esc(strip(tr(k.valeur, L))) + '</dd></div>'; }).join('') + '</dl>' : '') +
        ((g.finitions || []).length ? '<h3 class="pg-h4">' + esc(lb('finitions', L)) + '</h3><ul class="chips pg-chips">' + g.finitions.map(function (f) { return '<li class="chip">' + (f.couleur ? '<span class="pg-dot" style="background:' + esc(f.couleur) + '"></span>' : '') + esc(strip(tr(f.texte, L))) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>\n</div></section>\n';
      var col = g.coloris || [];
      if (col.length) {
        h += '<section class="sec pg-sec" id="coloris"><div class="wrap">\n<h2 class="h2">' + esc(strip(tr(g.titre_coloris, L)) || lb('coloris_dispo', L)) + '</h2>\n<p class="lead">' + col.length + ' ' + esc(lb('coloris_texte', L)) + '</p>\n<ul class="pg-colors">' +
          col.map(function (c) {
            var nm = strip(tr(c.nom, L));
            var bg = 'background:linear-gradient(135deg,' + esc(c.couleur1 || '#ddd') + ',' + esc(c.couleur2 || c.couleur1 || '#bbb') + ')';
            return '<li id="' + esc(slugify(nm)) + '"><span class="pg-sw" style="' + bg + '">' + (c.image ? '<img src="' + esc(img(c.image, L)) + '" alt="' + esc(strip(tr(g.titre, L)) + ' ' + nm) + '" loading="lazy" decoding="async">' : '') + '</span>' +
              '<span class="pg-sw-n">' + esc(nm) + '</span>' + (tr(c.finition, L) ? '<span class="pg-sw-f">' + esc(strip(tr(c.finition, L))) + '</span>' : '') +
              (tr(c.description, L) ? '<span class="pg-sw-d">' + esc(strip(tr(c.description, L))) + '</span>' : '') + '</li>';
          }).join('') + '</ul>\n' +
          '<p class="pg-center"><a class="btn btn-gold" href="' + href(pg, L, 'home', L, '#devis') + '">' + esc(lb('devis_gamme', L)) + ' ' + esc(strip(tr(g.bouton_devis, L)) || strip(tr(g.titre, L))) + ' <span aria-hidden="true" class="ar">→</span></a></p>\n</div></section>\n';
      }
      var ph = (g.photos || []).filter(function (p) { return p.image; });
      if (ph.length) h += gallery(L, ph.map(function (p) { return { image: p.image, t: strip(tr(p.titre, L)), d: strip(tr(p.legende, L)) }; }), lb(g.photos_sont_des_realisations ? 'nos_realisations' : 'ambiances', L));
      return h;
    }
    function gallery(L, items, title) {
      return '<section class="sec pg-sec" style="background:var(--cream2)"><div class="wrap">' + (title ? '<h2 class="h3">' + esc(title) + '</h2>' : '') + '<ul class="pg-gal">' +
        items.map(function (p) { return '<li><figure><img src="' + esc(img(p.image, L)) + '" alt="' + esc([p.t, p.d].filter(Boolean).join(', ')) + '" loading="lazy" decoding="async"><figcaption>' + (p.t ? '<b>' + esc(p.t) + '</b>' : '') + (p.d ? '<span>' + esc(p.d) + '</span>' : '') + '</figcaption></figure></li>'; }).join('') + '</ul></div></section>\n';
    }
    function blocRealisations(pg, L) {
      var R = D.realisations || {}; var h = '';
      (R.categories || []).forEach(function (c) {
        var ph = (R.photos || []).filter(function (p) { return p.categorie === c.id && p.image; });
        if (ph.length) h += gallery(L, ph.map(function (p) { return { image: p.image, t: strip(tr(p.materiau, L)), d: strip(tr(p.legende, L)) }; }), strip(tr(c.nom, L)));
      });
      return h;
    }
    function blocGuide(pg, L) {
      var G = D.guide || []; if (!G.length) return '';
      var dots = function (n) { n = +n || 0; return '<span class="pg-rate" aria-label="' + n + '/5">' + '●●●●●'.slice(0, n) + '<span>' + '●●●●●'.slice(n) + '</span></span>'; };
      return '<section class="sec pg-sec" style="background:var(--white)"><div class="wrap">\n<h2 class="h2">' + esc(lb('comparatif', L)) + '</h2>\n<p class="lead">' + esc(tx('guide.04', L)) + '</p>\n<div class="pg-table-wrap"><table class="pg-table"><thead><tr>' +
        ['guide.05', 'guide.06', 'guide.07', 'guide.08', 'guide.09', 'guide.10'].map(function (k) { return '<th scope="col">' + esc(tx(k, L)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        G.map(function (r) { return '<tr><th scope="row">' + esc(strip(tr(r.nom, L))) + (tr(r.precision, L) ? '<small>' + esc(strip(tr(r.precision, L))) + '</small>' : '') + '</th><td>' + dots(r.rayures) + '</td><td>' + dots(r.chaleur) + '</td><td>' + dots(r.taches) + '</td><td>' + dots(r.entretien) + '</td><td>' + esc(strip(tr(r.ideal_pour, L))) + '</td></tr>'; }).join('') +
        '</tbody></table></div>\n<p class="pg-note">' + esc(tx('guide.12', L)) + '</p>\n</div></section>\n';
    }
    function blocContact(pg, L) {
      var map = 'https://www.google.com/maps/search/?api=1&query=Estrada+Nacional+9+Km+29+Igreja+Nova+Mafra';
      return '<section class="sec pg-sec" style="background:var(--white)"><div class="wrap pg-grid2">\n<dl class="pg-contact">' +
        '<div><dt>' + esc(tx('contact.04', L)) + '</dt><dd><address>' + esc(tx('contact.05', L)) + '</address><a href="' + map + '" rel="noopener" target="_blank">' + esc(tx('contact.06', L)) + '</a></dd></div>' +
        '<div><dt>' + esc(tx('contact.07', L)) + '</dt><dd><a href="tel:+33188326449">+33 (1) 88 32 64 49</a></dd></div>' +
        '<div><dt>' + esc(tx('contact.10', L)) + '</dt><dd><a href="tel:+351219672216">+351 219 672 216</a></dd></div>' +
        '<div><dt>' + esc(tx('contact.13', L)) + '</dt><dd><a href="mailto:direction@cbproducao.com">direction@cbproducao.com</a></dd></div>' +
        '<div><dt>' + esc(tx('contact.15', L)) + '</dt><dd>' + esc(tx('contact.16', L)) + '<br><small>' + esc(tx('contact.17', L)) + '</small></dd></div>' +
        '</dl>\n<div class="pg-prose"><h2 class="h3">' + esc(lb('ecrire', L)) + '</h2><p>' + esc(lb('ecrire_texte', L)) + '</p><div class="btn-row"><a class="btn btn-gold" href="' + href(pg, L, 'home', L, '#devis') + '">' + esc(lb('cta_devis', L)) + '</a><a class="btn btn-ghost" href="' + href(pg, L, 'home', L, '#contact') + '">' + esc(lb('message_rapide', L)) + '</a></div></div>\n</div></section>\n';
    }

    /* ── Assemblage d'une page ── */
    function page(pg, L) {
      var d = pg.data || {};
      var title = strip(tr(d.title, L)) || (name(pg, L) + ' | CB Prod');
      var meta = strip(tr(d.meta, L)) || trunc(tr(d.intro, L) || (pg.g ? tr(pg.g.description, L) : ''), 158);
      var bg = '', body = '', faqs = (d.faq || []).slice(), ld = [];
      if (pg.kind === 'gamme') { bg = gammeImage(pg.g); }
      else if (pg.kind === 'famille') bg = famImage(pg);
      else bg = d.image || '';
      body += hero(pg, L, d, bg ? img(bg, L) : '');
      if (pg.kind === 'gamme') body += blocGamme(pg, L) + sections(d, L);
      else if (pg.kind === 'famille') body += cards(pg, L, pg.gammes.map(function (id) { return byId['gamme:' + id]; }), lb('gammes_famille', L) + ' ' + name(pg, L)) + sections(d, L);
      else if (pg.kind === 'hub') {
        var tops = reg.filter(function (p) { return p.kind === 'famille' || (p.kind === 'gamme' && !inFam[p.g.id]); });
        body += cards(pg, L, tops, lb('familles_titre', L)) + sections(d, L);
      } else {
        body += sections(d, L);
        if (pg.id === 'realisations') body += blocRealisations(pg, L);
        if (pg.id === 'guide') body += blocGuide(pg, L);
        if (pg.id === 'contact') body += blocContact(pg, L);
        if (pg.id === 'faq') faqs = (D.faq || []).concat(faqs);
        if (d.familles_conseillees && d.familles_conseillees.length) body += cards(pg, L, d.familles_conseillees.map(function (id) { return byId['famille:' + id] || byId['gamme:' + id]; }), lb('materiaux_conseilles', L));
      }
      body += faqHtml(faqs, L, pg.id === 'faq' ? tr(d.h1, L) : '') + related(pg, L) + ctaBand(pg, L);
      var u = url(pg, L);
      var ogImg = absImg(bg) || SITE + '/images/site/logo-cb.png';
      ld.push({ '@type': 'WebPage', '@id': u + '#page', url: u, name: title, description: meta, inLanguage: { fr: 'fr-FR', en: 'en-GB', pt: 'pt-PT' }[L], isPartOf: { '@id': SITE + '/#site' }, about: { '@id': SITE + '/#org' }, breadcrumb: { '@id': u + '#crumbs' }, primaryImageOfPage: ogImg });
      var bc = crumbsLd(pg, L); bc['@id'] = u + '#crumbs'; ld.push(bc);
      if (pg.kind === 'gamme' || pg.kind === 'famille' || pg.kind === 'usage') {
        ld.push({ '@type': 'Service', '@id': u + '#service', name: strip(tr(d.h1, L)) || name(pg, L), serviceType: name(pg, L), provider: { '@id': SITE + '/#org' }, areaServed: [{ '@type': 'Country', name: 'France' }, { '@type': 'Country', name: 'Portugal' }], url: u, image: ogImg });
      }
      if (pg.kind === 'gamme' && (pg.g.coloris || []).length) {
        ld.push({ '@type': 'ItemList', name: strip(tr(pg.g.titre_coloris, L)) || name(pg, L), numberOfItems: pg.g.coloris.length, itemListElement: pg.g.coloris.map(function (c, i) { return { '@type': 'ListItem', position: i + 1, name: strip(tr(c.nom, L)), url: u + '#' + slugify(strip(tr(c.nom, L))) }; }) });
      }
      if (pg.kind === 'zone' && d.zone) {
        ld.push({ '@type': 'Service', '@id': u + '#service', name: strip(tr(d.h1, L)), provider: { '@id': SITE + '/#org' }, areaServed: d.zone, url: u });
      }
      if (pg.id === 'contact') ld.push({ '@type': 'ContactPage', '@id': u + '#contact', url: u });
      var fl = faqLd(faqs, L); if (fl) ld.push(fl);
      var alt = LANGS.map(function (l) { return '<link rel="alternate" hreflang="' + l + '" href="' + url(pg, l) + '">'; }).join('\n') + '\n<link rel="alternate" hreflang="x-default" href="' + url(pg, 'fr') + '">';
      var r = rootRel(L);
      return '<!DOCTYPE html>\n<html lang="' + L + '">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
        '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(meta) + '">\n<meta name="robots" content="index, follow, max-image-preview:large">\n' +
        '<link rel="canonical" href="' + u + '">\n' + alt + '\n' +
        '<meta property="og:type" content="website">\n<meta property="og:url" content="' + u + '">\n<meta property="og:site_name" content="CB Prod">\n<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(meta) + '">\n<meta property="og:locale" content="' + LOCALE[L] + '">\n<meta property="og:image" content="' + esc(ogImg) + '">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="theme-color" content="#2A2420">\n<meta name="format-detection" content="telephone=no">\n' +
        '<link rel="icon" href="' + r + 'images/site/favicon.svg" type="image/svg+xml">\n<link rel="icon" href="' + r + 'images/site/favicon-48.png" sizes="48x48" type="image/png">\n<link rel="apple-touch-icon" href="' + r + 'images/site/apple-touch-icon.png">\n' +
        '<link rel="preload" href="' + r + 'fonts/playfair-display-normal-latin-5.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="' + r + 'fonts/jost-normal-latin-1.woff2" as="font" type="font/woff2" crossorigin>\n' +
        '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c') + '</script>\n' +
        '<script>' + INLINE_JS + '</script>\n<link rel="stylesheet" href="' + r + 'style.css">\n<link rel="stylesheet" href="' + r + 'pages.css">\n</head>\n<body class="pg">\n' +
        header(pg, L) + '<main id="main">\n' + body + '</main>\n' + footer(pg, L) +
        '<script src="' + r + 'pages-site.js" defer></script>\n</body>\n</html>\n';
    }

    var files = {};
    reg.forEach(function (pg) { LANGS.forEach(function (L) { if (pg.slug && pg.slug[L]) files[relPath(pg, L) + 'index.html'] = page(pg, L); }); });

    /* Sitemap : accueil + toutes les pages, avec les liens entre langues */
    function smEntry(locs) {
      return LANGS.map(function (L) {
        return '  <url>\n    <loc>' + locs[L] + '</loc>\n    <lastmod>' + today + '</lastmod>\n' +
          LANGS.map(function (l) { return '    <xhtml:link rel="alternate" hreflang="' + l + '" href="' + locs[l] + '"/>\n'; }).join('') +
          '    <xhtml:link rel="alternate" hreflang="x-default" href="' + locs.fr + '"/>\n  </url>\n';
      }).join('');
    }
    var sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
    sm += smEntry({ fr: SITE + '/', en: SITE + '/en/', pt: SITE + '/pt/' });
    reg.forEach(function (pg) { sm += smEntry({ fr: url(pg, 'fr'), en: url(pg, 'en'), pt: url(pg, 'pt') }); });
    files['sitemap.xml'] = sm + '</urlset>\n';

    /* Bloc de liens pour le pied des pages d'accueil (maillage interne) */
    function homeBlock(L) {
      return MARK_A + '\n' + footerLinks(null, L) + '\n' + MARK_B;
    }
    return { files: files, homeBlock: homeBlock, count: reg.length };
  }

  /* Insère ou remplace le bloc de liens dans une page d'accueil */
  function insererLiensAccueil(html, block) {
    var a = html.indexOf(MARK_A), b = html.indexOf(MARK_B);
    if (a >= 0 && b > a) return html.slice(0, a) + block + html.slice(b + MARK_B.length);
    var i = html.indexOf('<div class="ft-bot">');
    if (i < 0) return html;
    return html.slice(0, i) + block + '\n' + html.slice(i);
  }

  var api = { genererPages: genererPages, insererLiensAccueil: insererLiensAccueil, slugGamme: slugGamme, MARK_A: MARK_A, MARK_B: MARK_B };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.CB = root.CB || {}; root.CB.pagesSeo = api; }
})(typeof window !== 'undefined' ? window : this);
