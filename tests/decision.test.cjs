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
 let rows=[row('A'),row('B',450000)],server=rows[0].slice(),version=1,fail=false,unsupported=false,conflict=false,confirmClose=true;const writes=[],polls=[];
 const property=()=>({id:'A',version:String(version),headers,row:server.slice(),fields:{preco:{label:'Preço (R$)',type:'number',value:server[3]},area:{label:'Área do lote (m²)',type:'number',value:server[4]},link:{label:'Link original',type:'url',value:server[0]},bairro:{label:'Bairro',type:'text',value:server[1]},contato:{label:'Contato do vendedor',type:'text',value:server[8]}},history:[]});
 w.confirm=()=>confirmClose;w.setInterval=fn=>{polls.push(fn);return polls.length;};
 w.fetch=async(url,options={})=>{
   if(String(url).includes('/export?'))return {ok:true,text:async()=>csv(rows)};
   let result;
   if(options.method==='POST'){
     const body=JSON.parse(options.body);writes.push(body);if(fail)throw Error('network');
     if(body.chave!=='test-only')result={ok:false,erro:'chave'};
     else if(body.op==='readProperty')result={ok:true,property:property()};
     else if(body.op==='updateProperty'){
       if(conflict||body.expectedVersion!==String(version)){server[3]=490000;version++;result={ok:false,erro:'conflito',current:property()};conflict=false;}
       else{for(const [k,v] of Object.entries(body.changes)){const index={preco:3,area:4,link:0,bairro:1,contato:8}[k];server[index]=v===null?'':(['preco','area'].includes(k)?w.CatalogoSheets.number(v):v);}version++;result={ok:true,property:property()};}
     }
   }else if(String(url).includes('op=capabilities'))result=unsupported?{notas:[]}:{ok:true,contract:1,propertyEditor:true};
   else if(String(url).includes('op=property'))result={ok:true,property:property()};
   else result={notas:[],comentarios:[],descartes:[]};
   return {ok:true,json:async()=>result};
 };
 for(const f of ['config.js','sheets.js','ghdb.js','catalogo.js','decision.js'])vm.runInContext(fs.readFileSync(__dirname+'/../site/'+f,'utf8'),dom.getInternalVMContext());
 const input=(id,value)=>{const e=d.querySelector(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const submit=selector=>d.querySelector(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const edit=async()=>{await until(()=>d.querySelector('[data-edit="A"]'));d.querySelector('[data-edit="A"]').click();await until(()=>d.querySelector('#editor-password'));input('#editor-password','test-only');submit('#editor-auth');await until(()=>d.querySelector('#property-editor'));};
 return {w,d,writes,polls,input,submit,edit,eval:s=>vm.runInContext(s,dom.getInternalVMContext()),refresh:()=>d.querySelector('#syncbtn').click(),setRows:v=>rows=v,setFail:v=>fail=v,setUnsupported:v=>unsupported=v,setConflict:v=>conflict=v,setConfirm:v=>confirmClose=v,get server(){return server;}};
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
test('backend antigo informa dependência sem enviar escrita ou simular sucesso',async t=>{const a=app(t);a.setUnsupported(true);await until(()=>a.d.querySelector('[data-edit]'));a.d.querySelector('[data-edit]').click();await until(()=>a.d.querySelector('[role="alert"]'));assert.match(a.d.querySelector('[role="alert"]').textContent,/nova implantação/);assert.equal(a.writes.length,0);});
test('editor salva só preço, mantém filtros e usa resposta confirmada enquanto CSV atrasa',async t=>{
 const a=app(t);await a.edit();assert.equal(a.d.querySelector('#editor-save').disabled,true);a.input('#edit-preco','430.000,50');a.submit('#property-editor');await until(()=>!a.d.querySelector('#property-dialog').open);
 const sent=a.writes.find(w=>w.op==='updateProperty');assert.deepEqual(sent.changes,{preco:'430.000,50'});assert.equal(sent.expectedVersion,'1');assert.equal(a.server[3],430000.5);assert.match(a.d.querySelector('.price').textContent,/430.001/);
 a.refresh();await new Promise(r=>setTimeout(r,30));assert.match(a.d.querySelector('.price').textContent,/430.001/);assert.equal(a.w.localStorage.getItem('cat-chave'),null);
});
test('editor mantém formulário durante atualização e pede confirmação ao cancelar',async t=>{
 const a=app(t);await a.edit();a.input('#edit-area','200');a.setRows([row('A',470000),row('B')]);a.refresh();await until(()=>a.d.querySelector('#syncmsg').textContent.includes('feche o editor'));assert.equal(a.d.querySelector('#edit-area').value,'200');
 a.setConfirm(false);a.d.querySelector('#editor-cancel').click();assert.equal(a.d.querySelector('#property-dialog').open,true);a.setConfirm(true);a.d.querySelector('#editor-cancel').click();assert.equal(a.d.querySelector('#property-dialog').open,false);assert.equal(a.writes.filter(w=>w.op==='updateProperty').length,0);
});
test('editor valida número, área negativa e URL antes de enviar; aceita remoção explícita',async t=>{
 const a=app(t);await a.edit();for(const [id,value] of [['preco','abc'],['area','-2'],['link','javascript:x']])a.input('#edit-'+id,value);a.submit('#property-editor');assert.equal(a.d.querySelectorAll('[aria-invalid="true"]').length,3);assert.equal(a.writes.filter(w=>w.op==='updateProperty').length,0);
 a.input('#edit-preco','450000');a.input('#edit-area','250');a.input('#edit-link','https://example.com/A');a.input('#edit-contato','');a.submit('#property-editor');await until(()=>!a.d.querySelector('#property-dialog').open);assert.equal(a.writes.at(-1).changes.contato,null);assert.equal(a.server[8],'');
});
test('conflito exige revisão explícita e usa nova versão ao reaplicar rascunho',async t=>{
 const a=app(t);await a.edit();a.setConflict(true);a.input('#edit-preco','430000');a.submit('#property-editor');await until(()=>a.d.querySelector('#review-conflict'));assert.equal(a.d.querySelector('#editor-save').disabled,true);a.d.querySelector('#review-conflict').click();assert.match(a.d.querySelector('#dialog-content').textContent,/490000/);a.d.querySelector('#reapply').click();a.submit('#property-editor');await until(()=>!a.d.querySelector('#property-dialog').open);assert.equal(a.writes.at(-1).expectedVersion,'2');assert.equal(a.server[3],430000);
});
test('falha de rede não exibe sucesso nem apaga rascunho, e impede envio duplicado',async t=>{
 const a=app(t);await a.edit();a.setFail(true);a.input('#edit-preco','430000');a.submit('#property-editor');a.submit('#property-editor');await until(()=>a.d.querySelector('#editor-status').textContent.includes('Não foi possível confirmar'));assert.equal(a.d.querySelector('#edit-preco').value,'430000');assert.equal(a.writes.filter(w=>w.op==='updateProperty').length,1);assert.equal(a.d.querySelector('#property-dialog').open,true);assert.equal(a.d.querySelector('#editor-save').disabled,true);
});
test('rascunho de comentário sobrevive a filtros e não é atribuído a outra autora',async t=>{
 const a=app(t);await until(()=>a.d.querySelector('.cform'));const ta=a.d.querySelector('.cform[data-id="A"] textarea');ta.value='Rascunho de visita';ta.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.input('#q','Bairro B');a.input('#q','');assert.equal(a.d.querySelector('.cform[data-id="A"] textarea').value,'Rascunho de visita');
});
test('axe: catálogo, detalhes, comparação e editor sem violações automatizáveis em jsdom',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length===2);a.w.HTMLCanvasElement.prototype.getContext=()=>null;a.w.eval(require('axe-core').source);
 const audit=async()=>{const result=await a.w.axe.run(a.d.body,{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));};
 await audit();a.d.querySelector('[data-detail="A"]').click();await audit();a.d.querySelector('#dialog-close').click();
 a.d.querySelector('[data-compare="A"]').click();a.d.querySelector('[data-compare="B"]').click();a.d.querySelector('#open-compare').click();await audit();a.d.querySelector('#dialog-close').click();await a.edit();await audit();
});
