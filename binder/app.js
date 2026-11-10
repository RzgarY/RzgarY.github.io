
const $=s=>document.querySelector(s),E=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let D=null,IMG={},OV={},P=0,CA={},INF={},RE=false,SEL=null,HIST=[],DIRTY=false,dr=null;const FAIL=new Set();let RED=[];const ck=c=>((c.image||'').split('/')[3]||'en')+':'+c.id;const ft=(u,o={},ms=8000)=>{const a=new AbortController(),t=setTimeout(()=>a.abort(),ms);return fetch(u,{...o,signal:a.signal}).finally(()=>clearTimeout(t))};
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};let NEG=LS('bs_neg',{});const NOI=LS('bs_noi',{});CA=LS('bs_cache',{});
const keep=(()=>{let t=0;return()=>{clearTimeout(t);t=setTimeout(()=>{try{localStorage.setItem('bs_cache',JSON.stringify(CA));localStorage.setItem('bs_neg',JSON.stringify(NEG));localStorage.setItem('bs_noi',JSON.stringify(NOI));localStorage.setItem('bs_ov',JSON.stringify(OV))}catch(e){}},300)}})();
const two=()=>matchMedia('(min-width:900px)').matches,all=()=>D.state.pages.flatMap(p=>Object.values(p.cards||{}));

/* ---- görsel çözücü: sırayla dener, hiçbir kart boş kalmaz ---- */
const probe=u=>new Promise(r=>{const i=new Image(),t=setTimeout(()=>{i.src='';r(null)},8000);i.referrerPolicy='no-referrer';i.onload=()=>{clearTimeout(t);r(u)};i.onerror=()=>{clearTimeout(t);r(null)};i.src=u});
async function first(a){for(const u of a){if(u&&await probe(u))return u}return null}
const tpU=id=>[`https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`,`https://product-images.tcgplayer.com/fit-in/437x610/${id}.jpg`];
const dexU=b=>{b=b.replace(/\/(high|low)\.\w+$/,'');return['high.webp','low.webp','high.png','low.png'].map(s=>b+'/'+s)};
function findTp(o,t){if(!o||typeof o!=='object')return 0;for(const k in o){const v=o[k],x=t||/tcgplayer/i.test(k);if(x&&/^(productId|idProduct|product_id)$/i.test(k)&&+v)return+v;const r=findTp(v,x);if(r)return r}return 0}
async function viaApi(c){
 const lang=(c.image||'').split('/')[3]||'en';
 try{const r=await ft(`https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(c.id)}`);
  if(r.ok){const j=await r.json();
   if(j.image){const u=await first(dexU(j.image));if(u)return u}
   const id=findTp(j);if(id){const u=await first(tpU(id));if(u){OV[c.id]={tp:id};return u}}}}catch(e){}
 if(lang==='en')try{
  const n=String(c.number).replace(/^0+(?=\d)/,'');
  const r=await ft('https://api.pokemontcg.io/v2/cards?pageSize=12&select=name,number,set,images&q='+encodeURIComponent(`name:"${c.name.replace(/"/g,'')}" number:"${n}"`));
  if(r.ok){const l=(await r.json()).data||[];
   const m=l.find(x=>x.set&&x.set.name.toLowerCase()===String(c.setName).toLowerCase())||(l.length===1?l[0]:null);
   if(m&&m.images){const u=await first([m.images.large,m.images.small]);if(u)return u}}}catch(e){}
 return null}
async function r0(c){
 if(CA[ck(c)])return CA[ck(c)];if(NOI[c.id])return null;if(!OV[c.id]&&NEG[c.id]&&Date.now()-NEG[c.id]<864e5){FAIL.add(c.id);return null}
 const tp=OV[c.id]&&OV[c.id].tp;let u=null;
 if(tp)u=await first(tpU(tp));
 if(!u&&c.image)u=await first(dexU(c.image));
 if(!u)u=await viaApi(c);
 if(u){CA[ck(c)]=u;FAIL.delete(c.id);delete NEG[c.id]}else{FAIL.add(c.id);if(navigator.onLine)NEG[c.id]=Date.now()}keep();
 return u}
const resolve=c=>INF[c.id]||(INF[c.id]=r0(c).finally(()=>delete INF[c.id]));

/* ---- çizim ---- */
function fill(d,c,noClick){
 const im=E('img');im.alt=c.name;im.decoding='async';im.referrerPolicy='no-referrer';im.onerror=()=>{if(!im.dataset.r&&im.getAttribute('src')){im.dataset.r=1;delete CA[ck(c)];keep();resolve(c).then(u=>{if(u)im.src=u})}};d.classList.add('load');d.append(im);if(noClick)d.dataset.nc=1;mark(d,c);
 resolve(c).then(u=>{d.classList.remove('load');if(u)im.src=u;else{im.remove();d.classList.add('ph');d.innerHTML=`<b>${esc(c.name)}</b><span>${esc(c.setName)}<br>#${esc(c.number)}</span>`}mark(d,c);stats()});
 if(!noClick){d.onclick=()=>{if(!RE)openCard(c)};d.tabIndex=0;d.setAttribute('role','button');d.onkeydown=e=>{if(!RE&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCard(c)}}}}
function pageEl(pg,i,noClick){
 const {rows,cols}=D.state,w=E('div','pg'),g=E('div','grid'),cov=new Set();
 w.innerHTML=`<h3>${noClick?esc(D.state.name)+' · ':''}Sayfa ${i+1}</h3>`;
 g.style.setProperty('--r',rows);g.style.setProperty('--c',cols);g.dataset.pg=i;
 (pg.blocks||[]).forEach((b,bi)=>{for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)cov.add((b.r+y)+','+(b.c+x));
  const d=E('div','slot blk');d.dataset.b=bi;d.style.gridArea=`${b.r+1}/${b.c+1}/span ${b.h}/span ${b.w}`;
  if(IMG[b.imageId]){const im=E('img');im.src=IMG[b.imageId];im.alt='';d.append(im)}if(RE&&!noClick)d.append(btn('⤢',()=>openBlk(i,bi),'l'),btn('✕',()=>{snap();D.state.pages[i].blocks.splice(bi,1);render()}));g.append(d)});
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=r+','+c;if(cov.has(k))continue;
  const card=(pg.cards||{})[k],d=E('div','slot'+(card?'':' empty'));d.style.gridArea=`${r+1}/${c+1}`;d.dataset.k=k;
  if(card)fill(d,card,noClick);g.append(d)}
 w.append(g);return w}
function render(){
 if(!D)return;const pgs=D.state.pages,n=pgs.length,t=two()?2:1;if(t==2)P-=P%2;
 const s=E('div','spread'+(t==2?' two':''));
 for(let i=P;i<Math.min(n,P+t);i++)s.append(pageEl(pgs[i],i));
 $('#view').replaceChildren(s);
 const sel=$('#sel');sel.innerHTML='';
 for(let i=0;i<n;i+=t){const o=E('option');o.value=i;o.textContent=t==2?`Sayfa ${i+1}${i+1<n?'–'+(i+2):''} / ${n}`:`Sayfa ${i+1} / ${n}`;sel.append(o)}
 sel.value=P;try{history.replaceState(null,'','#p='+(P+1))}catch(e){}$('#pv').disabled=P<=0;$('#nx').disabled=P+t>=n;stats();markSel()}
function stats(){if(!D)return;$('#mc').textContent=FAIL.size;const cs=all(),bl=D.state.pages.reduce((a,p)=>a+(p.blocks||[]).length,0);
 $('#chips').innerHTML=[`${D.state.pages.length} sayfa`,`${cs.length} kart`,`${bl} özel görsel`,`%${cs.length?Math.round(100*cs.filter(c=>!isMiss(c)).length/cs.length):0} tamamlandı`,cs.some(isMiss)?`🕳 ${cs.filter(isMiss).length} missing`:'',DIRTY?'💾 Kaydedilmemiş değişiklik → ⬇ JSON indir':'',`✅ ${cs.filter(c=>CA[ck(c)]).length} görsel bulundu`,FAIL.size?`⚠️ ${FAIL.size} kartta görsel yok → düzelt`:''].filter(Boolean).map(t=>`<span${t.endsWith('düzelt')?' data-miss':''}>${t}</span>`).join('')}
function go(d){const n=D.state.pages.length;P=Math.max(0,Math.min(n-1,P+d*(two()?2:1)));render();scrollTo(0,0)}

/* ---- kart penceresi + TCGplayer ID ---- */
function openCard(c){if(RE)return;$('#dlg').className='';
 const tp=OV[c.id]&&OV[c.id].tp,d=$('#dlg');
 d.innerHTML=`<div class="md"><img id="mi" alt="${esc(c.name)}" class="${isMiss(c)?'gs':''}"><div><h2 style="margin:0">${esc(c.name)}</h2><p>${esc(c.setName)} · #${esc(c.number)}<br><small style="color:var(--mu)">${esc(c.id)}</small></p>
 <p><a style="color:var(--ac)" target="_blank" rel="noopener noreferrer" href="${tp?'https://www.tcgplayer.com/product/'+tp:'https://www.tcgplayer.com/search/pokemon/product?q='+encodeURIComponent(c.name+' '+c.number)}">TCGplayer’da ${tp?'aç':'ara'} ↗</a></p>
 <label style="color:var(--mu);font-size:13px">TCGplayer ürün ID’si ya da linki (görsel çıkmıyorsa)</label>
 <input id="tpi" value="${tp||''}" placeholder="647110 ya da tcgplayer.com/product/647110"><p><button class="pri" id="tps">Kaydet</button> <button id="tpc">Kapat</button></p><p><button id="tpm">${isMiss(c)?'✅ Missing’i kaldır':'🕳 Missing olarak işaretle'}</button></p></div></div>`;
 resolve(c).then(u=>{if(u)$('#mi').src=u});
 $('#tpc').onclick=()=>d.close();$('#tpm').onclick=()=>{toggleMiss(c);d.close();render()};
 $('#tps').onclick=()=>{const m=String($('#tpi').value).match(/(\d{4,})/);if(m){OV[c.id]={tp:+m[1]};delete CA[ck(c)];FAIL.delete(c.id);delete NEG[c.id]}else delete OV[c.id];DIRTY=true;keep();d.close();render()};
 d.showModal()}

/* ---- içe/dışa aktarma ---- */
function load(j){
 const cj=clean(j),s=cj.state;
 
 D={state:s};IMG=cj.images;OV={...cj.overrides,...LS('bs_ov',{})};P=Math.min(s.pages.length-1,Math.max(0,(+(location.hash.match(/p=(\d+)/)||[])[1]||1)-1));FAIL.clear();HIST=[];RED=[];DIRTY=false;{const n=Date.now();all().forEach(c=>{if(NEG[c.id]&&n-NEG[c.id]<864e5&&!NOI[c.id])FAIL.add(c.id)})}
 $('#nm').textContent=s.name;$('#sub').textContent=`${s.rows}×${s.cols} · ${s.pages.length} sayfa`;document.title=s.name+' · Binder';
 ['#bExp','#bPdf','#bScan','#bRe','#bPg','#bSch','#bMiss'].forEach(x=>$(x).disabled=false);$('#nav').hidden=false;setRe(false)}
const readF=f=>f&&f.text().then(t=>{try{load(JSON.parse(t))}catch(e){alert('Bu dosya geçerli bir binder JSON’u değil.')}});
$('#file').onchange=e=>{readF(e.target.files[0]);e.target.value=''};
addEventListener('dragover',e=>e.preventDefault());addEventListener('drop',e=>{e.preventDefault();readF(e.dataTransfer.files[0])});

$('#bExp').onclick=()=>{DIRTY=false;setTimeout(stats);try{localStorage.removeItem('bs_draft')}catch(e){}
 const o={app:'DreamBinder',version:2,exported:new Date().toISOString(),state:D.state,images:usedImgs(),missing:[...FAIL],overrides:OV};
 const a=E('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));
 a.download='binder.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5e3)};
async function scan(){
 const cs=all().filter(c=>!CA[ck(c)]),m=$('#sub'),old=m.textContent;let i=0,n=0;
 await Promise.all(Array.from({length:6},async()=>{while(i<cs.length){await resolve(cs[i++]);m.textContent=`Taranıyor ${++n}/${cs.length}…`}}));
 m.textContent=old;stats()}
$('#bScan').onclick=async()=>{FAIL.clear();NEG={};keep();await scan();render()};
$('#bPdf').onclick=async()=>{
 await scan();const p=$('#print');p.innerHTML='';
 D.state.pages.forEach((pg,i)=>{const s=E('section','sheet');s.append(pageEl(pg,i,true));p.append(s)});
 await new Promise(r=>setTimeout(r,60));
 await Promise.all([...p.querySelectorAll('img')].map(i=>new Promise(r=>{if(i.complete&&i.naturalWidth)r();else{i.onload=i.onerror=r;setTimeout(r,8000)}})));
 print()};

/* ---- missing + düzenleme modu ---- */
const V=$('#view'),isMiss=c=>c.missing===true||c.owned===false;
function mark(d,c){d.classList.toggle('miss',isMiss(c));d.querySelectorAll('.mb,.ib').forEach(x=>x.remove());
 if(isMiss(c)){const b=E('i','mb');b.textContent='MISSING';d.append(b)}
 if(!d.dataset.nc&&RE){const k=d.dataset.k;d.append(btn(RE?'✕':'ⓘ',()=>{const pi=+d.closest('.grid').dataset.pg;if(RE){snap();delete D.state.pages[pi].cards[k];render()}else openCard(c)}))}}
const snap=()=>{HIST.push(JSON.stringify(D.state.pages));if(HIST.length>40)HIST.shift();DIRTY=true;RED.length=0;$('#bRo').disabled=true;$('#bUn').disabled=false;setTimeout(saveDraft,400)};
function toggleMiss(c){snap();if(isMiss(c)){c.missing=false;if(c.owned===false)c.owned=true}else c.missing=true}
function setRe(v){RE=v;SEL=null;dr=null;document.body.classList.toggle('re',v);const b=$('#bRe');b.classList.toggle('on',v);b.innerHTML=v?'✔<span class="lb"> Bitti</span>':'✋<span class="lb"> Düzenle</span>';$('#tb').hidden=!v;$('#bUn').disabled=!HIST.length;$('#bRo').disabled=!RED.length;render()}
$('#bRe').onclick=()=>setRe(!RE);
$('#bUn').onclick=()=>{if(!HIST.length)return;RED.push(JSON.stringify(D.state.pages));D.state.pages=JSON.parse(HIST.pop());SEL=null;$('#bUn').disabled=!HIST.length;$('#bRo').disabled=false;setTimeout(saveDraft,400);render()};$('#bRo').onclick=()=>{if(!RED.length)return;HIST.push(JSON.stringify(D.state.pages));D.state.pages=JSON.parse(RED.pop());SEL=null;$('#bUn').disabled=false;$('#bRo').disabled=!RED.length;setTimeout(saveDraft,400);render()};$('#bDn').onclick=()=>setRe(false);
const hit=(a,b)=>a.r<b.r+b.h&&b.r<a.r+a.h&&a.c<b.c+b.w&&b.c<a.c+a.w;
function canMove(s,t){
 const {rows,cols}=D.state,pp=D.state.pages[t.pg];if(!pp)return false;const bl=pp.blocks||[];
 if(s.b!=null){const b=D.state.pages[s.pg].blocks[s.b];
  if(t.pg!==s.pg||t.r<0||t.c<0||t.r+b.h>rows||t.c+b.w>cols||(t.r===b.r&&t.c===b.c))return false;
  const n={r:t.r,c:t.c,w:b.w,h:b.h};return !bl.some((o,i)=>i!==s.b&&hit(n,o))}
 if(t.r<0||t.c<0||t.r>=rows||t.c>=cols||(t.pg===s.pg&&t.r+','+t.c===s.k))return false;
 return !bl.some(o=>hit({r:t.r,c:t.c,w:1,h:1},o))}
function doMove(s,t){snap();const ps=D.state.pages;
 if(s.b!=null){const p=ps[s.pg],b=p.blocks[s.b],cd=p.cards=p.cards||{},ins=(r,c,o)=>r>=o.r&&r<o.r+o.h&&c>=o.c&&c<o.c+o.w,n={r:t.r,c:t.c,w:b.w,h:b.h},to=[],from=[];
  for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){if(!ins(t.r+y,t.c+x,b))to.push((t.r+y)+','+(t.c+x));if(!ins(b.r+y,b.c+x,n))from.push((b.r+y)+','+(b.c+x))}
  to.forEach((k,i)=>{if(cd[k]){cd[from[i]]=cd[k];delete cd[k]}});b.r=t.r;b.c=t.c;return}
 const A=ps[s.pg].cards=ps[s.pg].cards||{},B=ps[t.pg].cards=ps[t.pg].cards||{},k=t.r+','+t.c,a=A[s.k],o=B[k];
 if(o)A[s.k]=o;else delete A[s.k];B[k]=a}
function cellAt(x,y){
 const el=document.elementFromPoint(x,y),g=el&&el.closest('#view .grid');if(!g)return null;
 const {rows,cols}=D.state,r=g.getBoundingClientRect(),cs=getComputedStyle(g),pl=parseFloat(cs.paddingLeft),pt=parseFloat(cs.paddingTop),gx=parseFloat(cs.columnGap)||0,gy=parseFloat(cs.rowGap)||0,
 pw=(g.clientWidth-2*pl+gx)/cols,ph=(g.clientHeight-2*pt+gy)/rows;
 return{g,pg:+g.dataset.pg,r:Math.max(0,Math.min(rows-1,Math.floor((y-r.top-g.clientTop-pt)/ph))),c:Math.max(0,Math.min(cols-1,Math.floor((x-r.left-g.clientLeft-pl)/pw)))}}
function dropBox(t,w,h,ok){document.querySelectorAll('.dz').forEach(x=>x.remove());if(!t)return;const {rows,cols}=D.state,r=Math.max(0,Math.min(rows-h,t.r)),c=Math.max(0,Math.min(cols-w,t.c)),z=E('div','dz'+(ok?'':' bad'));z.style.gridArea=`${r+1}/${c+1}/span ${h}/span ${w}`;t.g.append(z)}
function markSel(){
 document.querySelectorAll('.slot.sel,.slot.dragging').forEach(x=>x.classList.remove('sel','dragging'));
 const q=S=>{if(!S)return null;const g=V.querySelector(`.grid[data-pg="${S.pg}"]`);return g&&g.querySelector(S.b!=null?`[data-b="${S.b}"]`:`[data-k="${S.k}"]`)};
 const a=q(SEL);a&&a.classList.add('sel');if(dr&&dr.on){const b=q(dr.src);if(b){b.classList.add('dragging');dr.s=b}}}
V.addEventListener('dragstart',e=>e.preventDefault());
V.addEventListener('pointerdown',e=>{
 if(!RE||(e.pointerType==='mouse'&&e.button))return;
 const s=e.target.closest('.slot');if(!s||e.target.closest('.ib'))return;const pg=+s.closest('.grid').dataset.pg,empty=s.classList.contains('empty'),isB=s.dataset.b!=null,
 b=isB?D.state.pages[pg].blocks[+s.dataset.b]:null,rc=s.getBoundingClientRect();
 dr={id:e.pointerId,s,x:e.clientX,y:e.clientY,on:false,w:b?b.w:1,h:b?b.h:1,rc,dst:null,
  src:empty?null:(isB?{pg,b:+s.dataset.b}:{pg,k:s.dataset.k}),
  ox:b?Math.min(b.w-1,Math.floor((e.clientX-rc.left)/rc.width*b.w)):0,oy:b?Math.min(b.h-1,Math.floor((e.clientY-rc.top)/rc.height*b.h)):0};
 try{e.target.releasePointerCapture(e.pointerId)}catch(_){}
 e.preventDefault()});
let flipT=0;
addEventListener('pointermove',e=>{
 if(!dr||e.pointerId!==dr.id||!dr.src)return;
 if(!dr.on){if(Math.hypot(e.clientX-dr.x,e.clientY-dr.y)<8)return;dr.on=true;dr.s.classList.add('dragging');
  const g=E('div','ghost '+[...dr.s.classList].filter(c=>c!=='dragging'&&c!=='sel').join(' '));g.style.width=dr.rc.width+'px';g.style.height=dr.rc.height+'px';g.innerHTML=dr.s.innerHTML;document.body.append(g);dr.gh=g}
 dr.gh.style.left=e.clientX+'px';dr.gh.style.top=e.clientY+'px';
 const el=document.elementFromPoint(e.clientX,e.clientY),nb=el&&el.closest('#pv,#nx');
 if(nb&&!nb.disabled&&Date.now()-flipT>700){flipT=Date.now();dr.dst=null;go(nb.id==='nx'?1:-1);return}
 const c=cellAt(e.clientX,e.clientY);if(!c){dr.dst=null;dropBox(null);return}
 const t={pg:c.pg,g:c.g,r:c.r-dr.oy,c:c.c-dr.ox};t.ok=canMove(dr.src,t);dr.dst=t;dropBox(t,dr.w,dr.h,t.ok)});
const endDrag=e=>{
 if(!dr||e.pointerId!==dr.id)return;const d=dr;dr=null;
 d.gh&&d.gh.remove();dropBox(null);d.s.classList.remove('dragging');
 if(e.type==='pointercancel')return render();
 if(d.on){if(d.dst&&d.dst.ok){doMove(d.src,d.dst);SEL=null}return render()}
 const c=cellAt(e.clientX,e.clientY);if(!c)return;
 if(d.src&&SEL&&JSON.stringify(SEL)===JSON.stringify(d.src))SEL=null;
 else if(SEL){const t={pg:c.pg,r:c.r,c:c.c};if(canMove(SEL,t)){doMove(SEL,t);SEL=null}else SEL=d.src}
 else if(!d.src){openAdd(c.pg,c.r,c.c);return}
 else SEL=d.src;
 render()};
addEventListener('pointerup',endDrag);addEventListener('pointercancel',endDrag);

/* ---- GitHub'dan çekme ---- */
function srcs(){let s='';try{s=localStorage.getItem('bs_src')||''}catch(e){}return[...(s?[s]:[]),'binder.json']}
async function loadRemote(manual){
 for(const u of srcs()){try{const r=await ft(u+(u.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(!r.ok)continue;
  load(await r.json());try{manual?localStorage.removeItem('bs_draft'):askDraft()}catch(e){}$('#sub').textContent+=' · ☁ '+new Date().toLocaleTimeString(LANG,{hour:'2-digit',minute:'2-digit'});return true}catch(e){}}
 if(manual)alert('binder.json bulunamadı. Menü → Kaynak adresi’nden link girebilirsin.');return false}
$('#bGh').onclick=()=>{if(DIRTY&&!confirm('Kaydedilmemiş değişiklikler var. sunucudaki sürümle değiştirilsin mi?'))return;loadRemote(true)};
$('#bSrc').onclick=()=>{let v=null;try{v=prompt('binder.json linki (boş = aynı klasör):',localStorage.getItem('bs_src')||'')}catch(e){}if(v===null)return;try{v.trim()?localStorage.setItem('bs_src',v.trim()):localStorage.removeItem('bs_src')}catch(e){}loadRemote(true)};

/* ---- sayfalar, kart & görsel ekleme ---- */
const inb=(r,c,o)=>r>=o.r&&r<o.r+o.h&&c>=o.c&&c<o.c+o.w;
const btn=(t,f,c)=>{const b=E('button','ib '+(c||''));b.textContent=t;b.onclick=e=>{e.stopPropagation();f()};return b};
const sz=(id,n,v)=>`<select id="${id}">${Array.from({length:n},(_,k)=>`<option ${k+1==v?'selected':''}>${k+1}</option>`).join('')}</select>`;
const usedImgs=()=>{const u=new Set(D.state.pages.flatMap(p=>(p.blocks||[]).map(b=>b.imageId)));return Object.fromEntries(Object.entries(IMG).filter(([k])=>u.has(k)))};
const readImg=f=>new Promise((ok,no)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>{const s=Math.min(1,1400/Math.max(i.width,i.height)),cv=E('canvas');cv.width=Math.round(i.width*s);cv.height=Math.round(i.height*s);cv.getContext('2d').drawImage(i,0,0,cv.width,cv.height);URL.revokeObjectURL(u);ok(cv.toDataURL('image/jpeg',.85))};i.onerror=no;i.src=u});
function showDlg(html,cls){const d=$('#dlg');d.className=cls||'';d.innerHTML=html;if(!d.open)d.showModal();return d}
function setBlock(pi,idx,nb){
 const {rows,cols}=D.state,p=D.state.pages[pi],bl=p.blocks=p.blocks||[],cd=p.cards=p.cards||{},others=bl.filter((_,i)=>i!==idx);
 if(nb.r<0||nb.c<0||nb.r+nb.h>rows||nb.c+nb.w>cols||others.some(o=>hit(nb,o))){alert('Bu boyut sığmıyor (sayfa dışına taşıyor ya da başka görselle çakışıyor).');return false}
 const cov=[],free=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=r+','+c;if(inb(r,c,nb)){if(cd[k])cov.push(k)}else if(!cd[k]&&!others.some(o=>inb(r,c,o)))free.push(k)}
 if(cov.length>free.length){alert('Kapladığı kartları taşıyacak boş yer yok.');return false}
 snap();cov.forEach((k,i)=>{cd[free[i]]=cd[k];delete cd[k]});if(idx==null)bl.push(nb);else bl[idx]=nb;return true}
const parseCode=t=>{t=String(t).trim();const m=t.match(/tcgplayer\.com\/(?:[a-z-]+\/)*product\/(\d+)/i)||t.match(/^#?(\d{4,9})$/);return m?{tp:+m[1]}:{dex:t}};
async function tpMeta(id){for(const u of[`https://mpapi.tcgplayer.com/v2/product/${id}/details`,`https://mp-search-api.tcgplayer.com/v1/product/${id}/details`]){
  try{const r=await ft(u,{},6000);if(!r.ok)continue;let j=await r.json();j=(j&&j.results&&j.results[0])||j;
   const name=j.productName||j.name,ca=j.customAttributes||{};if(name)return{name:String(name).replace(/\s*\(.*?\)\s*$/,'').trim()||name,set:j.setName||j.groupName||'',num:String(ca.number||j.cardNumber||'').split('/')[0]}}catch(e){}}
 return null}
function openAdd(pi,r,c){
 const {rows,cols}=D.state,d=showDlg(`<h3 style="margin:0 0 8px">Boş hücre · satır ${r+1}, sütun ${c+1}</h3>
 <b>🃏 Kart ekle (TCG kodu)</b><p class="mu" style="margin:4px 0">TCGplayer ID ya da link: <code>709288</code> · TCGdex kodu: <code>swsh12-001</code>, <code>sv03.5-199</code></p>
 <p style="display:flex;gap:6px;flex-wrap:wrap"><input id="ac" placeholder="709288 ya da swsh12-001" autocomplete="off" inputmode="text"><input id="an" placeholder="Kart adı (isteğe bağlı)" hidden><select id="al" title="Dil (sadece TCGdex kodu için)">${['en','fr','de','es','it','pt','ja'].map(l=>`<option>${l}</option>`).join('')}</select></p><p id="am" class="mu"></p>
 <p><button class="pri" id="ab">Kartı ekle</button></p><hr>
 <b>🖼 Görsel bloğu ekle</b><p>Boyut: ${sz('bw',cols,1)} × ${sz('bh',rows,1)} <span class="mu">(genişlik × yükseklik)</span></p>
 <p><label class="btn">Resim seç ve ekle<input id="af" type="file" accept="image/*" hidden></label> <button id="ak">Kapat</button></p>`);
 $('#ak').onclick=()=>d.close();
 const putCard=card=>{snap();const cd=D.state.pages[pi].cards=D.state.pages[pi].cards||{};cd[r+','+c]=card;d.close();render()};
 const addTp=async(id,name)=>{const m=$('#am'),img=await first(tpU(id));
  if(!img){m.textContent='TCGplayer’da bu ID ile görsel bulunamadı. ID’yi kontrol et.';return}
  const meta=await tpMeta(id),nm=name||(meta&&meta.name)||'';
  if(!nm){m.textContent='Kart adı otomatik alınamadı. Aşağıya adı yaz (isteğe bağlı) ve tekrar bas; boş bırakırsan ID ile eklenir.';const a=$('#an');a.hidden=false;a.focus();if(!a.dataset.once){a.dataset.once=1;return}}
  OV['tp'+id]={tp:id};CA['en:tp'+id]=img;keep();
  putCard({id:'tp'+id,name:nm||('TCGplayer #'+id),setName:(meta&&meta.set)||'',number:(meta&&meta.num)||'',image:''})};
 const addDex=async(raw)=>{const lang=$('#al').value,tries=[raw];
  const mm=raw.match(/^(.+)-(\d{1,3})$/i);if(mm)tries.push(mm[1]+'-'+mm[2].padStart(3,'0'));
  for(const id of [...new Set(tries)]){try{const rs=await ft(`https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(id)}`);if(!rs.ok)continue;const j=await rs.json();if(!j.id)continue;
   putCard({id:j.id,name:j.name,setName:(j.set&&j.set.name)||'',number:j.localId||'',image:j.image||''});return}catch(e){}}
  $('#am').textContent='Bulunamadı. TCGplayer ID/link ya da TCGdex kodunu (set-numara) yaz ve dili kontrol et.'};
 $('#ab').onclick=async()=>{const raw=$('#ac').value.trim(),m=$('#am');if(!raw)return;m.textContent='Aranıyor…';$('#ab').disabled=true;
  try{const k=parseCode(raw);if(k.tp)await addTp(k.tp,$('#an').value.trim());else await addDex(k.dex)}
  catch(e){m.textContent='Bir hata oldu, tekrar dene.'}finally{$('#ab').disabled=false}};
 $('#ac').onkeydown=e=>{if(e.key==='Enter')$('#ab').click()};
 $('#ac').oninput=()=>{const k=parseCode($('#ac').value);$('#am').textContent=!$('#ac').value.trim()?'':k.tp?'✔ TCGplayer ID algılandı: '+k.tp:'TCGdex kodu olarak aranacak'};
 $('#af').onchange=async e=>{const f=e.target.files[0];if(!f)return;const w=+$('#bw').value,h=+$('#bh').value,id='img_'+Date.now().toString(36);
  try{IMG[id]=await readImg(f)}catch(_){alert('Resim okunamadı.');return}
  if(setBlock(pi,null,{r:Math.max(0,Math.min(rows-h,r)),c:Math.max(0,Math.min(cols-w,c)),w,h,imageId:id})){d.close();render()}else delete IMG[id]}}
function openBlk(pi,i){
 const {rows,cols}=D.state,b=D.state.pages[pi].blocks[i];let pend=null;
 const d=showDlg(`<h3 style="margin:0 0 8px">🖼 Görsel bloğu</h3><p>Boyut: ${sz('bw',cols,b.w)} × ${sz('bh',rows,b.h)} <span class="mu">(genişlik × yükseklik)</span></p>
 <p><label class="btn">Resmi değiştir<input id="af" type="file" accept="image/*" hidden></label> <span id="fm" class="mu"></span></p>
 <p><button class="pri" id="bk">Uygula</button> <button id="bd">🗑 Sil</button> <button id="bc">Kapat</button></p>`);
 $('#bc').onclick=()=>d.close();
 $('#af').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{pend=await readImg(f);$('#fm').textContent='✔ yeni resim hazır'}catch(_){alert('Resim okunamadı.')}};
 $('#bd').onclick=()=>{snap();D.state.pages[pi].blocks.splice(i,1);d.close();render()};
 $('#bk').onclick=()=>{const w=+$('#bw').value,h=+$('#bh').value,nb={...b,w,h,r:Math.min(b.r,rows-h),c:Math.min(b.c,cols-w)};
  if(pend){nb.imageId='img_'+Date.now().toString(36);IMG[nb.imageId]=pend}
  if(setBlock(pi,i,nb)){d.close();render()}}}
function thumb(p){let s='';(p.blocks||[]).forEach(b=>{const u=IMG[b.imageId];s+=`<i class="m" style="grid-area:${b.r+1}/${b.c+1}/span ${b.h}/span ${b.w};${u?`background-image:url('${esc(u)}')`:''}"></i>`});
 const {rows,cols}=D.state;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if((p.blocks||[]).some(b=>inb(r,c,b)))continue;const k=(p.cards||{})[r+','+c];
  s+=k?`<i class="m${isMiss(k)?' miss':''}" style="grid-area:${r+1}/${c+1};${CA[ck(k)]?`background-image:url('${esc(CA[ck(k)])}')`:''}"></i>`:`<i class="m e" style="grid-area:${r+1}/${c+1}"></i>`}return s}
function openOv(){
 const {rows,cols}=D.state,ps=D.state.pages;
 const d=showDlg(`<h3 style="margin:0 0 10px">▦ Sayfalar (${ps.length})</h3><p class="mu" style="margin:0 0 8px">Sürükleyip bırakarak sırala (telefonda ⠿ tutamacından tut). PDF de bu sırayla çıkar.</p><div class="ov">${ps.map((p,i)=>`<div data-pi="${i}"><div class="tg" data-go="${i}" style="--r:${rows};--c:${cols}">${thumb(p)}</div><div class="tb"><span><b class="hd" title="Sürükle">⠿</b> Sayfa ${i+1}</span><span><button data-add="${i}" title="Bu sayfadan sonra yeni sayfa">➕</button> <button data-del="${i}" title="Sayfayı sil">🗑</button></span></div></div>`).join('')}</div>
 <p><button class="pri" data-add="${ps.length-1}">➕ Yeni sayfa (sona)</button> <button id="ovc">Kapat</button></p>`,'wide');
 $('#ovc').onclick=()=>d.close()}
$('#dlg').onclick=e=>{if(OVD)return;const d=e.target;if(d.id==='dlg')return d.close();const b=d.closest('[data-go],[data-add],[data-del]');if(!b)return;const ps=D.state.pages;
 if(b.dataset.go!=null){P=+b.dataset.go;$('#dlg').close();render();return}
 if(b.dataset.add!=null){snap();ps.splice(+b.dataset.add+1,0,{cards:{},blocks:[]});openOv();render();return}
 const i=+b.dataset.del;if(ps.length<2){alert('Son sayfa silinemez.');return}
 if(!confirm(`Sayfa ${i+1} silinsin mi?\n${Object.keys(ps[i].cards||{}).length} kart ve ${(ps[i].blocks||[]).length} görsel de gidecek. Emin misin?`))return;
 snap();ps.splice(i,1);P=Math.max(0,Math.min(P,ps.length-1));openOv();render()};
$('#bPg').onclick=openOv;
let OVD=false,od=null;
$('#dlg').addEventListener('pointerdown',e=>{
 const w=e.target.closest('.ov>[data-pi]');if(!w||e.target.closest('button'))return;
 if(e.pointerType!=='mouse'&&!e.target.closest('.hd'))return;
 od={id:e.pointerId,w,i:+w.dataset.pi,x:e.clientX,y:e.clientY,on:false,to:null};
 try{e.target.releasePointerCapture(e.pointerId)}catch(_){}});
addEventListener('pointermove',e=>{
 if(!od||e.pointerId!==od.id)return;
 if(!od.on){if(Math.hypot(e.clientX-od.x,e.clientY-od.y)<8)return;od.on=true;OVD=true;od.w.style.opacity='.35';
  const t0=od.w.querySelector('.tg'),g=t0.cloneNode(true);g.classList.add('ghost');g.style.width=t0.offsetWidth+'px';$('#dlg').append(g);od.g=g}
 od.g.style.left=e.clientX+'px';od.g.style.top=e.clientY+'px';
 const ov=$('.ov');ov.querySelectorAll('.dl,.dr').forEach(x=>x.classList.remove('dl','dr'));od.to=null;
 const rc=ov.getBoundingClientRect();if(e.clientY<rc.top+40)ov.scrollTop-=12;else if(e.clientY>rc.bottom-40)ov.scrollTop+=12;
 const t=document.elementFromPoint(e.clientX,e.clientY),w=t&&t.closest('.ov>[data-pi]');
 if(w){const r=w.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;w.classList.add(after?'dr':'dl');od.to=+w.dataset.pi+(after?1:0)}});
const endOd=e=>{if(!od||e.pointerId!==od.id)return;const d=od;od=null;
 if(d.g)d.g.remove();d.w.style.opacity='';document.querySelectorAll('.ov>.dl,.ov>.dr').forEach(x=>x.classList.remove('dl','dr'));
 if(!d.on)return;setTimeout(()=>OVD=false,60);
 if(e.type==='pointerup'&&d.to!=null){const n=d.to>d.i?d.to-1:d.to;if(n!==d.i){snap();const ps=D.state.pages,[p]=ps.splice(d.i,1);ps.splice(n,0,p);P=n;openOv();render()}}};
addEventListener('pointerup',endOd);addEventListener('pointercancel',endOd);

/* ---- gezinme ---- */
$('#pv').onclick=()=>go(-1);$('#nx').onclick=()=>go(1);$('#sel').onchange=e=>{P=+e.target.value;render();scrollTo(0,0)};
addEventListener('keydown',e=>{if(!D||document.querySelector('dialog[open]')||/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))return;if(e.key==='/'){e.preventDefault();openSearch()}if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1)});
let tx=0,ty=0;addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
addEventListener('touchend',e=>{if(!D||RE||document.querySelector('dialog[open]'))return;const d=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;if(Math.abs(d)>70&&Math.abs(d)>Math.abs(dy)*1.5)go(d<0?1:-1)},{passive:true});
matchMedia('(min-width:900px)').addEventListener('change',render);
/* ===== v2: doğrulama, taslak, menü, arama, eksik görsel paneli, dil, PWA ===== */
const ni=(v,a,b,d)=>{v=Math.trunc(+v);return v>=a&&v<=b?v:d};
function clean(j){const s=j.state||j;if(!s||!Array.isArray(s.pages)||s.pages.length>500)throw 0;
 const rows=ni(s.rows,1,12,3),cols=ni(s.cols,1,12,3),S=x=>String(x??'').slice(0,200);
 const pages=s.pages.map(p=>{p=p||{};const cards={},blocks=[];
  for(const k in p.cards||{}){const m=/^(\d+),(\d+)$/.exec(k),c=p.cards[k];if(m&&+m[1]<rows&&+m[2]<cols&&c&&typeof c==='object')cards[k]={...c,id:S(c.id),name:S(c.name),setName:S(c.setName),number:S(c.number),image:/^https?:\/\//.test(c.image)?String(c.image).slice(0,400):''}}
  for(const b of p.blocks||[]){const w=ni(b&&b.w,1,cols,0),h=ni(b&&b.h,1,rows,0),r=ni(b&&b.r,0,rows-1,-1),c=ni(b&&b.c,0,cols-1,-1);if(w&&h&&r>=0&&c>=0&&r+h<=rows&&c+w<=cols)blocks.push({...b,w,h,r,c,imageId:S(b.imageId)})}
  return{cards,blocks}});
 return{state:{...s,rows,cols,pages,name:S(s.name)||'Binder'},
  images:Object.fromEntries(Object.entries(j.images||{}).filter(([k,v])=>typeof v==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(v))),
  overrides:Object.fromEntries(Object.entries(j.overrides||{}).filter(([k,v])=>v&&/^\d{1,10}$/.test(String(v.tp))).map(([k,v])=>[k,{tp:+v.tp}]))}}
function saveDraft(){if(!D||!DIRTY)return;const o={state:D.state,overrides:OV};try{localStorage.setItem('bs_draft',JSON.stringify({...o,images:usedImgs()}))}catch(e){try{localStorage.setItem('bs_draft',JSON.stringify(o))}catch(_){}}}
function askDraft(){let d=null;try{d=JSON.parse(localStorage.getItem('bs_draft'))}catch(e){}if(!d)return;
 if(confirm('Kaydedilmemiş taslak var, geri yüklensin mi?')){load({...d,images:{...IMG,...(d.images||{})}});DIRTY=true;stats()}else localStorage.removeItem('bs_draft')}
addEventListener('beforeunload',e=>{if(DIRTY){e.preventDefault();e.returnValue=''}});
/* menü */
const mn=$('#mn');$('#bMn').onclick=()=>mn.showModal();$('#bMx').onclick=()=>mn.close();
mn.onclick=e=>{const t=e.target;if(t.id==='mn'||(t.closest('button,label.btn')&&!t.closest('[data-keep]')&&t.id!=='bMx'))mn.close()};
$('#bSch').onclick=()=>openSearch();$('#bMiss').onclick=()=>openMiss();$('#chips').onclick=e=>{if(e.target.closest('[data-miss]'))openMiss()};
$('#bClr').onclick=async()=>{if(!confirm('Önbellek temizlensin mi?'))return;['bs_cache','bs_neg','bs_noi'].forEach(k=>localStorage.removeItem(k));try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}location.reload()};
$('#bAb').onclick=()=>showDlg(`<h3 style="margin:0 0 8px">Hakkında</h3><p>${$('#legal').innerHTML}</p><p class="mu">Son güncelleme: ${new Date(document.lastModified).toLocaleDateString(LANG)}</p><p><button onclick="this.closest('dialog').close()">Kapat</button></p>`);
/* arama */
let SF='all',SS='';
function openSearch(){
 const sets=[...new Set(all().map(c=>c.setName))].sort(),norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('en');
 const d=showDlg(`<input id="sq" placeholder="Kart ara…" autocomplete="off"><p style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${[['all','Hepsi'],['own','Sahip olduklarım'],['miss','Missing'],['noimg','Görseli yok']].map(([k,l])=>`<button data-f="${k}" class="${k===SF?'on':''}">${l}</button>`).join('')}<select id="ss"><option value="">Tüm setler</option>${sets.map(s=>`<option ${s===SS?'selected':''}>${esc(s)}</option>`).join('')}</select></p><div id="sr" class="ml"></div><p><button id="sx">Kapat</button></p>`,'wide');
 const run=()=>{const q=norm($('#sq').value.trim()),out=[];
  D.state.pages.forEach((p,pi)=>{for(const k in p.cards||{}){const c=p.cards[k];
   if((SF==='own'&&isMiss(c))||(SF==='miss'&&!isMiss(c))||(SF==='noimg'&&!FAIL.has(c.id))||(SS&&c.setName!==SS))continue;
   if(q&&!norm(`${c.name} ${c.setName} ${c.number} ${c.id}`).includes(q))continue;out.push({c,pi,k})}});
  $('#sr').innerHTML=out.slice(0,60).map((o,i)=>{const[r,cl]=o.k.split(',').map(Number),u=CA[ck(o.c)];return`<div class="mr" data-i="${i}" tabindex="0" style="cursor:pointer;display:flex;gap:10px;align-items:center">${u?`<img src="${esc(u)}" alt="" height="44" style="border-radius:3px">`:'<span style="width:32px"></span>'}<span><b>${esc(o.c.name)}</b> <span class="mu">${esc(o.c.setName)} · #${esc(o.c.number)}${isMiss(o.c)?' · missing':''}</span><br><small class="mu">Sayfa ${o.pi+1} · satır ${r+1}, sütun ${cl+1}</small></span></div>`}).join('')||'<p class="mu">Sonuç yok.</p>';
  $('#sr').onclick=e=>{const row=e.target.closest('[data-i]');if(!row)return;const o=out[+row.dataset.i];d.close();P=o.pi;render();scrollTo(0,0);const g=V.querySelector(`.grid[data-pg="${o.pi}"] [data-k="${o.k}"]`);g&&g.animate([{boxShadow:'0 0 0 0 #ffcb05'},{boxShadow:'0 0 0 14px #ffcb0500'}],{duration:700,iterations:3})}};
 d.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{SF=b.dataset.f;d.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('on',x===b));run()});
 $('#sq').oninput=run;$('#ss').onchange=e=>{SS=e.target.value;run()};$('#sx').onclick=()=>d.close();run();$('#sq').focus()}
/* görseli olmayanlar */
function openMiss(){
 const seen=new Set,L=all().filter(c=>FAIL.has(c.id)&&!seen.has(c.id)&&seen.add(c.id));
 const d=showDlg(`<h3 style="margin:0 0 8px">⚠️ Görseli olmayanlar (${L.length})</h3><p class="mu" style="margin:0 0 6px">TCGplayer’da kartı bul, ürün linkini ya da ID’sini yapıştır, Enter’a bas.</p><div class="ml">${L.map(c=>`<div class="mr"><div><b>${esc(c.name)}</b> <span class="mu">${esc(c.setName)} · #${esc(c.number)}</span> <a style="color:var(--ac)" target="_blank" rel="noopener noreferrer" href="https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(c.name+' '+c.number)}">TCGplayer’da ara ↗</a></div><div style="display:flex;gap:6px;margin-top:4px"><input placeholder="647110 / tcgplayer.com/product/647110" value="${(OV[c.id]||{}).tp||''}"><button class="pri">Kaydet</button><button data-no>Görselsiz bırak</button></div><small class="mu"></small></div>`).join('')||'<p>✅ Hepsi tamam.</p>'}</div><p class="mu">Değişiklikleri kalıcı yapmak için Menü → JSON indir.</p><p><button id="mx">Kapat</button></p>`,'wide');
 $('#mx').onclick=()=>{d.close();render()};
 d.querySelectorAll('.mr').forEach((row,i)=>{const c=L[i],inp=row.querySelector('input'),msg=row.querySelector('small');
  const save=async()=>{const m=String(inp.value).match(/(\d{4,})/);if(!m){msg.textContent='ID bulunamadı.';return}msg.textContent='Kontrol ediliyor…';
   const u=await first(tpU(+m[1]));if(!u){msg.textContent='❌ Bu ID’de görsel yok.';return}
   OV[c.id]={tp:+m[1]};CA[ck(c)]=u;FAIL.delete(c.id);delete NEG[c.id];DIRTY=true;keep();stats();
   row.innerHTML=`✅ <b>${esc(c.name)}</b> <img src="${esc(u)}" alt="" height="48" style="vertical-align:middle;border-radius:4px">`;const n=d.querySelector('.mr input');n&&n.focus()};
  inp.onkeydown=e=>{if(e.key==='Enter')save()};row.querySelector('.pri').onclick=save;
  row.querySelector('[data-no]').onclick=()=>{NOI[c.id]=1;FAIL.delete(c.id);keep();stats();row.remove()}});
 const f=d.querySelector('.mr input');f&&f.focus()}
/* dil */
let LANG=(()=>{try{const s=localStorage.getItem('bs_lang');if(s)return s}catch(e){}return(navigator.language||'').toLowerCase().startsWith('tr')?'tr':'en'})();
document.documentElement.lang=LANG;
const EN={};`JSON aç§Open JSON
JSON indir§Download JSON
JSON yükle ya da binder.json ekle§Load a JSON or add binder.json
JSON dosyanı buraya bırak ya da§Drop your JSON file here or use
Menü → JSON aç seçeneğini kullan.§Menu → Open JSON.
PDF olarak yazdır§Print as PDF
İpucu: yazdırma penceresinde “Arka plan grafikleri”ni aç, hedef olarak “PDF olarak kaydet”i seç.§Tip: in the print dialog enable “Background graphics” and choose “Save as PDF”.
Sunucudan yenile§Refresh from server
Tüm görselleri tara§Scan all images
Görseli olmayanlar§Cards without image
Kaynak adresi§Source URL
Önbelleği temizle§Clear cache
Önbellek temizlensin mi?§Clear the cache?
Yasal / telif notu§Legal / copyright
Dosya§File
Veri§Data
Ayarlar§Settings
Hakkında§About
Son güncelleme:§Last update:
Kapat§Close
Kaydet§Save
Sayfalar§Pages
Sayfayı sil§Delete page
Düzenle§Edit
Bitti§Done
Geri al§Undo
İleri al§Redo
Kart ara§Search cards
Hepsi§All
Sahip olduklarım§Owned
Görseli yok§No image
Tüm setler§All sets
Sonuç yok.§No results.
satır§row
sütun§column
Sayfa§Page
 sayfa§ pages
 kartta görsel yok → düzelt§ cards have no image → fix
 kart§ cards
özel görsel§custom images
tamamlandı§complete
görsel bulundu§images found
Kaydedilmemiş değişiklik → ⬇ JSON indir§Unsaved changes → ⬇ Download JSON
Kaydedilmemiş taslak var, geri yüklensin mi?§There is an unsaved draft. Restore it?
Kaydedilmemiş değişiklikler var. sunucudaki sürümle değiştirilsin mi?§You have unsaved changes. Replace them with the server version?
Taranıyor§Scanning
Önceki§Previous
Sonraki§Next
Menü§Menu
TCGplayer’da ara§Search on TCGplayer
TCGplayer’da aç§Open on TCGplayer
TCGplayer’da kartı bul, ürün linkini ya da ID’sini yapıştır, Enter’a bas.§Find the card on TCGplayer, paste the product link or ID, press Enter.
TCGplayer ürün ID’si ya da linki (görsel çıkmıyorsa)§TCGplayer product ID or link (if the image is missing)
Değişiklikleri kalıcı yapmak için Menü → JSON indir.§To make changes permanent use Menu → Download JSON.
Görselsiz bırak§Leave without image
Hepsi tamam.§All done.
ID bulunamadı.§ID not found.
Kontrol ediliyor…§Checking…
Bu ID’de görsel yok.§No image for this ID.
Missing’i kaldır§Remove missing
Missing olarak işaretle§Mark as missing
Bu dosya geçerli bir binder JSON’u değil.§This file is not a valid binder JSON.
binder.json bulunamadı. Menü → Kaynak adresi’nden link girebilirsin.§binder.json not found. You can enter a link in Menu → Source URL.
binder.json linki (boş = aynı klasör):§binder.json link (empty = same folder):
Sürükleyip bırakarak sırala (telefonda ⠿ tutamacından tut). PDF de bu sırayla çıkar.§Drag and drop to reorder (on phones use the ⠿ handle). The PDF follows this order.
Yeni sayfa (sona)§New page (at end)
Bu sayfadan sonra yeni sayfa§New page after this one
Sürükle§Drag
silinsin mi?§delete?
kart ve§cards and
görsel de gidecek. Emin misin?§images will be removed too. Sure?
Son sayfa silinemez.§The last page cannot be deleted.
Boş hücre§Empty cell
Kart ekle (TCG kodu)§Add card (TCG code)
TCGdex kodu:§TCGdex code:
Kartı ekle§Add card
Görsel bloğu ekle§Add image block
Görsel bloğu§Image block
Boyut:§Size:
(genişlik × yükseklik)§(width × height)
Resim seç ve ekle§Choose image and add
Resmi değiştir§Change image
Uygula§Apply
Sil§Delete
yeni resim hazır§new image ready
Aranıyor…§Searching…
TCGplayer ID ya da link:§TCGplayer ID or link:
Bulunamadı. TCGplayer ID/link ya da TCGdex kodunu (set-numara) yaz ve dili kontrol et.§Not found. Enter a TCGplayer ID/link or a TCGdex code (set-number) and check the language.
TCGplayer’da bu ID ile görsel bulunamadı. ID’yi kontrol et.§No image found on TCGplayer for this ID. Check the ID.
Bir hata oldu, tekrar dene.§Something went wrong, try again.
Bulunamadı. Kodu set-numara biçiminde yaz ve dili kontrol et.§Not found. Use the set-number format and check the language.
Resim okunamadı.§Could not read the image.
Bu boyut sığmıyor (sayfa dışına taşıyor ya da başka görselle çakışıyor).§This size doesn’t fit (outside the page or overlapping another image).
Kapladığı kartları taşıyacak boş yer yok.§No free slots to move the covered cards.`.split('\n').forEach(l=>{const[a,b]=l.split('§');EN[a]=b});
EN[$('#legal').textContent.trim()]='This is a personal, non-commercial hobby project made to view my own card collection digitally. It is unofficial and is not affiliated with, endorsed by, or sponsored by The Pokémon Company, Nintendo, Creatures Inc., or GAME FREAK. Pokémon, Poké Ball, and all related names, characters, and card images are trademarks and copyrights of their respective owners. Card data and images are loaded externally from TCGdex and other third-party sources (TCGplayer, Pokémon TCG API) and are not hosted on this site. Any custom images on the pages are my own.';
const KEYS=Object.keys(EN).sort((a,b)=>b.length-a.length),tr=s=>{if(LANG!=='en')return s;for(const k of KEYS)if(s.includes(k))s=s.split(k).join(EN[k]);return s};
['alert','confirm','prompt'].forEach(n=>{const f=window[n].bind(window);window[n]=(m,...a)=>f(tr(m),...a)});
function walk(n){if(LANG!=='en')return;if(n.nodeType===3){const v=tr(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;return}
 if(n.nodeType!==1||n.id==='nm'||/^(SCRIPT|STYLE|CODE)$/.test(n.tagName))return;['title','placeholder','aria-label'].forEach(a=>n.hasAttribute(a)&&n.setAttribute(a,tr(n.getAttribute(a))));n.childNodes.forEach(walk)}
walk(document.body);new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(walk))).observe(document.body,{childList:true,subtree:true});
document.querySelectorAll('[data-lang]').forEach(b=>{b.classList.toggle('on',b.dataset.lang===LANG);b.onclick=()=>{try{localStorage.setItem('bs_lang',b.dataset.lang)}catch(e){}location.reload()}});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
loadRemote();
