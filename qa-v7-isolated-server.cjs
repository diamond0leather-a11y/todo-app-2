// Local-only visual QA server. Firebase config and sync code are never served.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const publicDir=path.resolve(__dirname,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const port=Number(process.env.V7_QA_PORT||18961);
http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  if(pathname==='/firebase-config-v7.js'||pathname==='/firebase-sync.js'){
    response.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});
    response.end(pathname==='/firebase-config-v7.js'?'window.todo2V7FirebaseConfig=null;':'Object.assign(window.todo2SyncBridge,{flush:async()=>{},stage:()=>{},hasPending:()=>false});document.body.classList.remove("firebase-locked");');
    return;
  }
  const relative=pathname==='/'?'index.html':pathname.slice(1);
  const file=path.resolve(publicDir,relative);
  if(file!==publicDir&&!file.startsWith(publicDir+path.sep)){response.writeHead(403);response.end();return;}
  fs.readFile(file,(error,content)=>{if(error){response.writeHead(404);response.end();return;}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(content);});
}).listen(port,'127.0.0.1',()=>console.log(`Isolated v7 QA server: http://127.0.0.1:${port}/ (Firebase scripts blocked)`));
