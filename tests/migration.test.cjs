const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/../';
function client(target){
 const posts=[],context={window:{CATALOGO_CONFIG:{spreadsheetId:'NEW',apiUrl:'https://example.com/api'}},localStorage:{removeItem(){}},document:{addEventListener(){}},setInterval(){},setTimeout,AbortSignal,console:{warn(){}},fetch:async(u,o={})=>{if(o.method==='POST'){posts.push(JSON.parse(o.body));return {ok:true,json:async()=>({ok:true})};}return {ok:true,json:async()=>({spreadsheetId:target,notas:[],comentarios:[],descartes:[]})};}};
 vm.runInNewContext(fs.readFileSync(root+'site/ghdb.js','utf8'),context);
 return {posts,load:()=>context.window.GHDB()};
}
test('API antiga ou apontada a outra base nunca recebe gravações',async()=>{
 for(const id of [undefined,'OLD']){const c=client(id),db=await c.load();await assert.rejects(()=>db.collection('notas').doc('A').set({estrelas:5}),/não está conectada/);assert.equal(c.posts.length,0);}
});
test('gravação inclui o ID confirmado da base',async()=>{
 const c=client('NEW'),db=await c.load();await db.collection('notas').doc('A').set({estrelas:5});assert.equal(c.posts[0].spreadsheetId,'NEW');
});
test('Apps Script identifica destino e recusa chamadas da base anterior',()=>{
 const opened=[],context={SpreadsheetApp:{openById(id){opened.push(id);return {getSheetByName(){return {getDataRange(){return {getValues(){return [['id','casa']];}}}}}};}},ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return {text,setMimeType(){return this}}}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(root+'apps_script/Code.gs','utf8'),context);
 const output=JSON.parse(context.doGet({}).text);assert.equal(output.spreadsheetId,'1TaUluQulubmyRxq2qgPJEYHAmfKsZtX_VQOCmdqpq2I');assert.ok(opened.every(id=>id===output.spreadsheetId));
 for(const spreadsheetId of [undefined,'OLD'])assert.equal(JSON.parse(context.doPost({postData:{contents:JSON.stringify({op:'set',col:'notas',id:'A',spreadsheetId})}}).text).erro,'planilha divergente');
});
