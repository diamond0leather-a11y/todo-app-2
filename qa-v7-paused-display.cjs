const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'dist');
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';
 if(name==='firebase-sync.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('window.todo2SyncBridge.flush=async()=>{};');return;}
 const file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':'text/html'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
async function run(){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async()=>{
  const post=createConcept(TODAY,0,'pattern');post.id='qa-paused-post';post.format='Feed';post.theme='架空の企画';post.caption='架空の本文。\n次の段落。';post.paused=true;post.actualAt=null;post.skuIds=['qa-sku'];post.shots=[{id:'qa-shot',signature:'qa-shot',media:'写真',what:'架空の撮影指示',count:1,skuIds:['qa-sku']}];
  demo.items=[{id:'qa-item',name:'架空の商品'}];demo.skus=[{id:'qa-sku',itemId:'qa-item',name:'架空の色'}];
  demo.posts=[post];demo.storyDays=[1,2,3,4].map(slot=>({id:'qa-story-'+slot,date:TODAY,slot,text:'架空のStory '+slot,asset:'架空の素材',action:'確認する',skuIds:[]}));
  const stored=localStorage.getItem(MOCK_KEY);
  renderHome();const pausedHome=dx('#homeTodayContent').textContent,homeStories=dx('#homeStoryPreview').querySelectorAll('.home-story-mini').length;
  go('execution');const pausedExecution=dx('#executionContent').textContent,executionStories=dx('#executionContent').querySelectorAll('.execution-story').length,pausedTasks=allTasks().length;
  let pausedCaptionCopied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{pausedCaptionCopied=text;}}});
  dx('[data-execution-caption-copy]').click();await new Promise(resolve=>setTimeout(resolve,0));
  post.paused=false;renderHome();const plannedHome=dx('#homeTodayContent').textContent;go('execution');const plannedExecution=dx('#executionContent').textContent;
  post.actualAt=new Date(TODAY+'T08:00:00Z').toISOString();renderHome();const postedHome=dx('#homeTodayContent').textContent;go('execution');const postedExecution=dx('#executionContent').textContent,postedTasks=allTasks().length;
  post.actualAt=null;post.noPostConfirmedAt=new Date().toISOString();renderHome();const noPostHome=dx('#homeTodayContent').textContent,notPostedTasks=allTasks().length;
  return {pausedHome,pausedExecution,homeStories,executionStories,pausedTasks,pausedCaptionCopied,plannedHome,plannedExecution,postedHome,postedExecution,postedTasks,noPostHome,notPostedTasks,storedUnchanged:localStorage.getItem(MOCK_KEY)===stored,fitsPhone:document.documentElement.scrollWidth<=innerWidth};
 });
 assert.match(result.pausedHome,/架空の企画/);assert.match(result.pausedHome,/今日は投稿しない/);assert.match(result.pausedHome,/撮影 0\/1カット完了/);
 assert.match(result.pausedExecution,/今日は投稿しない/);assert.match(result.pausedExecution,/架空の本文/);assert.match(result.pausedExecution,/架空の商品 \/ 架空の色/);assert.match(result.pausedExecution,/1カット中0カット撮影済み/);
 assert.equal(result.pausedCaptionCopied,'架空の本文。\n次の段落。','pausedでも本文全文をコピーできる');
 assert.equal(result.homeStories,4);assert.equal(result.executionStories,4);assert.equal(result.pausedTasks,0);
 assert.match(result.plannedHome,/今日の投稿を準備しましょう/);assert.match(result.plannedExecution,/投稿予定/);
 assert.match(result.postedHome,/投稿済み（実投稿日/);assert.match(result.postedExecution,/投稿済み（実投稿日/);assert.equal(result.postedTasks,1,'実投稿のみ7日後評価を作成');
 assert.match(result.noPostHome,/今日は投稿しない/);assert.equal(result.notPostedTasks,0);assert.equal(result.storedUnchanged,true);assert.equal(result.fitsPhone,true);assert.deepEqual(errors,[]);
 console.log('PASS paused HOME/execution, Story1-4, shots, planned/posted status, 7d eligibility, no storage write');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}}
run().catch(error=>{console.error(error);server.close();process.exitCode=1;});
