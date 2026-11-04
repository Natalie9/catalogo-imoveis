/* Leitura pública do Google Sheets. Nenhum dado de imóveis é embutido no site. */
(function (root) {
  'use strict';
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function parseCSV(text) {
    if (/^\s*</.test(text)) throw new Error('A planilha retornou uma página de acesso, não os dados.');
    const rows = []; let row = [], cell = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
        else if (quoted || cell === '') quoted = !quoted;
        else cell += c;
      } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw new Error('CSV incompleto: tente atualizar novamente.');
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function number(v) {
    if (v == null || String(v).trim() === '') return null;
    let s = String(v).trim().replace(/R\$|\s|m²/gi, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d+(\.\d+)?$/.test(s) && Number.isFinite(+s) ? +s : null;
  }
  function url(v) {
    try { const u = new URL(String(v).trim()); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; }
    catch (_) { return ''; }
  }
  function images(v) {
    let a = String(v || '').trim();
    if (!a) return [];
    try { if (a.startsWith('[')) a = JSON.parse(a); } catch (_) { return []; }
    if (!Array.isArray(a)) a = a.split(/[\n|]+/);
    return [...new Set(a.map(url).filter(Boolean))];
  }
  const yes = v => /^(sim|true|verdadeiro|1)(\b|$)/.test(norm(v));
  const finance = v => /^(nao|não)\b/.test(norm(v)) ? 'nao' : /^sim\b/.test(norm(v)) ? 'sim' : 'incerto';
  const positive = v => { const n=number(v);return n!=null&&n>=0?n:null; };
  const decimal = v => {
    const s = String(v ?? '').trim().replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) && Number.isFinite(+s) ? +s : null;
  };
  function pool(com, explicit) {
    const e = norm(explicit);
    if (['nao', 'sem piscina', 'nenhuma'].includes(e)) return null;
    if (['sim', 'cond', 'prev'].includes(e)) return e;
    const s = norm(com);
    if (!/piscin/.test(s) || /sem piscina|nao (tem|possui) piscina/.test(s)) return null;
    if (/espaco.{0,20}piscin|piscina a instalar|potencial para.{0,10}piscin/.test(s)) return 'prev';
    return /lazer do condominio.{0,20}piscin|condominio com piscina/.test(s) ? 'cond' : 'sim';
  }
  function tags(com, off, pk) {
    const t = [], s = norm(com);
    if (pk) t.push([pk === 'prev' ? 'poolp' : 'pool', {sim:'Piscina', cond:'Piscina do condomínio', prev:'Espaço p/ piscina'}[pk]]);
    if (off) t.push(['off', 'Fora do ar']);
    if (/\bagio\b/.test(s)) t.push(['bad', 'Ágio']);
    else if (/ALERTA/.test(com)) t.push(['bad', 'Alerta']);
    if (/DIVERG/.test(com)) t.push(['warn', 'Dados divergentes']);
    if (/Comprar já alugado/.test(com)) t.push(['warn', 'Já alugada']);
    if (/mesma casa|mesmo imovel|duplicat|tambem anunciada/.test(s.replace(/nao e a (mesma casa|casa)/g, ''))) t.push(['info', 'Anunciada em 2 lugares']);
    if (/desatualizado|\bparado\b/.test(s)) t.push(['warn', 'Anúncio antigo']);
    return t;
  }
  const HEADERS = ['Link original','Bairro','Rua / endereço aproximado','Preço (R$)','Área do lote (m²)','Quartos','Quintal','Financia?','Contato do vendedor','Imobiliária','Comentários','Status','ID do anúncio'];
  const EXTRA = ['Latitude','Longitude','Distância UFG (km)','Precisão da localização','Cidade','Fotos','Fora do ar','Piscina','Tipo de área'];
  function houses(rows) {
    const headers = (rows[0] || []).map(norm);
    for (const h of HEADERS) if (!headers.includes(norm(h))) throw new Error('Coluna obrigatória ausente na planilha: ' + h);
    const at = (row, h) => row[headers.indexOf(norm(h))] ?? '';
    const out = [], warnings = [], ids = new Set();
    rows.slice(1).forEach((v, i) => {
      if (!v.some(x => String(x).trim())) return;
      const r = i + 2, u = url(at(v, HEADERS[0])), id = String(at(v, HEADERS[12])).trim();
      if (!u || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(id) || ids.has(id)) {
        warnings.push('Linha ' + r + ': confira o link e o ID (obrigatório e único).'); return;
      }
      ids.add(id);
      const com = String(at(v, 'Comentários')), pk = pool(com, at(v, 'Piscina'));
      let lat = decimal(at(v, 'Latitude')), lng = decimal(at(v, 'Longitude'));
      if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) lat = lng = null;
      let km = decimal(at(v, 'Distância UFG (km)'));
      if (km == null && lat != null) {
        const rad = x => x * Math.PI / 180, a = Math.sin(rad(lat + 16.60457) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(-16.60457)) * Math.sin(rad(lng + 49.2624) / 2) ** 2;
        km = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1-a))) * 10) / 10;
      }
      const q = String(at(v, 'Quartos')).match(/^\s*\d+/), nat = com.match(/Comentário da Natalie:\s*[“"]([^”"]+)[”"]/);
      const off = yes(at(v, 'Fora do ar'));
      out.push({r,id,u,s:new URL(u).hostname.replace(/^www\./,''),b:String(at(v,'Bairro')),rua:String(at(v,HEADERS[2])),
        p:positive(at(v,HEADERS[3])),l:positive(at(v,HEADERS[4])),q:q?+q[0]:null,qt:String(at(v,'Quintal')),f:String(at(v,'Financia?')),
        c:String(at(v,'Contato do vendedor')),i:String(at(v,'Imobiliária')),com,st:String(at(v,'Status')||'Em avaliação'),
        lat,lng,km:km!=null&&km>=0?km:null,gp:String(at(v,'Precisão da localização')||'sem localização'),cid:String(at(v,'Cidade')),img:images(at(v,'Fotos')),
        nat:nat?nat[1].trim():null,tags:tags(com,off,pk),novo:lat==null,pool:pk,lc:norm(at(v,'Tipo de área'))?norm(at(v,'Tipo de área'))==='construida':com.includes('Coluna E com a área'),
        nn:number(at(v,'Nota Natalie (painel)')),nj:number(at(v,'Nota Jéssica (painel)')),pc:String(at(v,'Comentários do painel')),
        built:positive(at(v,'Área construída (m²)')),suites:positive(at(v,'Suítes')),baths:positive(at(v,'Banheiros')),
        parking:positive(at(v,'Vagas de garagem')),condo:positive(at(v,'Condomínio (R$)')),iptu:positive(at(v,'IPTU (R$)')),
        fin:String(at(v,'Situação do financiamento')),checked:String(at(v,'Data da conferência')),source:String(at(v,'Fonte da conferência')),
        confirmed:String(at(v,'Informações confirmadas')),pending:String(at(v,'Pendências')),agio:String(at(v,'Informação sobre ágio')),
        poolInfo:String(at(v,'Piscina'))});
      const house=out[out.length-1];house.lot=house.lc?null:house.l;
      if(house.built==null&&house.lc)house.built=house.l;
    });
    return {data:out,warnings};
  }
  async function read(config, gid, signal) {
    if (!/^[\w-]+$/.test(config.spreadsheetId || '') || !/^\d+$/.test(String(gid))) throw new Error('Planilha não configurada.');
    const u = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`;
    const r = await fetch(u, {cache:'no-store',credentials:'omit',signal});
    if (!r.ok) throw new Error('Falha ao ler a planilha (HTTP ' + r.status + ').');
    return parseCSV(await r.text());
  }
  const api = {parseCSV,number,url,images,pool,finance,houses,read,HEADERS,EXTRA};
  root.CatalogoSheets = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
