const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),{HEADERS,EXTRA,locate}=require('../site/sheets.js');
const headers=[...HEADERS,'N','O','P','Q',...EXTRA];
const row=(id,p=420000)=>['https://example.com/'+id,'Bairro '+id,'Rua',p,250,3,'Sim','Sim','Contato','Imob','Observações','Em avaliação',id,'','','','',-16.6,-49.3,5,'bairro','Goiânia','','Não','não','lote'];
const csv=rows=>[headers,...rows].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Condição não alcançada');};
function app(t){
 const dom=new JSDOM(fs.readFileSync(__dirname+'/../site/index.html','utf8'),{url:'https://example.com',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;t.after(()=>w.close());
 w.CSS={escape:s=>s};w.AbortSignal=AbortSignal;w.confirm=()=>true;w.console.warn=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let rows=[row('A'),row('B',450000)],fail=false;const polls=[],opened=[];
 w.open=()=>{const popup={opener:'original',closed:false,url:null,location:{replace:url=>popup.url=url},close:()=>popup.closed=true};opened.push(popup);return popup;};
 w.setInterval=fn=>{polls.push(fn);return polls.length;};
 const posts=[];w.prompt=()=>{throw Error('senha pedida');};
 w.fetch=async(url,options={})=>{if(options.method==='POST'){posts.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true})};}if(String(url).includes('/export?')){if(fail)throw Error('Sem conexão');return {ok:true,text:async()=>csv(rows)};}return {ok:true,json:async()=>({notas:[],comentarios:[],descartes:[]})};};
 for(const f of ['config.js','sheets.js','ghdb.js','catalogo.js','decision.js'])vm.runInContext(fs.readFileSync(__dirname+'/../site/'+f,'utf8'),dom.getInternalVMContext());
 const input=(id,value)=>{const e=d.querySelector(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {w,d,polls,posts,opened,input,eval:s=>vm.runInContext(s,dom.getInternalVMContext()),refresh:()=>d.querySelector('#syncbtn').click(),setRows:v=>rows=v,setFailure:v=>fail=v};
}
test('filtro de preço exclui desconhecidos quando há faixa e aceita valores além dos antigos limites',async t=>{
 const a=app(t);a.setRows([row('A',''),row('B',900000),row('C',50000)]);a.refresh();await until(()=>a.d.querySelectorAll('.card').length===3);
 a.input('#pmin','800.000');assert.equal(a.d.querySelectorAll('.card').length,1);assert.equal(a.d.querySelector('.idtag').textContent,'B');
 a.input('#pmin','');a.input('#pmax','100.000');assert.equal(a.d.querySelector('.idtag').textContent,'C');a.d.querySelector('#reset').click();assert.equal(a.d.querySelectorAll('.card').length,3);
});
test('lote e área construída não se misturam no filtro',async t=>{
 const a=app(t),r=row('A');r[25]='construída';a.setRows([r,row('B')]);a.refresh();await until(()=>a.d.querySelectorAll('.card').length===2);a.input('#lmin','200');assert.equal(a.d.querySelector('.idtag').textContent,'B');a.d.querySelector('#area input[value=construida]').click();assert.equal(a.d.querySelector('.idtag').textContent,'A');
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
test('editar localiza o ID após reordenação, inclusive com detalhes antigos abertos',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length===2);a.d.querySelector('[data-detail="A"]').click();a.setRows([row('B'),row('A')]);
 a.d.querySelector('#dialog-content [data-sheet-edit="A"]').click();await until(()=>a.opened[0]?.url);
 assert.match(a.opened[0].url,/gid=2136363186&range=M3$/);assert.equal(a.opened[0].opener,null);assert.equal(a.d.querySelector('[data-edit]'),null);assert.equal(a.eval('DATA.find(d=>d.id==="A").r'),2);
});
test('ID ausente ou duplicado bloqueia a abertura, mesmo se a linha duplicada for inválida',async t=>{
 for(const duplicate of [false,true]){const a=app(t);await until(()=>a.d.querySelector('[data-sheet-edit="A"]'));const invalid=row('A');invalid[0]='';a.setRows(duplicate?[row('A'),invalid]:[row('B')]);a.d.querySelector('[data-sheet-edit="A"]').click();await until(()=>a.opened[0]?.closed);assert.equal(a.opened[0].url,null);assert.match(a.d.querySelector('#decision-message').textContent,duplicate?/ID duplicado/:/não está mais/);}
});
test('falha de consulta não usa a linha antiga e permite tentar novamente',async t=>{
 const a=app(t);await until(()=>a.d.querySelector('[data-sheet-edit="A"]'));a.setFailure(true);a.d.querySelector('[data-sheet-edit="A"]').click();await until(()=>a.opened[0]?.closed);assert.equal(a.opened[0].url,null);assert.equal(a.d.querySelector('[data-sheet-edit="A"]').disabled,false);
 a.setFailure(false);a.setRows([row('B'),row('A')]);a.d.querySelector('[data-sheet-edit="A"]').click();await until(()=>a.opened[1]?.url);assert.match(a.opened[1].url,/range=M3$/);
});
test('nova guia bloqueada tem feedback e cliques simultâneos não abrem guias duplicadas',async t=>{
 const a=app(t);await until(()=>a.d.querySelector('[data-sheet-edit="A"]'));const open=a.w.open;a.w.open=()=>null;a.d.querySelector('[data-sheet-edit="A"]').click();assert.match(a.d.querySelector('#decision-message').textContent,/Permita abrir/);a.w.open=open;
 const button=a.d.querySelector('[data-sheet-edit="A"]');button.dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));button.dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));await until(()=>a.opened[0]?.url);assert.equal(a.opened.length,1);
});
test('localização encontra a coluna por cabeçalho e rejeita cabeçalhos ambíguos',()=>{
 assert.deepEqual(locate([['Bairro','ID do anúncio'],['X','A']],'A'),{row:2,cell:'B2'});
 assert.deepEqual(locate([[...Array(27).fill(''),'ID do anúncio'],[...Array(27).fill(''),'A']],'A'),{row:2,cell:'AB2'});
 assert.throws(()=>locate([['ID do anúncio','ID do anúncio'],['A','A']],'A'),/única vez/);assert.throws(()=>locate([['Bairro'],['A']],'A'),/única vez/);
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
test('nota é salva sem pedir senha do painel',async t=>{
 const a=app(t);await until(()=>a.d.querySelector('.stars button:not([disabled])'));a.d.querySelector('.stars button[data-v="4"]').click();await until(()=>a.posts.length);assert.equal(a.posts[0].op,'set');assert.equal(a.posts[0].data.estrelas,4);assert.equal('chave' in a.posts[0],false);
});
test('casa descartada some da lista e não há filtro para mostrá-la',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length===2);a.eval("DESC={A:{pessoa:'natalie'}};S.showdisc=true;render()");assert.equal(a.d.querySelectorAll('.card').length,1);assert.equal(a.d.querySelector('.idtag').textContent,'B');assert.equal(a.d.querySelector('#showdisc'),null);
});
test('ordem de adição desempata o critério e pode inverter a lista',async t=>{
 const a=app(t);a.setRows([row('A'),row('B'),row('C')]);a.refresh();await until(()=>a.d.querySelectorAll('.card').length===3);
 const ids=()=>[...a.d.querySelectorAll('.idtag')].map(e=>e.textContent).join('');
 assert.equal(ids(),'ABC');a.input('#ord','novas');assert.equal(ids(),'CBA');
 a.input('#sort','r');assert.equal(ids(),'CBA');a.input('#ord','antigas');assert.equal(ids(),'ABC');
});
test('quartos funciona como controle segmentado e conta como filtro ativo',async t=>{
 const a=app(t);await until(()=>a.d.querySelectorAll('.card').length>0);
 a.d.querySelector('#qmin input[value="4"]').dispatchEvent(new a.w.Event('input',{bubbles:true}));
 a.d.querySelector('#qmin input[value="4"]').checked=true;a.d.querySelector('#qmin').dispatchEvent(new a.w.Event('input',{bubbles:true}));
 assert.equal(a.eval('S.qmin'),'4');assert.match(a.d.querySelector('#activefilters').textContent,/1/);
});
