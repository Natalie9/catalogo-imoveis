/** Editor v1. Instalar junto de Code.gs; ativar serviço avançado Sheets.
 * EDITOR_ENABLED=true somente após revisar permissões da planilha e homologar.
 * Autoria é declarada; CHAVE compartilhada não autentica uma pessoa.
 */
const PROPERTY_FIELDS = {
  link:['Link original','url'], bairro:['Bairro','text'], cidade:['Cidade','text'],
  endereco:['Rua / endereço aproximado','text'], imobiliaria:['Imobiliária','text'],
  contato:['Contato do vendedor','text'], status:['Status','text'], foraDoAr:['Fora do ar','text'],
  preco:['Preço (R$)','number'], financiamento:['Financia?','text'], agio:['Informação sobre ágio','text'],
  condominio:['Condomínio (R$)','number'], iptu:['IPTU (R$)','number'],
  area:['Área do lote (m²)','number'], construida:['Área construída (m²)','number'],
  tipoArea:['Tipo de área','text'], quartos:['Quartos','integer'], suites:['Suítes','integer'],
  banheiros:['Banheiros','integer'], vagas:['Vagas de garagem','integer'], quintal:['Quintal','text'],
  piscina:['Piscina','text'], latitude:['Latitude','latitude'], longitude:['Longitude','longitude'],
  precisao:['Precisão da localização','text'], distancia:['Distância UFG (km)','decimal'],
  fotos:['Fotos','photos'], comentarios:['Comentários','longtext'],
  financiamentoSituacao:['Situação do financiamento','text'], conferencia:['Data da conferência','text'],
  fonte:['Fonte da conferência','text'], confirmadas:['Informações confirmadas','longtext'], pendencias:['Pendências','longtext']
};
const HISTORY_HEADERS=['operação','imóvel','campo','valor anterior','valor novo','quando','autoria declarada','motivo'];
function editorEnabled_(){return PropertiesService.getScriptProperties().getProperty('EDITOR_ENABLED')==='true' && typeof Sheets!=='undefined';}
function propertyError_(err){return json_({ok:false,erro:err.code||err.message||'falha',current:err.current||null});}
function propertyTable_(id){
  if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(id))throw new Error('id');
  const sheet=SpreadsheetApp.getActive().getSheetByName('Imóveis');if(!sheet)throw new Error('aba_ausente');
  const rows=sheet.getDataRange().getValues(),headers=rows[0].map(String),idx=headers.indexOf('ID do anúncio');
  if(idx<0||headers.filter(h=>h==='ID do anúncio').length!==1)throw new Error('cabecalho');
  const matches=[];for(let i=1;i<rows.length;i++)if(String(rows[i][idx]).trim()===id)matches.push(i);
  if(matches.length!==1)throw new Error(matches.length?'id_duplicado':'id_inexistente');
  return {sheet,headers,row:rows[matches[0]].map(v=>v instanceof Date?v.toISOString():v),index:matches[0]};
}
function propertyVersion_(table){
  // Inclui a linha inteira: mudanças diretas no Sheets e colunas históricas invalidam a versão.
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([table.headers,table.row]),Utilities.Charset.UTF_8));
}
function propertySnapshot_(id,history){
  const t=propertyTable_(id),fields={};
  Object.keys(PROPERTY_FIELDS).forEach(k=>{const [label,type]=PROPERTY_FIELDS[k];
    if(t.headers.filter(h=>h===label).length>1)throw new Error('cabecalho_duplicado');
    const i=t.headers.indexOf(label);if(i>=0)fields[k]={label,type,value:t.row[i]};
  });
  const result={id,headers:t.headers,row:t.row,version:propertyVersion_(t)};
  if(history){result.fields=fields;result.history=propertyHistory_(id);}
  return result;
}
function propertyHistory_(id){
  const sheet=SpreadsheetApp.getActive().getSheetByName('historico_imoveis');if(!sheet)return [];
  const rows=sheet.getDataRange().getValues();
  if(JSON.stringify(rows[0])!==JSON.stringify(HISTORY_HEADERS))throw new Error('historico_incompativel');
  return rows.slice(1).filter(r=>String(r[1])===id).slice(-200).reverse().map(r=>({operation:r[0],field:r[2],before:r[3],after:r[4],when:r[5],author:r[6],reason:r[7]}));
}
function propertyValue_(key,value){
  if(!Object.prototype.hasOwnProperty.call(PROPERTY_FIELDS,key))throw new Error('campo_nao_permitido');
  if(value===null){if(key==='link')throw new Error('link_obrigatorio');return '';}
  if(typeof value!=='string'&&typeof value!=='number')throw new Error('tipo:'+key);
  let s=String(value).trim();const type=PROPERTY_FIELDS[key][1];
  if(s.length>(type==='longtext'||type==='photos'?10000:1000))throw new Error('limite:'+key);
  if(!s){if(key==='link')throw new Error('link_obrigatorio');return '';}
  if(['number','integer','latitude','longitude','decimal'].includes(type)){
    if(type==='latitude'||type==='longitude'||type==='decimal')s=s.replace(',','.');
    else {s=s.replace(/R\$|\s|m²/gi,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');}
    if(!/^-?\d+(\.\d+)?$/.test(s)||!Number.isFinite(+s))throw new Error('numero:'+key);
    const n=+s;if(type==='latitude'?Math.abs(n)>90:type==='longitude'?Math.abs(n)>180:n<0)throw new Error('intervalo:'+key);
    if(type==='integer'&&!Number.isInteger(n))throw new Error('inteiro:'+key);
    return n;
  }
  if(type==='url'&&!/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(s))throw new Error('url:'+key);
  if(type==='photos'){
    let links;try{links=s[0]==='['?JSON.parse(s):s.split(/[\n|]+/);}catch(e){throw new Error('fotos');}
    if(!Array.isArray(links)||links.length>30||links.some(v=>typeof v!=='string'||!/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(v.trim())))throw new Error('fotos');
    return JSON.stringify(links.map(v=>v.trim()));
  }
  return s;
}
function userValue_(value){return typeof value==='number'?{numberValue:value}:{stringValue:String(value)};}
function updateProperty_(b){
  if(!b.changes||typeof b.changes!=='object'||Array.isArray(b.changes))throw new Error('alteracoes');
  if(typeof b.expectedVersion!=='string'||b.expectedVersion.length>100)throw new Error('versao');
  if(PESSOAS.indexOf(b.author)<0)throw new Error('autoria');
  if(typeof b.reason!=='undefined'&&(typeof b.reason!=='string'||b.reason.length>1000))throw new Error('motivo');
  const keys=Object.keys(b.changes);if(keys.length>Object.keys(PROPERTY_FIELDS).length)throw new Error('alteracoes');
  // Valida todo o payload antes de iniciar qualquer escrita.
  const values={};keys.forEach(k=>{values[k]=propertyValue_(k,b.changes[k]);});
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('ocupado');
  try{
    const t=propertyTable_(b.id);
    if(propertyVersion_(t)!==b.expectedVersion){const err=new Error('conflito');err.current=propertySnapshot_(b.id,true);throw err;}
    const changes=keys.map(k=>{const name=PROPERTY_FIELDS[k][0],col=t.headers.indexOf(name);
      if(col<0||t.headers.filter(h=>h===name).length!==1)throw new Error('coluna_ausente:'+k);
      if(t.sheet.getRange(t.index+1,col+1).getFormula())throw new Error('campo_calculado:'+k);
      return {key:k,col,name,before:t.row[col],after:values[k]};
    }).filter(c=>String(c.before)!==String(c.after));
    if(!changes.length)return {ok:true,unchanged:true,property:propertySnapshot_(b.id,true)};
    const ss=SpreadsheetApp.getActive(),history=ss.getSheetByName('historico_imoveis');
    if(history&&JSON.stringify(history.getRange(1,1,1,HISTORY_HEADERS.length).getValues()[0])!==JSON.stringify(HISTORY_HEADERS))throw new Error('historico_incompativel');
    const requests=[],used=ss.getSheets().map(s=>s.getSheetId());let historyId=history?history.getSheetId():1;
    while(!history&&used.includes(historyId))historyId++;
    if(!history){requests.push({addSheet:{properties:{sheetId:historyId,title:'historico_imoveis',gridProperties:{frozenRowCount:1}}}});requests.push({appendCells:{sheetId:historyId,rows:[{values:HISTORY_HEADERS.map(v=>({userEnteredValue:userValue_(v)}))}],fields:'userEnteredValue'}});}
    changes.forEach(c=>requests.push({updateCells:{range:{sheetId:t.sheet.getSheetId(),startRowIndex:t.index,endRowIndex:t.index+1,startColumnIndex:c.col,endColumnIndex:c.col+1},rows:[{values:[{userEnteredValue:userValue_(c.after)}]}],fields:'userEnteredValue'}}));
    const when=new Date().toISOString(),operation=Utilities.getUuid();
    requests.push({appendCells:{sheetId:historyId,rows:changes.map(c=>({values:[operation,b.id,c.name,c.before,c.after,when,b.author,b.reason||''].map(v=>({userEnteredValue:userValue_(v)}))})),fields:'userEnteredValue'}});
    // Uma requisição atômica evita gravar o imóvel sem o histórico (e vice-versa).
    // stringValue impede que textos iniciados com '=' sejam executados como fórmulas.
    Sheets.Spreadsheets.batchUpdate({requests},ss.getId());
    SpreadsheetApp.flush();
    return {ok:true,operation,property:propertySnapshot_(b.id,true)};
  }finally{lock.releaseLock();}
}
