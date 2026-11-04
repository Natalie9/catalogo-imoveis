const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const {HEADERS,EXTRA}=require('../site/sheets.js');
const headers=[...HEADERS,'Histórico N','Histórico O','Histórico P','Histórico Q',...EXTRA];
function backend(){
  const initial=['https://example.com/A','Bairro','Rua',450000,300,3,'Sim','Sim','Contato','Imobiliária','Observação','Em avaliação','A','N','O','P','Q',-16.6,-49.3,5,'bairro','Goiânia','https://example.com/foto.jpg','Não','não','lote'];
  let data={Imóveis:{id:10,rows:[headers.slice(),initial.slice(),[...initial.slice(0,12),'B',...initial.slice(13)]]},notas:{id:11,rows:[['id','casa','pessoa','estrelas','quando'],['A__natalie','A','natalie',4,'2026-01-01']]},comentarios:{id:12,rows:[['id','casa','pessoa','texto','quando'],['c1','A','jessica','Teste','2026-01-01']]},descartes:{id:13,rows:[['id','casa','pessoa','quando']]}};
  const props={CHAVE:'test-only',EDITOR_ENABLED:'true'};let locked=false,unavailable=false,batchFailure=false,commits=0;
  const sheet=name=>({getSheetId:()=>data[name].id,getDataRange:()=>({getValues:()=>structuredClone(data[name].rows)}),getRange:(r,c,rs=1,cs=1)=>({getValues:()=>structuredClone(data[name].rows.slice(r-1,r-1+rs).map(row=>row.slice(c-1,c-1+cs))),getFormula:()=>''})});
  const ss={getSheetByName:name=>data[name]?sheet(name):null,getSheets:()=>Object.keys(data).map(sheet),getId:()=> 'test-spreadsheet'};
  const ctx=vm.createContext({console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},SpreadsheetApp:{getActive:()=>ss,flush:()=>{}},LockService:{getScriptLock:()=>({tryLock:()=>{if(unavailable||locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>crypto.createHash('sha256').update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),getUuid:()=>crypto.randomUUID()},Sheets:{Spreadsheets:{batchUpdate:body=>{
    if(batchFailure)throw Error('simulated_batch_failure');const next=structuredClone(data),find=id=>Object.values(next).find(s=>s.id===id);
    const value=c=>c.userEnteredValue.numberValue??c.userEnteredValue.stringValue;
    for(const req of body.requests){
      if(req.addSheet){const p=req.addSheet.properties;next[p.title]={id:p.sheetId,rows:[]};}
      if(req.updateCells){const {range,rows}=req.updateCells,s=find(range.sheetId);s.rows[range.startRowIndex][range.startColumnIndex]=value(rows[0].values[0]);}
      if(req.appendCells){const a=req.appendCells;find(a.sheetId).rows.push(...a.rows.map(r=>r.values.map(value)));}
    }data=next;commits++;
  }}}});
  vm.runInContext(fs.readFileSync(__dirname+'/../apps_script/Code.gs','utf8')+'\n'+fs.readFileSync(__dirname+'/../apps_script/Properties.gs','utf8'),ctx);
  const post=b=>ctx.doPost({postData:{contents:JSON.stringify({chave:'test-only',...b})}});
  const read=id=>post({op:'readProperty',id}).property;
  const update=(changes,extra={})=>post({op:'updateProperty',id:'A',changes,expectedVersion:read('A')?.version||'',author:'natalie',reason:'Conferido',...extra});
  return {ctx,post,read,update,get data(){return data;},get commits(){return commits;},get locked(){return locked;},props,setBusy:v=>unavailable=v,setBatchFailure:v=>batchFailure=v};
}
test('edição pontual por ID preserva outras linhas, N–Q, notas e comentários',()=>{
  const b=backend(),before=structuredClone(b.data),j=b.update({preco:'420.000,50'});assert.equal(j.ok,true);assert.equal(j.property.row[3],420000.5);
  assert.deepEqual(b.data.Imóveis.rows[2],before.Imóveis.rows[2]);assert.deepEqual(b.data.Imóveis.rows[1].slice(13,17),before.Imóveis.rows[1].slice(13,17));
  for(const col of ['notas','comentarios','descartes'])assert.deepEqual(b.data[col],before[col]);assert.equal(b.data.historico_imoveis.rows.length,2);assert.equal(j.property.history[0].before,450000);assert.equal(j.property.history[0].author,'natalie');
});
test('edição só de área, múltiplos campos e remoção intencional',()=>{
 const b=backend();assert.equal(b.update({area:'250,5'}).property.row[4],250.5);const j=b.update({preco:'400000',bairro:'Água Branca',contato:null});assert.equal(j.ok,true);assert.equal(j.property.row[1],'Água Branca');assert.equal(j.property.row[8],'');assert.equal(j.property.row[4],250.5);
});
test('nenhuma modificação não grava nem cria histórico',()=>{const b=backend();assert.equal(b.update({}).unchanged,true);assert.equal(b.update({preco:450000}).unchanged,true);assert.equal(b.commits,0);assert.equal(b.data.historico_imoveis,undefined);});
test('validação rejeita número inválido, negativo, URL insegura e campo não permitido',()=>{
 for(const changes of [{preco:'abc'},{area:'-1'},{preco:'-1'},{link:'javascript:alert(1)'},{link:null},{quartos:'2,5'},{latitude:'91'},{longitude:'-181'},{fotos:'javascript:bad'},{id:'B'},{'ID do anúncio':'B'},{range:'A1'},{preco:{}},{preco:'1e300'}]){
   const b=backend(),before=structuredClone(b.data);assert.equal(b.update(changes).ok,false,JSON.stringify(changes));assert.deepEqual(b.data,before);assert.equal(b.commits,0);
 }
});
test('validação completa antes de gravar: um campo inválido impede todos',()=>{const b=backend();assert.equal(b.update({preco:400000,area:-2}).ok,false);assert.equal(b.read('A').row[3],450000);assert.equal(b.commits,0);});
test('autoriza no servidor e exige ativação explícita',()=>{
 const b=backend();assert.equal(b.update({preco:1},{chave:''}).erro,'chave');assert.equal(b.update({preco:1},{chave:'incorreta'}).erro,'chave');b.props.EDITOR_ENABLED='false';assert.equal(b.update({preco:1}).erro,'editor_desativado');assert.equal(b.commits,0);
});
test('IDs ausentes e duplicados bloqueiam leitura e edição',()=>{const b=backend();assert.equal(b.post({op:'readProperty',id:'X'}).erro,'id_inexistente');b.data.Imóveis.rows.push(b.data.Imóveis.rows[1].slice());assert.equal(b.post({op:'readProperty',id:'A'}).erro,'id_duplicado');assert.equal(b.commits,0);});
test('reordenação de linhas não muda o alvo da edição',()=>{const b=backend(),p=b.read('A');b.data.Imóveis.rows.reverse();b.data.Imóveis.rows.unshift(b.data.Imóveis.rows.pop());assert.equal(b.update({preco:420000},{expectedVersion:p.version}).ok,true);assert.equal(b.data.Imóveis.rows[1][12],'B');assert.equal(b.data.Imóveis.rows[1][3],450000);assert.equal(b.read('A').row[3],420000);});
test('duas edições com a mesma versão geram conflito com valores atuais',()=>{const b=backend(),version=b.read('A').version;assert.equal(b.update({preco:420000},{expectedVersion:version}).ok,true);const j=b.update({area:200},{expectedVersion:version});assert.equal(j.erro,'conflito');assert.equal(j.current.row[3],420000);assert.equal(b.read('A').row[4],300);assert.equal(b.commits,1);assert.equal(b.locked,false);});
test('mudança manual também invalida a versão',()=>{const b=backend(),version=b.read('A').version;b.data.Imóveis.rows[1][1]='Outro bairro';assert.equal(b.update({preco:1},{expectedVersion:version}).erro,'conflito');assert.equal(b.commits,0);});
test('falha no lote não persiste imóvel nem histórico; lock sempre liberado',()=>{const b=backend(),before=structuredClone(b.data);b.setBatchFailure(true);assert.equal(b.update({preco:1}).ok,false);assert.deepEqual(b.data,before);assert.equal(b.locked,false);});
test('lock ocupado retorna erro sem alterações',()=>{const b=backend();b.setBusy(true);assert.equal(b.update({preco:1}).erro,'ocupado');assert.equal(b.commits,0);});
test('novas colunas só são editáveis quando existem; cabeçalhos repetidos bloqueiam',()=>{const b=backend();assert.match(b.update({banheiros:2}).erro,/coluna_ausente/);b.data.Imóveis.rows[0].push('Banheiros');b.data.Imóveis.rows.slice(1).forEach(r=>r.push(''));assert.equal(b.update({banheiros:2}).property.row.at(-1),2);b.data.Imóveis.rows[0].push('Preço (R$)');assert.equal(b.post({op:'readProperty',id:'A'}).erro,'cabecalho_duplicado');});
test('textos especiais são dados, não fórmulas; histórico não aparece na leitura pública',()=>{const b=backend();const text='=IMPORTXML("https://example.com", "x") <script>á & ç</script>';assert.equal(b.update({comentarios:text}).property.row[10],text);const j=b.ctx.doGet({parameter:{op:'property',id:'A'}});assert.equal(j.property.history,undefined);assert.equal(j.property.fields,undefined);assert.equal(j.property.row[10],text);});
module.exports={backend};
