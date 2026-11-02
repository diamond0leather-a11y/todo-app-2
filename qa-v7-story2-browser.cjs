// Isolated Chrome QA: serves dist locally without Firebase config or sync scripts.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const root=path.join(__dirname,'dist');
const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert(fs.existsSync(chrome),'Chrome is required for isolated browser QA');
const harness=`<script>window.addEventListener('load',()=>setTimeout(()=>{try{
  const date=dayAdd(TODAY,-1),story=[1,2,3,4].map(slot=>({id:'qa-story-'+slot,slot,text:'Story '+slot,kind:slot===2?'アンケート':'通常',options:slot===2?['A','B']:[],skuIds:[],asset:'素材',action:'確認',materialMode:'過去素材使用可'}));
  demo.posts=[{id:'qa-post',date,format:'Feed',theme:'QA',stories:story,shots:[],skuIds:[],caption:'QA',primaryAxis:'CUSTOMER_VALUE'}];
  demo.storyDays=[];demo.reactions=[];
  document.documentElement.style.width='390px';document.body.style.width='390px';
  renderHome();
  const button=document.querySelector('[data-story2-pending]');if(!button)throw Error('HOME reminder missing');
  if(button.getBoundingClientRect().right>391)throw Error('390px reminder overflow');
  button.click();
  const form=document.querySelector('#workForm');if(!form?.elements.story2Status)throw Error('Result form missing');
  if(form.getBoundingClientRect().right>window.innerWidth+1)throw Error('form overflow at '+window.innerWidth+'px');
  form.elements.story2Status.value='none';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  if(demo.reactions.length!==1||demo.reactions[0].story2ResultStatus!=='none')throw Error('Result not saved');
  renderHome();if(document.querySelector('[data-story2-pending]'))throw Error('Reminder remains');
  showPost('qa-post');
  const edit=document.querySelector('#dayDetail [data-story2-result]');if(!edit)throw Error('Story 2 edit entry missing');
  edit.click();
  const again=document.querySelector('#workForm');again.elements.story2Status.value='entered';again.elements.story2Text.value='後から届いた回答';
  again.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  if(demo.reactions.length!==1||demo.reactions[0].story2ResultText!=='後から届いた回答')throw Error('Edit duplicated or lost');
  if(document.querySelector('#homeReactionListEntry'))throw Error('Old entry remains');
  if(getComputedStyle(document.querySelector('#view-results')).display!=='none')throw Error('Independent screen visible');
  document.body.dataset.qa='PASS';
 }catch(error){document.body.dataset.qa='FAIL:'+error.message;}},0));</script>`;
const server=http.createServer((req,res)=>{
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 if(relative.includes('..')){res.writeHead(400);res.end();return;}
 const file=path.join(root,relative);
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 let body=fs.readFileSync(file);
 if(relative==='index.html'){
  let html=body.toString('utf8');
  html=html.replace(/<script src="\.\/firebase-config-v7\.js"><\/script>/,'').replace(/<script type="module" src="\.\/firebase-sync\.js[^"<>]*"><\/script>/,'');
  assert(!html.includes('src="./firebase-sync.js'),'Firebase sync must be absent');
  body=Buffer.from(html.replace('</body>',harness+'</body>'));
 }
 res.setHeader('Content-Type',relative.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');
 res.end(body);
});
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'todo-v7-story2-qa-'));
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/';
  const {stdout}=await run(chrome,['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--window-size=390,844','--user-data-dir='+profile,'--virtual-time-budget=8000','--dump-dom',url],{timeout:30000,maxBuffer:12*1024*1024,windowsHide:true});
  const result=stdout.match(/<body[^>]*data-qa="([^"]+)/)?.[1]||'NO_RESULT';
  assert.equal(result,'PASS',result);
  console.log('PASS: 隔離Chromeで起動、390px配置、翌日案内、入力、保存、Story2から編集、重複なし、独立画面非表示');
 }finally{
  server.close();
  if(path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
