const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const editorial=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const ui=fs.readFileSync('dist/v7-story-ui.js','utf8');
const V7StoryState=require('./dist/v7-story-state.js');
const date='2026-11-05';
const clone=structuredClone;
const base=()=>({posts:[{id:'post-1',date,format:'Feed',revision:1,manual:true,caption:'手動本文',cta:'手動CTA',skuIds:['sku-old'],shots:[{id:'cut-1',media:'写真',what:'手動撮影',skuIds:[],signature:'done-1'}],sequence:[{shotId:'cut-1'}],stories:[]}],storyDays:[1,2,3,4].map(slot=>({id:'story-'+slot,date,slot,text:'手動Story'+slot,manual:true})),reactions:[],shotDone:{'shot-id|cut-1':true},records:[{id:'7d'}],sales:[{id:'sale'}]});
const plan=()=>({date,format:'Feed',primaryPurpose:'BUSINESS',themeId:null,mainTopic:'AI企画',customerValue:'価値',mainPostBody:'AI本文',CTA:'AI CTA',products:[],shots:[{media:'写真',what:'AI撮影',count:1,skuIds:[]}],story1:{text:'AI Story1'},story2:{text:'AI Story2'},story3:{text:'AI Story3'},story4:{text:'AI Story4'}});
let id=0,writes=0;
const ctx={demo:base(),V7StoryState,structuredClone,OFFICIAL_TOPICS:[],V7_OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],STORY_ROLES:['知る','対話','発見','導線'],displayedPeriod:'current',MOCK_KEY:'qa',SCHEMA:'qa',SINGLE_SCOPE:'single-day-reproposal',newId:()=>`new-${++id}`,short:value=>value,html:String,
  validate:()=>[],importPeriod:()=>({from:date,to:date}),qualityAudit:()=>({exposure:{issues:[]}}),salesCycleBlock:()=>({nextFrom:date}),persist(){},finishPreview(){},
  localStorage:{setItem(){writes++;}},window:{todo2SyncBridge:{read:()=>({}),flush:async()=>{}}},
  dx:()=>({close(){},querySelector:()=>({textContent:''})}),refreshWork(){},toast(){},openForm:(_title,body,onSave)=>{ctx.singleBody=body;ctx.singleSave=onSave;},
  skuLabel:value=>value,validateSingle:()=>null};
ctx.shotDoneFor=shot=>!!(ctx.demo.shotDone['shot-id|'+shot.id]??ctx.demo.shotDone[shot.signature]);
vm.createContext(ctx);
vm.runInContext(editorial.slice(editorial.indexOf('function importProtection('),editorial.indexOf('function validateEditorialShots(')),ctx);
vm.runInContext(editorial.slice(editorial.indexOf('function editorialCoverageIssues('),editorial.indexOf('function validate(data)')),ctx);
vm.runInContext(editorial.slice(editorial.indexOf('async function savePreview(target)'),editorial.indexOf('function finishPreview(')),ctx);
vm.runInContext(ui.slice(ui.indexOf('function v7StoryHasReaction'),ui.indexOf('// Single-day proposals use')),ctx);
vm.runInContext(editorial.slice(editorial.indexOf('function showSingleOptInPreview'),editorial.indexOf('function openSingleImport(')),ctx);
const counts=state=>({posts:state.posts.length,stories:state.storyDays.length,ids:Array.from(state.storyDays,story=>story.id),reactions:state.reactions.length,done:Object.keys(state.shotDone).length,records:state.records.length,sales:state.sales.length});
const storySnapshot=()=>({[date]:[1,2,3,4].map(slot=>ctx.demo.storyDays.filter(story=>story.date===date&&story.slot===slot).map(story=>JSON.stringify(story)))});
async function ten(selection){ctx.demo=base();const before=counts(ctx.demo),target={data:{plans:[plan()]},period:{from:date,to:date},revisions:{[date]:{id:'post-1',revision:1}},storySnapshot:storySnapshot(),legacyChoices:{},approvals:{[date]:{v7Selection:true,meta:false,caption:false,cta:false,products:false,shots:false,stories:[],...selection}},exposureConfirmed:true};await ctx.savePreview(target);assert.deepEqual(counts(ctx.demo),before);return ctx.demo;}
(async()=>{
  ctx.demo=base();const untouched=JSON.stringify(ctx.demo),initialWrites=writes;await assert.rejects(tenLockedNone(),/すべての投稿が保護/);assert.equal(JSON.stringify(ctx.demo),untouched);assert.equal(writes,initialWrites);
  function tenLockedNone(){return ctx.savePreview({data:{plans:[plan()]},period:{from:date,to:date},revisions:{[date]:{id:'post-1',revision:1}},legacyChoices:{},approvals:{[date]:{v7Selection:true,meta:false,caption:false,cta:false,products:false,shots:false,stories:[]}},exposureConfirmed:true});}
  let state=await ten({caption:true});assert.equal(state.posts[0].caption,'AI本文');assert.equal(state.posts[0].cta,'手動CTA');assert.deepEqual(state.posts[0].skuIds,['sku-old']);
  state=await ten({cta:true});assert.equal(state.posts[0].cta,'AI CTA');assert.equal(state.posts[0].caption,'手動本文');
  state=await ten({products:true});assert.deepEqual(Array.from(state.posts[0].skuIds),[]);assert.equal(state.posts[0].caption,'手動本文');
  state=await ten({stories:[2]});assert.deepEqual(Array.from(state.storyDays,story=>story.text),['手動Story1','AI Story2','手動Story3','手動Story4']);
  state=await ten({stories:[3]});assert.deepEqual(Array.from(state.storyDays,story=>story.text),['手動Story1','手動Story2','AI Story3','手動Story4']);
  state=await ten({shots:true,sameShots:[0]});assert.equal(state.posts[0].shots[0].id,'cut-1');assert.equal(state.posts[0].shots[0].what,'AI撮影');assert.equal(state.shotDone['shot-id|cut-1'],true);
  state=await ten({shots:true});assert.notEqual(state.posts[0].shots[0].id,'cut-1');assert.equal(ctx.shotDoneFor(state.posts[0].shots[0]),false);
  ctx.demo=base();ctx.demo.reactions=[{id:'reaction-1',sourceStory:{storyId:'story-1'}}];const lockedBefore=JSON.stringify(ctx.demo),writesBefore=writes;await assert.rejects(tenLocked(),/反応が記録/);assert.equal(JSON.stringify(ctx.demo),lockedBefore);assert.equal(writes,writesBefore);
  function tenLocked(){const target={data:{plans:[plan()]},period:{from:date,to:date},revisions:{[date]:{id:'post-1',revision:1}},storySnapshot:storySnapshot(),legacyChoices:{},approvals:{[date]:{v7Selection:true,meta:false,caption:false,cta:false,products:false,shots:false,stories:[1]}},exposureConfirmed:true};return ctx.savePreview(target);}
  for(const selection of [['caption'],['cta'],['products'],['story2'],['story3'],['shots']]){
    ctx.demo=base();ctx.singlePreview={postId:'post-1',before:plan(),after:plan(),revision:1};ctx.showSingleOptInPreview();assert.match(ctx.singleBody,/name="singleApprove"/);
    const approved=selection;ctx.singleSave({getAll:name=>name==='singleApprove'?approved:[]});
    assert.deepEqual(counts(ctx.demo),counts(base()));
    assert.equal(ctx.demo.posts[0].caption,approved.includes('caption')?'AI本文':'手動本文');
    assert.equal(ctx.demo.posts[0].cta,approved.includes('cta')?'AI CTA':'手動CTA');
    assert.deepEqual(Array.from(ctx.demo.posts[0].skuIds),approved.includes('products')?[]:['sku-old']);
    assert.equal(ctx.demo.storyDays[1].text,approved.includes('story2')?'AI Story2':'手動Story2');
    assert.equal(ctx.demo.storyDays[2].text,approved.includes('story3')?'AI Story3':'手動Story3');
  }
  ctx.demo=base();ctx.demo.reactions=[{id:'reaction-1',sourceStory:{storyId:'story-1'}}];ctx.singlePreview={postId:'post-1',before:plan(),after:plan(),revision:1};ctx.showSingleOptInPreview();const singleLockedBefore=JSON.stringify(ctx.demo);assert.throws(()=>ctx.singleSave({getAll:name=>name==='singleApprove'?['story1']:[]}),/反応が記録/);assert.equal(JSON.stringify(ctx.demo),singleLockedBefore);
  ctx.demo=base();ctx.singlePreview={postId:'post-1',before:plan(),after:plan(),revision:1};ctx.showSingleOptInPreview();const singleUntouched=JSON.stringify(ctx.demo);assert.throws(()=>ctx.singleSave({getAll:()=>[]}),/変更する項目/);assert.equal(JSON.stringify(ctx.demo),singleUntouched);
  console.log('PASS v7 editorial opt-in: ten-day and single-day field/Story selection, counts, reaction lock');
})().catch(error=>{console.error(error);process.exitCode=1;});
