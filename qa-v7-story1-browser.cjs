// Isolated 390px browser QA. Firebase configuration and sync are removed from the served page.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile),root=path.join(__dirname,'dist');
const harness=`<script>window.addEventListener('load',()=>setTimeout(async()=>{try{
 const from='2026-11-09',days=Array.from({length:10},(_,i)=>dayAdd(from,i));
 demo.posts=days.map((date,i)=>({id:'qa-post-'+i,date,format:'Feed',caption:'元の本文',skuIds:[],shots:[],stories:[],revision:1}));
 demo.storyDays=days.map((date,i)=>({id:'qa-story-'+i,date,slot:1,theme:'元の題名',text:'元のStory',asset:'元素材',action:'元の行動',skuIds:[],manual:true}));demo.reactions=[];
 demo.posts[2].actualAt='2026-11-11T10:00:00+09:00';demo.reactions.push({id:'qa-reaction',sourceStory:{storyId:'qa-story-3'}});
 const incoming={schema:'cian-story1-verified-review-v1',scope:'story1-only',period:{from,to:days[9]},stories:days.map(date=>({date,slot:1,category:'文化',title:'検証済みの題名',text:'新しいStory https://example.test/source',action:'見る',asset:'検証素材',materialMode:'既存素材',skuIds:[],researchSources:[{name:'資料',url:'https://example.test/source'}],verificationStatus:'verified'}))};
 let saves=0;window.todo2SyncBridge={saveStory1Selection:async changes=>{saves++;for(const change of changes){Object.assign(demo.storyDays.find(story=>story.date===change.date),{text:change.story.text,theme:change.story.title,asset:change.story.asset,action:change.story.action,researchSources:change.story.researchSources,verificationStatus:change.story.verificationStatus});}localStorage.setItem(MOCK_KEY,JSON.stringify(demo));}};window.confirm=()=>true;
 window.editorialPlanner.openImport();const input=document.querySelector('#editorialJsonFile'),transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(incoming)],'story1.json',{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new Event('change'));await new Promise(resolve=>setTimeout(resolve,150));
 const choices=[...document.querySelectorAll('#workForm [data-story1-date]')];if(choices.length!==10||!choices[2].disabled||!choices[3].disabled||!document.querySelector('#workBody').textContent.includes('https://example.test/source'))throw Error('preview or protected dates missing');
 const rect=choices[0].getBoundingClientRect();if(rect.right>innerWidth+1||rect.width<16||document.documentElement.scrollWidth>innerWidth+2)throw Error('390px preview overflow');
 choices[0].checked=true;document.querySelector('#workForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,100));
 if(saves!==1||demo.storyDays[0].text!=='新しいStory https://example.test/source'||demo.storyDays[1].text!=='元のStory'||demo.posts[0].caption!=='元の本文')throw Error('selection changed other saved data');
 if(JSON.parse(localStorage.getItem(MOCK_KEY)).storyDays[0].text!==demo.storyDays[0].text)throw Error('reload did not retain Story1');
 showPost('qa-post-0');if(!document.querySelector('#dayDetail').textContent.includes('https://example.test/source'))throw Error('source not shown in post detail');
 document.body.dataset.qa='PASS';
}catch(error){document.body.dataset.qa='FAIL:'+error.message;}},0));</script>`;
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';if(rel.includes('..')){res.writeHead(400);res.end();return;}const file=path.join(root,rel);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}let body=fs.readFileSync(file);if(rel==='index.html'){let html=body.toString('utf8');html=html.replace(/<script src="\.\/firebase-config-v7\.js"><\/script>/,'').replace(/<script type="module" src="\.\/firebase-sync\.js[^"<>]*"><\/script>/,'');body=Buffer.from(html.replace('</body>',harness+'</body>'));}res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(body);});
(async()=>{const profile=fs.mkdtempSync(path.join(os.tmpdir(),'todo-v7-story1-qa-'));try{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const {stdout}=await run('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--window-size=390,844','--user-data-dir='+profile,'--virtual-time-budget=8000','--dump-dom','http://127.0.0.1:'+server.address().port+'/'],{timeout:30000,maxBuffer:12*1024*1024,windowsHide:true});const result=stdout.match(/<body[^>]*data-qa="([^"]+)/)?.[1]||'NO_RESULT';assert.equal(result,'PASS',result);console.log('PASS 390px Story1 file preview and isolated save');}finally{server.close();if(path.resolve(profile).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
