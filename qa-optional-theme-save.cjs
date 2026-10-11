const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const between=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
const original={id:'post-a',date:'2026-10-11',revision:1,parentId:'official-01',themeId:'official-01',topicGroup:'LEATHER',shots:[],stories:[],skuIds:[]};
const untouched={...original,id:'post-b',date:'2026-10-12'};
const ctx={demo:{posts:[original,untouched]},displayedPeriod:'current',structuredClone,OFFICIAL_TOPICS:[{id:'official-01',group:'LEATHER'}],STORY_ROLES:['知る','参加','発見','導線'],
 importPeriod:()=>({from:'2026-10-05',to:'2026-10-14'}),validate:()=>[],qualityAudit:()=>({exposure:{issues:[]}}),
 importProtection:()=>({whole:false,meta:false,caption:false,stories:[false,false,false,false]}),
 newId:()=> 'new-post',short:value=>value,salesCycleBlock:()=>({nextFrom:'2026-11-09'}),
 localStorage:{setItem(_key,value){ctx.local=JSON.parse(value);}},MOCK_KEY:'test',persist(){},refreshWork(){},
 previewDialog:{close(){}},toast(){},window:{todo2SyncBridge:{read:()=>({}),flush:async()=>{}}}};
vm.createContext(ctx);
vm.runInContext(between('async function savePreview(target)', 'function copyText(scope)'),ctx);
const plan={date:original.date,format:'Feed',primaryPurpose:'BUSINESS',themeId:null,mainTopic:'次回販売ラインナップ',customerValue:'次回商品を把握できる',CTA:'',products:[],mainPostBody:'本文',shots:[{media:'写真',what:'表紙',count:1,skuIds:[]}],story1:{text:'文化'},story2:{text:'質問'},story3:{text:'発見'},story4:{text:'案内'}};
const target={data:{plans:[plan]},period:{from:'2026-10-05',to:'2026-10-14'},revisions:{[original.date]:{id:original.id,revision:1}},legacyChoices:{},researchConfirmed:false,exposureConfirmed:true};
ctx.savePreview(target).then(()=>{
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
 console.log('PASS ten-day null theme clears only target post official references and survives local save');
}).catch(error=>{console.error(error);process.exitCode=1;});
