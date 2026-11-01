const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const appSource=fs.readFileSync('dist/index.html','utf8');
const ui=fs.readFileSync('dist/v7-story-ui.js','utf8');
const stateApi=require('./dist/v7-story-state.js');
const start='2026-10-30';
const dates=Array.from({length:10},(_,index)=>{const day=new Date(start+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+index);return day.toISOString().slice(0,10);});
const makeStory=(date,slot)=>({text:`${date} の Story ${slot} を見る理由と具体的な案内です`,asset:`${date} の写真 ${slot}`,action:`${date} の次の行動 ${slot}`,materialMode:'過去素材使用可',skuIds:[],...(slot===2?{kind:'会話'}:{})});
const feedBody=[
 'この日は、革小物を毎日の持ち物にどう合わせるかを考えます。まず机の上に普段持ち歩くカード、鍵、紙類を並べ、何を一緒に持ちたいのかを目で確認します。',
 '最初の写真は小物の外側を手元と同じ画面に入れて撮ります。次の写真では開いた状態を見せ、収納部の位置と出し入れする向きを確かめます。実際に入る量は商品の仕様と実物を確認し、写真だけで断定しません。',
 '使う場面は、出かける前に持ち物をしまうときと、外出先で必要な物を取り出すときに分けます。同じ形でも、よく使うものをどこへ入れるかによって感じ方は変わります。',
 '革の色や表情を比べる場合は、光の条件と背景をそろえます。暗い写真と明るい写真を並べて素材の差だと決めつけず、確認できる範囲を丁寧に伝えます。',
 '購入前には、今使っている小物のどこに困っているのかを書き出すと選びやすくなります。収納が足りないのか、大きさが合わないのか、手に持ったときの動きが気になるのかを分けてみてください。',
 '商品ページでは素材、寸法、販売予定を確認できます。分からない点は質問として残し、実物で確かめてから答えます。今日の写真が、自分に合う使い方を考えるきっかけになれば幸いです。'
].join('\n\n');
assert.ok([...feedBody].length>=500,'Feedあり日の架空AI本文は500文字以上');
const makePlan=(date,index)=>({date,dayNumber:index+1,format:index%2?'Reel':'Feed',primaryPurpose:'CUSTOMER_VALUE',customerValue:'暮らしの使い方',themeId:null,mainTopic:'架空の投稿',mainPostBody:feedBody,products:[],shots:[{media:'写真',what:'テスト用の手元を撮る',count:1,skuIds:[]}],CTA:'商品を見る',...Object.fromEntries([1,2,3,4].map(slot=>['story'+slot,makeStory(date,slot)]))});
const plans=dates.map(makePlan);
const ctx={V7StoryState:stateApi,demo:{posts:[],storyDays:[],reactions:[],shotDone:{},records:[],salesResults:{}},structuredClone,OFFICIAL_TOPICS:[],V7_OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],STORY_ROLES:['毎日見る理由','会話','販売SKU補完','次の行動'],SCHEMA:'qa',validAxes:['CUSTOMER_VALUE','INSTAGRAM_GROWTH','BUSINESS'],MOCK_KEY:'qa',displayedPeriod:'current',newId:(()=>{let id=0;return ()=>`qa-story-${++id}`;})(),short:value=>value,html:String,sku:()=>null,skuLabel:value=>value,
  blocked:()=>false,dayDiff:(to,from)=>Math.round((Date.parse(to)-Date.parse(from))/86400000),dayAdd:(date,n)=>{const day=new Date(date+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+n);return day.toISOString().slice(0,10);},
  importPeriod:()=>({from:dates[0],to:dates[9],dayFrom:1}),warnings:()=>[],qualityAudit:()=>({issues:[],exposure:{issues:[]}}),validate:()=>[],salesCycleBlock:()=>({nextFrom:dates[0]}),persist(){},finishPreview(){},refreshWork(){},toast(){},
  localStorage:{saved:null,setItem(_key,value){this.saved=value;}},window:{todo2SyncBridge:{read:()=>({}),flush:async()=>{}}}};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('function story2Kind('),source.indexOf('function storyQuality(')),ctx);
vm.runInContext(source.slice(source.indexOf('function validateEditorialShots('),source.indexOf('function normalizeEditorialPlan(')),ctx);
vm.runInContext(source.slice(source.indexOf('function normalizeEditorialPlan('),source.indexOf('function openImport(')),ctx);
vm.runInContext(source.slice(source.indexOf('function importProtection('),source.indexOf('function validateEditorialShots(')),ctx);
vm.runInContext(source.slice(source.indexOf('async function savePreview(target)'),source.indexOf('function finishPreview(')),ctx);
vm.runInContext(ui.slice(ui.indexOf('function v7StoryHasReaction'),ui.indexOf('const v7PreviousSaveStoryDraft')),ctx);
const snapshot=()=>Object.fromEntries(dates.map(date=>[date,[1,2,3,4].map(slot=>ctx.V7StoryState.entriesOnDate(ctx.demo,date).filter(entry=>entry.slot===slot).map(entry=>JSON.stringify(entry.story)))]));
const target=(selected={})=>({data:{schema:'qa',scope:'ten-day',plans:structuredClone(plans)},period:{from:dates[0],to:dates[9]},revisions:Object.fromEntries(dates.map(date=>{const post=ctx.demo.posts.find(p=>p.date===date&&!p.deleted);return [date,post?{id:post.id,revision:post.revision}:null];})),storySnapshot:snapshot(),legacyChoices:{},approvals:Object.fromEntries(dates.map(date=>[date,{v7Selection:true,createPost:false,meta:false,caption:false,cta:false,products:false,shots:false,stories:selected[date]||[]}])),exposureConfirmed:true});
(async()=>{
  assert.equal(ctx.validateEditorialPlan(plans[0],{scope:'ten-day'}).plan.format,'Feed');
  assert.equal(ctx.validateEditorialPlan(plans[1],{scope:'ten-day'}).plan.format,'Reel');
  assert.throws(()=>ctx.validateEditorialPlan({...plans[0],format:'投稿なし'},{scope:'ten-day'}),/FeedまたはReel/);
  assert.equal(ctx.validate({schema:'qa',scope:'ten-day',plans}).length,0);
  const qualityCtx={OFFICIAL_TOPICS:[],V7_OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],productContext:()=>[],postHistories:()=>({actualHistory:[]}),exposureSummary:()=>({last10:{bySku:{}},last20:{bySku:{}}}),monthlySaleStrategy:()=>[],skuLabel:String,short:String};
  vm.createContext(qualityCtx);vm.runInContext(source.slice(source.indexOf('function contentText('),source.indexOf('function importPeriod(')),qualityCtx);
  assert(Array.isArray(qualityCtx.qualityAudit(plans).issues),'quality checks accept all daily Feed/Reel and Story proposals');
  ctx.importPeriod=()=>({from:dates[0],to:dates[9],dayFrom:null});
  assert.equal(ctx.validate({schema:'qa',scope:'ten-day',plans}).length,0,'first sale has no prior day number');
  ctx.importPeriod=()=>({from:dates[0],to:dates[9],dayFrom:1});
  assert.throws(()=>ctx.validate({schema:'qa',scope:'ten-day',plans:plans.slice(0,9)}),/2026-11-08のFeed／ReelとStory1〜4がありません/);
  assert.throws(()=>ctx.validate({schema:'qa',scope:'ten-day',plans:[...plans,plans[0]]}),/重複/,'同日2件を拒否');
  const before=JSON.stringify(ctx.demo),none=target();await assert.rejects(ctx.savePreview(none),/保護されています/);assert.equal(JSON.stringify(ctx.demo),before);
  const missing=target({[dates[0]]:[1]});await assert.rejects(ctx.savePreview(missing),/Feed／Reel企画が未登録/,'Storyだけの保存で企画0件を残さない');assert.equal(JSON.stringify(ctx.demo),before);
  ctx.demo.posts=dates.map((date,index)=>({id:`existing-${index}`,date,format:plans[index].format,revision:1,stories:[],shots:[],skuIds:[],...(index===1?{noPostConfirmedAt:'2026-11-01T00:00:00Z'}:{})}));
  const storyEntry=(date,slot)=>({id:`existing-${date}-${slot}`,date,slot,text:`既存Story${slot}`});
  for(let count=0;count<=3;count++){const state={posts:ctx.demo.posts,storyDays:[1,2,3,4].slice(0,count).map(slot=>storyEntry(dates[0],slot))};const issues=ctx.editorialStoryCoverageIssues({plans:[plans[0]]},{},state);assert.match(issues.join(' '),new RegExp('Story'+(count+1)),'Story '+count+'件では不足枠を検出');}
  assert.match(ctx.editorialStoryCoverageIssues({plans:[plans[0]]},{},{posts:ctx.demo.posts,storyDays:[1,2,3,4,5].map(slot=>storyEntry(dates[0],slot))}).join(' '),/Story1〜4以外/,'Story5を拒否');
  assert.match(ctx.editorialStoryCoverageIssues({plans:[plans[0]]},{},{posts:ctx.demo.posts,storyDays:[1,1,2,3,4].map((slot,index)=>({...storyEntry(dates[0],slot),id:`duplicate-${index}`}))}).join(' '),/Story1が重複/,'同じ枠の重複を拒否');
  ctx.demo.storyDays=dates.flatMap(date=>[1,2,3,4].filter(slot=>date!==dates[0]||slot!==1).map(slot=>storyEntry(date,slot)));
  const missingStory=target();missingStory.approvals[dates[0]].caption=true;await assert.rejects(ctx.savePreview(missingStory),/Story1が未登録/,'投稿だけを採用してStoryを欠かさない');
  const first=target({[dates[0]]:[1]});await ctx.savePreview(first);assert.equal(ctx.demo.posts.length,10);assert.equal(ctx.demo.storyDays.length,40);assert.equal(ctx.demo.storyDays.filter(story=>story.date===dates[0]&&story.slot===1).length,1);assert.ok(ctx.demo.posts[1].noPostConfirmedAt,'投稿しない記録でも5件の企画を保持');
  for(const extra of [{...storyEntry(dates[0],1),id:'duplicate-slot'},storyEntry(dates[0],5)]){ctx.demo.storyDays.push(extra);const attempted=target();attempted.approvals[dates[0]].caption=true;const unchanged=JSON.stringify(ctx.demo);await assert.rejects(ctx.savePreview(attempted),/重複|Story1〜4以外/,'余分なStoryがあれば保存拒否');assert.equal(JSON.stringify(ctx.demo),unchanged);ctx.demo.storyDays.pop();}
  const storyId=ctx.demo.storyDays.find(story=>story.date===dates[0]&&story.slot===1).id;
  const second=target({[dates[0]]:[2,3],[dates[2]]:[1]});second.data.plans[0].story2.text='編集して採用した会話Story';await ctx.savePreview(second);assert.equal(ctx.demo.storyDays.length,40);assert.equal(ctx.demo.posts.length,10);assert.equal(ctx.demo.storyDays.find(story=>story.date===dates[0]&&story.slot===1).id,storyId);assert.equal(ctx.demo.storyDays.find(story=>story.date===dates[0]&&story.slot===2).text,'編集して採用した会話Story');
  assert.equal(ctx.demo.storyDays.filter(story=>story.date===dates[0]).length,4);
  const reloaded=JSON.parse(ctx.localStorage.saved);assert.equal(reloaded.storyDays.length,40);assert.equal(reloaded.posts.length,10);
  const stale=target({[dates[0]]:[1]});ctx.demo.storyDays.find(story=>story.id===storyId).text='別端末の編集';await assert.rejects(ctx.savePreview(stale),/プレビュー後に変更/);assert.equal(ctx.demo.storyDays.find(story=>story.id===storyId).text,'別端末の編集');
  ctx.demo.reactions.push({id:'reaction-1',sourceStory:{storyId}});const locked=target({[dates[0]]:[1]});await assert.rejects(ctx.savePreview(locked),/反応が記録/);assert.equal(ctx.demo.storyDays.find(story=>story.id===storyId).id,storyId);assert.equal(ctx.demo.reactions.length,1);
  ctx.demo={posts:dates.filter(date=>![dates[2],dates[3],dates[4],dates[5]].includes(date)).map((date,index)=>({id:date===dates[0]?'protected-post':`kept-${index}`,date,format:'Feed',revision:date===dates[0]?2:1,caption:date===dates[0]?'確定済み本文':'既存本文',stories:[],shots:[],skuIds:[],manual:date===dates[0]})),storyDays:dates.filter(date=>![dates[2],dates[3],dates[4],dates[5]].includes(date)).flatMap(date=>[1,2,3,4].map(slot=>storyEntry(date,slot))),reactions:[],shotDone:{},records:[],salesResults:{}};
  const selectedDates=dates.slice(2,6),selected=target(Object.fromEntries(selectedDates.map(date=>[date,[1,2,3,4]])));
  for(const date of selectedDates)selected.approvals[date].createPost=true;
  let flushCalls=0;ctx.window.todo2SyncBridge.flush=async(_state,postIds)=>{flushCalls++;assert.equal(postIds.length,4,'共有保存には選択した4投稿のIDだけを渡す');};
  await ctx.savePreview(selected);
  assert.equal(flushCalls,1,'共有保存を1回呼ぶ');
  assert.equal(ctx.demo.posts.length,10,'各日1件を維持し、選択した4日だけ投稿を作成');
  assert.equal(ctx.demo.storyDays.length,40,'全日Story4枠を維持し、選択した4日を追加');
  assert.deepEqual(ctx.demo.posts.filter(post=>post.id==='protected-post').map(post=>[post.revision,post.caption]),[[2,'確定済み本文']],'未選択の既存投稿を維持');
  assert.deepEqual(ctx.demo.posts.filter(post=>post.editorialSource==='chatgpt-import').map(post=>post.date),selectedDates,'未選択日は投稿を作成しない');
  const saved=JSON.parse(ctx.localStorage.saved);
  assert.equal(saved.posts.length,10,'再読み込み用の端末保存に全日1件が残る');
  assert.equal(saved.storyDays.length,40,'再読み込み用の端末保存に全日Story4枠が残る');
  ctx.demo.posts=ctx.demo.posts.filter(post=>post.date!==dates[6]);
  const offline=target({[dates[6]]:[1]});offline.approvals[dates[6]].createPost=true;
  ctx.window.todo2SyncBridge.flush=async()=>{throw Error('mock-offline');};
  await assert.rejects(ctx.savePreview(offline),/mock-offline/,'共有保存失敗を成功扱いしない');
  assert.ok(offline.localApplied,'共有保存失敗時も端末内の採用結果を保持する');
  ctx.demo.posts=[];ctx.createConcept=(date,index)=>({id:`generated-${date}`,date,format:index%2?'Reel':'Feed',caption:feedBody});ctx.planConflict=()=>false;
  const generatorAt=appSource.indexOf('function generatePlanDates(');
  vm.runInContext(appSource.slice(generatorAt,appSource.indexOf('\n',generatorAt)),ctx);
  const yearDates=Array.from({length:365},(_,index)=>ctx.dayAdd('2026-01-01',index));
  assert.equal(yearDates.at(-1),'2026-12-31');assert.equal(ctx.dayAdd('2026-12-31',1),'2027-01-01');
  assert.equal(ctx.generatePlanDates(yearDates).length,365,'365日すべてに1案を生成');
  assert.equal(new Set(ctx.demo.posts.map(post=>post.date)).size,365,'同日重複なし');
  assert.equal(ctx.generatePlanDates(yearDates).length,0,'再実行で二重登録しない');
  ctx.demo.posts.push({...ctx.demo.posts[0],id:'duplicate'});
  assert.throws(()=>ctx.generatePlanDates(yearDates),/重複/,'既存の同日2件は停止');
  ctx.demo.posts=[];ctx.createConcept=(date,index)=>({id:`draft-${index}`,date,format:index===1?'投稿なし':'Feed',caption:feedBody});
  assert.throws(()=>ctx.generatePlanDates(yearDates.slice(0,2)),/新規Feed／Reel本文/,'不正な案で全体を停止');
  assert.equal(ctx.demo.posts.length,0,'生成途中の失敗で部分保存しない');
  console.log('PASS ten-day daily plans: Feed/Reel coverage, 365 dates, year boundary, opt-in, Stories, reload, conflict, reaction lock');
})().catch(error=>{console.error(error);process.exitCode=1;});
