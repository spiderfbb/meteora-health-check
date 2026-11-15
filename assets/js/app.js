/* Health Check at a Glance: application logic (no frameworks, runs offline from file://)
   Layout: the deck on the left keeps the crew identity, the annunciator navigation and the body model
   on screen at all times. Everything about the astronaut opens in #panel on the right. */
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d)=>v==null||isNaN(v)?'--':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const SEV={good:0,warn:1,bad:2};
const worst=list=>list.reduce((a,b)=>SEV[b]>SEV[a]?b:a,'good');
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function series([a,b,noise],n,seed,dec){const r=rng(seed),out=[];for(let i=0;i<n;i++){const t=i/(n-1);const ease=t*t*(3-2*t);let v=a+(b-a)*(i>n*0.55?ease:t*0.35);v+= (i===n-1?0:(r()-.5)*2*noise);out.push(+v.toFixed(dec))}out[n-1]=+b.toFixed(dec);return out}
function mix(c1,c2,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const a=p(c1),b=p(c2);return'#'+a.map((x,i)=>Math.round(x+(b[i]-x)*t).toString(16).padStart(2,'0')).join('')}
const ICON={
  good:'<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="6" fill="currentColor"/><path d="M3.3 6.2l1.8 1.8 3.6-3.8" stroke="#0B111A" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn:'<svg viewBox="0 0 12 12"><path d="M6 .8l5.4 10H.6z" fill="currentColor"/><path d="M6 4.3v3" stroke="#0B111A" stroke-width="1.4" stroke-linecap="round"/><circle cx="6" cy="9" r=".75" fill="#0B111A"/></svg>',
  bad:'<svg viewBox="0 0 12 12"><path d="M3.6 .5h4.8L11.5 3.6v4.8L8.4 11.5H3.6L.5 8.4V3.6z" fill="currentColor"/><path d="M6 3.2v3.4" stroke="#0B111A" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="8.7" r=".8" fill="#0B111A"/></svg>',
  info:'<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="6" fill="currentColor"/><path d="M6 5.3v3.3" stroke="#0B111A" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="3.4" r=".8" fill="#0B111A"/></svg>'
};
const icon=(st,size=12)=>ICON[st].replace('<svg',`<svg width="${size}" height="${size}" style="color:${STATUS_COLOR[st]||'var(--accent)'}" aria-hidden="true"`);
const pill=(st,txt)=>`<span class="status ${st}">${ICON[st]}${esc(txt||STATUS_WORD[st])}</span>`;
const ev=(key,v)=>RULES[key].eval(v);
const N=14;

/* ---------- state ---------- */
const S={mission:'iss',crew:0,role:'astro',view:'overview',mode:'train',sel:{train:null,treat:'lowerleg',organs:null,elements:null},cond:null,
  trend:'temp',habModule:null,habKey:'co2',sep:false,cases:[],activeCase:null,xp:{},runner:null,checkinPhoto:null,ci:{},tab:{},folds:{},allAttn:false,rf:{},sd:{},alm:{q:'',cat:'all',id:null}};
const D={};          // per-crew time series
CREW.forEach((c,ci)=>{
  const d={};
  for(const k in c.spec){d[k]=series(c.spec[k],N,hash(c.id+k),RULES[k].dec)}
  d.strength={};for(const m in c.muscles){const end=c.muscles[m];d.strength[m]=series([100,end,1.1],8,hash(c.id+m),0)}
  d.dose=series([.44,.46,.03],N,hash(c.id+'dose'),2);
  D[c.id]=d;
  S.xp[c.id]={pts:[1240,980,610][ci],streak:[9,6,4][ci],badges:new Set(['first'].concat(ci===0?['bone']:[]))};
});
const H={};for(const m in HABITAT){H[m]={};for(const k in HABITAT[m])H[m][k]=series(HABITAT[m][k],24,hash('hab'+m+k),RULES[k].dec)}

const crew=()=>CREW[S.crew];
const data=()=>D[crew().id];
const mission=()=>MISSIONS[S.mission];
const habOf=m=>H[m in H?m:0];
const moduleName=()=>{const m=mission(),c=crew();return m.modules[c.module]||m.modules[0]};
function latest(key){
  const c=crew(),d=data();
  if(key==='bmd')return c.bmd;
  if(key==='career')return c.prior+c.missionDose;
  if(key in d&&Array.isArray(d[key]))return d[key][N-1];
  const h=habOf(c.module);if(key in h)return h[key][23];
  return null;
}
function statusOf(key){const v=latest(key);return v==null?'good':ev(key,v)}

/* ---------- derived statuses ---------- */
function muscleStatus(m){return ev('strength',crew().muscles[m])}
function organStatus(o){
  const c=crew();
  if(o==='eyes')return c.eyes;
  if(o==='ear')return 'good';
  if(o==='bones')return ev('bmd',c.bmd);
  return worst(ORGANS[o].keys.map(statusOf));
}
function elemStatus(e){return statusOf(ELEMENTS[e].key)}
function pickWorst(ids,fn){let best=ids[0],bs=-1;ids.forEach(i=>{const s=SEV[fn(i)];if(s>bs){bs=s;best=i}});return best}
function defaults(){
  S.sel.train=pickWorst(Object.keys(MUSCLES),muscleStatus);
  S.sel.organs=pickWorst(Object.keys(ORGANS),organStatus);
  S.sel.elements=pickWorst(Object.keys(ELEMENTS),elemStatus);
  S.sel.treat='lowerleg';S.cond='sprain';
}
function watchList(){
  const flags=[];
  Object.keys(ORGANS).forEach(o=>{const s=organStatus(o);if(s!=='good')flags.push([s,ORGANS[o].n,'organs',o])});
  Object.keys(ELEMENTS).forEach(e=>{const s=elemStatus(e);if(s!=='good'&&!flags.some(f=>f[1]===ELEMENTS[e].n))flags.push([s,ELEMENTS[e].n,'elements',e])});
  Object.keys(MUSCLES).forEach(mm=>{const s=muscleStatus(mm);if(s==='bad')flags.push([s,MUSCLES[mm].n,'train',mm])});
  return flags.sort((a,b)=>SEV[b[0]]-SEV[a[0]]);
}

/* ---------- body figure (traced 2D map, front and back) ---------- */
const UNFILLED=new Set(['head','neck','pelvis','knees','sternum','hands','feet']);
const FIG={muscle:'#24324B',zone:'#18223A',line:'#9DB0CC',sil:'#172235',silLine:'#5E7395',bone:'#33445F'};
/* The reference drawing stops at mid-shin. These drawn extensions carry each leg down to the
   ankle and foot so the map shows the whole body. They join the traced shins and calves at
   y = 486 and are mirrored across each figure's centre line (front x = 159.6, back x = 468.3). */
const FIG_H=560;
const LEG={
  f:{axis:319.2,
     shin:'M100.3 485.2L124.5 485.2C123.6 499 121 512 118.8 525L105.4 525C103.6 512 101.4 499 100.3 485.2Z',
     edge:'M100.3 486C101.4 499 103.6 512 105.4 525M124.5 486C123.6 499 121 512 118.8 525',
     foot:'M105.4 524.6C104.2 530 101.4 535 98.6 539.5C96.4 543 96.2 547.6 99.6 548.6C104 549.8 116 549.8 120.8 548.4C123.6 547.6 123.6 544 122.4 540.6C121 536.4 119.8 530.4 118.8 524.6Z',
     detail:'M104.6 545.4V548.8M108.8 545.8V549.2M113 545.8V549.2M117.2 545.4V548.8'},
  b:{axis:936.6,
     shin:'M403.5 485.2L434.7 485.2C432.6 498 429.2 512 427 525L413.4 525C411 512 405.4 498 403.5 485.2Z',
     edge:'M403.5 486C405.4 498 411 512 413.4 525M434.7 486C432.6 498 429.2 512 427 525',
     foot:'M413.4 524.6C412 532 409.6 539 409.2 544C408.8 549.6 413 552 420.2 552C427.4 552 431.6 549.6 431.2 544C430.8 539 428.4 532 427 524.6Z',
     detail:'M420.2 506V532M414.6 547.6Q420.2 549.6 425.8 547.6'}
};
const mirror=f=>`translate(${LEG[f].axis} 0) scale(-1 1)`;
/* extra regions in the same shape as BODY.regions, with an optional transform */
const EXT_REGIONS=[
  {g:'shins',side:'R',view:'f',d:LEG.f.shin,ext:1},{g:'shins',side:'L',view:'f',d:LEG.f.shin,tf:mirror('f'),ext:1},
  {g:'feet',side:'R',view:'f',d:LEG.f.foot},{g:'feet',side:'L',view:'f',d:LEG.f.foot,tf:mirror('f')},
  {g:'calves',side:'L',view:'b',d:LEG.b.shin,ext:1},{g:'calves',side:'R',view:'b',d:LEG.b.shin,tf:mirror('b'),ext:1},
  {g:'feet',side:'L',view:'b',d:LEG.b.foot},{g:'feet',side:'R',view:'b',d:LEG.b.foot,tf:mirror('b')}
];
const REGIONS=BODY.regions.concat(EXT_REGIONS);
function legLines(faces,color,w){
  return faces.map(f=>{const L=LEG[f],p=`${L.edge}${L.foot}${L.detail}`;
    return `<g fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"><path d="${p}"/><path d="${p}" transform="${mirror(f)}"/></g>`}).join('');
}
/* front silhouette legs for the organ and element views (fill only; outline drawn by legLines) */
const silLegs=fill=>`<g fill="${fill}" pointer-events="none"><path d="${LEG.f.shin}"/><path d="${LEG.f.foot}"/><path d="${LEG.f.shin}" transform="${mirror('f')}"/><path d="${LEG.f.foot}" transform="${mirror('f')}"/></g>`;

function regionFill(r){
  const base=UNFILLED.has(r.g)?FIG.zone:FIG.muscle;
  if(S.mode==='train'){
    const m=GROUP_TO_MUSCLE[r.g]; if(!m)return{fill:base,off:true,label:''};
    const st=muscleStatus(m),t={good:.42,warn:.62,bad:.66}[st];
    const sel=S.sel.train===m;
    return{fill:mix(base,STATUS_COLOR[st],sel?Math.min(.9,t+.2):t),off:false,sel,st,label:MUSCLES[m].n.split(' (')[0]+', '+STATUS_WORD[st]};
  }
  const z=ZONE_OF(r.g,r.view);if(!z)return{fill:base,off:true,label:''};
  const sel=S.sel.treat===z;
  return{fill:sel?mix(base,'#6CCBEA',.5):base,off:false,sel,label:ZONES[z].n};
}
/* Warning areas carry a hatch and Caution areas a dot texture, so status never depends on color alone. */
function patterns(){
  return `<defs>
   <pattern id="hatchBad" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#FFD2D2" stroke-width="1.1" opacity=".55"/></pattern>
   <pattern id="dotWarn" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".8" fill="#FFF0CF" opacity=".55"/></pattern>
   <clipPath id="silF"><path d="${BODY.sil.f}"/><path d="${LEG.f.shin}"/><path d="${LEG.f.foot}"/><path d="${LEG.f.shin}" transform="${mirror('f')}"/><path d="${LEG.f.foot}" transform="${mirror('f')}"/></clipPath>
   <linearGradient id="fluid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6CCBEA" stop-opacity=".55"/><stop offset="1" stop-color="#1D5F86" stop-opacity=".35"/></linearGradient>
  </defs>`;
}
function muscleSVG(){
  let s=`<svg class="figure" viewBox="0 0 626 ${FIG_H}" role="group" aria-label="Body map, front and back">${patterns()}`;
  for(const r of REGIONS){
    const f=regionFill(r),tf=r.tf?` transform="${r.tf}"`:'';
    const attrs=f.off?'':` tabindex="0" role="button" aria-label="${esc(f.label)}" data-tip="${esc(f.label)}"`;
    s+=`<path class="rg${r.ext?' ext':''}${f.off?' off':''}${f.sel?' sel':''}" d="${r.d}"${tf} fill="${f.fill}" data-g="${r.g}" data-face="${r.view}"${attrs}/>`;
    if(f.st==='bad')s+=`<path d="${r.d}"${tf} fill="url(#hatchBad)" pointer-events="none"/>`;
    if(f.st==='warn')s+=`<path d="${r.d}"${tf} fill="url(#dotWarn)" pointer-events="none"/>`;
  }
  s+=`<path d="${BODY.lines}" fill="${FIG.line}" pointer-events="none"/>${legLines(['f','b'],FIG.line,1.4)}`;
  /* the drawn shin pieces join the traced ones, so their selection outline is drawn on the sides only */
  for(const r of EXT_REGIONS)if(r.ext&&regionFill(r).sel)s+=`<path d="${LEG[r.view].edge}"${r.tf?` transform="${r.tf}"`:''} fill="none" stroke="#6CCBEA" stroke-width="1.4" pointer-events="none"/>`;
  s+=`<text class="viewlbl" x="16" y="24">Front</text><text class="viewlbl" x="610" y="24" text-anchor="end">Back</text>`;
  return s+'</svg>';
}
/* ---- callout helper shared by the anatomy and sensor views ---- */
function svgCallout(id,kind,side,ly,ax,ay,name,line2,line3,st,sel){
  const L=side==='L',tx=L?-10:330,kx=L?2:318,c=STATUS_COLOR[st],cx=tx+(L?-4:4),cy=ly-4;
  const mark=st==='good'?`<circle cx="${cx}" cy="${cy}" r="3.6" fill="${c}"/>`
    :st==='warn'?`<path d="M${cx} ${ly-8.2}l4.2 7.6h-8.4z" fill="${c}"/>`
    :`<rect x="${cx-3.4}" y="${cy-3.4}" width="6.8" height="6.8" fill="${c}" transform="rotate(45 ${cx} ${cy})"/>`;
  const x=tx+(L?-12:12),a=L?'end':'start';
  return `<g class="callout${sel?' sel':''}" data-${kind}="${id}" tabindex="0" role="button" aria-label="${esc(name)}: ${STATUS_WORD[st]}">
    <path class="leader" d="M${ax} ${ay}L${kx} ${ly-4}H${tx}"/><circle cx="${ax}" cy="${ay}" r="1.8" fill="${sel?'#6CCBEA':'#AEBAD0'}"/>
    ${mark}<text class="cl-n" x="${x}" y="${ly-1}" text-anchor="${a}">${esc(name)}</text>
    <text class="cl-v" x="${x}" y="${ly+11}" text-anchor="${a}" style="fill:${c}">${esc(line2)}</text>
    ${line3?`<text class="cl-m" x="${x}" y="${ly+22}" text-anchor="${a}">${esc(line3)}</text>`:''}</g>`;
}
/* ---- Organs: silhouette, skeleton and the full organ set, with labelled callouts ---- */
function anatomySVG(){
  const st=o=>STATUS_COLOR[organStatus(o)],sel=o=>S.sel.organs===o;
  const g=(o,inner,op=.62)=>`<g class="organ${sel(o)?' sel':''}" data-organ="${o}" tabindex="0" role="button" aria-label="${esc(ORGANS[o].n)}: ${STATUS_WORD[organStatus(o)]}" data-tip="${esc(ORGANS[o].n.split(' (')[0])}, ${STATUS_WORD[organStatus(o)]}" fill="${st(o)}" fill-opacity="${sel(o)?Math.min(.9,op+.2):op}" stroke="${mix(st(o),'#FFFFFF',.35)}" stroke-width=".7">${inner}</g>`;
  const ribs=Array.from({length:7},(_,i)=>{const y=112+i*9.5,w=30-Math.abs(i-2)*1.2;return `<path d="M158 ${y}c-8 -1 -${w-4} 1 -${w} ${12+i*0.6}M162 ${y}c8 -1 ${w-4} 1 ${w} ${12+i*0.6}"/>`}).join('');
  const verts=Array.from({length:22},(_,i)=>`<rect x="157.6" y="${88+i*7.1}" width="4.8" height="5.2" rx="1.4"/>`).join('');
  const bone=`stroke-linecap="round" fill="none"`;
  let s=`<svg class="figure" viewBox="-172 0 664 ${FIG_H}" role="group" aria-label="Organ view">${patterns()}`;
  s+=`<path d="${BODY.sil.f}" fill="${FIG.sil}" stroke="${FIG.silLine}" stroke-width="1"/>${silLegs(FIG.sil)}${legLines(['f'],FIG.silLine,1)}`;
  s+=`<g stroke="${FIG.bone}" stroke-width="1.6" fill="none" opacity=".9" pointer-events="none">${ribs}<path d="M130 106q30 6 60 0"/></g>`;
  s+=g('bones',`<g stroke="${st('bones')}" stroke-opacity=".7" ${bone}><path d="M100 130L70 192M66 198L36 250M220 130L250 192M254 198L284 250" stroke-width="4"/><path d="M140 272L125 392M121 404L113 521M180 272L195 392M199 404L206.2 521" stroke-width="5.5"/><path d="M104 540L119 540M200.2 540L215.2 540" stroke-width="3"/></g><g fill-opacity=".9"><circle cx="68" cy="195" r="3.6"/><circle cx="252" cy="195" r="3.6"/><circle cx="123" cy="398" r="4.6"/><circle cx="197" cy="398" r="4.6"/><circle cx="100" cy="129" r="4"/><circle cx="220" cy="129" r="4"/><circle cx="112.4" cy="527" r="3.6"/><circle cx="206.8" cy="527" r="3.6"/></g>${verts}<path d="M134 248c10-7 20-6 26 3 6-9 16-10 26-3l-3 20c-8 6-16 4-23-4-7 8-15 10-23 4z"/>`,.55);
  s+=g('brain','<ellipse cx="160" cy="34" rx="18.5" ry="14"/><path d="M147 31q6-6 13 0t13 0M148 38q6-5 12 0t12 0M160 21v26" fill="none" stroke-opacity=".7"/>');
  s+=g('eyes','<ellipse cx="151.6" cy="51.5" rx="4.4" ry="2.8"/><ellipse cx="168.4" cy="51.5" rx="4.4" ry="2.8"/>',.75);
  s+=g('ear','<path d="M135.6 51c-3 0-4.2 3-4.2 5.4s1.6 5.2 4.2 5.2c2 0 2.6-2 1.4-3.2-1.4-1.2-.8-3.4.4-4.4 1-1 .4-3-1.8-3z"/><path d="M184.4 51c3 0 4.2 3 4.2 5.4s-1.6 5.2-4.2 5.2c-2 0-2.6-2-1.4-3.2 1.4-1.2.8-3.4-.4-4.4-1-1-.4-3 1.8-3z"/>',.75);
  s+=g('kidneys','<path d="M136 204c-7 0-10 7-10 12s3 13 10 12c4 0 4-5 2-7-2-3-2-7 0-10 2-3 2-7-2-7z"/><path d="M184 204c7 0 10 7 10 12s-3 13-10 12c-4 0-4-5-2-7 2-3 2-7 0-10-2-3-2-7 2-7z"/><ellipse cx="160" cy="263" rx="8" ry="6"/>');
  s+=g('lungs','<path d="M154 116c-10-4-24 2-27 22-2 13-1 25 3 31 6 4 16 2 22-3 2-14 4-33 2-50z"/><path d="M166 116c9-4 23 2 26 22 2 13 1 25-3 31-6 4-15 2-21-3l1-14c4-3 3-12-2-15z"/>');
  s+=g('heart','<path d="M165 138c-3-7-14-6-14 3 0 8 9 14 16 21 7-7 14-13 13-21-1-8-11-9-15-3z"/>',.75);
  s+=g('digestive','<path d="M131 182c10-8 34-9 42-3-3 10-19 18-33 16-7-1-12-6-9-13z"/><path d="M177 177c9-2 15 6 12 15-2 9-11 12-19 8 5-5 9-11 7-23z"/><path d="M143 206c10-5 28-5 35 1 4 12 3 28-5 36-9 5-20 5-27 0-8-9-8-26-3-37z"/><path d="M150 217q10 6 20 0M148 229q12 6 24 0" fill="none" stroke-opacity=".8"/>');
  for(const [o,O] of Object.entries(ORGANS))s+=svgCallout(o,'organ',O.side,O.ly,O.at[0],O.at[1],O.n.split(' (')[0],organReading(o),'',organStatus(o),sel(o));
  return s+'</svg>';
}
/* ---- Elements: how each level is measured, with hydration shown as a fluid level ---- */
function sensorSVG(){
  const water=latest('water'),pct=Math.max(.04,Math.min(1,water/2.5)),top=12,bot=552,lvl=bot-pct*(bot-top);
  const wc=STATUS_COLOR[elemStatus('water')];
  let s=`<svg class="figure" viewBox="-172 0 664 ${FIG_H}" role="group" aria-label="Body elements and how they are measured">${patterns()}`;
  s+=`<path d="${BODY.sil.f}" fill="${FIG.sil}" stroke="${FIG.silLine}" stroke-width="1"/>${silLegs(FIG.sil)}`;
  s+=`<g clip-path="url(#silF)" pointer-events="none"><rect x="0" y="${lvl}" width="320" height="${bot-lvl}" fill="url(#fluid)"/>
      <path class="fluid-wave" d="M-80 ${lvl} ${Array.from({length:12},()=>'q10 -3 20 0t20 0').join(' ')} V${lvl+6} H-80Z" fill="#6CCBEA" opacity=".35"/>
      <line x1="0" x2="320" y1="${lvl}" y2="${lvl}" stroke="#8EDCF2" stroke-width=".8" stroke-dasharray="3 3"/></g>${legLines(['f'],FIG.silLine,1)}`;
  s+=`<g fill="none" stroke="#C25A62" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round" pointer-events="none">
      <path d="M163 138V250M163 250L142 300L126 400L113 524L104 544M163 250L182 300L196 400L206.2 524L215.2 544M160 122L104 128L70 192L34 254M160 122L216 128L250 192L286 254M153 122V58M167 122V58"/></g>
      <path d="M165 138c-3-7-14-6-14 3 0 8 9 14 16 21 7-7 14-13 13-21-1-8-11-9-15-3z" fill="#C25A62" fill-opacity=".55" pointer-events="none"/>`;
  for(const [id,E] of Object.entries(ELEMENTS)){
    const st=elemStatus(id),c=STATUS_COLOR[st],[x,y]=E.pos,sel=S.sel.elements===id;
    s+=svgCallout(id,'elem',E.side,E.ly,x,y,E.lbl,elemReading(id),E.via,st,sel);
    s+=`<g class="sensor" pointer-events="none"><circle class="pulse" cx="${x}" cy="${y}" r="4" stroke="${c}"/><circle cx="${x}" cy="${y}" r="${sel?5:4}" fill="${c}" stroke="#0E1521" stroke-width="1.2"/></g>`;
  }
  return s+'</svg>';
}
function figure2D(){return S.mode==='organs'?anatomySVG():S.mode==='elements'?sensorSVG():muscleSVG()}

/* ---------- readings shown on callouts ---------- */
function organReading(o){
  const c=crew();
  if(o==='bones')return `${STATUS_WORD[organStatus(o)]}, ${c.bmd} %/month loss`;
  if(o==='eyes')return `${STATUS_WORD[c.eyes]}, ${c.eyes==='good'?'no vision change':'vision change logged'}`;
  if(o==='ear')return 'Nominal, no dizziness';
  const k=ORGANS[o].keys[0];return `${STATUS_WORD[organStatus(o)]}, ${fmt(latest(k),RULES[k].dec)} ${RULES[k].unit}`;
}
function elemReading(id){const E=ELEMENTS[id],k=E.key,v=latest(k);
  if(k==='career')return `${STATUS_WORD[elemStatus(id)]}, ${v} of 600 mSv`;
  if(k==='bmd')return `${STATUS_WORD[elemStatus(id)]}, ${v} %/month`;
  if(k==='water')return `${STATUS_WORD[elemStatus(id)]}, ${fmt(v,1)} L, ${Math.round(Math.min(1,v/2.5)*100)} % of goal`;
  return `${STATUS_WORD[elemStatus(id)]}, ${fmt(v,RULES[k].dec)} ${RULES[k].unit}`}
/* legend for the current body view, shown on the stage */
function legendHTML(){
  const m=S.mode;
  if(m==='treat')return `<span class="lg"><i class="sw" style="background:${mix(FIG.zone,'#6CCBEA',.5)}"></i>Selected area</span><span class="lg"><i class="sw" style="background:${FIG.zone}"></i>Select to open a guide</span>`;
  if(m==='train')return `<span class="lg"><i class="sw" style="background:${mix(FIG.muscle,'#3DBE7A',.42)}"></i>Nominal</span><span class="lg"><i class="sw" style="background:${mix(FIG.muscle,'#E9A93A',.62)} url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='2' cy='2' r='.7' fill='%23FFF0CF'/%3E%3C/svg%3E&quot;)"></i>Caution, dotted</span><span class="lg"><i class="sw" style="background:${mix(FIG.muscle,'#EF5B5B',.66)} repeating-linear-gradient(45deg,rgba(255,220,220,.55) 0 1px,transparent 1px 4px)"></i>Warning, hatched</span>`;
  return ['good','warn','bad'].map(s=>`<span class="lg">${icon(s,12)}${STATUS_WORD[s]}</span>`).join('');
}


/* ---------- charts (2px line, recessive grid, crosshair tooltip) ---------- */
const BANDS={hr:[60,100],sys:[90,120],dia:[60,80],glu:[70,99],temp:[36.1,37.2],spo2:[95,100],sleep:[7,9],mood:[4,5],water:[2.2,3.2],kcal:[2600,3400],na:[135,145],k:[3.5,5],
  co2:[0,3],o2:[145,155],ctemp:[20,25],rh:[30,60],press:[95,103],dose:[0,.8],strength:[90,100]};
function chart(vals,key,{w=520,h=150,labels=null}={}){
  const band=BANDS[key]||null;let lo=Math.min(...vals),hi=Math.max(...vals);
  if(band){const span=Math.max(hi-lo,(band[1]-band[0])*.5);lo=Math.min(lo,Math.max(band[0],lo-span));hi=Math.max(hi,Math.min(band[1],hi+span))}
  const pad=(hi-lo)*.12||1;const nonneg=Math.min(...vals)>=0;lo-=pad;hi+=pad;if(nonneg&&lo<0)lo=0;
  const L=36,R=10,T=10,B=22,X=i=>L+i*(w-L-R)/(vals.length-1),Y=v=>T+(hi-v)*(h-T-B)/(hi-lo);
  const st=ev(key,vals[vals.length-1]),col=STATUS_COLOR[st],R_=RULES[key];
  const lab=labels||vals.map((_,i)=>i===vals.length-1?'Today':`D-${vals.length-1-i}`);
  const pts=vals.map((v,i)=>[+X(i).toFixed(1),+Y(v).toFixed(1),fmt(v,R_.dec),lab[i],STATUS_WORD[ev(key,v)]]);
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(R_.name)} trend, latest ${fmt(vals[vals.length-1],R_.dec)} ${R_.unit}" data-pts='${JSON.stringify(pts)}' data-unit="${esc(R_.unit)}" data-w="${w}">`;
  if(band)s+=`<rect x="${L}" y="${Y(band[1])}" width="${w-L-R}" height="${Math.max(1,Y(band[0])-Y(band[1]))}" fill="#3DBE7A" opacity=".08"/><text x="${w-R-4}" y="${Math.min(h-B-4,Y(band[0])-4)}" text-anchor="end" style="fill:#6FCF9C">reference range</text>`;
  for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3;s+=`<line x1="${L}" x2="${w-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1A2533"/><text x="${L-6}" y="${Y(v)+3}" text-anchor="end">${fmt(v,R_.dec>0?1:0)}</text>`}
  s+=`<polyline points="${pts.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
  vals.forEach((v,i)=>{const c=STATUS_COLOR[ev(key,v)];if(i===vals.length-1||ev(key,v)!=='good')s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${i===vals.length-1?4.5:2.8}" fill="${c}" stroke="#0B111A" stroke-width="2"/>`});
  lab.forEach((t,i)=>{if(i%Math.ceil(vals.length/7)===0||i===vals.length-1)s+=`<text x="${X(i)}" y="${h-6}" text-anchor="middle">${t}</text>`});
  s+=`<line class="xh" x1="0" x2="0" y1="${T}" y2="${h-B}" stroke="#A9B6CB" stroke-width="1" opacity="0"/><circle class="xd" r="4.5" fill="${col}" stroke="#E6ECF5" stroke-width="1.5" opacity="0"/>`;
  s+=`<rect x="${L}" y="${T}" width="${w-L-R}" height="${h-T-B}" fill="transparent" class="hit"/>`;
  return s+'</svg>';
}
function spark(vals,key,w=200,h=40){
  let lo=Math.min(...vals),hi=Math.max(...vals);const p=(hi-lo)*.15||1;lo-=p;hi+=p;
  const X=i=>2+i*(w-6)/(vals.length-1),Y=v=>3+(hi-v)*(h-6)/(hi-lo);
  const col=STATUS_COLOR[ev(key,vals[vals.length-1])];
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px" aria-hidden="true"><polyline points="${vals.map((v,i)=>X(i)+','+Y(v)).join(' ')}" fill="none" stroke="${col}" stroke-width="1.6"/><circle cx="${X(vals.length-1)}" cy="${Y(vals[vals.length-1])}" r="2.6" fill="${col}"/></svg>`;
}
document.addEventListener('mousemove',e=>{
  const tip=document.getElementById('tip'),svg=e.target.closest&&e.target.closest('svg.chart[data-pts]');
  document.querySelectorAll('svg.chart .xh,svg.chart .xd').forEach(n=>{if(!svg||!svg.contains(n))n.setAttribute('opacity','0')});
  if(!svg){const rt=e.target.closest&&e.target.closest('#stage [data-tip]');if(rt){tip.innerHTML=esc(rt.dataset.tip);tip.hidden=false;tip.style.left=Math.min(window.innerWidth-220,e.clientX+14)+'px';tip.style.top=(e.clientY-38)+'px'}else tip.hidden=true;return}
  const pts=JSON.parse(svg.dataset.pts),box=svg.getBoundingClientRect(),sx=(e.clientX-box.left)*(+svg.dataset.w)/box.width;
  let best=pts[0];for(const p of pts)if(Math.abs(p[0]-sx)<Math.abs(best[0]-sx))best=p;
  const xh=svg.querySelector('.xh'),xd=svg.querySelector('.xd');xh.setAttribute('x1',best[0]);xh.setAttribute('x2',best[0]);xh.setAttribute('opacity','.5');xd.setAttribute('cx',best[0]);xd.setAttribute('cy',best[1]);xd.setAttribute('opacity','1');
  tip.innerHTML=`<b>${best[2]} ${esc(svg.dataset.unit)}</b>, ${esc(best[4])}<br><span style="color:var(--muted)">${esc(best[3])}</span>`;tip.hidden=false;
  tip.style.left=Math.min(window.innerWidth-170,e.clientX+14)+'px';tip.style.top=(e.clientY-46)+'px';
});


/* ---------- shared UI bits ---------- */
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const cut=s=>String(s).split(' (')[0];
function metric(key,label){
  const v=latest(key),st=ev(key,v),R=RULES[key];
  return `<div class="metric"><small>${esc(label||R.name)}</small><b class="num" style="color:${st==='good'?'var(--ink)':STATUS_COLOR[st]}">${fmt(v,R.dec)} <span class="u">${R.unit}</span></b><em style="color:${STATUS_COLOR[st]}">${icon(st,11)}${STATUS_WORD[st]}</em><span class="ref">Normal ${esc(R.ref)}</span></div>`;
}
function metricRaw(label,val,st,ref){return `<div class="metric"><small>${esc(label)}</small><b class="num" style="color:${st==='good'?'var(--ink)':STATUS_COLOR[st]}">${val}</b><em style="color:${STATUS_COLOR[st]}">${icon(st,11)}${STATUS_WORD[st]}</em>${ref?`<span class="ref">${ref}</span>`:''}</div>`}
function stepsHTML(list,opts={}){
  const done=opts.done||new Set();
  return `<ol class="steps">${list.map((s,i)=>`<li class="step">${opts.check?`<input type="checkbox" aria-label="Done: ${esc(s[0])}" data-stepchk="${i}" ${done.has(i)?'checked':''}>`:`<span class="n">${i+1}</span>`}<div><b>${esc(s[0])}</b>${s[1]?`<p>${esc(s[1])}</p>`:''}${s[2]?`<div class="chips">${s[2]}</div>`:''}</div></li>`).join('')}</ol>`;
}
function toast(html){const w=$('#toasts');while(w.children.length>=2)w.firstChild.remove();const t=document.createElement('div');t.className='toast';t.innerHTML=html;w.appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),400)},3200)}
function addXP(n,why){const x=S.xp[crew().id];x.pts+=n;toast(`<span><b>+${n} points</b><br>${esc(why)}</span>`)}
const MODE_ICON={
  train:'<svg viewBox="0 0 24 24"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  treat:'<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5.5h6V7M12 10.5v5M9.5 13h5"/></svg>',
  organs:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  elements:'<svg viewBox="0 0 24 24"><path d="M12 3.5c3 4 5.5 7.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2.5-6.2 5.5-10.2z"/></svg>'
};
const MODES=[['train','Train','Muscle strength'],['treat','Treat','Where it hurts'],['organs','Organs','Organs and skeleton'],['elements','Elements','Levels and sensors']];
const CHEV='<svg class="go" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3"/></svg>';

/* a titled block inside the panel */
const blk=(title,aside,body,cls='')=>`<section class="blk ${cls}">${title?`<header class="blk-h"><h3>${title}</h3>${aside?`<span class="aside">${aside}</span>`:''}</header>`:''}${body}</section>`;
/* a block that opens and closes with an animated height; closed by default */
const fold=(id,title,aside,body)=>{const open=!!S.folds[id];return `<section class="fold${open?' open':''}"><button class="fold-h" data-fold="${id}" aria-expanded="${open}"><span class="ft">${title}</span>${aside?`<span class="aside">${aside}</span>`:''}<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></button><div class="fold-b"><div class="fold-in">${body}</div></div></section>`};
/* tabs: only the active pane is rendered; the ink slides between tabs */
function tabs(group,list,def){
  let cur=S.tab[group];if(!list.some(t=>t[0]===cur))cur=def||list[0][0];S.tab[group]=cur;
  return `<div class="tabs slider" role="tablist" data-group="${group}">${list.map(([k,l,,b])=>`<button class="tab${k===cur?' on':''}" role="tab" aria-selected="${k===cur}" data-tab="${group}:${k}">${l}${b||''}</button>`).join('')}<i class="ink" aria-hidden="true"></i></div><div class="tabpane" role="tabpanel" data-pane="${group}">${list.find(t=>t[0]===cur)[2]()}</div>`;
}
/* place every sliding indicator under its active item */
function inks(root=document){
  root.querySelectorAll('.slider').forEach(sl=>{
    const on=sl.querySelector('.on'),ink=sl.querySelector('.ink');if(!on||!ink)return;
    const first=!ink.dataset.placed;if(first)ink.style.transition='none';
    ink.style.width=on.offsetWidth+'px';ink.style.transform=`translateX(${on.offsetLeft}px)`;
    if(sl.classList.contains('modes')||getComputedStyle(sl).flexDirection==='column')ink.style.height=on.offsetHeight+'px',ink.style.top=on.offsetTop+'px';
    if(first){void ink.offsetWidth;ink.style.transition='';ink.dataset.placed='1'}
  });
}

/* ---------- what needs attention ---------- */
const HAB_KEYS=['co2','o2','ctemp','rh','press','dose'];
const VITALS=[['temp','Temperature'],['hr','Heart rate'],['sys','Blood pressure'],['spo2','Blood oxygen'],['sleep','Sleep'],['water','Water today']];
const LINK_OF={temp:'elements:temp',spo2:'elements:spo2',water:'elements:water',glu:'elements:glu',na:'elements:na',k:'elements:k',hr:'organs:heart',sys:'organs:heart',dia:'organs:heart',sleep:'organs:brain',mood:'organs:brain',kcal:'organs:digestive'};
function attention(){
  const c=crew(),out=[],add=(st,title,val,note,act)=>out.push({st,title,val,note,act});
  for(const k of ['temp','spo2','hr','sys','dia','glu','water','kcal','na','k','sleep','mood']){const v=latest(k),st=ev(k,v);if(st!=='good')add(st,RULES[k].name,`${fmt(v,RULES[k].dec)} ${RULES[k].unit}`,`Normal ${RULES[k].ref}`,'jump:'+LINK_OF[k])}
  if(c.eyes!=='good')add(c.eyes,'Vision','Change logged','Eye check due this week','jump:organs:eyes');
  const b=ev('bmd',c.bmd);if(b!=='good')add(b,'Bone loss rate',`${c.bmd} %/month`,`Normal ${RULES.bmd.ref}`,'jump:elements:ca');
  const tot=c.prior+c.missionDose,cs=ev('career',tot);if(cs!=='good')add(cs,'Career radiation dose',`${tot} mSv`,'Career limit 600 mSv','jump:elements:rad');
  const mus=Object.keys(MUSCLES).filter(m=>muscleStatus(m)!=='good');
  mus.filter(m=>muscleStatus(m)==='bad').forEach(m=>add('bad',`${cut(MUSCLES[m].n)} strength`,`${c.muscles[m]} %`,'Of preflight, normal 90 % or more','jump:train:'+m));
  const mw=mus.filter(m=>muscleStatus(m)==='warn');if(mw.length)add('warn',`${plural(mw.length,'muscle group')} below target`,'',mw.map(m=>cut(MUSCLES[m].n)).join(', '),'jump:train:'+mw[0]);
  const h=habOf(c.module);HAB_KEYS.forEach(k=>{const v=h[k][23],st=ev(k,v);if(st!=='good')add(st,`${cut(RULES[k].name)} in ${moduleName()}`,`${fmt(v,RULES[k].dec)} ${RULES[k].unit}`,`Normal ${RULES[k].ref}`,'hab:'+k)});
  if(S.sep)add('bad','Solar particle event drill','Shelter','Follow the shelter checklist','view:weather');
  return out.sort((a,b)=>SEV[b.st]-SEV[a.st]);
}

/* ---------- navigation: an annunciator panel; every key shows its own live state ---------- */
const NAV=[['Crew',[['overview','Overview'],['checkin','Check-in'],['trends','Trends'],['review','Medical review']]],
           ['Station',[['habitat','Habitat'],['weather','Space weather'],['almanac','Almanac']]]];
function navState(v){
  const c=crew();
  if(v==='overview'){const A=attention(),nb=A.filter(a=>a.st==='bad').length,nw=A.length-nb;return A.length?{st:nb?'bad':'warn',txt:[nb?plural(nb,'warning'):'',nw?plural(nw,'caution'):''].filter(Boolean).join(', ')}:{st:'good',txt:'All nominal'}}
  if(v==='checkin')return S.ci[c.id]?{st:'good',txt:'Done today'}:{st:'warn',txt:'Due since 07:30'};
  if(v==='trends'){const out=TREND_KEYS.filter(k=>ev(k,data()[k][N-1])!=='good');return out.length?{st:worst(out.map(k=>ev(k,data()[k][N-1]))),txt:`${out.length} outside range`}:{st:'good',txt:'All in range'}}
  if(v==='review'){
    if(S.role==='cmo'){const n=S.cases.filter(x=>['sent','received','review'].includes(x.status)).length;return n?{st:'warn',txt:`${n} to review`}:{st:'good',txt:'Inbox clear'}}
    const mine=S.cases.filter(x=>x.crew===c.id),open=mine.filter(x=>x.status!=='approved').length;return open?{st:'info',txt:`${open} open`}:{st:'off',txt:mine.length?'All answered':'No requests'}}
  if(v==='habitat'){const h=habOf(c.module),bad=HAB_KEYS.filter(k=>ev(k,h[k][23])!=='good');if(!bad.length)return{st:'good',txt:'Cabin air nominal'};const k=bad.sort((a,b)=>SEV[ev(b,h[b][23])]-SEV[ev(a,h[a][23])])[0];return{st:ev(k,h[k][23]),txt:`${cut(RULES[k].name).replace('Cabin ','')} ${fmt(h[k][23],RULES[k].dec)} ${RULES[k].unit}`}}
  if(v==='weather'){if(S.sep)return{st:'bad',txt:'Shelter drill'};return DONKI.some(d=>d[0]==='SEP')?{st:'warn',txt:'Particle alert'}:{st:'good',txt:'No particle alerts'}}
  if(v==='almanac')return{st:'off',txt:`${Object.keys(ALMANAC).length} offline entries`};
}
function renderNav(){
  const act=S.view==='part'?'overview':S.view;
  $('#ann').innerHTML=NAV.map(([g,items],gi)=>`<span class="ann-l">${g}</span>${items.map(([v,l])=>{const s=navState(v);return `<button class="key s-${s.st}${gi?' wide':''}${v===act?' on':''}" data-view="${v}"${v===act?' aria-current="page"':''}><i class="lamp" aria-hidden="true"></i><b>${l}</b><span>${esc(s.txt)}</span></button>`}).join('')}`).join('');
}

/* ---------- the deck: identity, body view switch and the body model (always on screen) ---------- */
function modeCounts(){return{train:Object.keys(MUSCLES).map(muscleStatus),organs:Object.keys(ORGANS).map(organStatus),elements:Object.keys(ELEMENTS).map(elemStatus)}}
function renderModes(){
  const counts=modeCounts();
  $('#modes').innerHTML=MODES.map(([id,t,d])=>{const l=counts[id],n=l?l.filter(s=>s!=='good').length:0;return `<button class="mode${S.mode===id?' on':''}" role="tab" aria-selected="${S.mode===id}" data-mode="${id}" title="${d}">${MODE_ICON[id]}<b>${t}</b>${n?`<i class="n ${worst(l)}" aria-label="${n} to watch">${n}</i>`:''}</button>`}).join('')+'<i class="ink" aria-hidden="true"></i>';
}
function renderDeck(swap){
  const c=crew();
  $('#whoSub').textContent=`${c.role}, mission day ${c.day}, ${moduleName()}`;
  renderModes();
  $('#legend').innerHTML=legendHTML();
  renderFigure(swap);
  inks($('.deck'));
}
function renderFigure(swap){
  const st=$('#stage');st.innerHTML=figure2D();
  if(swap){st.classList.remove('swap');void st.offsetWidth;st.classList.add('swap')}
}

/* ---------- the panel ---------- */
const VIEWS={};
function renderPanel(anim='panel'){
  const V=VIEWS[S.view],box=$('#panelIn'),pan=$('#panel'),y=pan.scrollTop;
  $('#app').style.setProperty('--pw',V.w+'px');$('#app').dataset.view=S.view;
  box.innerHTML=`<header class="ph">${V.crumb?`<nav class="crumb" aria-label="Breadcrumb">${V.crumb()}</nav>`:''}<div class="ph-row"><h2>${V.title()}</h2>${V.status?V.status():''}</div>${V.sub?`<p class="ph-sub">${V.sub()}</p>`:''}</header><div class="pb">${V.html()}</div>`;
  if(anim==='panel'){box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter');pan.scrollTop=0}
  else{box.classList.remove('enter');pan.scrollTop=y;
    if(anim==='soft')box.querySelectorAll('.swap-in').forEach(n=>{n.classList.remove('flash');void n.offsetWidth;n.classList.add('flash')})}
  inks(box);
}
function render(swap=true){renderNav();renderDeck(swap);renderPanel('panel')}
function go(v){S.view=v;renderNav();renderPanel('panel')}
function refreshSoft(){renderNav();renderPanel(null)}

/* ===== OVERVIEW ===== */
VIEWS.overview={w:520,
  title:()=>'Overview',
  sub:()=>{const c=crew();return `${esc(c.name)}, ${esc(c.role.toLowerCase())}. Mission day ${c.day}.`},
  html(){
    const A=attention(),nb=A.filter(a=>a.st==='bad').length,nw=A.length-nb,shown=S.allAttn?A:A.slice(0,5);
    const verdict=A.length
      ?`<div class="verdict s-${nb?'bad':'warn'}">${icon(nb?'bad':'warn',20)}<div><b>${[nb?plural(nb,'warning'):'',nw?plural(nw,'caution'):''].filter(Boolean).join(' and ')}</b><span>${nb?'Start with the warnings. Each one opens its guide.':'Follow the guides and re-check today.'}</span></div></div>`
      :`<div class="verdict s-good">${icon('good',20)}<div><b>All readings nominal</b><span>Keep the routine.</span></div></div>`;
    return verdict
    +blk('Needs attention',A.length>5?`<button class="linkbtn" data-allattn>${S.allAttn?'Show fewer':`Show all ${A.length}`}</button>`:'',
      A.length?`<div class="attn">${shown.map(a=>`<button class="at s-${a.st}" data-act="${a.act}">${icon(a.st,14)}<span class="at-t"><b>${esc(a.title)}</b><small>${esc(a.note)}</small></span><span class="at-v">${esc(a.val)}</span>${CHEV}</button>`).join('')}</div>`:'<p class="empty">Nothing needs attention right now.</p>')
    +blk('Vital signs','Latest readings',`<div class="vitals">${VITALS.map(([k,l])=>{
        const v=latest(k),R=RULES[k];let st=ev(k,v),val=`${fmt(v,R.dec)}<small>${R.unit}</small>`;
        if(k==='sys'){const d=latest('dia');st=worst([st,ev('dia',d)]);val=`${fmt(v,0)}/${fmt(d,0)}<small>mmHg</small>`}
        return `<button class="vt s-${st}" data-act="trend:${k}"><span class="vt-l">${l}</span><b class="num">${val}</b><em>${icon(st,11)}${STATUS_WORD[st]}</em></button>`}).join('')}</div>`)
    +blk('Today','',todayHTML());
  }
};
function todayHTML(){
  const c=crew(),done=S.ci[c.id];
  return `<div class="routine"><div class="rt${done?'':' due'}"><time>07:30</time><span>Morning check-in</span>${done?pill('good','Done'):'<button class="btn sm primary" data-view="checkin">Start</button>'}</div>
    ${ROUTINE.slice(1,4).map((r,i)=>`<div class="rt"><time>${r[0]}</time><span>${esc(r[1])}</span><span class="small muted">${i===0?'Next':'Later'}</span></div>`).join('')}</div>`;
}

/* ===== BODY PART DETAIL ===== */
function partName(){const m=S.mode,id=S.sel[m];return m==='train'?cut(MUSCLES[id].n):m==='treat'?ZONES[id].n:m==='organs'?cut(ORGANS[id].n):ELEMENTS[id].n}
function partStatus(){const m=S.mode,id=S.sel[m];return m==='train'?muscleStatus(id):m==='organs'?organStatus(id):m==='elements'?elemStatus(id):null}
VIEWS.part={w:560,
  crumb:()=>`<button data-view="overview">Overview</button><span>/</span>${MODES.find(x=>x[0]===S.mode)[1]}`,
  title:()=>esc(partName()),
  status:()=>{const st=partStatus();return st?pill(st):''},
  html(){const m=S.mode,id=S.sel[m];return m==='train'?trainDetail(id):m==='treat'?treatDetail(id):m==='organs'?organDetail(id):elemDetail(id)}
};
function caseFor(item){return S.cases.filter(c=>c.crew===crew().id&&c.item===item).slice(-1)[0]}
const FLOW=['Summary made','Sent to CMO','Verified','Approved plan'];
function reviewBox(item,title,st,extra=''){
  const cs=caseFor(item),m=mission();
  if(cs)return `<div class="actbox"><div class="row">${caseStatusPill(cs)}<span class="small muted">${cs.id}, sent ${cs.created}</span></div>${flowHTML(cs)}<p class="small ink2">${esc(cs.plan||m.path)}</p><button class="btn ghost" data-opencase="${cs.id}">Open request</button></div>`;
  const need=st!=='good';
  return `<div class="actbox"><p class="small ink2">${need?'This needs a professional opinion. Send a summary of your readings to the Crew Medical Officer to verify and approve a plan.':'No review needed. Readings are logged automatically.'}</p>${extra}
    <button class="btn ${st==='bad'?'danger':need?'primary':'ghost'}" ${need?'':'disabled'} data-sendcase="${esc(item)}" data-title="${esc(title)}" data-st="${st}">${need?'Send summary for review':'Logged'}</button>
    <p class="small muted">${esc(m.path)}</p></div>`;
}
function flowHTML(cs){
  const idx={sent:1,received:2,review:2,remeasure:3,escalated:3,approved:4}[cs.status];
  return `<div class="flow">${FLOW.map((t,i)=>`<div class="fstep ${i<idx?'done':i===idx?'now':''}"><b>${t}</b>${[cs.created,cs.recvAt||'waiting',cs.verAt||'waiting',cs.apprAt||(cs.status==='remeasure'?'re-measure asked':cs.status==='escalated'?'with flight surgeon':'waiting')][i]}</div>`).join('')}</div>`;
}
function caseStatusPill(cs){return pill({sent:'info',received:'info',review:'warn',approved:'good',remeasure:'warn',escalated:'bad'}[cs.status],{sent:'Sent',received:'Received by CMO',review:'Under review',approved:'Approved',remeasure:'Re-measure asked',escalated:'Escalated to ground'}[cs.status])}
const revTab=(item,title,st,extra)=>{const cs=caseFor(item);return['review','Medical review',()=>reviewBox(item,title,st,extra),cs?'<i class="dot info"></i>':st!=='good'?`<i class="dot ${st}"></i>`:'']};

function trainDetail(mu){
  const M=MUSCLES[mu],c=crew(),st=muscleStatus(mu),eq=mission().eq,s=data().strength[mu],[done,plan]=c.sessions;
  return `<p class="lead">${esc(M.fn)}</p>`+tabs('train',[
    ['status','Status',()=>`<div class="metrics">${metricRaw('Strength vs preflight',c.muscles[mu]+' %',st,'Normal 90 % or more')}${metricRaw('8-week change',(s[7]-s[0])+' pts',st,'Weekly strength test')}${metricRaw('Sessions this week',`${done} / ${plan}`,done/plan>=.85?'good':done/plan>=.6?'warn':'bad','Planned sessions')}</div>
      <div class="chartbox"><div class="cap">Strength against preflight, last 8 weeks</div>${chart(s,'strength',{w:520,h:150,labels:s.map((_,i)=>i===7?'This wk':`W-${7-i}`)})}</div>`],
    ['ex','Exercises',()=>`<p class="small muted">${esc(mission().short)} equipment</p>`+stepsHTML(M.ex.map(e=>[e[0],e[3],`<span class="eq">${esc(eq[e[1]])}</span><span class="eq load">${esc(e[2])}</span>`]))],
    ['session','Session',()=>S.runner&&S.runner.mu===mu?runnerHTML():sessionHTML(mu)]
  ]);
}
function sessionHTML(mu){
  const c=crew(),x=S.xp[c.id],[done,plan]=c.sessions;
  return `<div class="actbox"><div class="xp"><b>${x.streak}-day streak</b><div class="xbar"><i style="width:${Math.min(100,done/plan*100)}%"></i></div><span>${done}/${plan} sessions</span></div>
    <div class="badges">${badgeList()}</div><button class="btn meteor" data-startsession="${mu}"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Start guided session</button></div>`;
}
function badgeList(){const b=S.xp[crew().id].badges;return [['first','First check-in'],['streak7','7-day streak'],['bone','Bone guardian'],['hydro','Hydration hero'],['team','Crew goal']].map(([k,t])=>`<span class="badge${b.has(k)||(k==='streak7'&&S.xp[crew().id].streak>=7)?'':' locked'}"><i>★</i>${t}</span>`).join('')}
function runnerHTML(){
  const r=S.runner,M=MUSCLES[r.mu],e=M.ex[r.ex],sets=parseInt(e[2])||3,eq=mission().eq;
  return `<div class="runner"><div class="row"><span class="small muted">Exercise ${r.ex+1} of ${M.ex.length}</span><span class="spacer"></span><button class="btn ghost sm" data-endsession>End session</button></div>
    <div class="row" style="margin-top:6px;align-items:flex-end"><div><div class="h2">${esc(e[0])}</div><div class="small ink2">${esc(eq[e[1]])}, ${esc(e[2])}. ${esc(e[3])}</div></div><span class="spacer"></span><div class="big" id="restT">${r.rest>0?r.rest+'s':''}</div></div>
    <div class="sets">${Array.from({length:sets},(_,i)=>`<i class="${i<r.set?'on':''}"></i>`).join('')}</div>
    <div class="row"><span class="small muted">${r.rest>0?'Rest, then start the next set':'Set '+(Math.min(r.set+1,sets))+' of '+sets}</span><span class="spacer"></span><button class="btn meteor" data-setdone ${r.rest>0?'disabled':''}>Set complete</button></div></div>`;
}
const zoneOf=cond=>Object.keys(ZONES).find(z=>ZONES[z].conds.includes(cond));
function treatDetail(z){
  const Z=ZONES[z];if(!S.cond||!Z.conds.includes(S.cond))S.cond=Z.conds[0];
  const G=GUIDES[S.cond],rf=S.rf[S.cond]||new Set(),sd=S.sd[S.cond]||new Set();
  const linked=(G.linked||[]).filter(k=>RULES[k]&&latest(k)!=null).map(k=>{const st=statusOf(k);return `<span class="lk">${icon(st)}${esc(cut(RULES[k].name))} <b class="num">${fmt(latest(k),RULES[k].dec)} ${RULES[k].unit}</b></span>`}).join('');
  return `<div class="conds" role="group" aria-label="What is happening">${Z.conds.map(k=>`<button class="cond${k===S.cond?' on':''}" data-cond="${k}" aria-pressed="${k===S.cond}">${esc(GUIDES[k].n)}</button>`).join('')}</div>
    <p class="lead">${esc(G.why)}</p>${linked?`<div class="linked">${linked}</div>`:''}`
  +tabs('treat',[
    ['red','Check first',()=>`<div class="redflags"><h4>${icon('bad',13)}Any of these: stop and send for review now</h4>${G.red.map((r,i)=>`<label><input type="checkbox" data-redflag="${i}" ${rf.has(i)?'checked':''}>${esc(r)}</label>`).join('')}</div>`,G.urgent?'<i class="dot bad"></i>':''],
    ['steps','Steps',()=>`${stepsHTML(G.steps,{check:true,done:sd})}<p class="kit"><b>Kit:</b> ${esc(G.kit)}</p>`],
    revTab('treat:'+z+':'+S.cond,`${Z.n}: ${G.n}`,G.urgent?'bad':'warn',G.urgent?'<div class="notice warn">Chest pain is always urgent. Tell the CMO in person as well.</div>':'')
  ],'red')+`<button class="linkbtn more" data-almanac="${S.cond}">Read the full entry in the almanac ${CHEV}</button>`;
}
function organDetail(o){
  const O=ORGANS[o],st=organStatus(o),c=crew();let mets='',ch='';
  if(o==='bones'){const months=c.day/30.4;
    mets=metric('bmd','Hip density loss rate')+metricRaw('Loss so far (est.)',`-${fmt(c.bmd*months,1)} %`,st,`${fmt(months,1)} months in flight`)+metricRaw('Projected at day 180',`-${fmt(c.bmd*180/30.4,1)} %`,st,'Rate times mission length');
    ch=`<div class="chartbox"><div class="cap">Hip bone density change, % of preflight</div>${bmdChart(c)}</div>`;
  }else if(o==='eyes'){
    mets=metricRaw('Near vision',c.eyes==='good'?'No change':'Slightly blurry',c.eyes,'Weekly eye chart')+metricRaw('Last eye scan',c.eyes==='good'?'18 days ago':'26 days ago',c.eyes==='good'?'good':'warn','Every 30 days')+metricRaw('Headaches this week',c.eyes==='good'?'0':'3',c.eyes,'Self-report');
  }else if(o==='ear'){
    mets=metricRaw('Dizziness reports','0','good','Self-report')+metricRaw('Motion sickness','Resolved','good','First days in space')+metricRaw('Balance test','After landing','good','Post-flight');
  }else{
    mets=O.keys.slice(0,3).map(k=>metric(k)).join('');
    const k=O.keys.find(k=>k in data())||O.keys[0],vals=k in data()?data()[k]:habOf(c.module)[k];
    ch=`<div class="chartbox"><div class="cap">${esc(RULES[k].name)}, ${k in data()?'last 14 days':'last 24 hours'}</div>${chart(vals,k,{w:520,h:150,labels:k in data()?null:vals.map((_,i)=>i===23?'Now':`-${23-i}h`)})}</div>`;
  }
  return `<p class="lead">${esc(O.fn)}</p>`+tabs('organ',[
    ['read','Readings',()=>`<div class="metrics">${mets}</div>${ch}`],
    ['todo',st==='good'?'Keep doing':'What to do',()=>stepsHTML(O.act),st!=='good'?`<i class="dot ${st}"></i>`:''],
    revTab('organ:'+o,O.n,st)
  ]);
}
function bmdChart(c){
  const w=520,h=150,L=34,R=10,T=10,B=22,lo=-10,hi=1,X=m=>L+m*(w-L-R)/6,Y=v=>T+(hi-v)*(h-T-B)/(hi-lo),now=c.day/30.4;
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Bone density projection">`;
  s+=`<polygon points="${X(0)},${Y(0)} ${X(6)},${Y(-6)} ${X(6)},${Y(-9)} ${X(0)},${Y(0)}" fill="#E9A93A" opacity=".10"/><text x="${X(6)-4}" y="${Y(-7.6)}" text-anchor="end" style="fill:#F2CF8E">typical in flight, 1 to 1.5 %/mo</text>`;
  for(let v=0;v>=-10;v-=5)s+=`<line x1="${L}" x2="${w-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1A2533"/><text x="${L-6}" y="${Y(v)+3}" text-anchor="end">${v}%</text>`;
  for(let m=0;m<=6;m++)s+=`<text x="${X(m)}" y="${h-6}" text-anchor="middle">${m===0?'Launch':m+' mo'}</text>`;
  const col=STATUS_COLOR[ev('bmd',c.bmd)],n6=Math.min(now,6);
  s+=`<line x1="${X(0)}" y1="${Y(0)}" x2="${X(n6)}" y2="${Y(-c.bmd*n6)}" stroke="${col}" stroke-width="2.4"/><line x1="${X(n6)}" y1="${Y(-c.bmd*n6)}" x2="${X(6)}" y2="${Y(-c.bmd*6)}" stroke="${col}" stroke-width="2" stroke-dasharray="5 4"/>`;
  s+=`<circle cx="${X(n6)}" cy="${Y(-c.bmd*n6)}" r="4.5" fill="${col}" stroke="#0B111A" stroke-width="1.4"/><text x="${X(n6)+8}" y="${Y(-c.bmd*n6)-6}" style="fill:#E6ECF5;font-weight:600">Today</text>`;
  return s+'</svg>';
}
function elemDetail(e){
  const E=ELEMENTS[e],k=E.key,st=elemStatus(e),c=crew();let mets='',ch='';
  if(k==='career'){const tot=c.prior+c.missionDose;
    mets=metric('career','Career dose')+metricRaw('This mission',`${c.missionDose} mSv`,'good',`${c.day} days`)+metricRaw('Left to limit',`${600-tot} mSv`,st,'Career limit 600 mSv');
    ch=`<div class="chartbox"><div class="cap">Career dose against the 600 mSv limit</div>${doseBar(c)}</div><div class="chartbox"><div class="cap">Daily dose, last 14 days (mSv/day)</div>${chart(data().dose,'dose',{w:520,h:130})}</div>`;
  }else if(k==='bmd'){
    mets=metric('bmd','Bone loss rate')+metricRaw('Urine calcium',c.bmd>1?'High':'Normal',c.bmd>1?'warn':'good','Weekly sample')+metricRaw('Supplement','Taken today','good','Vitamin D and calcium');
    ch=`<div class="chartbox"><div class="cap">Projected hip density change</div>${bmdChart(c)}</div>`;
  }else{
    const d=data()[k],mn=Math.min(...d),mx=Math.max(...d);
    mets=metric(k,'Now')+metricRaw('14-day range',`${fmt(mn,RULES[k].dec)} to ${fmt(mx,RULES[k].dec)}`,worst([ev(k,mn),ev(k,mx)]),RULES[k].unit)+metricRaw('Change in 7 days',`${d[N-1]-d[N-8]>=0?'+':''}${fmt(d[N-1]-d[N-8],RULES[k].dec)} ${RULES[k].unit}`,st,'Trend');
    ch=`<div class="chartbox"><div class="cap">${esc(RULES[k].name)}, last 14 days</div>${chart(d,k,{w:520,h:150})}</div>`;
  }
  return `<p class="lead">${esc(E.fn)} <span class="muted">Measured by ${esc(E.via.toLowerCase())}.</span></p>`+tabs('elem',[
    ['read','Levels',()=>`<div class="metrics">${mets}</div>${ch}`],
    ['todo',st==='good'?'Keep doing':'What to do',()=>stepsHTML(elemActions(e)),st!=='good'?`<i class="dot ${st}"></i>`:''],
    revTab('elem:'+e,E.n,st)
  ]);
}
function elemActions(e){
  const E=ELEMENTS[e],k=E.key,st=elemStatus(e);
  const acts={good:[['No action needed','Keep your normal routine.'],['How to measure',E.how]],
    warn:[['Follow the guide','Act on this today and re-check tomorrow.'],['How to measure',E.how],['Re-check','Log a new reading in Check-in.']],
    bad:[['Act now','Stop exercise, rest, and stay with a crewmate.'],['Re-measure in 1 hour',E.how],['Send to the medical team','Two high readings in a row need a professional review.']]};
  const custom={temp:{bad:[['Rest and cool down','Stop exercise, drink water, move to a cooler module.'],['Re-check in 1 hour','Use the same thermometer and log the reading.'],['Send to the medical team','A reading at or above 38.0 °C is a fever and needs CMO review.']]},
    water:{warn:[['Drink 500 mL now','Then 250 mL every 90 minutes until evening.'],['Log each pouch','Tap +250 mL in Check-in.'],['Check urine color','Re-check before sleep.']]},
    k:{warn:[['Add potassium foods','Have potassium-rich menu items today, for example dried fruit.'],['Hydrate','Low fluid makes cramps more likely.'],['Re-test','Repeat the blood test in 48 hours.']]}};
  return (custom[k]&&custom[k][st])||acts[st];
}
function doseBar(c){
  const w=520,L=6,R=6,X=v=>L+v/600*(w-L-R),tot=c.prior+c.missionDose,col=STATUS_COLOR[ev('career',tot)];
  return `<svg class="chart" viewBox="0 0 ${w} 84" role="img" aria-label="Career dose ${tot} of 600 mSv">
  <text x="${Math.max(30,X(tot))}" y="12" text-anchor="middle" style="fill:#E6ECF5;font-weight:600;font-size:11px">${tot} mSv now</text>
  <rect x="${L}" y="20" width="${w-L-R}" height="14" rx="2" fill="#1F2B3B"/><rect x="${L}" y="20" width="${Math.max(0,X(c.prior)-L)}" height="14" fill="#6F7FA0"/>
  <rect x="${X(c.prior)}" y="20" width="${X(tot)-X(c.prior)}" height="14" fill="${col}"/><line x1="${X(600)-1}" x2="${X(600)-1}" y1="14" y2="40" stroke="#EF5B5B" stroke-width="2"/>
  <rect x="${L}" y="50" width="10" height="10" rx="1" fill="#6F7FA0"/><text x="${L+15}" y="59">Earlier missions ${c.prior} mSv</text>
  <rect x="${L+190}" y="50" width="10" height="10" rx="1" fill="${col}"/><text x="${L+205}" y="59">This mission ${c.missionDose} mSv</text>
  <text x="${w-R}" y="78" text-anchor="end" style="fill:#F48A8A">Career limit 600 mSv</text></svg>`;
}

/* ===== CHECK-IN ===== */
const CI_FIELDS=[
  ['Vitals','Wearable or cuff','hr',[['hr','Resting heart rate'],['sys','BP systolic'],['dia','BP diastolic'],['spo2','Blood oxygen']]],
  ['Blood and temperature','Glucometer, thermometer','temp',[['glu','Fasting blood sugar'],['temp','Body temperature'],['na','Sodium (weekly)'],['k','Potassium (weekly)']]],
  ['Sleep and food','Self-report','sleep',[['sleep','Sleep last night'],['kcal','Energy eaten yesterday']]]
];
const SYMPTOMS=['Headache','Blurry vision','Nausea','Back pain','Congestion','Dizziness','Muscle cramp','Skin irritation','Trouble sleeping','Feeling low'];
VIEWS.checkin={w:640,
  title:()=>'Morning check-in',
  status:()=>S.ci[crew().id]?pill('good','Submitted'):pill('warn','Due'),
  sub:()=>`Mission day ${crew().day}. Type a value, tap the scales, or import from the wearable.`,
  html(){
    const c=crew(),v=S.ciVals||{},water=S.ciWater??0,mood=S.ciMood??0,x=S.xp[c.id],team=CREW.reduce((a,cc)=>a+S.xp[cc.id].pts,0);
    return `<div class="actions-row"><button class="btn meteor" data-submitci><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Submit check-in</button><button class="btn ghost" data-fillsensor><svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4"/></svg>Import from wearable</button></div>`
    +CI_FIELDS.map(([t,src,mk,fs])=>blk(t,`<button class="linkbtn" data-almanac="${MEASURE_OF[mk]}">How to measure</button>`,`<div class="fields">${fs.map(([k,l])=>{const val=v[k]??'';const st=val!==''?ev(k,+val):null;
      return `<div class="field"><label for="f_${k}">${l}</label><div class="inp"><input id="f_${k}" inputmode="decimal" data-ci="${k}" value="${val}" placeholder="${fmt(latest(k),RULES[k].dec)}"><span class="u">${RULES[k].unit}</span></div><div class="lv" id="lv_${k}">${lvHTML(k,st)}</div></div>`}).join('')}</div>`,'ci')).join('')
    +blk('Mood and stress','1 very low, 5 very good',`<div class="scale" role="radiogroup" aria-label="Mood">${[1,2,3,4,5].map(n=>`<button class="${mood===n?'on':''}" data-mood="${n}" role="radio" aria-checked="${mood===n}">${n}</button>`).join('')}</div>`)
    +blk('Water today','Goal 2.5 L',`<div class="water"><div class="cup">${Array.from({length:10},(_,i)=>`<i class="${i<water/0.25?'on':''}"></i>`).join('')}</div><b class="num">${fmt(water,2)} L</b><span class="spacer"></span><button class="btn ghost sm" data-water="-0.25">−250 mL</button><button class="btn ghost sm" data-water="0.25">+250 mL</button></div>`)
    +fold('symp','Symptoms',(S.ciSymp||[]).length?plural(S.ciSymp.length,'selected'):'None selected',`<div class="symp">${SYMPTOMS.map(s=>`<label><input type="checkbox" data-symp="${s}" ${(S.ciSymp||[]).includes(s)?'checked':''}>${s}</label>`).join('')}</div>`)
    +fold('photo','Photo','Optional, stays on board',`<div class="photo"><label class="drop" for="ciPhoto">Take or attach a photo of a skin change, swelling or injury so the CMO can compare over time.<input id="ciPhoto" type="file" accept="image/*" capture="environment" hidden></label>${S.checkinPhoto?`<img class="thumb" src="${S.checkinPhoto}" alt="Attached photo">`:''}</div>`)
    +fold('routine','Routine, streak and crew goal',`${x.streak}-day streak`,`<div class="routine">${ROUTINE.map((r,i)=>{const s=i===0?(S.ci[c.id]?'done':'due'):i===1?'due':'later';return `<div class="rt ${s==='due'?'due':''}"><time>${r[0]}</time><span>${esc(r[1])}</span><span class="st">${s==='done'?pill('good','Done'):s==='due'?pill('warn','Due'):'<span class="small muted">Later</span>'}</span></div>`}).join('')}</div>
      <div class="xp" style="margin-top:14px"><b>${x.streak}-day streak</b><div class="xbar"><i style="width:${Math.min(100,x.streak/14*100)}%"></i></div></div>
      <div class="xp" style="margin-top:8px"><span>Crew goal this week</span><div class="xbar"><i style="width:${Math.min(100,team/40)}%"></i></div><span class="num">${team.toLocaleString()} / 4,000</span></div>
      <div class="badges" style="margin-top:12px">${badgeList()}</div><p class="small muted" style="margin-top:8px">Points reward the routine, not the result. Logging a Warning earns the same as a Nominal reading.</p>`);
  }
};
const lvHTML=(k,st)=>st?`<span style="color:${STATUS_COLOR[st]}">${STATUS_WORD[st]}</span><span class="muted">, normal ${esc(RULES[k].ref)}</span>`:`<span class="muted">Normal ${esc(RULES[k].ref)}</span>`;

/* ===== TRENDS ===== */
const TREND_KEYS=['temp','hr','sys','dia','spo2','glu','sleep','mood','water','kcal','na','k','dose'];
VIEWS.trends={w:580,
  title:()=>'Trends',
  sub:()=>'Last 14 days against the normal range. Select an indicator to chart it.',
  html(){
    const k=S.trend,d=data()[k],R=RULES[k],st=ev(k,d[N-1]),mean=d.reduce((a,b)=>a+b,0)/N;
    const groups=[['Vitals',['temp','hr','sys','dia','spo2']],['Blood and nutrition',['glu','na','k','kcal','water']],['Sleep, mood and dose',['sleep','mood','dose']]];
    const row=t=>{const dd=data()[t],s2=ev(t,dd[N-1]);return `<button class="ki${t===k?' sel':''}" data-trend="${t}" aria-pressed="${t===k}">${icon(s2)}<span>${esc(RULES[t].name)}</span><b>${fmt(dd[N-1],RULES[t].dec)} <small>${RULES[t].unit}</small></b>${spark(dd,t,64,22)}</button>`};
    return `<section class="blk trend-main swap-in"><div class="row"><h3 class="h2">${esc(R.name)}</h3><span class="spacer"></span>${pill(st)}</div><p class="small muted">Normal ${esc(R.ref)}</p>
      <div class="chartwrap">${chart(d,k,{w:560,h:210})}</div>
      <div class="stats">${[['Today',d[N-1]],['14-day average',mean],['Lowest',Math.min(...d)],['Highest',Math.max(...d)]].map(([l,v])=>{const s=ev(k,v);return `<div><small>${l}</small><b class="num" style="color:${s==='good'?'var(--ink)':STATUS_COLOR[s]}">${fmt(v,R.dec)}</b></div>`}).join('')}</div>
      <p class="note s-${st}">${trendSentence(k,d)}</p></section>`
    +blk('All indicators','',tabs('tgrp',groups.map(([g,keys],i)=>['g'+i,g,()=>`<div class="klist">${keys.map(row).join('')}</div>`,keys.some(t=>ev(t,data()[t][N-1])!=='good')?`<i class="dot ${worst(keys.map(t=>ev(t,data()[t][N-1])))}"></i>`:'']),'g'+groups.findIndex(g=>g[1].includes(k))))
    +fold('trtable',`${esc(cut(R.name))} readings as a table`,'14 days',`<table class="tbl"><tr><th>Day</th><th>${esc(R.unit)}</th><th>Status</th></tr>${d.map((v,i)=>({v,i})).reverse().map(({v,i})=>{const s2=ev(k,v);return `<tr><td>${i===N-1?'Today':`D-${N-1-i}`}</td><td><b class="num">${fmt(v,R.dec)}</b></td><td style="color:${STATUS_COLOR[s2]}">${STATUS_WORD[s2]}</td></tr>`}).join('')}</table>`);
  }
};
function trendSentence(k,d){
  const R=RULES[k],ch=d[N-1]-d[N-8],dir=Math.abs(ch)<Math.pow(10,-R.dec)?'held steady':ch>0?'rose':'fell';
  const days=d.slice(-7).filter(v=>ev(k,v)!=='good').length;
  return `Over the last 7 days, ${R.name.toLowerCase()} ${dir}${dir==='held steady'?'':` by ${fmt(Math.abs(ch),R.dec)} ${R.unit}`}. ${days?`${days} of 7 readings were outside the normal range.`:'All 7 readings stayed in the normal range.'}`;
}

/* ===== HABITAT ===== */
function habCtx(){const m=mission(),c=crew();if(S.habModule==null||S.habModule>=m.modules.length)S.habModule=Math.min(c.module,m.modules.length-1);return{m,h:habOf(S.habModule)}}
VIEWS.habitat={w:580,
  title:()=>'Habitat',
  sub:()=>{const {m}=habCtx();return `${esc(m.gravity)}. Ground link ${esc(m.delayTxt.toLowerCase())}.`},
  html(){
    const {m,h}=habCtx(),k=S.habKey,R=RULES[k],here=CREW.filter(cc=>Math.min(cc.module,m.modules.length-1)===S.habModule),co2st=ev('co2',h.co2[23]);
    return `<label class="ctl"><span>Module</span><select id="habSel">${m.modules.map((n,i)=>`<option value="${i}" ${i===S.habModule?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`
    +(co2st!=='good'?`<div class="banner caution">${icon('warn',16)}<span>CO2 is ${fmt(h.co2[23],1)} mmHg, above the 3 mmHg one-hour limit. High CO2 causes headaches and poor sleep.${here.length?' '+esc(here.map(x=>x.name).join(', '))+' should move to a better ventilated module.':''}</span></div>`:'')
    +blk('Readings','Now',`<div class="gauges">${HAB_KEYS.map(kk=>{const v=h[kk][23],st=ev(kk,v),b=BANDS[kk],lo=b[0]-(b[1]-b[0])*.6,hi=b[1]+(b[1]-b[0])*.6,P=x=>Math.max(0,Math.min(100,(x-lo)/(hi-lo)*100));
      return `<button class="gauge${kk===k?' sel':''}" data-habkey="${kk}" aria-pressed="${kk===k}"><span class="g-n">${esc(cut(RULES[kk].name))}</span><b class="num" style="color:${st==='good'?'var(--ink)':STATUS_COLOR[st]}">${fmt(v,RULES[kk].dec)} <small>${RULES[kk].unit}</small></b>
        <span class="band"><i style="left:${P(b[0])}%;width:${P(b[1])-P(b[0])}%"></i><em style="left:calc(${P(v)}% - 1px)"></em></span><span class="g-r">${icon(st,10)}${STATUS_WORD[st]}, normal ${esc(RULES[kk].ref)}</span></button>`}).join('')}</div>`)
    +`<section class="blk swap-in">${`<header class="blk-h"><h3>${esc(R.name)}</h3><span class="aside">Last 24 hours</span></header>`}<div class="chartwrap">${chart(h[k],k,{w:560,h:190,labels:h[k].map((_,i)=>i===23?'Now':`-${23-i}h`)})}</div></section>`
    +fold('env','Mission environment','',`<table class="kv">${[['Gravity',m.gravity],['Ground link',m.delayTxt],['Medical path',m.path],['Exercise hardware',[m.eq.R,m.eq.T,m.eq.C].filter((v,i,a)=>a.indexOf(v)===i).join(', ')],['Crew in this module',here.length?here.map(x=>x.name).join(', '):'None']].map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>`);
  }
};

/* ===== SPACE WEATHER ===== */
VIEWS.weather={w:580,
  title:()=>'Space weather',
  status:()=>S.sep?pill('bad','Shelter drill'):'',
  sub:()=>S.feed==='live'?'Live notifications, last 30 days.':`On-board copy of ${DONKI.length} notifications. Updates when the ground link allows.`,
  html(){
    const c=crew(),counts={};DONKI.forEach(d=>counts[d[0]]=(counts[d[0]]||0)+1);
    return (S.sep?`<div class="banner sep">${icon('bad',18)}<div><b>Solar particle event drill</b><br>Move to the shielded area now. The dose from one solar event must stay below 250 mSv.</div></div>`
       +blk('Shelter checklist','',stepsHTML([['Move to the shielded area','Go to the designated shelter.'],['Dosimeter on','Check your personal dosimeter is worn and logging.'],['Stay until all-clear','Remain until flight control or the on-board alert clears.'],['Log time in shelter','The event dose is added to your career total.']],{check:true}))
      :`<div class="banner ok">${icon('good',16)}<span>No solar particle alerts. No shelter action needed.</span></div>`)
    +`<div class="actions-row"><button class="btn ${S.sep?'ghost':'danger'}" data-sep>${S.sep?'End drill':'Run shelter drill'}</button><button class="linkbtn" data-almanac="sep">Shelter procedure ${CHEV}</button></div>`
    +blk(`Radiation, ${esc(c.name)}`,'',doseBar(c))
    +blk('Notifications',`${DONKI.length}`,`<div class="feed">${DONKI.map(d=>{const T=DONKI_TYPES[d[0]];return `<div class="ev"><span class="ty" style="color:${T.color};background:${T.bg}">${T.label}</span><div><b>${esc(T.name)}</b><p>${esc(d[3])}</p></div><time>${d[2].slice(5,10)} ${d[2].slice(11,16)}Z</time></div>`}).join('')}</div>`)
    +fold('types','Last 30 days by type','',typeBars(counts))
    +fold('meaning','What each alert means','',stepsHTML(Object.entries(DONKI_TYPES).filter(([k])=>k!=='Report').map(([k,T])=>[T.name,T.action])));
  }
};
function typeBars(counts){
  const types=['RBE','CME','GST','SEP','Report'],max=Math.max(...types.map(t=>counts[t]||0),1),w=520,row=26;
  return `<svg class="chart" viewBox="0 0 ${w} ${types.length*row+6}" role="img" aria-label="Notifications by type">${types.map((t,i)=>{const v=counts[t]||0,T=DONKI_TYPES[t];return `<text x="0" y="${i*row+17}" style="fill:#A9B6CB;font-weight:600">${T.label}</text><rect x="48" y="${i*row+6}" width="${Math.max(2,(w-90)*v/max)}" height="15" rx="2" fill="${T.color}" opacity=".8"/><text x="${54+(w-90)*v/max}" y="${i*row+17}" style="fill:#E6ECF5;font-weight:600">${v}</text>`}).join('')}</svg>`;
}

/* ===== MEDICAL REVIEW ===== */
function buildSummary(item,title,st){
  const c=crew(),h=habOf(c.module),rows=[];
  const add=k=>{if(latest(k)==null)return;const d=data()[k];rows.push([RULES[k].name,`${fmt(latest(k),RULES[k].dec)} ${RULES[k].unit}`,STATUS_WORD[ev(k,latest(k))],d?`${fmt(Math.min(...d),RULES[k].dec)} to ${fmt(Math.max(...d),RULES[k].dec)}`:'24 h']);};
  const [kind,id,cond]=item.split(':');
  let keys=['temp','hr','sys','spo2'];
  if(kind==='elem')keys=[ELEMENTS[id].key].concat(keys);
  if(kind==='organ')keys=ORGANS[id].keys.concat(keys);
  if(kind==='treat')keys=(ALMANAC[cond].linked||[]).concat(keys);
  [...new Set(keys)].filter(k=>RULES[k]&&k!=='strength'&&k!=='bmd'&&k!=='career').slice(0,7).forEach(add);
  if((kind==='organ'&&id==='bones')||(kind==='elem'&&id==='ca'))rows.unshift(['Bone loss rate',`${c.bmd} %/month`,STATUS_WORD[ev('bmd',c.bmd)],'typical 1 to 1.5']);
  if(kind==='elem'&&id==='rad')rows.unshift(['Career dose',`${c.prior+c.missionDose} mSv`,STATUS_WORD[ev('career',c.prior+c.missionDose)],'limit 600']);
  const env=`CO2 ${fmt(h.co2[23],1)} mmHg, ${fmt(h.ctemp[23],1)} °C, RH ${fmt(h.rh[23],0)} %`;
  const A=kind==='treat'?ALMANAC[cond]:null;
  const flags=A&&A.red?[...(S.rf[cond]||[])].map(i=>A.red[i]):[];
  const stepsDone=kind==='treat'?(S.sd[cond]||new Set()).size:0;
  const plan=(A?A.steps:kind==='organ'?ORGANS[id].act:elemActions(id)).map(s=>s[0]+': '+s[1]).join(' ');
  return {rows,env,flags,stepsDone,symptoms:S.ciSymp||[],plan,photo:S.checkinPhoto};
}
function now(){const d=new Date();return d.toTimeString().slice(0,5)}
function createCase(item,title,st){
  const c=crew(),id='HC-'+(1000+S.cases.length+1);
  const cs={id,crew:c.id,crewName:c.name,item,title,sev:st,status:'sent',created:now(),summary:buildSummary(item,title,st),notes:'',plan:''};
  S.cases.push(cs);S.activeCase=id;
  toast(`<span><b>Summary sent</b><br>${esc(title)} to the Crew Medical Officer</span>`);
  setTimeout(()=>{if(cs.status==='sent'){cs.status='received';cs.recvAt=now();refreshSoft()}},1400);
  refreshSoft();
}
function reviewList(){return S.role==='cmo'?S.cases:S.cases.filter(c=>c.crew===crew().id)}
function activeCase(){const list=reviewList();return list.find(c=>c.id===S.activeCase)||list[list.length-1]}
VIEWS.review={w:640,
  title:()=>'Medical review',
  status:()=>pill(S.role==='cmo'?'warn':'info',S.role==='cmo'?'Crew Medical Officer':'Astronaut'),
  sub:()=>S.role==='cmo'?'Requests from the whole crew. Verify, approve, ask for a re-measure, or escalate.':'Your requests to the Crew Medical Officer and the plans that come back.',
  html(){
    const cmo=S.role==='cmo',list=reviewList(),cs=activeCase();
    if(!list.length)return `<div class="emptystate">${icon('info',20)}<div><b>No requests</b><p>Send a summary from any Caution or Warning item. It arrives here with your readings, symptoms and cabin conditions attached.</p></div></div>`;
    const act=cs&&cmo&&['sent','received','review'].includes(cs.status);
    return blk(cmo?'Inbox':'Requests',plural(list.length,'request'),`<div class="cases">${list.slice().reverse().map(c=>`<button class="case${cs&&c.id===cs.id?' on':''}" data-case="${c.id}">${icon(c.sev==='bad'?'bad':'warn',15)}<span class="cs-t"><b>${esc(c.title)}</b><small>${c.id}, ${esc(c.crewName)}, ${c.created}</small></span>${caseStatusPill(c)}</button>`).join('')}</div>`)
    +(cs?caseDetail(cs):'')
    +(act?blk('Decision','',`<label class="ctl"><span>Plan to approve, edit if needed</span><textarea id="planTxt">${esc(cs.summary.plan)}</textarea></label><textarea id="noteTxt" placeholder="Note to the crew member (optional)" style="margin-top:8px;min-height:56px"></textarea>
        <div class="actions-row"><button class="btn good" data-cmo="approve">Verify and approve</button><button class="btn ghost" data-cmo="remeasure">Ask to re-measure</button><button class="btn danger" data-cmo="escalate">Escalate to flight surgeon</button></div>`)
     :cs&&!cmo&&cs.status!=='approved'?`<p class="note s-info">Waiting for the Crew Medical Officer.</p>`:'');
  }
};
function caseDetail(cs){
  const s=cs.summary;
  return `<section class="blk swap-in"><header class="blk-h"><h3>${esc(cs.title)}</h3><span class="aside">${cs.id}, sent ${cs.created}</span></header>${flowHTML(cs)}
  <table class="tbl" style="margin-top:14px"><tr><th>Indicator</th><th>Now</th><th>Status</th><th>14-day range</th></tr>${s.rows.map(r=>`<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}</table>
  <dl class="dl">
    <div><dt>Cabin</dt><dd>${esc(s.env)}</dd></div>
    <div><dt>Red flags</dt><dd>${s.flags.length?esc(s.flags.join('; ')):'None reported'}</dd></div>
    <div><dt>Symptoms</dt><dd>${s.symptoms.length?esc(s.symptoms.join(', ')):'None logged'}</dd></div>
    <div><dt>Guide steps done</dt><dd>${s.stepsDone}</dd></div></dl>
  ${s.photo?`<img class="thumb" src="${s.photo}" alt="Attached photo" style="width:120px;height:120px;margin-top:10px">`:''}
  ${cs.notes?`<p class="note s-info"><b>CMO note:</b> ${esc(cs.notes)}</p>`:''}
  ${cs.status==='approved'?`<p class="note s-good"><b>Approved plan:</b> ${esc(cs.plan)}</p>`:''}</section>`;
}

/* ===== ALMANAC ===== */
const ALMANAC={};
for(const [id,G] of Object.entries(GUIDES))ALMANAC[id]={cat:GUIDE_CAT[id]||'illness',n:G.n,why:G.why,red:G.red,steps:G.steps,kit:G.kit,linked:G.linked,guide:true,urgent:G.urgent};
Object.assign(ALMANAC,ALMANAC_EXTRA);
const CAT=Object.fromEntries(ALMANAC_CATS.map(c=>[c[0],c]));
function almMatches(){
  const q=S.alm.q.trim().toLowerCase();
  return Object.entries(ALMANAC).filter(([id,E])=>(S.alm.cat==='all'||E.cat===S.alm.cat)&&(!q||(E.n+' '+E.why+' '+(E.red||[]).join(' ')+' '+E.steps.map(s=>s.join(' ')).join(' ')).toLowerCase().includes(q)));
}
function almList(){
  const hits=almMatches();if(!hits.length)return `<p class="empty">No entry matches "${esc(S.alm.q)}".</p>`;
  return ALMANAC_CATS.map(([c,t])=>{const es=hits.filter(h=>h[1].cat===c).sort((a,b)=>a[1].n.localeCompare(b[1].n));if(!es.length)return'';
    return `<div class="al-g"><h4>${t}</h4>${es.map(([id,E])=>`<button class="al-i${S.alm.id===id?' on':''}" data-almanac="${id}">${E.urgent||c==='emergency'?'<i class="dot bad"></i>':''}${esc(E.n)}</button>`).join('')}</div>`}).join('');
}
function almEntry(){
  const id=S.alm.id,E=ALMANAC[id];
  if(!E)return `<div class="al-start"><h3>Start here in an emergency</h3><div class="al-quick">${Object.entries(ALMANAC).filter(([,e])=>e.cat==='emergency').map(([i,e])=>`<button class="al-q" data-almanac="${i}"><b>${esc(e.n)}</b><span>${esc(e.why.split('. ')[0])}.</span></button>`).join('')}</div>
    <p class="small muted" style="margin-top:14px">Every entry works without a ground link. Search by symptom, body part or reading.</p></div>`;
  const linked=(E.linked||[]).filter(k=>RULES[k]&&latest(k)!=null).map(k=>{const st=statusOf(k);return `<span class="lk">${icon(st)}${esc(cut(RULES[k].name))} <b class="num">${fmt(latest(k),RULES[k].dec)} ${RULES[k].unit}</b></span>`}).join('');
  const z=E.guide?zoneOf(id):null;
  return `<article class="al-entry swap-in"><span class="al-cat">${CAT[E.cat][1]}</span><h3>${esc(E.n)}</h3><p class="lead">${esc(E.why)}</p>
    ${E.red?`<div class="redflags"><h4>${icon('bad',13)}${E.cat==='emergency'?'Signs it is serious':'Get help now if'}</h4><ul>${E.red.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>`:''}
    <h4 class="al-h">${E.cat==='measure'?'How to do it':E.cat==='prevent'?'What to do every day':'What to do'}</h4>${stepsHTML(E.steps)}
    ${E.kit?`<p class="kit"><b>Kit:</b> ${esc(E.kit)}</p>`:''}
    ${linked?`<h4 class="al-h">Your readings</h4><div class="linked">${linked}</div>`:''}
    ${E.guide?`<div class="actions-row"><button class="btn primary" data-act="treat:${z}:${id}">Show on the body</button><button class="btn ghost" data-sendcase="treat:${z}:${id}" data-title="${esc(E.n)}" data-st="${E.urgent?'bad':'warn'}">Send summary for review</button></div>`:''}</article>`;
}
VIEWS.almanac={w:780,
  title:()=>'Almanac',
  sub:()=>'Offline guides for emergencies, injuries, illness and daily care.',
  html(){
    return `<div class="al-top"><label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><span class="sr">Search the almanac</span><input id="almQ" type="search" placeholder="Search: sprain, fever, CO2" value="${esc(S.alm.q)}" autocomplete="off"></label>
      <div class="al-cats" role="group" aria-label="Category">${[['all','All']].concat(ALMANAC_CATS.map(c=>[c[0],c[1]])).map(([k,t])=>`<button class="chip${S.alm.cat===k?' on':''}" data-almcat="${k}" aria-pressed="${S.alm.cat===k}">${t}</button>`).join('')}</div></div>
      <div class="al-grid"><nav class="al-list" id="almList" aria-label="Entries">${almList()}</nav><div class="al-read" id="almRead">${almEntry()}</div></div>`;
  }
};

/* ---------- events ---------- */
function select(mode,id){
  if(mode==='train'&&S.sel.train!==id)S.runner=null;
  if(mode==='treat'&&S.sel.treat!==id)S.cond=null;
  S.sel[mode]=id;S.view='part';renderNav();renderFigure(false);renderPanel('panel');
}
function act(a){
  const [k,x,y]=a.split(':');
  if(k==='jump'){const sw=S.mode!==x;S.mode=x;S.sel[x]=y;if(x==='train')S.runner=null;S.view='part';renderNav();if(sw){renderModes();$('#legend').innerHTML=legendHTML();inks($('.deck'))}renderFigure(sw);renderPanel('panel');return}
  if(k==='treat'){const sw=S.mode!=='treat';S.mode='treat';S.sel.treat=x;S.cond=y;S.tab.treat='steps';S.view='part';renderNav();if(sw){renderModes();$('#legend').innerHTML=legendHTML();inks($('.deck'))}renderFigure(sw);renderPanel('panel');return}
  if(k==='hab'){S.habKey=x;go('habitat');return}
  if(k==='trend'){S.trend=x;go('trends');return}
  if(k==='view'){go(x);return}
}
function switchTab(g,k){
  S.tab[g]=k;
  const html=VIEWS[S.view].html(),tmp=document.createElement('div');tmp.innerHTML=html;
  const pane=document.querySelector(`[data-pane="${g}"]`),np=tmp.querySelector(`[data-pane="${g}"]`);if(!pane||!np){renderPanel(null);return}
  pane.innerHTML=np.innerHTML;pane.classList.remove('flash');void pane.offsetWidth;pane.classList.add('flash');
  const bar=document.querySelector(`.tabs[data-group="${g}"]`);bar.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===g+':'+k;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});inks(bar.parentNode);
}
function openAlmanac(id){
  S.alm.id=id;
  if(S.view!=='almanac'){if(id&&S.alm.cat!=='all'&&ALMANAC[id].cat!==S.alm.cat)S.alm.cat='all';go('almanac');return}
  const rd=$('#almRead');rd.innerHTML=almEntry();rd.scrollTop=0;rd.classList.remove('flash');void rd.offsetWidth;rd.classList.add('flash');
  document.querySelectorAll('.al-i').forEach(b=>b.classList.toggle('on',b.dataset.almanac===id));
}
document.addEventListener('click',e=>{
  const t=e.target.closest('button,.rg,.organ,.callout,a');if(!t)return;
  if(t.tagName==='A')return;
  const ds=t.dataset;
  if(ds.closemodal!==undefined&&!ds.view)return;
  if(ds.view){if(ds.closemodal!==undefined)$('#modal').hidden=true;go(ds.view);return}
  if(ds.act){act(ds.act);return}
  if(ds.role){S.role=ds.role;document.querySelectorAll('.role-btn').forEach(b=>{const on=b===t;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});inks($('.rail'));if(S.role==='cmo')go('review');else refreshSoft();return}
  if(ds.mode){if(S.mode===ds.mode)return;S.mode=ds.mode;
    document.querySelectorAll('#modes .mode').forEach(b=>{const on=b.dataset.mode===S.mode;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});inks($('.deck'));
    $('#legend').innerHTML=legendHTML();renderFigure(true);if(S.view==='part')renderPanel('panel');return}
  if(t.classList.contains('rg')&&!t.classList.contains('off')){
    if(S.mode==='train'){const m=GROUP_TO_MUSCLE[ds.g];if(m)select('train',m)}
    else if(S.mode==='treat')select('treat',ZONE_OF(ds.g,ds.face));
    return}
  if(ds.organ){select('organs',ds.organ);return}
  if(ds.elem){select('elements',ds.elem);return}
  if(ds.tab){const [g,k]=ds.tab.split(':');switchTab(g,k);return}
  if(ds.fold){S.folds[ds.fold]=!S.folds[ds.fold];const f=t.closest('.fold');f.classList.toggle('open',S.folds[ds.fold]);t.setAttribute('aria-expanded',S.folds[ds.fold]);return}
  if(ds.allattn!==undefined){S.allAttn=!S.allAttn;renderPanel(null);return}
  if(ds.almanac){openAlmanac(ds.almanac);return}
  if(ds.almcat){S.alm.cat=ds.almcat;document.querySelectorAll('[data-almcat]').forEach(b=>{const on=b===t;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});$('#almList').innerHTML=almList();return}
  if(ds.cond){S.cond=ds.cond;S.tab.treat='red';renderPanel('soft');return}
  if(ds.sendcase){createCase(ds.sendcase,ds.title,ds.st);return}
  if(ds.opencase){S.activeCase=ds.opencase;go('review');return}
  if(ds.case){S.activeCase=ds.case;if(S.role==='cmo'){const cs=S.cases.find(c=>c.id===ds.case);if(cs&&cs.status==='received'){cs.status='review';cs.verAt=null}}renderNav();renderPanel('soft');return}
  if(ds.cmo){const cs=activeCase();if(!cs)return;
    cs.notes=($('#noteTxt')||{}).value||'';
    if(ds.cmo==='approve'){cs.plan=$('#planTxt').value;cs.status='approved';cs.verAt=cs.verAt||now();cs.apprAt=now();toast(`<span><b>Plan approved</b><br>${esc(cs.title)} for ${esc(cs.crewName)}</span>`)}
    if(ds.cmo==='remeasure'){cs.status='remeasure';cs.verAt=now();cs.notes=cs.notes||'Please re-measure in 1 hour and send again.';toast('<span><b>Re-measure requested</b></span>')}
    if(ds.cmo==='escalate'){cs.status='escalated';cs.verAt=now();const m=mission();cs.notes=(cs.notes?cs.notes+' ':'')+`Escalated to the ground flight surgeon (${m.delay>60?'reply expected after a '+Math.round(m.delay/60)*2+' min round trip':'real-time consult'}).`;toast('<span><b>Escalated</b> to the flight surgeon</span>')}
    renderNav();renderPanel('soft');return}
  if(ds.startsession){S.runner={mu:ds.startsession,ex:0,set:0,rest:0};renderPanel(null);return}
  if(ds.endsession!==undefined){S.runner=null;renderPanel(null);return}
  if(ds.setdone!==undefined){const r=S.runner,e2=MUSCLES[r.mu].ex[r.ex],sets=parseInt(e2[2])||3;r.set++;addXP(10,'Set complete');
    if(r.set>=sets){if(r.ex<MUSCLES[r.mu].ex.length-1){r.ex++;r.set=0;r.rest=0}else{S.runner=null;const c=crew();c.sessions[0]=Math.min(c.sessions[1],c.sessions[0]+1);S.xp[c.id].badges.add('bone');addXP(40,'Session complete')}}
    else{r.rest=45;const tick=()=>{if(!S.runner||S.runner!==r)return;r.rest--;const el=$('#restT');if(r.rest<=0){r.rest=0;if(S.view==='part')renderPanel(null);return}if(el)el.textContent=r.rest+'s';setTimeout(tick,1000)};setTimeout(tick,1000)}
    if(S.view==='part')renderPanel(null);return}
  if(ds.trend){S.trend=ds.trend;document.querySelectorAll('[data-trend]').forEach(b=>b.classList.toggle('sel',b===t));renderPanel('soft');return}
  if(ds.habkey){S.habKey=ds.habkey;renderPanel('soft');return}
  if(ds.sep!==undefined){S.sep=!S.sep;renderNav();renderPanel(null);if(S.sep)toast('<span><b>Shelter drill started</b><br>Checklist is open.</span>');return}
  if(ds.mood){S.ciMood=+ds.mood;document.querySelectorAll('[data-mood]').forEach(b=>{const on=+b.dataset.mood===S.ciMood;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});return}
  if(ds.water){S.ciWater=Math.max(0,Math.min(2.5,(S.ciWater||0)+(+ds.water)));if(+ds.water>0)addXP(5,'Water logged');if(S.ciWater>=2.5)S.xp[crew().id].badges.add('hydro');renderPanel(null);return}
  if(ds.fillsensor!==undefined){const d=data();S.ciVals={};['hr','sys','dia','spo2','glu','temp','na','k','sleep','kcal'].forEach(k=>S.ciVals[k]=fmt(d[k][N-1],RULES[k].dec).replace(/,/g,''));renderPanel(null);toast('<span>Readings imported from the wearable and glucometer.</span>');return}
  if(ds.submitci!==undefined){submitCI();return}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.rg,svg .organ,svg .callout')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
document.addEventListener('input',e=>{
  const k=e.target.dataset.ci;if(k){S.ciVals=S.ciVals||{};S.ciVals[k]=e.target.value;const v=parseFloat(e.target.value),lv=$('#lv_'+k);if(lv)lv.innerHTML=lvHTML(k,isNaN(v)?null:ev(k,v))}
  if(e.target.dataset.symp!==undefined)S.ciSymp=[...document.querySelectorAll('[data-symp]:checked')].map(i=>i.dataset.symp);
  if(e.target.id==='almQ'){S.alm.q=e.target.value;$('#almList').innerHTML=almList()}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='crewSel'){S.crew=+t.value;S.runner=null;S.ciVals=null;S.ciWater=0;S.ciMood=0;S.ciSymp=[];S.checkinPhoto=null;S.habModule=null;S.rf={};S.sd={};defaults();render(true);startMET()}
  if(t.id==='missionSel'){S.mission=t.value;S.habModule=null;renderLink();render(false)}
  if(t.id==='habSel'){S.habModule=+t.value;renderPanel('soft')}
  if(t.id==='ciPhoto'&&t.files[0]){const f=t.files[0],r=new FileReader();r.onload=()=>{S.checkinPhoto=r.result;renderPanel(null);toast('<span>Photo attached. It stays on board.</span>')};r.readAsDataURL(f)}
  if(t.dataset.symp!==undefined)S.ciSymp=[...document.querySelectorAll('[data-symp]:checked')].map(i=>i.dataset.symp);
  if(t.dataset.redflag!==undefined){const s=S.rf[S.cond]||(S.rf[S.cond]=new Set());t.checked?s.add(+t.dataset.redflag):s.delete(+t.dataset.redflag)}
  if(t.dataset.stepchk!==undefined&&S.view==='part'&&S.mode==='treat'){const s=S.sd[S.cond]||(S.sd[S.cond]=new Set());t.checked?s.add(+t.dataset.stepchk):s.delete(+t.dataset.stepchk)}
});
function submitCI(){
  const c=crew(),d=data(),vals=S.ciVals||{},out=[];
  for(const k in vals){const v=parseFloat(vals[k]);if(!isNaN(v)&&d[k]){d[k][N-1]=v;out.push([k,v])}}
  if(S.ciMood){d.mood[N-1]=S.ciMood;out.push(['mood',S.ciMood])}
  if(S.ciWater){d.water[N-1]=S.ciWater;out.push(['water',S.ciWater])}
  if(!out.length){toast('<span>Enter at least one reading, or use <b>Import from wearable</b>.</span>');return}
  S.ci[c.id]=out;const x=S.xp[c.id];x.badges.add('first');if(!x.today){x.streak++;x.today=true}
  addXP(50,'Daily check-in');
  const flagged=out.filter(([k,v])=>ev(k,v)!=='good');
  renderNav();renderModes();inks($('.deck'));renderFigure(false);renderPanel(null);
  showModal(`<div class="row"><div><div class="small muted">Check-in saved at ${now()}</div><div class="h2" style="font-size:20px;margin-top:2px">${flagged.length?`${plural(flagged.length,'reading')} to act on`:'All readings normal'}</div></div><span class="spacer"></span>${pill(worst(out.map(([k,v])=>ev(k,v))))}</div>
  <div class="results">${out.map(([k,v])=>{const st=ev(k,v);return `<div class="metric"><small>${esc(RULES[k].name)}</small><b class="num" style="color:${st==='good'?'var(--ink)':STATUS_COLOR[st]}">${fmt(v,RULES[k].dec)} ${RULES[k].unit}</b><em style="color:${STATUS_COLOR[st]}">${STATUS_WORD[st]}</em></div>`}).join('')}</div>
  ${flagged.length?`<p class="note s-warn">The body model now shows these on the right body part. The overview lists what to do first.</p>`:''}
  <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" data-closemodal>Close</button><button class="btn primary" data-closemodal data-view="overview">Open overview</button></div>`);
}
function showModal(html){$('#modalBody').innerHTML=html;$('#modal').hidden=false;requestAnimationFrame(()=>$('#modal').classList.add('in'))}
function hideModal(){const m=$('#modal');m.classList.remove('in');setTimeout(()=>m.hidden=true,200)}
document.addEventListener('click',e=>{if(e.target.closest('[data-closemodal]')||e.target.id==='modal')hideModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden)hideModal()});
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>inks(),120)});
$('#panel').addEventListener('transitionend',e=>{if(e.target.id==='panel')inks()});

/* ---------- telemetry ---------- */
function renderLink(){const m=mission(),el=$('#linkChip');el.className='link'+(m.delay>0?' delay':'');el.innerHTML=`<i></i>${esc(m.delayTxt)}`}
let metT=null;
function startMET(){clearInterval(metT);const c=crew();let t=c.day*86400+8*3600+15*60;const tick=()=>{t++;const d=Math.floor(t/86400),h=String(Math.floor(t%86400/3600)).padStart(2,'0'),m=String(Math.floor(t%3600/60)).padStart(2,'0'),s=String(t%60).padStart(2,'0');$('#met').textContent=`${d} d ${h}:${m}:${s}`};tick();metT=setInterval(tick,1000)}
$('#missionSel').innerHTML=Object.entries(MISSIONS).map(([k,m])=>`<option value="${k}">${esc(m.name)}</option>`).join('');
$('#crewSel').innerHTML=CREW.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('');
defaults();renderLink();startMET();render(false);inks();
/* Refresh space weather from DONKI when a network link exists; keep the on-board copy otherwise. */
S.feed='cached';
(function liveDonki(){
  if(!/^https?:/.test(location.protocol)||!window.fetch)return;
  const end=new Date(),start=new Date(end-30*864e5),f=d=>d.toISOString().slice(0,10);
  const ctl=new AbortController();setTimeout(()=>ctl.abort(),6000);
  fetch(`https://api.nasa.gov/DONKI/notifications?startDate=${f(start)}&endDate=${f(end)}&type=all&api_key=DEMO_KEY`,{signal:ctl.signal})
   .then(r=>r.ok?r.json():Promise.reject(r.status)).then(list=>{
     const items=(list||[]).map(n=>{const b=String(n.messageBody||'');const m=b.match(/##\s*Summary:\s*([\s\S]*?)(\n\n|##|$)/);const first=((m?m[1]:b).replace(/\s+/g,' ').trim().match(/^.*?[.!?](\s|$)/)||[''])[0].trim();
       return [n.messageType in DONKI_TYPES?n.messageType:'Report',n.messageID,n.messageIssueTime,first||'See the full notification for details.']}).filter(x=>x[1]);
     if(items.length){items.sort((a,b)=>a[2]<b[2]?1:-1);DONKI.length=0;items.forEach(i=>DONKI.push(i));S.feed='live';renderNav();if(S.view==='weather')renderPanel(null)}
   }).catch(()=>{});
})();
window.__HCG={S,render,go};
})();
