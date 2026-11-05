const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../site');
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__preview'){
    const width=Number(url.searchParams.get('width'))||1440;
    if(![320,390,768,1024,1440].includes(width)){res.writeHead(400);res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Revisão local ${width}px</title><style>body{margin:0;width:${width}px}iframe{border:0;width:${width}px;height:1200px;display:block}</style><iframe title="Catálogo em ${width}px" src="/"></iframe></html>`);return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,b)=>{if(err){res.writeHead(404);res.end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(b)});
}).listen(8000,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8000'));
