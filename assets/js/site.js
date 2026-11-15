/* Health Check at a Glance: home page behaviour.
   Reads the console's own data (data.js) so missions, limits and sources here never drift from the console. */
(function(){
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- body model, switchable by mode ---------- */
const FIGS=window.HCG_FIGURES||{};
const CAP={
  train:'Each muscle group is colored by strength against preflight. Here the calves and shins are at Warning.',
  treat:'Choose a body area to open first-aid guides adapted for microgravity, each starting with red-flag checks.',
  organs:'An anatomy view of the brain, eyes, heart, lungs, digestive organs, kidneys and bones, each with its status.',
  elements:'Where each level is measured and how, with hydration shown as fluid inside the body.'
};
const stage=$('#figStage');
let cur=null;
function show(m){
  if(!stage||!FIGS[m]||m===cur)return;
  cur=m;
  const old=stage.querySelector('svg');
  stage.insertAdjacentHTML('beforeend',FIGS[m]);
  const neu=stage.lastElementChild;
  if(old){neu.classList.add('out');requestAnimationFrame(()=>{neu.classList.remove('out');old.classList.add('out')});setTimeout(()=>old.remove(),380)}
  $$('[data-fig]').forEach(b=>{const on=b.dataset.fig===m;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1});
  $('#figText').textContent=CAP[m];
  stage.setAttribute('aria-label',`Front and back body model, ${m} view`);
}
const tabs=$$('[data-fig]');
tabs.forEach((b,i)=>{
  b.addEventListener('click',()=>show(b.dataset.fig));
  b.addEventListener('keydown',e=>{
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    e.preventDefault();const n=tabs[(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];n.focus();show(n.dataset.fig);
  });
});
show('train');

/* ---------- counts from the data ---------- */
try{
  const nAlm=Object.keys(GUIDES).length+Object.keys(ALMANAC_EXTRA).length;
  const a=$('[data-count=almanac]');if(a)a.textContent=`${nAlm} entries`;
  const m=$('[data-count=missions]');if(m)m.textContent=`${Object.keys(MISSIONS).length} missions`;
}catch(e){}

/* ---------- status vocabulary, drawn from the console's words and colors ---------- */
const SHAPE={
  good:'<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="6" fill="currentColor"/></svg>',
  warn:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l5.4 10H.6z" fill="currentColor"/></svg>',
  bad:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.6 .5h4.8L11.5 3.6v4.8L8.4 11.5H3.6L.5 8.4V3.6z" fill="currentColor"/></svg>'
};
try{
  $('#statusChips').innerHTML=['good','warn','bad'].map(k=>`<span class="chip st s-${k}">${SHAPE[k]}${esc(STATUS_WORD[k])}</span>`).join('');
}catch(e){}

/* ---------- missions ---------- */
try{
  const list=Object.values(MISSIONS),max=Math.log10(1+Math.max(...list.map(m=>m.delay)));
  $('#missionList').innerHTML=list.map(m=>{
    const w=m.delay?Math.max(4,Math.round(Math.log10(1+m.delay)/max*100)):0;
    const delay=m.delay===0?'Real time':m.delay<60?`${m.delay} s`:`${Math.round(m.delay/60)} min`;
    return `<article class="mis">
      <small>One-way delay to Earth</small>
      <p class="delay">${esc(delay)}</p>
      <div class="bar" aria-hidden="true"><i style="width:${w}%"></i></div>
      <h3>${esc(m.name)}</h3>
      <dl>
        <div><dt>Gravity</dt><dd>${esc(m.gravity)}</dd></div>
        <div><dt>Strength training on</dt><dd>${esc(m.eq.R)}</dd></div>
        <div><dt>Medical path</dt><dd>${esc(m.path)}</dd></div>
      </dl>
    </article>`}).join('');
}catch(e){}

/* ---------- limits and their sources ---------- */
try{
  const keys=['co2','o2','ctemp','rh','press','career','water','kcal','bmd','temp','hr','sleep'];
  $('#stdRows').innerHTML=keys.filter(k=>RULES[k]).map(k=>{
    const r=RULES[k],s=SOURCES[r.src];
    const ref=r.ref.charAt(0).toUpperCase()+r.ref.slice(1);
    return `<tr><td>${esc(r.name)}</td><td>${esc(ref)}</td><td>${s?`<a href="${esc(s.u)}" rel="noopener">${esc(s.s)}</a>`:''}</td></tr>`}).join('');
}catch(e){}

/* ---------- offline cache when served over the web ---------- */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!/claude\.ai|claudeusercontent/.test(location.hostname)){
  const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
})();
