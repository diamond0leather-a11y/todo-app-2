const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const page=fs.readFileSync('dist/index.html','utf8');
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
const original={id:'post-a',date:'2026-10-11',revision:1,parentId:'official-01',themeId:'official-01',topicGroup:'LEATHER',shots:[],stories:[],skuIds:[]};
const untouched={...original,id:'post-b',date:'2026-10-12'};
const ctx={demo:{posts:[original,untouched],storyDays:[]},displayedPeriod:'current',structuredClone,OFFICIAL_TOPICS:[{id:'official-01',group:'LEATHER'}],V7_OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[{id:'official-01',group:'LEATHER'}],STORY_ROLES:['知る','参加','発見','導線'],
 V7StoryState:require('./dist/v7-story-state.js'),
 importPeriod:()=>({from:'2026-10-05',to:'2026-10-14'}),validate:()=>[],qualityAudit:()=>({exposure:{issues:[]}}),
 importProtection:()=>({whole:false,meta:false,caption:false,stories:[false,false,false,false]}),
 newId:()=> 'new-post',short:value=>value,salesCycleBlock:()=>({nextFrom:'2026-11-09'}),
 localStorage:{setItem(_key,value){ctx.local=JSON.parse(value);}},MOCK_KEY:'test',persist(){},refreshWork(){},
 previewDialog:{close(){}},toast(){},window:{todo2SyncBridge:{read:()=>({}),flush:async()=>{}}}};
vm.createContext(ctx);
vm.runInContext(page.slice(page.indexOf('function storyDate('),page.indexOf('function dayAdd(')),ctx);
vm.runInContext(between('function editorialPostForDate(', 'function validateEditorialShots('),ctx);
vm.runInContext(between('async function savePreview(target)', 'function copyText(scope)'),ctx);
const plan={date:original.date,format:'Feed',primaryPurpose:'BUSINESS',themeId:null,mainTopic:'次回販売ラインナップ',customerValue:'次回商品を把握できる',CTA:'',products:[],mainPostBody:'本文',shots:[{media:'写真',what:'表紙',count:1,skuIds:[]}],story1:{text:'文化'},story2:{text:'質問'},story3:{text:'発見'},story4:{text:'案内'}};
const target={data:{plans:[plan]},period:{from:'2026-10-05',to:'2026-10-14'},revisions:{[original.date]:{id:original.id,revision:1}},storySnapshot:{[original.date]:[[],[],[],[]]},legacyChoices:{},approvals:{[original.date]:{v7Selection:true,meta:true,caption:false,cta:false,products:false,shots:false,stories:[]}},researchConfirmed:false,exposureConfirmed:true};
ctx.savePreview(target).then(async()=>{
 const saved=ctx.demo.posts[0];
 assert.equal(saved.id,original.id);
 assert.equal(saved.parentId,null);
 assert.equal(saved.themeId,null);
 assert.equal(saved.topicGroup,null);
 assert.equal(saved.theme,plan.mainTopic);
 assert.equal(ctx.local.posts[0].parentId,null);
 assert.equal(ctx.local.posts[0].themeId,null);
 assert.equal(original.parentId,'official-01','original object is not mutated before persistence');
 assert.equal(ctx.demo.posts[1].themeId,'official-01','unrelated post is preserved');
 ctx.demo.storyDays=[{id:'standalone-story-1',date:'2026-10-13',slot:1,text:'独立Story',asset:'写真'}];
 const nextPlan={...plan,date:'2026-10-13'};
 const nextTarget={data:{plans:[nextPlan]},period:{from:'2026-10-05',to:'2026-10-14'},revisions:{'2026-10-13':{id:null,revision:null}},storySnapshot:{'2026-10-13':[[JSON.stringify(ctx.demo.storyDays[0])],[],[],[]]},legacyChoices:{},approvals:{'2026-10-13':{v7Selection:true,createPost:true,meta:false,caption:false,cta:false,products:false,shots:false,stories:[]}},researchConfirmed:false,exposureConfirmed:true};
 await ctx.savePreview(nextTarget);
 const imported=ctx.demo.posts.find(post=>post.date==='2026-10-13');
 assert.equal(imported.stories.length,0,'new Feed post does not copy or create Story without explicit slot selection');
 assert.equal(ctx.demo.storyDays[0].id,'standalone-story-1');
 console.log('PASS ten-day null theme clears only target post official references and survives local save');
}).catch(error=>{console.error(error);process.exitCode=1;});
