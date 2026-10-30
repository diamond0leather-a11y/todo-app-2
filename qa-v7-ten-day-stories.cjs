const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const ui=fs.readFileSync('dist/v7-story-ui.js','utf8');
const stateApi=require('./dist/v7-story-state.js');
const start='2026-10-30';
const dates=Array.from({length:10},(_,index)=>{const day=new Date(start+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+index);return day.toISOString().slice(0,10);});
const makeStory=(date,slot)=>({text:`${date} の Story ${slot} を見る理由と具体的な案内です`,asset:`${date} の写真 ${slot}`,action:`${date} の次の行動 ${slot}`,materialMode:'過去素材使用可',skuIds:[],...(slot===2?{kind:'会話'}:{})});
const makePlan=(date,index)=>({date,dayNumber:index+1,format:'投稿なし',...Object.fromEntries([1,2,3,4].map(slot=>['story'+slot,makeStory(date,slot)]))});
const plans=dates.map(makePlan);
plans[2]={...plans[2],format:'Feed',primaryPurpose:'CUSTOMER_VALUE',customerValue:'暮らしの使い方',themeId:null,mainTopic:'架空の投稿',mainPostBody:'架空の投稿本文。'.repeat(40),products:[],shots:[{media:'写真',what:'テスト用の手元を撮る',count:1,skuIds:[]}],CTA:'商品を見る'};
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
const target=(selected={})=>({data:{schema:'qa',scope:'ten-day',plans:structuredClone(plans)},period:{from:dates[0],to:dates[9]},revisions:Object.fromEntries(dates.map(date=>[date,null])),storySnapshot:snapshot(),legacyChoices:{},approvals:Object.fromEntries(dates.map(date=>[date,{v7Selection:true,createPost:false,meta:false,caption:false,cta:false,products:false,shots:false,stories:selected[date]||[]}])),exposureConfirmed:true});
(async()=>{
  assert.equal(ctx.validateEditorialPlan(plans[0],{scope:'ten-day'}).plan.format,'投稿なし');
  assert.equal(ctx.validateEditorialPlan(plans[2],{scope:'ten-day'}).plan.format,'Feed');
  assert.equal(ctx.validate({schema:'qa',scope:'ten-day',plans}).length,0);
  const qualityCtx={OFFICIAL_TOPICS:[],V7_OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],productContext:()=>[],postHistories:()=>({actualHistory:[]}),exposureSummary:()=>({last10:{bySku:{}},last20:{bySku:{}}}),monthlySaleStrategy:()=>[],skuLabel:String,short:String};
  vm.createContext(qualityCtx);vm.runInContext(source.slice(source.indexOf('function contentText('),source.indexOf('function importPeriod(')),qualityCtx);
  assert(Array.isArray(qualityCtx.qualityAudit(plans).issues),'quality checks also accept Story-only dates without a runtime error');
  ctx.importPeriod=()=>({from:dates[0],to:dates[9],dayFrom:null});
  assert.equal(ctx.validate({schema:'qa',scope:'ten-day',plans}).length,0,'first sale has no prior day number');
  ctx.importPeriod=()=>({from:dates[0],to:dates[9],dayFrom:1});
  assert.throws(()=>ctx.validate({schema:'qa',scope:'ten-day',plans:plans.slice(0,9)}),/Story案がありません/);
  const before=JSON.stringify(ctx.demo),none=target();await assert.rejects(ctx.savePreview(none),/保護されています/);assert.equal(JSON.stringify(ctx.demo),before);
  const first=target({[dates[0]]:[1]});await ctx.savePreview(first);assert.equal(ctx.demo.posts.length,0);assert.equal(ctx.demo.storyDays.length,1);assert.equal(ctx.demo.storyDays[0].date,dates[0]);assert.equal(ctx.demo.storyDays[0].slot,1);
  const storyId=ctx.demo.storyDays[0].id;
  const second=target({[dates[0]]:[2,3],[dates[2]]:[1]});second.data.plans[0].story2.text='編集して採用した会話Story';await ctx.savePreview(second);assert.equal(ctx.demo.storyDays.length,4);assert.equal(ctx.demo.posts.length,0);assert.equal(ctx.demo.storyDays[0].id,storyId);assert.equal(ctx.demo.storyDays.find(story=>story.date===dates[0]&&story.slot===2).text,'編集して採用した会話Story');
  assert.equal(ctx.demo.storyDays.filter(story=>story.date===dates[0]).length,3);
  const reloaded=JSON.parse(ctx.localStorage.saved);assert.equal(reloaded.storyDays.length,4);assert.equal(reloaded.posts.length,0);
  const stale=target({[dates[0]]:[1]});ctx.demo.storyDays[0].text='別端末の編集';await assert.rejects(ctx.savePreview(stale),/プレビュー後に変更/);assert.equal(ctx.demo.storyDays[0].text,'別端末の編集');
  ctx.demo.reactions.push({id:'reaction-1',sourceStory:{storyId}});const locked=target({[dates[0]]:[1]});await assert.rejects(ctx.savePreview(locked),/反応が記録/);assert.equal(ctx.demo.storyDays[0].id,storyId);assert.equal(ctx.demo.reactions.length,1);
  console.log('PASS ten-day Story dates: all 10 required, post/no-post, opt-in only, storyDays-only, IDs, reload, conflict, reaction lock');
})().catch(error=>{console.error(error);process.exitCode=1;});
