
let DATA=[];
let CATALOG_STATE="loading", CATALOG_ERROR="", CATALOG_LOADED=false, PENDING_DATA=null;
const UFG=[-16.60457,-49.2624];
const LANDMARKS=[["Centro",-16.67487,-49.25818],["Shopping Flamboyant",-16.71051,-49.23634],["Aparecida de Goiânia",-16.7590,-49.2740],["Senador Canedo",-16.7013,-49.0915]];
const $=s=>document.querySelector(s);
const brl=v=>v==null?"Preço não informado":"R$ "+Math.round(v).toLocaleString("pt-BR");
const brlk=v=>"R$ "+Math.round(v/1000)+" mil";
const PB=[300000,400000,500000];
function pcol(p){if(p==null)return "var(--off)";return p<PB[0]?"var(--p1)":p<PB[1]?"var(--p2)":p<PB[2]?"var(--p3)":"var(--p4)";}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function pcolHex(p){const m={"var(--p1)":"--p1","var(--p2)":"--p2","var(--p3)":"--p3","var(--p4)":"--p4","var(--off)":"--off"};return cssVar(m[pcol(p)])}
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const isAlert=d=>d.tags.some(t=>t[0]==="bad");

/* ---------- estado e filtros ---------- */
const PMIN=null,PMAX=null,LMIN=null,LMAX=null;
const DEF={q:"",pmin:PMIN,pmax:PMAX,lmin:LMIN,lmax:LMAX,imob:"",bai:"",pool:"",qmin:"0",sort:"p",noalert:false,onlynat:false,showdisc:false,nmin:"0",grp:"",natmin:"0",jesmin:"0",fin:"",area:"lote"};
let S={...DEF};
let UI_BOUND=false;
try{Object.assign(S,JSON.parse(localStorage.getItem("cat-filtros")||"{}"))}catch(e){}
// Migração das faixas antigas: extremos representavam ausência de limite.
if(!S.version){if(S.pmin===100000)S.pmin=null;if(S.pmax===700000)S.pmax=null;if(S.lmin===0)S.lmin=null;if(S.lmax===600)S.lmax=null;S.version=2}
function save(){try{localStorage.setItem("cat-filtros",JSON.stringify(S))}catch(e){}}
function bindUI(){
  fillSelects();
  for(const key of Object.keys(DEF)){const el=$("#"+key);if(el){if(el.type==="checkbox")el.checked=!!S[key];else el.value=S[key]??""}}
  if(UI_BOUND)return; UI_BOUND=true;
  const up=()=>{
    for(const key of Object.keys(DEF)){const el=$("#"+key);if(!el)continue;S[key]=el.type==="checkbox"?el.checked:["pmin","pmax","lmin","lmax"].includes(key)?CatalogoSheets.number(el.value):el.value}
    save();render();
  };
  for(const key of Object.keys(DEF))$("#"+key)?.addEventListener("input",up);
  $("#reset").addEventListener("click",()=>{S={...DEF,version:2};save();bindUI();render()});
}
const normK=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
function baiNome(b){return (b||"").replace(/\(.*?\)/g,"").replace(/^\s*(bairro|setor)\s+/i,"").replace(/\s+/g," ").trim()||"Sem bairro"}
const baiK=b=>normK(baiNome(b));
function opts(list,all){return `<option value="">${all}</option>`+list.map(([k,n,c])=>`<option value="${esc(k)}">${esc(n)} (${c})</option>`).join("")}
function groupCount(fn){const M=new Map();DATA.forEach(d=>{const n=fn(d),k=normK(n);const g=M.get(k)||{n,c:0,v:{}};g.c++;g.v[n]=(g.v[n]||0)+1;M.set(k,g)});
  return [...M.entries()].map(([k,g])=>[k,Object.entries(g.v).sort((a,b)=>b[1]-a[1])[0][0],g.c]).sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"))}
function fillSelects(){
  const im=groupCount(imobNome), semI=im.filter(x=>x[1]===SEMIMOB), outI=im.filter(x=>x[1]!==SEMIMOB);
  $("#imob").innerHTML=opts(outI.concat(semI),"Todas ("+outI.length+")");
  const bs=groupCount(d=>baiNome(d.b));
  $("#bai").innerHTML=opts(bs,"Todos ("+bs.length+")");
}
function filtered(){
  const q=normK(S.q);
  let a=DATA.filter(d=>{
    if(q&&!normK(d.b+" "+(d.rua||"")+" "+(d.i||"")+" "+d.s+" "+(d.c||"")+" "+d.id+" "+d.cid).includes(q))return false;
    if((S.pmin!=null||S.pmax!=null)&&(d.p==null||(S.pmin!=null&&d.p<S.pmin)||(S.pmax!=null&&d.p>S.pmax)))return false;
    {const area=S.area==="construida"?d.built:d.lot;if((S.lmin!=null||S.lmax!=null)&&(area==null||(S.lmin!=null&&area<S.lmin)||(S.lmax!=null&&area>S.lmax)))return false}
    if(S.fin&&CatalogoSheets.finance(d.fin||d.f)!==S.fin)return false;
    for(const [key,p] of [["natmin","natalie"],["jesmin","jessica"]]){const v=(NOTAS[d.id]||{})[p];if(S[key]==="sem"&&v>0)return false;if(+S[key]>0&&!(v>=+S[key]))return false;}
    if(S.pool==="sim"&&!(d.pool==="sim"||d.pool==="cond"))return false;
    if(S.pool==="prev"&&!d.pool)return false;
    if(S.imob&&normK(imobNome(d))!==S.imob)return false;
    if(S.bai&&baiK(d.b)!==S.bai)return false;
    if(+S.qmin&&!(d.q>=+S.qmin))return false;
    if(S.noalert&&isAlert(d))return false;
    if(S.onlynat&&!(ME==="natalie"&&d.nat)&&!(COMS[d.id]||[]).some(c=>c.pessoa===ME))return false;
    if(!S.showdisc&&isGone(d))return false;
    if(S.nmin&&S.nmin!=="0"){const m=media(d.id),n=nRaters(d.id);
      if(S.nmin==="sem"){if(m!=null)return false}
      else if(S.nmin==="duas"){if(n<2)return false}
      else if(m==null||m<+S.nmin)return false}
    return true});
  const big=1e12;
  const k={nota:d=>-((media(d.id)??-1)*10+nRaters(d.id)),km:d=>d.km??big,p:d=>d.p??big,pd:d=>-(d.p??-big),l:d=>-((S.area==="construida"?d.built:d.lot)??-big),la:d=>(S.area==="construida"?d.built:d.lot)??big,notaa:d=>{const m=media(d.id);return m==null?big:m*10-nRaters(d.id)},r:d=>d.r}[S.sort];
  return a.sort((x,y)=>(k||((d)=>d.r))(x)-(k||((d)=>d.r))(y)||x.r-y.r);
}

/* ---------- resumo ---------- */
function stats(a){
  const ready=DBSTATE==="ready", active=a.filter(d=>!isGone(d));
  const items=[[active.length,"ativos"],[ready?a.filter(d=>nRaters(d.id)>0).length:"—","já avaliados"],[ready?a.filter(d=>nRaters(d.id)===2).length:"—","pelas duas"],[ready?a.filter(d=>nRaters(d.id)===0).length:"—","sem avaliação"],[ready?a.filter(isGone).length:"—","descartados"]];
  $("#stats").innerHTML='<p class="stats-scope">Nos resultados filtrados'+(ready?'':' · avaliações indisponíveis')+'</p>'+items.map(([n,label])=>'<div class="stat"><b>'+n+'</b><span>'+label+'</span></div>').join('');
}

/* ---------- avaliações (db compartilhado) ---------- */
const PESSOAS=["natalie","jessica"], NOMES={natalie:"Natalie",jessica:"Jéssica"};
let DB=null, DBSTATE="loading", NOTAS={}, COMS={}, DESC={};
let ME=PESSOAS[0]; try{ME=localStorage.getItem("cat-pessoa")||ME}catch(e){}
const dataBR=s=>{try{return new Date(s).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}catch(e){return ""}};
const isGone=d=>d.st==="Rejeitado"||!!DESC[d.id];
function notasDe(id){return NOTAS[id]}
function nRaters(id){const n=notasDe(id);return n?PESSOAS.filter(p=>n[p]>0).length:0}
function mediaTxt(id){const m=media(id);if(m==null)return "";const n=nRaters(id);return `<span class="chip dist" title="Média das notas">média ${m.toLocaleString("pt-BR",{maximumFractionDigits:1})}${n<2?" (só "+NOMES[PESSOAS.find(p=>(notasDe(id)||{})[p]>0)]+")":""}</span>`}
function media(id){const n=notasDe(id);if(!n)return null;const v=PESSOAS.map(p=>n[p]).filter(x=>x>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
function starsHTML(id,p){const v=(NOTAS[id]||{})[p]||0;const dis=DBSTATE!=="ready"?" disabled":"";
  return `<div class="srow"><span class="who">${NOMES[p]}</span><span class="stars" role="group" aria-label="Nota da ${NOMES[p]}">${[1,2,3,4,5].map(i=>`<button type="button" class="${i<=v?"on":""}" data-id="${id}" data-p="${p}" data-v="${i}" aria-pressed="${i===v}" aria-label="${i} estrela${i>1?"s":""} para ${NOMES[p]}"${dis}>${i<=v?"★":"☆"}</button>`).join("")}</span>${v&&DBSTATE==="ready"?`<button type="button" class="clr" data-id="${id}" data-p="${p}" data-v="0">limpar</button>`:""}</div>`}
function comsHTML(id){const L=(COMS[id]||[]).slice().sort((a,b)=>a.quando<b.quando?-1:1);
  return L.map(c=>`<div class="com"><div class="meta"><b>${esc(NOMES[c.pessoa]||c.pessoa)}</b><span>${dataBR(c.quando)}</span>${DBSTATE==="ready"?`<button type="button" class="delc" data-k="${esc(c.k)}">apagar</button>`:""}</div>${esc(c.texto)}</div>`).join("")}
function avalHTML(d){
  return `<div class="sw">${PESSOAS.map(p=>starsHTML(d.id,p)).join("")}${mediaTxt(d.id)}</div><details class="comments"><summary>Comentários e conversa (${(COMS[d.id]||[]).length})</summary><div class="coms">${comsHTML(d.id)}</div>
  ${DBSTATE==="ready"?`<form class="cform" data-id="${d.id}"><textarea placeholder="Escreva um comentário…" aria-label="Comentário"></textarea><select aria-label="Quem está comentando">${PESSOAS.map(p=>`<option value="${p}"${p===ME?" selected":""}>${NOMES[p]}</option>`).join("")}</select><button type="submit" class="send">Salvar comentário</button></form>`:`<span class="avalnote">${DBSTATE==="loading"?"Carregando notas…":"Avaliações indisponíveis. A lista de casas continua funcionando; tentaremos reconectar automaticamente."}</span>`}</details>`}
function refreshAval(id){
  document.querySelectorAll(`.aval[data-id="${CSS.escape(id)}"]`).forEach(el=>{
    const sw=el.querySelector(".sw"), cs=el.querySelector(".coms");
    const d=DATA.find(x=>x.id===id);if(!d)return;
    if(sw&&cs){sw.innerHTML=PESSOAS.map(p=>starsHTML(id,p)).join("")+mediaTxt(id);cs.innerHTML=comsHTML(id);const summary=el.querySelector('.comments summary');if(summary)summary.textContent='Comentários e conversa ('+(COMS[id]||[]).length+')'} else el.innerHTML=avalHTML(d)});
}
function typing(){return [...document.querySelectorAll(".cform textarea")].some(t=>t.value.trim()||t===document.activeElement)}
let pendingRender=false;
function softRender(changedIds,structural){
  if(structural){ if(typing()){pendingRender=true; changedIds.forEach(refreshAval);} else render(); }
  else changedIds.forEach(refreshAval);
  stats(filtered());window.dispatchEvent(new Event("ratingschange"));
}
async function initDB(){
  {
    try{ DB=window.GHDB?await window.GHDB():null; }catch(e){console.warn("planilha",e);DB=null}
    if(!DB){DBSTATE="error";render();return}
  }
  DB.collection("notas").onSnapshot(s=>{const ch=new Set();s.docChanges().forEach(c=>{const v=c.doc.data()||{};if(!v.casa)return;NOTAS[v.casa]=NOTAS[v.casa]||{};NOTAS[v.casa][v.pessoa]=c.type==="removed"?0:(v.estrelas||0);ch.add(v.casa)});softRender([...ch],S.sort==="nota"||S.sort==="notaa"||S.grp==="nat"||S.grp==="jes"||(S.nmin&&S.nmin!=="0")||S.natmin!=="0"||S.jesmin!=="0")},e=>console.warn("notas",e));
  DB.collection("comentarios").onSnapshot(s=>{const ch=new Set();s.docChanges().forEach(c=>{const v=c.doc.data()||{};if(!v.casa)return;const L=(COMS[v.casa]||[]).filter(x=>x.k!==c.doc.id);if(c.type!=="removed")L.push({...v,k:c.doc.id});COMS[v.casa]=L;ch.add(v.casa)});softRender([...ch],S.onlynat)},e=>console.warn("comentarios",e));
  DB.collection("descartes").onSnapshot(s=>{const ch=new Set();s.docChanges().forEach(c=>{const v=c.doc.data()||{};if(c.type==="removed")delete DESC[c.doc.id];else DESC[c.doc.id]=v;ch.add(c.doc.id)});softRender([...ch],true)},e=>console.warn("descartes",e));
  DB.onStatus(state=>{const next=state.ready?"ready":"error";if(next!==DBSTATE){DBSTATE=next;softRender([],true)}});
}
function dbFail(e,el){const m=e&&e.code==="chave"?"Senha do painel incorreta. Tente de novo; ela é pedida outra vez.":e&&e.code==="invalid_argument"?"Você não tem permissão para salvar aqui. Peça para a Natalie te dar acesso de Contribuidora.":"Não deu para salvar agora. Tente de novo em alguns segundos.";if(el){let n=el.querySelector(".avalnote.err");if(!n){n=document.createElement("span");n.className="avalnote err";el.appendChild(n)}n.textContent=m}}
document.addEventListener("click",async e=>{
  const st=e.target.closest(".stars button,.srow .clr");
  if(st&&DB){const {id,p,v}=st.dataset;const old=(NOTAS[id]||{})[p]||0;const nv=(+v===old)?0:+v;
    NOTAS[id]={...(NOTAS[id]||{}),[p]:nv};refreshAval(id);
    try{const ref=DB.collection("notas").doc(id+"__"+p); if(nv) await ref.set({casa:id,pessoa:p,estrelas:nv,quando:new Date().toISOString()}); else await ref.delete()}catch(err){NOTAS[id][p]=old;refreshAval(id);dbFail(err,st.closest(".aval"))}
    return}
  const dl=e.target.closest(".com .meta button.delc");
  if(dl&&DB){ if(!dl.classList.contains("sure")){dl.classList.add("sure");dl.textContent="confirmar?";setTimeout(()=>{dl.classList.remove("sure");dl.textContent="apagar"},4000);return}
    try{await DB.collection("comentarios").doc(dl.dataset.k).delete()}catch(err){dbFail(err,dl.closest(".aval"))} return}
  const ds=e.target.closest("button.disc");
  if(ds&&DB){const id=ds.dataset.id;
    if(DESC[id]){try{await DB.collection("descartes").doc(id).delete()}catch(err){dbFail(err,ds.parentNode)} return}
    if(!ds.classList.contains("sure")){ds.classList.add("sure");ds.textContent="Confirmar descarte";setTimeout(()=>{ds.classList.remove("sure");ds.textContent="Descartar esta casa"},4000);return}
    try{await DB.collection("descartes").doc(id).set({casa:id,pessoa:ME,quando:new Date().toISOString()})}catch(err){dbFail(err,ds.parentNode)}
    return}
});
document.addEventListener("change",e=>{const s=e.target.closest(".cform select");if(s){ME=s.value;try{localStorage.setItem("cat-pessoa",ME)}catch(x){}}});
document.addEventListener("submit",async e=>{
  const f=e.target.closest(".cform"); if(!f)return; e.preventDefault(); if(!DB)return;
  const ta=f.querySelector("textarea"), txt=ta.value.trim(); if(!txt)return;
  const p=f.querySelector("select").value; const btn=f.querySelector(".send"); btn.disabled=true;
  try{await DB.collection("comentarios").add({casa:f.dataset.id,pessoa:p,texto:txt.slice(0,2000),quando:new Date().toISOString()}); ta.value=""; COMMENT_DRAFTS.delete(f.dataset.id); document.querySelectorAll(`.cform[data-id="${CSS.escape(f.dataset.id)}"] textarea`).forEach(t=>t.value=""); ta.blur(); if(pendingRender){pendingRender=false;render()}}
  catch(err){dbFail(err,f.closest(".aval"))} finally{btn.disabled=false}
});
document.addEventListener("focusout",()=>{setTimeout(()=>{if(pendingRender&&!typing()){pendingRender=false;render()}},300)});

const SEMIMOB="Sem imobiliária informada (dono ou não identificado)";
function imobNome(d){let s=(d.i||"").replace(/\(.*?\)/g,"").replace(/\bCRECI\b.*$/i,"").replace(/\bLtda\.?/gi,"").replace(/\s+/g," ").trim().replace(/[-–·,]+$/,"").trim();return s||SEMIMOB}

/* ---------- cards ---------- */
function imgHTML(d){
  const src=d.img[0];
  return `<button type="button" class="ph" data-i="0" aria-label="${d.img.length>1?"Próxima foto":"Abrir anúncio"}: ${esc(d.b)}" title="${d.img.length>1?"Clique para ver a próxima foto":"Abrir anúncio"}">${src?`<img loading="lazy" alt="Foto do anúncio: ${esc(d.b)}" src="${esc(src)}">`:`<div class="noimg">Sem foto disponível</div>`}<span class="row">linha ${d.r}</span>${d.img.length>1?`<span class="nph">1/${d.img.length}</span>`:""}</button>`;
}
document.addEventListener("error",e=>{
  const im=e.target, ph=im.closest?.(".ph"); if(!ph||im.tagName!=="IMG")return;
  const d=DATA.find(x=>x.r==ph.closest(".card")?.dataset.r);if(!d)return;
  const next=+ph.dataset.i+1;
  if(next<d.img.length){ph.dataset.i=next;im.src=d.img[next];const n=ph.querySelector(".nph");if(n)n.textContent=(next+1)+"/"+d.img.length}
  else {im.remove();const no=document.createElement("div");no.className="noimg";no.textContent="Foto indisponível";ph.prepend(no)}
},true);
function card(d){
  const facts=[];
  if(d.q!=null)facts.push(`<span><span class="k">quartos</span> ${d.q}</span>`);
  if(d.l!=null)facts.push(`<span${d.lc?' title="Lote não informado; esta é a área construída/do anúncio"':""}><span class="k">${d.lc?"área":"lote"}</span> ${String(d.l).replace(".",",")} m²${d.lc?"*":""}</span>`);
  
  
  if(d.built!=null&&!d.lc)facts.push(`<span><span class="k">construída</span> ${d.built.toLocaleString("pt-BR")} m²</span>`);
  const chips=[];
  {const n=imobNome(d);chips.push(`<span class="chip imob" title="Imobiliária / anunciante: ${esc(d.i||"não informado")}">${esc(n===SEMIMOB?"Sem imobiliária":n)}</span>`)}
  if(d.km!=null)chips.push(`<span class="chip dist" title="Distância em linha reta até o Campus Samambaia">${d.km.toLocaleString("pt-BR")} km da UFG · linha reta</span>`);
  if(d.cid&&d.cid!=="Goiânia")chips.push(`<span class="chip">${esc(d.cid)}</span>`);
  d.tags.forEach(t=>chips.push(`<span class="chip ${t[0]}">${esc(t[1])}</span>`));
  if(d.st&&d.st!=="Em avaliação")chips.push(`<span class="chip bad">${esc(d.st)}</span>`);
  const com=(d.com||"").replace(/Comentário da Natalie:\s*[“"][^”"]+[”"]\.?\s*/,"");
  const off=d.tags.some(t=>t[0]==="off");
  return `<article class="card${off?" off":""}${isGone(d)?" gone":""}" id="c${d.r}" data-r="${d.r}">
  ${imgHTML(d)}
  <div class="body">
    <div class="price"><span class="dot" style="background:${pcol(d.p)}"></span>${brl(d.p)}</div>
    <div><div class="bairro">${esc(d.b)}</div><div class="rua">${esc(d.cid||"Cidade não informada")}</div></div>
    ${facts.length?`<div class="facts">${facts.join("")}</div>`:""}
    ${chips.length?`<div class="chips">${chips.join("")}</div>`:""}
    
    <div class="aval" data-id="${d.id}">${avalHTML(d)}</div>
    <div class="card-actions"><button type="button" data-detail="${d.id}">Ver detalhes</button><button type="button" data-sheet-edit="${d.id}">Editar na planilha</button><button type="button" data-compare="${d.id}" aria-pressed="false">Comparar</button></div>
    <div class="foot"><a class="go" href="${esc(d.u)}" target="_blank" rel="noopener">Abrir anúncio</a><span class="src">${esc(d.s)} · <span class="idtag">${esc(d.id)}</span></span></div>
    ${d.st!=="Rejeitado"?`<div class="foot"><button type="button" class="disc" data-id="${d.id}">${DESC[d.id]?"Voltar para a lista":"Descartar esta casa"}</button>${DESC[d.id]?`<span class="avalnote">descartada por ${esc(NOMES[DESC[d.id].pessoa]||"alguém")} em ${dataBR(DESC[d.id].quando)}</span>`:""}</div>`:""}
  </div></article>`;
}
function renderList(a){
  if(!CATALOG_LOADED){$("#list").innerHTML=`<div class="empty">${CATALOG_STATE==="error"?"Não foi possível carregar as casas. Use Atualizar agora para tentar novamente.":"Carregando imóveis da planilha…"}</div>`;$("#count").textContent="";return}
  if(!a.length){$("#list").innerHTML=`<div class="grid"><div class="empty">${DATA.length?"Nenhuma casa com esses filtros. Tente ampliar a faixa de preço ou limpar os filtros.":"A planilha ainda não tem imóveis cadastrados."}</div></div>`}
  else if(S.grp){
    const FX=(v,lim,un,fmt)=>{if(v==null||!(v>0))return [1e9,"Sem "+un+" informado"];for(let i=0;i<lim.length;i++)if(v<lim[i])return [i,i===0?"Até "+fmt(lim[0]):fmt(lim[i-1])+" a "+fmt(lim[i])];return [lim.length,"Acima de "+fmt(lim[lim.length-1])]};
    const PL=[250000,300000,350000,400000,450000,500000,550000,600000], TL=[150,200,250,300,400,600];
    const key={imob:d=>{const n=imobNome(d);return [normK(n),n,n===SEMIMOB?1:0]},
      bai:d=>{const n=baiNome(d.b);return [normK(n),n,0]},
      preco:d=>{const [o,n]=FX(d.p,PL,"preço",v=>brlk(v));return [String(o),n,o]},
      nat:d=>{const e=(notasDe(d.id)||{}).natalie||0;return [String(e),e?"★".repeat(e)+"☆".repeat(5-e)+" · Natalie deu "+e+(e>1?" estrelas":" estrela"):"Natalie ainda não deu nota",e?5-e:9]},
      jes:d=>{const e=(notasDe(d.id)||{}).jessica||0;return [String(e),e?"★".repeat(e)+"☆".repeat(5-e)+" · Jéssica deu "+e+(e>1?" estrelas":" estrela"):"Jéssica ainda não deu nota",e?5-e:9]},
      tam:d=>{const [o,n]=FX(S.area==="construida"?d.built:d.lot,TL,"tamanho",v=>v+" m²");return [String(o),n,o]}}[S.grp]||(d=>["","",0]);
    const G=new Map(); a.forEach(d=>{const [k,n,o]=key(d); if(!G.has(k))G.set(k,{n,o,l:[]}); G.get(k).l.push(d)});
    const ordered=["preco","tam","nat","jes"].includes(S.grp);
    const gs=[...G.values()].sort((x,y)=>ordered?x.o-y.o:(x.o-y.o||y.l.length-x.l.length||x.n.localeCompare(y.n,"pt-BR")));
    $("#list").innerHTML=gs.map(g=>{const ms=g.l.map(d=>media(d.id)).filter(v=>v!=null);const m=ms.length?(ms.reduce((p,c)=>p+c,0)/ms.length).toLocaleString("pt-BR",{maximumFractionDigits:1}):null;
      const ps=g.l.map(d=>d.p).filter(v=>v>0).sort((x,y)=>x-y), pm=ps.length&&S.grp!=="preco"?" · preço mediano "+brlk(ps[Math.floor(ps.length/2)]):"";
      return `<section class="grp"><h2>${esc(g.n)} <small>${g.l.length} casa${g.l.length>1?"s":""}${pm}${m?` · média ${m}`:""}</small></h2><div class="grid">${g.l.map(card).join("")}</div></section>`}).join("");
  } else $("#list").innerHTML=`<div class="grid">${a.map(card).join("")}</div>`;
  $("#count").textContent=`${a.length} de ${DATA.length} imóveis no catálogo`;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("button.loc");
  if(b){highlight(+b.dataset.r);return}
  const ph=e.target.closest(".ph");
  if(ph){const d=DATA.find(x=>x.r==ph.closest(".card").dataset.r);
    if(d&&d.img.length>1){const i=(+ph.dataset.i+1)%d.img.length;ph.dataset.i=i;const im=ph.querySelector("img");if(im)im.src=d.img[i];const n=ph.querySelector(".nph");if(n)n.textContent=(i+1)+"/"+d.img.length}
    else if(d) window.open(d.u,"_blank","noopener");}
});
function highlight(r){
  document.querySelectorAll(".card.hl").forEach(c=>c.classList.remove("hl"));
  const c=document.getElementById("c"+r); if(c){c.classList.add("hl");c.scrollIntoView({behavior:"smooth",block:"nearest"})}
}

/* ---------- render ---------- */
const COMMENT_DRAFTS=new Map();
document.addEventListener('input',e=>{const f=e.target.closest('.cform');if(f&&e.target.tagName==='TEXTAREA')COMMENT_DRAFTS.set(f.dataset.id,{text:e.target.value,person:f.querySelector('select').value});});
function render(){
  document.querySelectorAll('#list .cform').forEach(f=>{const t=f.querySelector('textarea');if(t.value)COMMENT_DRAFTS.set(f.dataset.id,{text:t.value,person:f.querySelector('select').value});});
  const a=filtered(); stats(a); renderList(a);
  document.querySelectorAll('#list .cform').forEach(f=>{const draft=COMMENT_DRAFTS.get(f.dataset.id);if(draft?.text){f.querySelector('textarea').value=draft.text;f.querySelector('select').value=draft.person;f.closest('details').open=true;}});
  window.dispatchEvent(new Event("catalogrender"));
}

function applyHouses(result){
  if(CATALOG_LOADED&&JSON.stringify(DATA)===JSON.stringify(result.data))return;
  const before=JSON.stringify(DATA); DATA=result.data;CATALOG_LOADED=true;
  if(before!==JSON.stringify(DATA)){fillSelects();$("#imob").value=S.imob;$("#bai").value=S.bai;}
  render();
  $("#note").textContent="Distâncias em linha reta até o Campus Samambaia da UFG. Localizações podem ser aproximadas. Fotos dos anúncios; clique para ver a próxima. Tamanho com * indica área construída ou do anúncio.";
}
let refreshing=false,refreshTimer=null,lastUpdated=null,lastWarnings=[];
function catalogMessage(){
  const msg=$("#syncmsg");msg.classList.toggle("err",CATALOG_STATE==="error");
  if(CATALOG_STATE==="error")msg.textContent=(CATALOG_LOADED?"Não foi possível atualizar; exibindo a última leitura de "+lastUpdated.toLocaleTimeString("pt-BR")+". ":"Não foi possível carregar a planilha. ")+CATALOG_ERROR;
  else if(PENDING_DATA)msg.textContent="Há atualizações na planilha. Termine seu comentário para atualizar a lista.";
  else if(lastUpdated)msg.textContent="Planilha consultada às "+lastUpdated.toLocaleTimeString("pt-BR")+". "+(lastWarnings.length?lastWarnings.join(" "):"Atualização automática ativada.");
}
async function refreshHouses(){
  if(refreshing)return;
  clearTimeout(refreshTimer);refreshing=true;$("#syncbtn").disabled=true;
  try{
    const c=window.CATALOGO_CONFIG||{};
    const rows=await CatalogoSheets.read(c,c.imoveisGid,AbortSignal.timeout(25000));
    const result=CatalogoSheets.houses(rows);CATALOG_STATE="ready";lastUpdated=new Date();lastWarnings=result.warnings;
    if(typing()&&CATALOG_LOADED&&JSON.stringify(DATA)!==JSON.stringify(result.data))PENDING_DATA=result;
    else {PENDING_DATA=null;applyHouses(result)}
  }catch(e){CATALOG_STATE="error";CATALOG_ERROR=e.message;console.warn("imóveis",e);if(!CATALOG_LOADED)render()}
  finally{refreshing=false;$("#syncbtn").disabled=false;catalogMessage();refreshTimer=setTimeout(()=>{if(!document.hidden)refreshHouses();else refreshTimer=null},Math.max(10,window.CATALOGO_CONFIG?.atualizarSegundos||20)*1000)}
}
document.addEventListener("focusout",()=>{setTimeout(()=>{if(PENDING_DATA&&!typing()){const result=PENDING_DATA;PENDING_DATA=null;applyHouses(result);catalogMessage()}},350)});
$("#syncbtn").addEventListener("click",()=>refreshHouses());
$("#sheetlink").href="https://docs.google.com/spreadsheets/d/"+window.CATALOGO_CONFIG.spreadsheetId+"/edit";
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshHouses()});
bindUI();render();refreshHouses();initDB();
