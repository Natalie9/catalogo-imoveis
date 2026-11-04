/**
 * Catálogo de Imóveis — backend na Planilha Google (Apps Script).
 *
 * Guarda as notas (estrelas), comentários e descartes do painel em três abas
 * da planilha: "notas", "comentarios" e "descartes" (criadas sozinhas).
 *
 *   GET  .../exec?op=all   -> {notas:[...], comentarios:[...], descartes:[...]}   (leitura aberta)
 *   POST .../exec          {op:"set"|"delete", col, id, data, chave}             (pede a senha)
 *
 * Instalação: docs/PLANILHA_GOOGLE.md
 *  1. Planilha > Extensões > Apps Script > cole este arquivo.
 *  2. Configurações do projeto > Propriedades do script > CHAVE = <senha do painel>.
 *  3. Implantar > Nova implantação > App da Web
 *     (Executar como: Eu · Quem pode acessar: Qualquer pessoa) e copie a URL /exec
 *     para site/config.js.
 */

const ABAS = {
  notas:       ['id', 'casa', 'pessoa', 'estrelas', 'quando'],
  comentarios: ['id', 'casa', 'pessoa', 'texto', 'quando'],
  descartes:   ['id', 'casa', 'pessoa', 'quando']
};
const PESSOAS = ['natalie', 'jessica'];


function aba_(nome) {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(nome);
  if (!s) {
    s = ss.insertSheet(nome);
    s.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]).setFontWeight('bold');
    s.setFrozenRows(1);
    s.getRange('A:Z').setNumberFormat('@');   // tudo como texto (datas ISO não viram Date)
  }
  return s;
}

function ler_(nome) {
  const v = aba_(nome).getDataRange().getValues();
  const h = v.shift();
  return v.filter(r => r[0] !== '').map(r => {
    const o = {};
    h.forEach((k, i) => { o[k] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
    if (o.estrelas !== undefined && o.estrelas !== '') o.estrelas = Number(o.estrelas);
    o.id = String(o.id);
    return o;
  });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const out = {};
  Object.keys(ABAS).forEach(n => { out[n] = ler_(n); });
  out.quando = new Date().toISOString();
  return json_(out);
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, erro: 'json' }); }
  const chave = PropertiesService.getScriptProperties().getProperty('CHAVE');
  if (!chave || b.chave !== chave) return json_({ ok: false, erro: 'chave' });
  if (!ABAS[b.col]) return json_({ ok: false, erro: 'coleção' });
  const id = String(b.id || '').slice(0, 200);
  if (!id) return json_({ ok: false, erro: 'id' });
  const d = b.data || {};
  if (b.op === 'set') {
    if (d.pessoa && PESSOAS.indexOf(d.pessoa) < 0) return json_({ ok: false, erro: 'pessoa' });
    if (d.texto) d.texto = String(d.texto).slice(0, 2000);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = aba_(b.col);
    const ids = s.getRange(1, 1, s.getLastRow(), 1).getValues().map(r => String(r[0]));
    const linha = ids.indexOf(id) + 1;               // 0 = não existe
    if (b.op === 'delete') {
      if (linha > 1) s.deleteRow(linha);
    } else if (b.op === 'set') {
      const row = ABAS[b.col].map(k => k === 'id' ? id : (d[k] === undefined || d[k] === null ? '' : String(d[k])));
      if (linha > 1) s.getRange(linha, 1, 1, row.length).setValues([row]);
      else s.appendRow(row);
    } else return json_({ ok: false, erro: 'op' });
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
