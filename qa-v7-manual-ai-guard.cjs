const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const editorial=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const ui=fs.readFileSync('dist/v7-story-ui.js','utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const date='2026-11-05';
const makePost=()=>({id:'post-1',date,revision:1,manual:false,caption:'元本文',cta:'元CTA',skuIds:['sku-old'],shots:[{id:'shot-old',media:'写真',what:'元撮影',count:1,skuIds:['sku-old'],signature:'done-old'}],sequence:[{order:1,words:'言葉',shotId:'shot-old'}],stories:[1,2,3,4].map(slot=>({id:'story-'+slot,date,slot,text:'元Story'+slot,manual:false}))});
const plan=()=>({date,format:'Feed',primaryPurpose:'BUSINESS',themeId:null,mainTopic:'新テーマ',customerValue:'価値',mainPostBody:'AI本文',CTA:'AI CTA',products:['sku-new'],shots:[{media:'写真',what:'AI撮影',count:1,skuIds:['sku-new']}],story1:{text:'AI Story1'},story2:{text:'AI Story2'},story3:{text:'AI Story3'},story4:{text:'AI Story4'}});
const ctx={demo:{posts:[],storyDays:[],reactions:[],shotDone:{}},V7StoryState:require('./dist/v7-story-state.js'),structuredClone,OFFICIAL_TOPICS:[],V7_OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],STORY_ROLES:['知る','対話','発見','導線'],displayedPeriod:'current',MOCK_KEY:'qa',
 importPeriod:()=>({from:date,to:date}),validate:()=>[],qualityAudit:()=>({exposure:{issues:[]}}),salesCycleBlock:()=>({nextFrom:date}),short:value=>value,
 newId:()=> 'new-post',newStoryIdentity:(post,story)=>({...story,id:'new-story-'+story.slot,date:post.date}),persist(){},finishPreview(){},
 localStorage:{setItem(){}},window:{todo2SyncBridge:{read:()=>({}),flush:async()=>{}}}};
vm.createContext(ctx);
ctx.shotDoneFor=shot=>!!ctx.demo.shotDone[shot.signature];
vm.runInContext(editorial.slice(editorial.indexOf('function importProtection('),editorial.indexOf('function validateEditorialShots(')),ctx);
vm.runInContext(editorial.slice(editorial.indexOf('async function savePreview(target)'),editorial.indexOf('function finishPreview(')),ctx);
async function apply(post,selection){ctx.demo.posts=[post];ctx.demo.storyDays=[];const p=plan();await ctx.savePreview({data:{plans:[p]},period:{from:date,to:date},revisions:{[date]:{id:post.id,revision:post.revision}},storySnapshot:{[date]:[1,2,3,4].map(slot=>ctx.V7StoryState.entriesOnDate(ctx.demo,date).filter(entry=>entry.slot===slot).map(entry=>JSON.stringify(entry.story)))},legacyChoices:{},approvals:{[date]:{v7Selection:true,createPost:false,meta:false,caption:false,cta:false,products:false,shots:false,stories:[],...selection}},exposureConfirmed:true});return ctx.demo.posts[0];}
function manual(post,fields){post.manual=true;post.manualFields={...fields,revision:post.revision};return post;}
(async()=>{
 let post=manual(makePost(),{caption:true});post=await apply(post,{cta:true,products:true});assert.equal(post.caption,'元本文');assert.equal(post.cta,'AI CTA');assert.deepEqual(clone(post.skuIds),['sku-new']);
 post=manual(makePost(),{cta:true});post=await apply(post,{caption:true});assert.equal(post.cta,'元CTA');assert.equal(post.caption,'AI本文');
 post=manual(makePost(),{products:true});post=await apply(post,{caption:true});assert.deepEqual(clone(post.skuIds),['sku-old']);assert.equal(post.caption,'AI本文');
 post=manual(makePost(),{shots:true});post=await apply(post,{caption:true});assert.equal(post.shots[0].what,'元撮影');assert.equal(post.sequence[0].shotId,'shot-old');
 post=makePost();ctx.demo.shotDone={'done-old':true};post=await apply(post,{caption:true});assert.equal(post.shots[0].signature,'done-old');assert.equal(ctx.demo.shotDone['done-old'],true);ctx.demo.shotDone={};
 for(let slot=1;slot<=4;slot++){post=manual(makePost(),{stories:[1,2,3,4].map(n=>n===slot)});post=await apply(post,{caption:true});assert.equal(post.stories[slot-1].text,'元Story'+slot);}
 post=makePost();post.date='2026-11-07';manual(post,{schedule:true,scheduleDates:[date]});ctx.demo.posts=[post];assert.equal(ctx.editorialPostForDate(ctx.demo.posts,date),post);assert.equal(ctx.importProtection(post).whole,false);assert.equal(post.date,'2026-11-07');
 post=makePost();post=await apply(post,{caption:true,shots:true});assert.equal(post.caption,'AI本文');assert.equal(post.shots[0].what,'AI撮影');
 const formCtx={demo:{posts:[makePost()]},structuredClone,openForm:(_title,_body,onSave)=>onSave({})};vm.createContext(formCtx);
 vm.runInContext(ui.slice(ui.indexOf('const v7ManualOpenForm='),ui.indexOf('// The post detail and batch-shoot')),formCtx);
 formCtx.openForm('冒頭・CTA','',()=>{const p=formCtx.demo.posts[0];p.cta='手動CTA';p.manual=true;p.revision++;});
 assert.equal(formCtx.demo.posts[0].manualFields.cta,true);assert.equal(formCtx.demo.posts[0].manualFields.meta,undefined);
 formCtx.openForm('投稿の日程・商品','',()=>{const p=formCtx.demo.posts[0];p.date='2026-11-07';p.skuIds=['sku-manual'];p.revision++;});
 assert.deepEqual(clone(formCtx.demo.posts[0].manualFields.scheduleDates),[date]);assert.equal(formCtx.demo.posts[0].manualFields.products,true);
 const storyCtx={demo:{posts:[makePost()]},structuredClone,openForm:(_title,_body,onSave)=>onSave({})};vm.createContext(storyCtx);
 vm.runInContext(ui.slice(ui.indexOf('const v7ManualOpenForm='),ui.indexOf('// The post detail and batch-shoot')),storyCtx);
 storyCtx.openForm('Story 2｜対話','',()=>{const p=storyCtx.demo.posts[0];p.stories[1].text='手動Story2';p.stories[1].manual=true;p.manual=true;p.revision++;});
 assert.equal(storyCtx.demo.posts[0].manualFields.stories[1],true);assert.equal(storyCtx.demo.posts[0].manualFields.meta,undefined);
 console.log('PASS v7 manual AI guard: caption, CTA, products, shots/done, Story1-4, moved date, normal import, form field tracking');
})().catch(error=>{console.error(error);process.exitCode=1;});
