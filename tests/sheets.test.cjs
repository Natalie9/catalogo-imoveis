const {test}=require('node:test'),assert=require('node:assert/strict');
const s=require('../site/sheets.js');
function table(overrides={}){
 const headers=[...s.HEADERS,'Nota Natalie (painel)','Nota Jéssica (painel)','Comentários do painel','Descartada no painel',...s.EXTRA];
 const values={'Link original':'https://example.com/casa','ID do anúncio':'TEST-1','Preço (R$)':'R$ 340.000,00','Área do lote (m²)':'220,50','Quartos':'3 (1 suíte)','Latitude':'-16,591','Longitude':'-49,33707','Fotos':'["https://example.com/1.jpg","javascript:alert(1)"]',...overrides};
 return [headers,headers.map(h=>values[h]||'')];
}
test('CSV suporta aspas, vírgulas, quebras de linha e células vazias',()=>{
 assert.deepEqual(s.parseCSV('\uFEFFa,b,c\r\n"Uma, casa","Disse ""oi""\nsegunda linha",\r\n'),[['a','b','c'],['Uma, casa','Disse "oi"\nsegunda linha','']]);
 assert.throws(()=>s.parseCSV('"incompleto'));
 assert.throws(()=>s.parseCSV('<html>Login</html>'));
});
test('converte números brasileiros, quartos mistos, coordenadas e fotos',()=>{
 const {data,warnings}=s.houses(table());assert.equal(warnings.length,0);assert.equal(data[0].p,340000);assert.equal(data[0].l,220.5);assert.equal(data[0].q,3);assert.equal(data[0].lat,-16.591);assert.ok(data[0].km>0);assert.deepEqual(data[0].img,['https://example.com/1.jpg']);
});
test('colunas podem ser reordenadas; campos vazios não viram zero',()=>{
 const t=table({'Preço (R$)':'','Latitude':'','Longitude':''}).map(r=>r.toReversed());
 const d=s.houses(t).data[0];assert.equal(d.p,null);assert.equal(d.lat,null);assert.equal(d.km,null);
});
test('IDs estáveis impedem duplicatas e atributos HTML; links perigosos são rejeitados',()=>{
 const t=table();t.push([...t[1]]);const a=[...t[1]];a[12]='" onclick="bad';t.push(a);const b=[...t[1]];b[0]='javascript:alert(1)';t.push(b);
 const r=s.houses(t);assert.equal(r.data.length,1);assert.equal(r.warnings.length,3);
});
test('ausência de cabeçalho obrigatório é erro; uma planilha vazia válida é aceita',()=>{
 assert.throws(()=>s.houses([['qualquer']]));assert.equal(s.houses([table()[0]]).data.length,0);
});
test('piscina explícita e negação têm precedência; URLs com apóstrofos são só dados',()=>{
 assert.equal(s.pool('sem piscina',''),null);assert.equal(s.pool('Tem piscina','não'),null);assert.equal(s.pool('','cond'),'cond');
 assert.deepEqual(s.images('https://example.com/a\'b.jpg\nhttps://example.com/c.jpg'),["https://example.com/a'b.jpg",'https://example.com/c.jpg']);
});
module.exports={table};

test('base normalizada separa lote, construção e área de tipo desconhecido',()=>{
 const t=table({'Área do lote (m²)':'','Tipo de área':'a confirmar','Comentários':'Coluna E com a área do anúncio'});
 t[0].push('Área construída (m²)','Área informada (m²)');t[1].push('','150');
 let d=s.houses(t).data[0];assert.equal(d.lot,null);assert.equal(d.built,null);assert.equal(d.areaReported,150);assert.equal(d.lc,false);
 t[1][t[0].indexOf('Área construída (m²)')]='99';d=s.houses(t).data[0];assert.equal(d.built,99);assert.equal(d.lot,null);
 t[1][t[0].indexOf('Área do lote (m²)')]='220';d=s.houses(t).data[0];assert.equal(d.lot,220);assert.equal(d.built,99);
});
