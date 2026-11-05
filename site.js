/* CB Prod — moteur du site (catalogue, galerie, diaporama, formulaires).
   Rien à modifier ici : le contenu se change dans le dossier « contenu »,
   le plus simplement avec l'outil modifier-mon-site.html. */
'use strict';
const DB=window.CB||{};
const LANG=(document.documentElement.lang||'fr').slice(0,2);
const ROOT=(function(){const s=document.currentScript&&document.currentScript.src;return s?s.replace(/[^\/]*$/,''):'';})();
const tr=o=>DB.tr(o,LANG);
const SRC=u=>DB.src(u,ROOT);
try{DB.appliquer(document,LANG,ROOT);}catch(err){console.error('Textes',err);}

/* Photos de secours (Unsplash) */
const U=(id,w)=>'https://images.unsplash.com/photo-'+id+'?w='+(w||600)+'&q=75';
const IMG={k1:'1556909190-eccf4a8bf97a',k2:'1600607687939-ce8a6c25118c',k3:'1560185007-5f0bb1866cab',k4:'1552321554-5fefe8c9ef14',k5:'1556909190-eccf4a8bf97a',k6:'1556909172-54557c7e4fb7',k7:'1484154218962-a197022b5858',k8:'1600607687939-ce8a6c25118c',k9:'1504328345606-18bbc8c9d7d1'};

/* Catalogue (contenu/catalogue.js) */
const MATS=(DB.catalogue||[]).filter(g=>g&&g.id).map(g=>{
  const m={id:g.id,grp:tr(g.groupe),nav:tr(g.nom_menu)||tr(g.titre),sup:tr(g.fournisseur),title:tr(g.titre),desc:tr(g.description)};
  if(g.nouveau)m.isNew=true;
  const note=tr(g.note);if(note)m.note=note;
  if(g.chiffres_cles&&g.chiffres_cles.length)m.coll=g.chiffres_cles.map(c=>[tr(c.valeur),tr(c.legende)]);
  m.fins=(g.finitions||[]).map(f=>f.couleur?[tr(f.texte),f.couleur]:[tr(f.texte)]);
  const ct=tr(g.titre_coloris);if(ct)m.colTitle=ct;
  m.cols=(g.coloris||[]).map(c=>[tr(c.nom),tr(c.finition),tr(c.description),c.couleur1||'#d8d2c8',c.couleur2||c.couleur1||'#b8b0a4',SRC(c.image),SRC(c.image_grande),c.lien||'']);
  const k=g.caracteristiques||{};if(tr(k.titre)||tr(k.texte))m.tech=[tr(k.titre),tr(k.texte)];
  if(g.photos&&g.photos.length)m.insp=g.photos.map(p=>[SRC(p.image),tr(p.titre),tr(p.legende)]);
  if(g.photos_sont_des_realisations)m.real=true;
  if(g.liens&&g.liens.length)m.links=g.liens.map(l=>[tr(l.texte),l.adresse]);
  m.cta=tr(g.bouton_devis)||m.title;
  return m;
});

/* Réalisations et diaporama (contenu/realisations.js) */
const RCX=(DB.realisations&&DB.realisations.categories)||[];
const catName=id=>{const c=RCX.find(x=>x.id===id);return c?tr(c.nom):String(id||'');};
const RF='';
const RCATS=RCX.map(c=>tr(c.nom));
const toReal=r=>[catName(r.categorie),SRC(r.image),tr(r.legende),tr(r.materiau),tr(r.famille)];
const REAL=((DB.realisations||{}).photos||[]).filter(r=>r&&r.image).map(toReal);
const CB_HERO=((DB.realisations||{}).diaporama||[]).filter(r=>r&&r.image).map(toReal);

/* Messages de l'interface (contenu/textes.js, clés « ui. ») */
const T={};
Object.keys(DB.textes||{}).forEach(k=>{if(k.indexOf('ui.')===0)T[k.slice(3)]=tr(DB.textes[k]);});
{const st=T.step||'{n}/{t} : ',o5=T.outOf5||'{n}/5';
T.step=(n,t)=>st.replace('{n}',n).replace('{t}',t);
T.outOf5=n=>o5.replace('{n}',n);}

/* Guide de choix (contenu/guide.js) */
const GUIDE=(DB.guide||[]).map(g=>[tr(g.nom),tr(g.precision),+g.rayures||0,+g.chaleur||0,+g.taches||0,+g.entretien||0,tr(g.ideal_pour),g.gamme]);


const COL=(typeof LANG!=='undefined'&&LANG==='fr')?' : ':': ';
function setHash(h){try{history.replaceState(null,'',h);}catch(_){}}
function safe(name,fn){try{fn();}catch(err){console.error(name,err);}}


/* ══════════════════ OUTILS ══════════════════ */
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Sécurité : un lien ne peut être qu'une adresse web (https://), un e-mail, un téléphone ou une page du site */
const safeUrl=u=>{u=String(u==null?'':u).trim();const t=u.replace(/[\s\x00-\x1f]/g,'');return /^[a-z][\w+.-]*:/i.test(t)&&!/^(https?|mailto|tel):/i.test(t)?'#':u;};
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

/* Photos de secours libres de droits (Unsplash) si une image hébergée ailleurs est bloquée */
const FREE={kitchen:[IMG.k1,IMG.k2,IMG.k6,IMG.k7,IMG.k8],bath:[IMG.k3,IMG.k4,IMG.k5],work:[IMG.k9]};
let fbN=0;
function freeFor(hint,w){const h=(hint||'').toLowerCase();const l=/salle|bain|vasque|douche|bath|banho|lavat/.test(h)?FREE.bath:/atelier|usine|façonnage|work/.test(h)?FREE.work:FREE.kitchen;return U(l[(fbN++)%l.length],w||900);}
const rfUsed=new Set();
function tryFallback(im){
  if(im.dataset.nofb||im.dataset.fbUsed)return false;
  const it=im.closest('.rf-item');
  if(it)return false;
  if(false){ // galerie : une photo de secours différente par projet, signalée comme illustration
    const h=(it.dataset.hint||'').toLowerCase(),l=/bain/.test(h)?FREE.bath.concat(FREE.kitchen):FREE.kitchen.concat(FREE.bath);
    const id=l.find(x=>!rfUsed.has(x));if(!id)return false;rfUsed.add(id);
    im.dataset.fbUsed=1;im.src=U(id,900);
    const c=$('.rf-cat',it);if(c)c.textContent+=' · '+T.illus;
    return true;
  }
  const fb=im.dataset.fb||freeFor((im.alt||'')+' '+(im.closest('[data-hint]')?.dataset.hint||'')+' '+(im.currentSrc||im.src));
  if(!fb||fb===im.src)return false;
  im.dataset.fbUsed=1;im.src=fb;return true;
}
/* Images : fondu à l'arrivée, texture pierre si l'image manque */
function arm(img){
  if(img.dataset.armed)return; img.dataset.armed=1;
  const ok=()=>img.classList.add('ok');
  img.addEventListener('load',ok);
  if(img.dataset.src&&!img.getAttribute('src')) img.src=img.dataset.src;
  if(img.complete&&img.naturalWidth) ok(); else if(img.complete&&img.getAttribute('src')) onImgErr(img);
}
function armAll(root){$$('.ph>img',root||document).forEach(arm);}
const TXMAP=[[/tempest|quartzit/i,'tempest'],[/travert/i,'travertin'],[/breccia|pierre naturelle|natural stone|pedra natural|sable|sand|areia/i,'breccia'],[/green|verde|vert/i,'verde'],[/noir|black|nero|preto|negro|marquina|tebas|absolute/i,'nero'],[/gris|grey|gray|cinza|cinzent|betão|grigio|ombra|ciment|béton|beton|keon|cement/i,'beton'],[/brown|brun|castanho|itara|baltic/i,'granitbrun'],[/granit/i,'granit'],[/calacatta|oro|gold|or\b|cheminée|fireplace|lareira|marbre$|marble$|mármore$/i,'calacatta'],[/quartz|silestone|compac|minéralis|mineralis/i,'quartz']];
const txFor=s=>{for(const [re,t] of TXMAP)if(re.test(s||''))return t;return 'statuario';};
const lum=h=>{h=(h||'#ccc').replace('#','');const n=parseInt(h.length===3?h.replace(/./g,'$&$&'):h,16);return((n>>16&255)*.299+(n>>8&255)*.587+(n&255)*.114)/255;};
const phImg=(src,alt,eager)=>src?`<img src="${esc(src)}" alt="${esc(alt||'')}" ${eager?'':'loading="lazy"'} decoding="async">`:'';

/* ══════════════════ CATALOGUE ══════════════════ */
let SW=[], curMat=null;
function swatchHTML(c,list){
  const [n,f,d,c1,c2,img,big,link]=c;
  const i=SW.push({kind:'sw',n,f,d,c1,c2,img:big||img,link,list})-1;
  return `<button class="sw" data-sw="${i}"><span class="ph${lum(c1)<.4?' dk':''}" style="--c1:${c1};--c2:${c2}">${phImg(img,'').replace('<img ','<img data-nofb="1" ')}</span><span class="sw-lbl"><span class="sw-n">${esc(n)}</span><span class="sw-f">${esc(f)}</span><span class="sr-only">${COL}${T.enlarge}</span></span></button>`;
}
function panelHTML(m){
  const L='main';
  let h=`<span class="mp-sup">${esc(m.sup.replace(/^◈\s*/,''))}</span><h3 class="mp-title" id="mp-${m.id}">${esc(m.title)}</h3><p class="mp-desc">${esc(m.desc)}</p>`;
  if(m.note) h+=`<div class="mp-note">${m.note}</div>`;
  if(m.coll) h+=`<div class="mp-coll">${m.coll.map(([a,b])=>`<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>`;
  h+=`<div class="fins" role="list" aria-label="${T.finishes}">${m.fins.map(([l,c])=>`<span class="fin" role="listitem">${c?`<i style="background:${c}" aria-hidden="true"></i>`:''}${esc(l)}</span>`).join('')}</div>`;
  h+=`<div class="mp-h"><h4>${esc(m.colTitle||T.colorsAvail)}</h4><span>${m.cols.length} ${T.colors}</span></div><div class="sw-grid">${m.cols.map(c=>swatchHTML(c,L)).join('')}</div>`;
  if(m.tech) h+=`<div class="tech"><span class="tech-i" aria-hidden="true">◈</span><div><b>${esc(m.tech[0])}</b><p>${esc(m.tech[1])}</p></div></div>`;
  if(m.extra) h+=`<div class="mp-sec"><div class="mp-h"><h4>${esc(m.extra.title)}</h4><span>${m.extra.cols.length} ${T.colors}</span></div><p class="mp-extra">${esc(m.extra.txt)} <a href="${esc(safeUrl(m.extra.link))}" target="_blank" rel="noopener" class="ext">${T.seeColl}</a></p><div class="sw-grid">${m.extra.cols.map(c=>swatchHTML(c,'extra')).join('')}</div></div>`;
  if(m.insp) h+=`<div class="mp-sec"><div class="mp-h"><h4>${m.real?T.realis:T.inspi} · ${esc(m.title)}</h4></div><div class="insp">${m.insp.map(([s,a,b])=>`<figure><div class="ph tx-${txFor(b+' '+m.title)}">${phImg(s,a)}</div><figcaption><b>${esc(a)}</b><span>${esc(b)}</span></figcaption></figure>`).join('')}</div>${m.real?'':'<p class="guide-note">'+T.ambiance+'</p>'}</div>`;
  h+=`<div class="mp-cta"><button class="btn btn-gold" data-quote="${esc(m.nav)}">${T.askQuote} ${esc(m.cta)} <span class="ar" aria-hidden="true">→</span></button>${(m.links||[]).map(([l,u])=>`<a class="btn btn-ghost ext" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div>`;
  return h;
}
function buildCatalogue(){
  let g='',h='';
  MATS.forEach(m=>{
    if(m.grp!==g){g=m.grp;h+=`<span class="cat-grp" aria-hidden="true">${esc(g)}</span>`;}
    h+=`<button class="cat-tab" role="tab" id="tab-${m.id}" data-tab="${m.id}" aria-selected="false" aria-controls="catPanel" tabindex="-1"><span>${esc(m.nav)}</span>${m.isNew?'<span class="nw">'+T.isNew+'</span>':`<span class="ct">${m.cols.length}</span>`}</button>`;
  });
  $('#catSide').innerHTML=h;
  const tabs=$$('.cat-tab');
  $('#catSide').addEventListener('keydown',e=>{
    const i=tabs.indexOf(document.activeElement); if(i<0)return;
    let j=null;
    if(e.key==='ArrowDown'||e.key==='ArrowRight')j=(i+1)%tabs.length;
    if(e.key==='ArrowUp'||e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;
    if(e.key==='Home')j=0; if(e.key==='End')j=tabs.length-1;
    if(j!==null){e.preventDefault();tabs[j].focus({preventScroll:true});switchMat(tabs[j].dataset.tab);setHash('#mat-'+tabs[j].dataset.tab);}
  });
  // Liste du formulaire de devis
  let o='<option value="">'+T.choose+'</option>',og='';
  MATS.forEach(m=>{if(m.grp!==og){if(og)o+='</optgroup>';og=m.grp;o+=`<optgroup label="${esc(og)}">`;}o+=`<option>${esc(m.nav)}</option>`;});
  $('#d-mat').innerHTML=o+'</optgroup><option>'+T.unknown+'</option>';
  $('#statFam').textContent=MATS.length;$('#statFam').dataset.count=MATS.length;
}
function switchMat(id){
  const m=MATS.find(x=>x.id===id)||MATS[0];
  if(curMat!==m.id){
    SW=[];const p=$('#catPanel');p.innerHTML=panelHTML(m);p.setAttribute('aria-labelledby','tab-'+m.id);
    p.style.animation='none';void p.offsetWidth;p.style.animation='';
    const fromSwitch=curMat!==null;curMat=m.id;armAll(p);
    if(fromSwitch){const top=p.getBoundingClientRect().top,lim=(innerWidth<=1000?140:90);if(top<lim)scrollBy({top:top-lim-10,behavior:'auto'});}
  }
  $$('.cat-tab').forEach(b=>{const on=b.dataset.tab===m.id;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  const act=$('.cat-tab[aria-selected="true"]');
  if(act&&innerWidth>1000){const s=$('#catSide');if(act.offsetTop<s.scrollTop||act.offsetTop+act.offsetHeight>s.scrollTop+s.clientHeight)s.scrollTop=act.offsetTop-s.clientHeight/2;}
  if(act&&innerWidth<=1000){const s=$('#catSide');s.scrollTo({left:act.offsetLeft-s.clientWidth/2+act.clientWidth/2,behavior:REDUCE?'auto':'smooth'});}
}
function openMat(id){
  switchMat(id);
  const t=$('#catalogue');
  t.scrollIntoView({behavior:REDUCE?'auto':'smooth'});
  setHash('#mat-'+id);
}

/* ══════════════════ GUIDE ══════════════════ */
function buildGuide(){
  const dots=n=>`<span class="dots" role="img" aria-label="${T.outOf5(n)}">${[1,2,3,4,5].map(k=>`<i class="${k<=n?'on':''}"></i>`).join('')}</span>`;
  $('#guideBody').innerHTML=GUIDE.map(([n,s,a,b,c,d,u,id])=>`<tr><th scope="row">${esc(n)}<small>${esc(s)}</small></th><td>${dots(a)}</td><td>${dots(b)}</td><td>${dots(c)}</td><td>${dots(d)}</td><td><span class="pick">${esc(u)}</span></td><td><a class="guide-cta" href="#mat-${id}" data-mat="${id}">${T.colorsCta}</a></td></tr>`).join('');
}

/* ══════════════════ RÉALISATIONS ══════════════════ */
const RCAT_ALL=T.all;let rfCat=RCAT_ALL,rfShown=12;
const ARS=['4/5','1/1','4/3','3/4','4/5','5/4'];
function orderedReal(cat){
  let list=REAL.map((r,i)=>[r,i]);
  if(cat!==RCAT_ALL) return list.filter(([r])=>r[0]===cat);
  const by={};list.forEach(x=>(by[x[0][0]]=by[x[0][0]]||[]).push(x));
  const out=[];let k=0;while(out.length<list.length){RCATS.forEach(c=>{if(by[c]&&by[c][k])out.push(by[c][k]);});k++;}
  return out;
}
function buildReal(){
  const cats=[RCAT_ALL].concat(RCATS.filter(c=>REAL.some(r=>r[0]===c)));
  if(!$('#rfTabs').children.length)$('#rfTabs').innerHTML=cats.map(c=>`<button class="rf-tab" data-rfcat="${esc(c)}" aria-pressed="${c===rfCat}">${esc(c)} <small>${c===RCAT_ALL?REAL.length:REAL.filter(r=>r[0]===c).length}</small></button>`).join('');
  $$('#rfTabs .rf-tab').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rfcat===rfCat));
  const list=orderedReal(rfCat);
  $('#rfGrid').innerHTML=list.map(([r,i],k)=>`<button class="rf-item${k>=rfShown?' hide':''}" data-rf="${i}" data-hint="${esc(r[0])}"><span class="ph tx-${txFor(r[3])}" style="--ar:${ARS[k%ARS.length]};background-size:${160+(i*37)%120}%;background-position:${(i*53)%100}% ${(i*29)%100}%">${phImg(RF+r[1],'')}</span><span class="rf-cap"><span class="rf-cat">${esc(r[0])}</span><span class="rf-mat">${esc(r[3])}</span><span class="sr-only">${COL}${esc(r[2])}, ${T.enlarge}</span></span></button>`).join('');
  rfRefresh();armAll($('#rfGrid'));
}
// Une photo absente est retirée de la galerie
function onImgErr(im){
  if(tryFallback(im))return;
  im.classList.add('ko');
  const it=im.closest('.rf-item');if(it&&!$('.rf-note',it)){const c=$('.rf-cap',it);if(c)c.insertAdjacentHTML('beforeend','<span class="rf-note" aria-hidden="true">'+T.matPreview+'</span>');}
}
document.addEventListener('error',e=>{const im=e.target;if(im.tagName==='IMG'&&im.closest('.ph'))onImgErr(im);},true);

function setInert(on,except){['main','footer','#mBar','#toTop','#nav'].forEach(s=>{const el=$(s);if(el&&el!==except)el.inert=on;});}
/* ══════════════════ LIGHTBOX ══════════════════ */
const lb=$('#lb');let lbItems=[],lbPos=0,lbReturn=null;
function lbOpen(items,pos){
  lbItems=items;lbPos=pos;lbReturn=document.activeElement;
  lb.hidden=false;lb.classList.add('open');document.body.style.overflow='hidden';setInert(true);
  lbShow();$('#lbX').focus();
}
function lbShow(){
  const it=lbItems[lbPos],vis=$('#lbVis'),img=$('#lbImg');
  vis.style.setProperty('--c1',it.c1||'#e8e0d4');vis.style.setProperty('--c2',it.c2||'#cfc3b0');
  vis.classList.toggle('wide',it.kind==='rf');vis.classList.toggle('cover',it.kind==='sw');
  vis.className=vis.className.replace(/\btx-\S+/g,'').trim();vis.classList.toggle('vein',it.kind==='sw');vis.classList.toggle('dk',it.kind==='sw'&&lum(it.c1)<.4);vis.style.removeProperty('--tx');if(it.tx)vis.classList.add('tx-'+it.tx);
  img.classList.remove('ok');img.removeAttribute('src');img.alt=it.n||'';
  if(it.img){let tried=false;img.onload=()=>img.classList.add('ok');img.onerror=()=>{img.classList.remove('ok');};img.src=it.img;}
  $('#lbK').textContent=it.k||'';$('#lbT').textContent=it.n;$('#lbD').textContent=it.d||'';
  $('#lbQuote').firstChild.textContent=it.kind==='rf'?T.lbSimilar:T.lbColour;
  const ln=$('#lbLink');if(it.link){ln.href=safeUrl(it.link);ln.hidden=false;}else ln.hidden=true;
  const many=lbItems.length>1;$('#lbP').hidden=$('#lbN').hidden=!many;
  $('#lbC').textContent=many?(lbPos+1)+' / '+lbItems.length:'';
  // précharge la suivante
  const nx=lbItems[(lbPos+1)%lbItems.length];if(nx&&nx.img){const p=new Image();p.src=nx.img;}
}
function lbStep(d){if(lbItems.length<2)return;lbPos=(lbPos+d+lbItems.length)%lbItems.length;lbShow();}
function lbClose(){setInert(false);lb.classList.remove('open');lb.hidden=true;document.body.style.overflow='';$('#lbImg').removeAttribute('src');if(lbReturn&&lbReturn.focus)lbReturn.focus({preventScroll:true});}
$('#lbX').addEventListener('click',lbClose);
$('#lbP').addEventListener('click',()=>lbStep(-1));
$('#lbN').addEventListener('click',()=>lbStep(1));
lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('lb-in'))lbClose();});
document.addEventListener('keydown',e=>{
  if(lb.hidden)return;
  if(e.key==='Escape'){e.preventDefault();lbClose();}
  else if(e.key==='ArrowLeft')lbStep(-1);
  else if(e.key==='ArrowRight')lbStep(1);
  else if(e.key==='Tab'){ // piège de focus
    const f=$$('button:not([hidden]),a[href]:not([hidden])',lb).filter(x=>x.offsetParent!==null);
    if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}
    else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}
  }
});
(function(){let x0=null,y0=0;lb.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  lb.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))lbStep(dx<0?1:-1);x0=null;},{passive:true});})();
$('#lbQuote').addEventListener('click',()=>{
  const it=lbItems[lbPos];lbClose();
  if(it.kind==='rf'){quote(it.mat||T.unknown,T.similarTo+it.n+' ('+it.k+' · '+it.d+')','');}
  else if(it.list==='extra'){quote(T.unknown,null,T.msCeramic+it.n);}
  else{const m=MATS.find(x=>x.id===curMat);quote(m?m.nav:'',null,it.n);}
});
function swItems(list){return SW.filter(s=>s.list===list).map(s=>({kind:'sw',list,n:s.n,k:s.f,d:s.d,c1:s.c1,c2:s.c2,img:s.img,link:s.link}));}

/* ══════════════════ ROUTAGE DES CLICS ══════════════════ */
document.addEventListener('click',e=>{
  const t=e.target;
  const mt=t.closest('[data-mat]'); if(mt){e.preventDefault();closeMenu();openMat(mt.dataset.mat);return;}
  const tab=t.closest('[data-tab]'); if(tab){switchMat(tab.dataset.tab);setHash('#mat-'+tab.dataset.tab);return;}
  const sw=t.closest('[data-sw]'); if(sw){const s=SW[+sw.dataset.sw];const items=swItems(s.list);lbOpen(items,items.findIndex(x=>x.n===s.n));return;}
  const rf=t.closest('[data-rf]'); if(rf){
    const ids=$$('[data-rf]',rf.parentElement).filter(b=>!b.classList.contains('hide')).map(b=>+b.dataset.rf);
    const items=ids.map(i=>{const r=REAL[i],im=$(`[data-rf="${i}"] img`,rf.parentElement),fb=im&&im.dataset.fbUsed;return{kind:'rf',n:r[3],k:r[0],d:r[2],img:im&&im.classList.contains('ko')?'':RF+r[1],tx:txFor(r[3]),mat:r[4]||''};});
    lbOpen(items,ids.indexOf(+rf.dataset.rf));return;}
  const rc=t.closest('[data-rfcat]'); if(rc){rfUsed.clear();rfCat=rc.dataset.rfcat;rfShown=12;buildReal();return;}
  const q=t.closest('[data-quote]'); if(q){quote(q.dataset.quote);return;}
  if(t.closest('[data-visit]')){e.preventDefault();prefillContact(T.visitSubj,T.visitMsg);return;}
  if(t.closest('[data-partner]')){e.preventDefault();prefillContact(T.partnerSubj,T.partnerMsg);return;}
  const a=t.closest('a[href^="#"]'); if(a&&a.closest('#navLinks'))closeMenu();
});
function rfRefresh(){
  const g=$('#rfGrid'),items=$$('.rf-item',g);
  items.forEach((b,k)=>b.classList.toggle('hide',k>=rfShown));
  const rest=items.length-rfShown,more=$('#rfMore');more.hidden=rest<=0;more.textContent=T.more+` (${Math.max(rest,0)})`;
  if(!items.length&&!$('.rf-empty',g))g.innerHTML='<p class="lead rf-empty" style="column-span:all">'+T.rfEmpty+'</p>';
}
$('#rfMore').addEventListener('click',()=>{rfShown+=12;rfRefresh();});

function goTo(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:REDUCE?'auto':'smooth'});}
function quote(mat,desc,col){
  dvGo(1);
  const s=$('#d-mat');if(mat)[...s.options].forEach(o=>{if(o.text===mat)s.value=o.text;});
  const c=$('#d-col');if(col!==undefined&&col!==null)c.value=col;else if(c.dataset.auto)c.value='';c.dataset.auto=col?1:'';
  const d=$('#d-desc');if(d.dataset.auto&&d.value===d.dataset.auto){d.value='';d.dataset.auto='';}
  if(desc&&!d.value){d.value=desc+'\n';d.dataset.auto=d.value;}
  goTo('devis');
  setTimeout(()=>{const first=$('#typeGroup input:checked')||$('#typeGroup input');first.focus({preventScroll:true});},REDUCE?0:700);
}
function prefillContact(subject,msg){
  const sj=$('#c-sujet'),ms=$('#c-msg');
  if(!ms.value.trim()||ms.value===ms.dataset.auto){ms.value=msg;ms.dataset.auto=msg;sj.value=subject;}
  goTo('contact');
  setTimeout(()=>$('#c-nom').focus({preventScroll:true}),REDUCE?0:700);
}

/* ══════════════════ MENU ══════════════════ */
const burger=$('#burger'),links=$('#navLinks');
function closeMenu(){if(links.classList.contains('open'))setInert(false,$('#nav'));links.classList.remove('open');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-label',T.menuOpen);document.body.classList.remove('menu-open');}
burger.addEventListener('click',()=>{const o=!links.classList.contains('open');links.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);burger.setAttribute('aria-label',o?T.menuClose:T.menuOpen);document.body.classList.toggle('menu-open',o);setInert(o,$('#nav'));if(o)setTimeout(()=>links.querySelector('a').focus(),60);});
document.addEventListener('keydown',e=>{if(!links.classList.contains('open'))return;if(e.key==='Escape'){closeMenu();burger.focus();}
  else if(e.key==='Tab'){const f=[...$$('a',links),...$$('.lang a'),burger];const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();}});
addEventListener('resize',()=>{if(innerWidth>1280&&links.classList.contains('open'))closeMenu();$('#catSide').setAttribute('aria-orientation',innerWidth<=1000?'horizontal':'vertical');});

/* ══════════════════ TOAST ══════════════════ */
let toastT;
function notify(t,m){const el=$('#toast');$('#toastT').textContent=t;$('#toastM').textContent=m;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),5500);}

/* ══════════════════ FORMULAIRES → E-MAIL PRÉ-REMPLI ══════════════════ */
const MAIL_TO='direction@cbproducao.com';
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function checkField(el){
  let msg='';const v=(el.value||'').trim();
  if(el.required&&!v)msg=T.required;
  else if(el.type==='email'&&v&&!EMAIL_RE.test(v))msg=T.badEmail;
  el.setAttribute('aria-invalid',msg?'true':'false');
  const err=document.getElementById('err-'+el.id);if(err)err.textContent=msg;
  return !msg;
}
function fieldsOf(f){
  const out=[],seen=new Set();
  $$('input,select,textarea',f).forEach(el=>{
    if(el.name==='site_web')return;
    if(el.type==='radio'){if(!el.checked||seen.has(el.name))return;seen.add(el.name);}
    const v=(el.value||'').trim();if(v)out.push([el.name,v]);
  });
  return out;
}
function serialize(f){return fieldsOf(f).map(c=>c[0]+(LANG==='fr'?' : ':': ')+c[1]).join('\n');}
/* Envoi direct par le serveur (envoyer.php). En cas d'échec (site ouvert sur l'ordinateur, serveur indisponible), on repasse par la messagerie du visiteur. */
const T0=Date.now();
async function sendServer(type,f,subj,who){
  if(location.protocol==='file:'||!window.fetch)return false;
  const hp=$('input[name="site_web"]',f);
  try{const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),15000);
    const r=await fetch(ROOT+'envoyer.php',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,
      body:JSON.stringify({type,lang:LANG,sujet:subj,email:who.email,nom:who.nom||'',prenom:who.prenom||'',champs:fieldsOf(f),site_web:hp?hp.value:'',duree:Date.now()-T0})});
    clearTimeout(to);if(!r.ok)return false;const j=await r.json();return !!(j&&j.ok);}catch(_){return false;}
}
function busy(btn,on){if(!btn)return;if(on){btn.dataset.lbl=btn.innerHTML;btn.textContent=T.sending||'…';btn.disabled=true;}else{if(btn.dataset.lbl)btn.innerHTML=btn.dataset.lbl;btn.disabled=false;}}
function mailto(subject,body){return 'mailto:'+MAIL_TO+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);}
/* Plan B quand aucune messagerie ne s'ouvre (webmail) */
function gmail(subject,body){return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(MAIL_TO)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);}
function outlook(subject,body){return 'https://outlook.live.com/mail/0/deeplink/compose?to='+encodeURIComponent(MAIL_TO)+'&subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);}
async function copyRecap(el){const txt=T.to+MAIL_TO+'\n\n'+el.textContent;
  try{await navigator.clipboard.writeText(txt);notify(T.copiedT,T.copiedM+MAIL_TO+'.');}
  catch(_){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);notify(T.selT,T.selM+MAIL_TO+'.');}}

/* Devis en 3 étapes */
let dvStep=1;const DVN=3;const dvForm=$('#devisForm');
function dvValid(n){
  const fs=$(`.step[data-step="${n}"]`,dvForm);let first=null;
  if(n===1){const ok=!!$('#typeGroup input:checked');$('#err-type').textContent=ok?'':T.chooseType;$('#typeGroup').setAttribute('aria-invalid',ok?'false':'true');$$('#typeGroup input').forEach(x=>x.setAttribute('aria-describedby','err-type'));if(!ok)first=$('#typeGroup input');}
  $$('[required]:not([type="radio"])',fs).forEach(el=>{if(!checkField(el)&&!first)first=el;});
  if(first){first.focus();return false;}return true;
}
function dvGo(n,focus){
  n=Math.max(1,n);dvStep=n;
  $$('.step',dvForm).forEach(s=>s.hidden=+s.dataset.step!==n);
  $$('#dvSteps li').forEach((li,k)=>{li.classList.toggle('on',k+1===n);li.classList.toggle('done',k+1<n);});
  $('#dvSteps').style.display=n>DVN?'none':'';
  $('#dvNav').hidden=n>DVN;
  $('#dvPrev').hidden=n===1;$('#dvNext').hidden=n>=DVN;$('#dvSend').hidden=n!==DVN;
  $('#dvLive').textContent=n<=DVN?T.step(n,DVN)+$(`.step[data-step="${n}"] legend`,dvForm).textContent:T.ready;
  if(focus){const s=$(`.step[data-step="${n}"]`,dvForm);const f=n>DVN?s:$('input:not([type=radio]),select,textarea',s)||$('input',s);if(f)f.focus({preventScroll:true});
    const top=dvForm.getBoundingClientRect().top;if(top<70||top>innerHeight*.5)dvForm.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'start'});}
}
$('#dvNext').addEventListener('click',()=>{if(dvValid(dvStep))dvGo(dvStep+1,true);});
$('#dvPrev').addEventListener('click',()=>dvGo(dvStep-1,true));
$('#typeGroup').addEventListener('change',()=>$('#err-type').textContent='');
dvForm.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&dvStep<DVN){e.preventDefault();$('#dvNext').click();}});
dvForm.addEventListener('submit',async e=>{
  e.preventDefault();
  for(let n=1;n<=DVN;n++){if(!dvValid(n)){dvGo(n);dvValid(n);notify(T.missingT,T.missingM);return;}}
  const subj=T.quoteSubj+($('#d-mat').value||T.project)+' · '+$('#d-prenom').value.trim()+' '+$('#d-nom').value.trim();
  const body=serialize(dvForm)+'\n\n'+T.sentFrom;
  const href=mailto(subj,body);
  $('#dvRecap').textContent=body;$('#dvMailAgain').href=href;
  busy($('#dvSend'),true);
  const sent=await sendServer('devis',dvForm,subj,{email:$('#d-email').value.trim(),nom:$('#d-nom').value.trim(),prenom:$('#d-prenom').value.trim()});
  busy($('#dvSend'),false);
  if(sent){const box=$('.step[data-step="4"]',dvForm);box.classList.add('sent');$('h3',box).textContent=T.sentT;$('p',box).textContent=T.sentQuote;$('.btn-row',box).hidden=true;dvGo(4,true);return;}
  const g=$('#dvGmail'),o=$('#dvOutlook');if(g)g.href=gmail(subj,body);if(o)o.href=outlook(subj,body);
  dvGo(4,true);
  location.href=href;
});
$('#dvCopy').addEventListener('click',()=>copyRecap($('#dvRecap')));
$$('input,select,textarea').forEach(el=>el.addEventListener('input',()=>{if(el.getAttribute('aria-invalid')==='true')checkField(el);}));
$$('input[required],textarea[required],select[required]').forEach(el=>el.addEventListener('blur',()=>{if(el.value)checkField(el);}));

/* Contact rapide */
$('#contactForm').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget;let first=null;
  $$('[required]',f).forEach(el=>{if(!checkField(el)&&!first)first=el;});
  if(first){first.focus();notify(T.missingT,T.missingM);return;}
  const subj=$('#c-sujet').value.trim()||T.msgSubj,body=serialize(f)+'\n\n'+T.sentFrom,href=mailto(subj,body);
  const done=$('#ctDone');
  const sb=$('button[type=submit]',f);busy(sb,true);
  const sent=await sendServer('contact',f,subj,{email:$('#c-email').value.trim(),nom:$('#c-nom').value.trim()});
  busy(sb,false);
  if(sent&&done){done.classList.add('sent');$('h3',done).textContent=T.sentT2;$('p',done).textContent=T.sentContact;$('.btn-row',done).hidden=true;$('#ctRecap').textContent=body;done.hidden=false;done.focus({preventScroll:true});done.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'nearest'});f.querySelectorAll('input,textarea').forEach(x=>{if(x.name!=='site_web')x.value='';});return;}
  if(done){$('#ctRecap').textContent=body;$('#ctMailAgain').href=href;$('#ctGmail').href=gmail(subj,body);$('#ctOutlook').href=outlook(subj,body);done.hidden=false;done.focus({preventScroll:true});done.scrollIntoView({behavior:REDUCE?'auto':'smooth',block:'nearest'});}
  location.href=href;
  if(!done)notify(T.mailOpenT,T.mailOpenContact);
});
{const b=$('#ctCopy');if(b)b.addEventListener('click',()=>copyRecap($('#ctRecap')));}

/* Carte : chargée à la demande (performance + vie privée) */
function loadMap(){const m=$('#ctMap');if(m.dataset.on)return;m.dataset.on=1;m.innerHTML='<iframe title="'+T.mapTitle+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.openstreetmap.org/export/embed.html?bbox=-9.32%2C38.92%2C-9.22%2C38.98&amp;layer=mapnik&amp;marker=38.95%2C-9.27"></iframe>';}
$('#mapBtn').addEventListener('click',loadMap);

/* ══════════════════ DÉFILEMENT : nav, scrollspy, barre mobile ══════════════════ */
const nav=$('#nav'),toTop=$('#toTop'),mBar=$('#mBar'),hero=$('.hero');
function onScroll(){
  const y=scrollY;
  nav.classList.toggle('solid',y>hero.offsetHeight-90);
  toTop.classList.toggle('on',y>1200);
  const dv=$('#devis').getBoundingClientRect();
  mBar.classList.toggle('on',y>innerHeight*.6&&!(dv.top<innerHeight&&dv.bottom>0));
}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);onScroll();
toTop.addEventListener('click',()=>{scrollTo({top:0,behavior:REDUCE?'auto':'smooth'});$('.logo').focus({preventScroll:true});});
if('IntersectionObserver' in window)safe('défilement',()=>{
  const map={materiaux:'materiaux',catalogue:'materiaux',guide:'guide',realisations:'realisations',methode:'usine',usine:'usine',fournisseurs:'usine',pro:'pro',faq:'faq',devis:'contact',contact:'contact'};
  const navA=$$('#navLinks a[href^="#"]');
  const spy=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const k=map[e.target.id];navA.forEach(a=>a.setAttribute('aria-current',a.getAttribute('href')==='#'+k?'true':'false'));}});},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(id=>{const el=document.getElementById(id);if(el)spy.observe(el);});
  new IntersectionObserver(es=>{if(es[0].isIntersecting)navA.forEach(a=>a.setAttribute('aria-current','false'));},{rootMargin:'-45% 0px -50% 0px'}).observe($('#top'));
  // Apparitions
  document.documentElement.classList.add('rv-on');
  const rv=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rv.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px'});
  $$('.rv').forEach(el=>rv.observe(el));
  // Compteurs
  const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const el=e.target,n=+el.dataset.count,suf=el.dataset.suf||'';if(REDUCE){el.textContent=n+suf;return;}const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/1400),v=Math.round(n*(1-Math.pow(1-p,3)));el.textContent=v+suf;if(p<1)requestAnimationFrame(f);})(t0);}),{threshold:.6});
  $$('[data-count]').forEach(el=>co.observe(el));
});


/* ══════════════════ DÉMARRAGE (chaque bloc isolé : une erreur n'empêche pas le reste) ══════════════════ */
safe('année',()=>{$('#year').textContent=new Date().getFullYear();});
safe('catalogue',buildCatalogue);safe('guide',buildGuide);safe('galerie',buildReal);safe('images',()=>armAll());
(function(){
  const h=decodeURIComponent(location.hash.slice(1));
  const id=h.startsWith('mat-')?h.slice(4):h;
  if(MATS.some(m=>m.id===id)){switchMat(id);setTimeout(()=>$('#catalogue').scrollIntoView(),50);}
  else switchMat('mineralis');
})();
addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(h.startsWith('mat-')&&MATS.some(m=>m.id===h.slice(4)))openMat(h.slice(4));});

/* ══════════════════ DIAPORAMA DE L'ACCUEIL ══════════════════ */
(function(){try{
const HERO=CB_HERO;
const DUR=REDUCE?9000:6500;
const box=$('#heroSlides'),bars=$('#heroBars'),catEl=$('#heroCat'),matEl=$('#heroMat');
hero.style.setProperty('--dur',DUR+'ms');
const state=HERO.map(()=>0);
const slides=HERO.map(()=>{const d=document.createElement('div');d.className='hs';box.appendChild(d);return d;});
bars.innerHTML=HERO.map((h,i)=>`<button type="button" class="hb" aria-label="${T.photo} ${i+1}${COL}${esc(h[3])}"><span></span></button>`).join('')+'<button type="button" class="hero-pause" id="heroPause" aria-pressed="false" aria-label="'+T.pause+'">❚❚</button>';
const btns=$$('.hb',bars);let userPaused=REDUCE,hover=false;let cur=-1,timer=null,kb=0,started=0,remaining=DUR;
function load(i){return new Promise(res=>{if(state[i])return res(state[i]>0);const im=new Image();im.decoding='async';
  let url=RF+HERO[i][1],tried=false;
  im.onload=()=>{state[i]=1;slides[i].style.backgroundImage=`url("${url}")`;res(true);};
  im.onerror=()=>{if(!tried){tried=true;url=freeFor(HERO[i][0],1800);im.src=url;return;}state[i]=-1;btns[i].hidden=true;res(false);};im.src=url;});}
function nextOk(from){for(let k=1;k<=HERO.length;k++){const j=(from+k)%HERO.length;if(state[j]>=0)return j;}return -1;}
async function go(i){
  clearTimeout(timer);const ok=await load(i);
  if(!ok){const n=nextOk(i);if(n>=0&&n!==i)return go(n);$('#heroCap').style.display='none';return;}
  const prev=cur;cur=i;const sl=slides[i];
  sl.classList.remove('kb0','kb1','kb2','kb3');void sl.offsetWidth;if(!REDUCE)sl.classList.add('kb'+(kb++%4));
  sl.classList.add('on');if(prev>=0&&prev!==i)setTimeout(()=>slides[prev].classList.remove('on'),1800);
  btns.forEach((b,k)=>{b.classList.remove('cur');b.classList.toggle('done',k<i);b.removeAttribute('aria-current');});
  const bar=btns[i].querySelector('span');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='';
  btns[i].classList.add('cur');btns[i].setAttribute('aria-current','true');
  matEl.classList.add('out');setTimeout(()=>{catEl.textContent=HERO[i][0];matEl.textContent=HERO[i][3];matEl.classList.remove('out');},350);
  const n=nextOk(i);if(n>=0)load(n);schedule(DUR);
}
function schedule(ms){started=performance.now();remaining=ms;clearTimeout(timer);if(hero.classList.contains('paused'))return;timer=setTimeout(()=>{const n=nextOk(cur);if(n>=0)go(n);},ms);}
function pause(){if(hero.classList.contains('paused'))return;clearTimeout(timer);remaining=Math.max(300,remaining-(performance.now()-started));hero.classList.add('paused');}
function resume(){if(!hero.classList.contains('paused'))return;hero.classList.remove('paused');schedule(remaining);}
let inView=true;
function check(){(!document.hidden&&inView&&!userPaused&&!hover)?resume():pause();}
const pb=$('#heroPause');function syncPb(){pb.setAttribute('aria-pressed',userPaused);pb.setAttribute('aria-label',userPaused?T.play:T.pause);pb.textContent=userPaused?'▶':'❚❚';}
pb.addEventListener('click',()=>{userPaused=!userPaused;syncPb();check();});syncPb();
$('.hero-cap').addEventListener('mouseenter',()=>{hover=true;check();});$('.hero-cap').addEventListener('mouseleave',()=>{hover=false;check();});
hero.addEventListener('focusin',e=>{if(e.target.closest('.hero-bars')){hover=true;check();}});hero.addEventListener('focusout',()=>{hover=false;check();});
document.addEventListener('visibilitychange',check);
if('IntersectionObserver' in window)new IntersectionObserver(es=>{inView=es[0].isIntersecting;check();},{threshold:.15}).observe(hero);
btns.forEach((b,i)=>b.addEventListener('click',()=>{go(i);check();}));
go(0).then(check);

/* Poussière dorée, légère */
try{
const C=$('#heroDust');if(!C||REDUCE)return;
const X=C.getContext&&C.getContext('2d');if(!X)return;let W=0,H=0;
const P=Array.from({length:innerWidth<760?30:60},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.7+.4,v:Math.random()*.00025+.00008,d:(Math.random()-.5)*.0002,o:Math.random()*.5+.15,ph:Math.random()*6.28}));
function rs(){const D=Math.min(devicePixelRatio||1,1.5);W=C.offsetWidth;H=C.offsetHeight;C.width=W*D;C.height=H*D;X.setTransform(D,0,0,D,0,0);}
rs();addEventListener('resize',rs);
let raf=0;function loop(){if(!raf)raf=requestAnimationFrame(f);}
new MutationObserver(()=>{if(!hero.classList.contains('paused'))loop();}).observe(hero,{attributes:true,attributeFilter:['class']});
function f(ts){raf=0;if(hero.classList.contains('paused')||!W)return;raf=requestAnimationFrame(f);const t=ts||0;X.clearRect(0,0,W,H);
  for(const p of P){p.y-=p.v;p.x+=p.d+Math.sin(t*.0005+p.ph)*.00008;if(p.y<-.02){p.y=1.02;p.x=Math.random();}
    const a=p.o*(.55+Math.sin(t*.0015+p.ph)*.45),R=p.r*4,g=X.createRadialGradient(W*p.x,H*p.y,0,W*p.x,H*p.y,R);
    g.addColorStop(0,`rgba(255,226,170,${a})`);g.addColorStop(1,'rgba(255,226,170,0)');X.fillStyle=g;X.beginPath();X.arc(W*p.x,H*p.y,R,0,6.283);X.fill();}
}
loop();
}catch(err){console.error('Poussière',err);}
}catch(err){console.error('Diaporama',err);}})();
