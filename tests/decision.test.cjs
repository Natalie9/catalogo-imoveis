const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),{HEADERS,EXTRA}=require('../site/sheets.js');
const headers=[...HEADERS,'N','O','P','Q',...EXTRA];
const row=(id,p=420000)=>['https://example.com/'+id,'Bairro '+id,'Rua',p,250,3,'Sim','Sim','Contato','Imob','Observações','Em avaliação',id,'','','','',-16.6,-49.3,5,'bairro','Goiânia','','Não','não','lote'];
const csv=rows=>[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Condição não alcançada');};
function app(t){
 const dom=new JSDOM(fs.readFileSync(__dirname+'/../site/index.html','utf8'),{url:'https://example.com',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;t.after(()=>w.close());
 w.CSS={escape:s=>s};w.AbortSignal=AbortSignal;w.confirm=()=>true;w.console.warn=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let rows=[row('A'),row('B',450000)];const polls=[];
 w.setInterval=fn=>{polls.push(fn);return polls.length;};
 w.fetch=async url=>String(url).includes('/export?')?{ok:true,text:async()=>csv(rows)}:{ok:true,json:async()=>({notas:[],comentarios:[],descartes:[]})};
 for(const f of ['config.js','sheets.js','ghdb.js','catalogo.js','decision.js'])vm.runInContext(fs.readFileSync(__dirname+'/../site/'+f,'utf8'),dom.getInternalVMContext());
 const input=(id,value)=>{const e=d.querySelector(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {w,d,polls,input,eval:s=>vm.runInContext(s,dom.getInternalVMContext()),refresh:()=>d.querySelector('#syncbtn').click(),setRows:v=>rows=v};
}
test('filtro de preço exclui desconhecidos quando há faixa e aceita valores além dos antigos limites',async t=>{
 const a=app(t);a.setRows([row('A',''),row('B',900000),row('C',50000)]);a.refresh();await until(()=>a.d.querySelectorAll('.card').length===3);
 a.input('#pmin','800.000');assert.equal(a.d.querySelectorAll('.card').length,1);assert.equal(a.d.querySelector('.idtag').textContent,'B');
 a.input('#pmin','');a.input('#pmax','100.000');assert.equal(a.d.querySelector('.idtag').textContent,'C');a.d.querySelector('#reset').click();assert.equal(a.d.querySelectorAll('.card').length,3);
});
test('lote e área construída não se misturam no filtro',async t=>{
 const a=app(t),r=row('A');r[25]='construída';a.setRows([r,row('B')]);a.refresh();await until(()=>a.d.querySelectorAll('.card').length===2);a.input('#lmin','200');assert.equal(a.d.querySelector('.idtag').textContent,'B');a.input('#area','construida');assert.equal(a.d.querySelector('.idtag').textContent,'A');
});
test('comentário meu respeita autora, filtros individuais e estatísticas reagem às notas',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length===2);a.eval("COMS={A:[{pessoa:'jessica',texto:'texto'}],B:[{pessoa:'natalie',texto:'texto'}]};NOTAS={A:{jessica:5},B:{natalie:4,jessica:3}};ME='natalie';S.onlynat=true;render()");assert.equal(a.d.querySelector('.idtag').textContent,'B');assert.match(a.d.querySelector('#stats').textContent,/1pelas duas/);a.eval("S.onlynat=false;S.natmin='sem';render()");assert.equal(a.d.querySelector('.idtag').textContent,'A');
});
test('detalhes escapam conteúdo inseguro e mantêm ausentes explícitos',async t=>{
 const a=app(t),r=row('A');r[10]='<img src=x onerror=alert(1)>';r[21]='';a.setRows([r]);a.refresh();await until(()=>a.d.querySelector('.card'));a.d.querySelector('[data-detail]').click();assert.equal(a.d.querySelector('#property-dialog').open,true);assert.match(a.d.querySelector('#dialog-content').textContent,/<img src=x/);assert.equal(a.d.querySelector('#dialog-content [onerror]'),null);assert.match(a.d.querySelector('#dialog-content').textContent,/Não informado/);a.d.querySelector('#dialog-close').click();assert.equal(a.d.querySelector('#property-dialog').open,false);
});
test('comparação permite 2–4 sem duplicar, calcula diferenças e atualiza após polling',async t=>{
 const a=app(t);a.setRows(['A','B','C','D','E'].map((id,i)=>row(id,400000+i*10000)));a.refresh();await until(()=>a.d.querySelectorAll('.card').length===5);
 for(const id of ['A','B','C','D','E'])a.d.querySelector('.card [data-compare="'+id+'"]').click();assert.match(a.d.querySelector('#compare-bar').textContent,/4 de 4/);assert.match(a.d.querySelector('#decision-message').textContent,/no máximo/);
 a.d.querySelector('#open-compare').click();assert.equal(a.d.querySelectorAll('.comparison thead th').length,5);assert.match(a.d.querySelector('.comparison').textContent,/\+10.000 reais \(\+2,5%\)/);
 a.setRows([row('A',500000),row('B',600000)]);a.refresh();await until(()=>a.d.querySelectorAll('.comparison thead th').length===3);assert.match(a.d.querySelector('.comparison').textContent,/\+100.000 reais \(\+20%\)/);
});
test('editar abre a linha da casa na planilha, sem formulário no site',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length===2);const link=[...a.d.querySelectorAll('.card a')].find(x=>x.textContent==='Editar na planilha');assert.match(link.href,/gid=2136363186&range=A2$/);assert.equal(a.d.querySelector('[data-edit]'),null);
});
test('rascunho de comentário sobrevive a filtros e não é atribuído a outra autora',async t=>{
 const a=app(t);await until(()=>a.d.querySelector('.cform'));const ta=a.d.querySelector('.cform[data-id="A"] textarea');ta.value='Rascunho de visita';ta.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.input('#q','Bairro B');a.input('#q','');assert.equal(a.d.querySelector('.cform[data-id="A"] textarea').value,'Rascunho de visita');
});
test('axe: catálogo, detalhes, comparação sem violações automatizáveis em jsdom',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length===2);a.w.HTMLCanvasElement.prototype.getContext=()=>null;a.w.eval(require('axe-core').source);
 const audit=async()=>{const result=await a.w.axe.run(a.d.body,{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));};
 await audit();a.d.querySelector('[data-detail="A"]').click();await audit();a.d.querySelector('#dialog-close').click();
 a.d.querySelector('[data-compare="A"]').click();a.d.querySelector('[data-compare="B"]').click();a.d.querySelector('#open-compare').click();await audit();a.d.querySelector('#dialog-close').click();
});
