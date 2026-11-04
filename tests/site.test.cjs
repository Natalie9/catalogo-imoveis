const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const headers=['Link original','Bairro','Rua / endereço aproximado','Preço (R$)','Área do lote (m²)','Quartos','Quintal','Financia?','Contato do vendedor','Imobiliária','Comentários','Status','ID do anúncio',...Array(4).fill(''), 'Latitude','Longitude','Distância UFG (km)','Precisão da localização','Cidade','Fotos','Fora do ar','Piscina','Tipo de área'];
const row=(id,price=340000)=>['https://example.com/'+id,'Floresta','',price,220,3,'Grande','Sim','','Imob','','Em avaliação',id,'','','','','-16,59','-49,33','8,2','bairro','Goiânia','https://example.com/foto.jpg','Não','',''];
const csv=rows=>[headers,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5))}throw Error('Condição não alcançada')};
function app(t){
 const root=path.join(__dirname,'../site'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://example.com/',runScripts:'outside-only',pretendToBeVisual:true});t.after(()=>dom.window.close());
 const w=dom.window;w.CSS={escape:s=>s};w.AbortSignal=AbortSignal;w.console.warn=()=>{};
 let rows=[row('TEST-1')],fail=false,apiFail=false;const polls=[];
 w.setInterval=fn=>{polls.push(fn);return polls.length};
 w.fetch=async u=>{if(String(u).includes('/export?')){if(fail)throw Error('Sem rede');return {ok:true,text:async()=>csv(rows)}}if(apiFail)throw Error('API indisponível');return {ok:true,json:async()=>({notas:[],comentarios:[],descartes:[]})}};
 for(const f of ['config.js','sheets.js','ghdb.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 for(const f of ['catalogo.js','decision.js'])require('node:vm').runInContext(fs.readFileSync(path.join(root,f),'utf8'),dom.getInternalVMContext());
 return {w,dom,polls,setRows:r=>rows=r,setFailure:v=>fail=v,setApiFailure:v=>apiFail=v,refresh:()=>w.document.querySelector('#syncbtn').click()};
}
test('site lê e reflete inclusão, edição e exclusão na planilha sem build',async t=>{
 const a=app(t),d=a.w.document;await until(()=>d.querySelectorAll('.card').length===1);
 a.setRows([row('TEST-1',399000),row('TEST-2')]);a.refresh();await until(()=>d.querySelectorAll('.card').length===2);assert.match(d.querySelector('.price').textContent,/340.000/);
 a.setRows([row('TEST-1',399000)]);a.refresh();await until(()=>d.querySelectorAll('.card').length===1);assert.match(d.querySelector('.price').textContent,/399.000/);
 a.setRows([]);a.refresh();await until(()=>d.querySelectorAll('.card').length===0);assert.match(d.querySelector('#list').textContent,/ainda não tem imóveis/);
});
test('falha de rede preserva a leitura anterior e permite tentar novamente',async t=>{
 const a=app(t),d=a.w.document;await until(()=>d.querySelector('.card'));a.setFailure(true);a.refresh();await until(()=>d.querySelector('#syncmsg').classList.contains('err'));assert.equal(d.querySelectorAll('.card').length,1);
 a.setFailure(false);a.setRows([row('TEST-2')]);a.refresh();await until(()=>d.querySelector('.idtag')?.textContent==='TEST-2');assert.ok(!d.querySelector('#syncmsg').classList.contains('err'));
});
test('atualizações não apagam comentário em edição e conservam filtros',async t=>{
 const a=app(t),d=a.w.document;await until(()=>d.querySelector('.cform textarea'));
 const textarea=d.querySelector('textarea');textarea.value='rascunho';textarea.focus();
 a.setRows([row('TEST-1',390000)]);a.refresh();await until(()=>d.querySelector('#syncmsg').textContent.includes('Termine seu comentário'));assert.equal(d.querySelector('textarea').value,'rascunho');
 textarea.value='';textarea.blur();await until(()=>d.querySelector('.price').textContent.includes('390.000'));
 const query=d.querySelector('#q');query.value='Floresta';query.dispatchEvent(new a.w.Event('input'));a.setRows([row('TEST-2')]);a.refresh();await until(()=>d.querySelector('.idtag')?.textContent==='TEST-2');assert.equal(d.querySelector('#q').value,'Floresta');
});
test('avaliações se recuperam de falha inicial sem impedir os imóveis',async t=>{
 const a=app(t),d=a.w.document;a.setApiFailure(true);
 // A consulta inicial já pode estar em andamento; força um ciclo com falha.
 await until(()=>a.polls.length);a.polls[0]();await until(()=>d.querySelector('.avalnote')?.textContent.includes('indisponíveis'));
 assert.equal(d.querySelectorAll('.card').length,1);a.setApiFailure(false);a.polls[0]();await until(()=>d.querySelector('.cform'));
});
