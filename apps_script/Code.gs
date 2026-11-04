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
 *  3. Rode importarTudoDoGitHub() uma vez (traz as casas e as notas atuais do repositório).
 *  4. Implantar > Nova implantação > App da Web
 *     (Executar como: Eu · Quem pode acessar: Qualquer pessoa) e copie a URL /exec
 *     para site/config.js.
 */

const ABAS = {
  notas:       ['id', 'casa', 'pessoa', 'estrelas', 'quando'],
  comentarios: ['id', 'casa', 'pessoa', 'texto', 'quando'],
  descartes:   ['id', 'casa', 'pessoa', 'quando']
};
const PESSOAS = ['natalie', 'jessica'];
// Pasta dados/ do repositório no GitHub (ajuste se mudar o dono/nome do repositório):
const RAW = 'https://raw.githubusercontent.com/Natalie9/catalogo-imoveis/main/dados/';
const URL_AVALIACOES = RAW + 'avaliacoes.json';
const URL_XLSX = RAW + 'Catalogo_de_imoveis.xlsx';

/** Menu "Catálogo" na planilha. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Catálogo')
    .addItem('Importar tudo do GitHub', 'importarTudoDoGitHub')
    .addToUi();
}

/** Primeira carga: aba "Imóveis" (casas) + abas notas/comentarios/descartes. */
function importarTudoDoGitHub() {
  importarImoveisDoGitHub();
  importarDoGitHub();
}

/**
 * Substitui a aba "Imóveis" pela aba de mesmo nome de dados/Catalogo_de_imoveis.xlsx do repositório
 * (converte o .xlsx numa planilha temporária, copia a aba com a formatação e apaga a temporária).
 */
function importarImoveisDoGitHub() {
  const ss = SpreadsheetApp.getActive();
  const xlsx = UrlFetchApp.fetch(URL_XLSX).getBlob().getBytes();
  const b = 'catalogo' + Date.now();
  const meta = JSON.stringify({ name: 'tmp-importacao-catalogo', mimeType: 'application/vnd.google-apps.spreadsheet' });
  const ini = Utilities.newBlob('--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta +
    '\r\n--' + b + '\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').getBytes();
  const fim = Utilities.newBlob('\r\n--' + b + '--').getBytes();
  const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'post', contentType: 'multipart/related; boundary=' + b, payload: ini.concat(xlsx, fim),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  });
  const id = JSON.parse(r.getContentText()).id;
  try {
    const origem = SpreadsheetApp.openById(id).getSheetByName('Imóveis');
    const nova = origem.copyTo(ss);
    const velha = ss.getSheetByName('Imóveis');
    if (velha) ss.deleteSheet(velha);
    nova.setName('Imóveis');
    ss.setActiveSheet(nova); ss.moveActiveSheet(1); nova.setFrozenRows(1);
    ['Página1', 'Sheet1', 'Planilha1'].forEach(n => { const v = ss.getSheetByName(n); if (v && v.getLastRow() === 0) ss.deleteSheet(v); });
  } finally {
    DriveApp.getFileById(id).setTrashed(true);
  }
}

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

/** Traz dados/avaliacoes.json do repositório para as abas (substitui o conteúdo). Rode uma vez. */
function importarDoGitHub() {
  const av = JSON.parse(UrlFetchApp.fetch(URL_AVALIACOES).getContentText());
  const idDe = {
    notas: o => o.casa + '__' + o.pessoa,
    comentarios: (o, i) => o.id || ('imp' + (o.quando || '').replace(/\D/g, '') + i),
    descartes: o => o.casa
  };
  Object.keys(ABAS).forEach(n => {
    const s = aba_(n);
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).clearContent();
    const rows = (av[n] || []).map((o, i) => ABAS[n].map(k => k === 'id' ? idDe[n](o, i) : (o[k] === undefined ? '' : String(o[k]))));
    if (rows.length) s.getRange(2, 1, rows.length, ABAS[n].length).setValues(rows);
  });
}
