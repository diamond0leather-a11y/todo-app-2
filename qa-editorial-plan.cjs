const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to));
const date='2026-10-11';
const ctx={SCHEMA:'cian-editorial-v1',SINGLE_SCOPE:'single-day-reproposal',
 OFFICIAL_TOPICS:[{id:'official-01',group:'LEATHER'}],validAxes:['BUSINESS'],
 sku:id=>id==='sku-a'?{id}:null,blocked:()=>false,short:value=>value,
 cycleDay:()=> 'Day7',dayDiff:(left,right)=>(Date.parse(left+'T00:00:00Z')-Date.parse(right+'T00:00:00Z'))/86400000,dayAdd:(value,days)=>new Date(Date.parse(value+'T00:00:00Z')+days*86400000).toISOString().slice(0,10),
 importPeriod:()=>({from:'2026-10-05',to:'2026-10-14',dayFrom:1}),warnings:()=>[],
 qualityAudit:plans=>({issues:plans.flatMap(plan=>ctx.story2Issue(plan.story2)?[{level:'要修正',text:ctx.story2Issue(plan.story2)}]:[])})};
vm.createContext(ctx);
vm.runInContext(section('function answerable(', 'function storyQuality('),ctx);
vm.runInContext(section('function validateEditorialShots(', 'function openImport('),ctx);
vm.runInContext(section('function validateSingle(data,date)', 'function singleDayShotUpdate('),ctx);
const original=ctx.validateEditorialPlan;
let sharedCalls=0;
ctx.validateEditorialPlan=(...args)=>{sharedCalls++;return original(...args);};

const plan=()=>({date,dayNumber:7,format:'Feed',primaryPurpose:'BUSINESS',customerValue:'商品を比較できる',themeId:'official-01',themeCategory:'LEATHER',mainTopic:'新商品の紹介',angle:'形を見る',products:['sku-a'],mainPostBody:'商品の形を具体的に紹介します。'.repeat(30),
 story1:{text:'今のファッションを知る',asset:'写真',materialMode:'新規撮影必要',action:'読む'},
 story2:{text:'どちらを詳しく見たいですか？',kind:'アンケート',options:['外側','内側'],asset:'写真',materialMode:'新規撮影必要',action:'投票する'},
 story3:{text:'商品の形を知る',asset:'写真',materialMode:'新規撮影必要',action:'見る'},
 story4:{text:'今日のFeedで形を確認する',asset:'写真',materialMode:'新規撮影必要',action:'Feedを開く'},CTA:null,
 shots:[{media:'写真',what:'1カット目｜商品',count:1,skuIds:['sku-a']}]});
const ten=p=>ctx.validate({schema:ctx.SCHEMA,scope:'ten-day',plans:Array.from({length:10},(_,i)=>i===6?p:{...plan(),date:ctx.dayAdd('2026-10-05',i),dayNumber:i+1})});
const single=p=>ctx.validateSingle({schema:ctx.SCHEMA,scope:ctx.SINGLE_SCOPE,plan:p},date);

assert.equal(ten(plan()).length,0);
assert.equal(single(plan()).id,'official-01');
for(const absent of [null,undefined]){
 const optional=plan();if(absent===undefined)delete optional.themeId;else optional.themeId=absent;
 delete optional.themeCategory;
 assert.equal(ten(optional).length,0);
 assert.equal(single(optional),null);
 optional.themeCategory='BUSINESS';
 assert.equal(ten(optional).length,0,'themeCategory does not classify a plan without an official theme');
 assert.equal(single(optional),null);
}
for(const id of ['', 'official-999', 'extra-sale', 'unknown']){
 const invalid=plan();invalid.themeId=id;
 assert.throws(()=>ten(invalid),undefined,`ten-day rejects ${id}`);
 assert.throws(()=>single(invalid),undefined,`single-day rejects ${id}`);
}
const wrongCategory=plan();wrongCategory.themeCategory='CUSTOMER';
assert.throws(()=>ten(wrongCategory),/テーマ分類/);
assert.throws(()=>single(wrongCategory),/カテゴリ/);
const noTopic=plan();delete noTopic.themeId;delete noTopic.themeCategory;delete noTopic.mainTopic;
assert.throws(()=>ten(noTopic),/テーマ/);
assert.throws(()=>single(noTopic),/テーマ/);
assert.ok(sharedCalls>=2,'both entry points must call the shared validator');
const originalPlan=plan(),normal=ctx.normalizeEditorialPlan({...originalPlan,mainTopic:'  新商品の紹介  '});
assert.equal(normal.mainTopic,'新商品の紹介');
assert.equal(originalPlan.mainTopic,'新商品の紹介');
assert.notEqual(normal.products,originalPlan.products);
for(const [label,change] of [
 ['format',p=>p.format='Carousel'],['themeId',p=>p.themeId='missing'],
 ['product SKU',p=>p.products=['missing']]
]){
 const bad=plan();change(bad);
 assert.throws(()=>ten(bad),undefined,`ten-day ${label}`);
 assert.throws(()=>single(bad),undefined,`single-day ${label}`);
}
const badPoll=plan();badPoll.story2.options=[];
assert.ok(ten(badPoll).some(issue=>issue.level==='要修正'),'ten-day keeps whole-plan issue reporting');
assert.throws(()=>single(badPoll),/アンケート/);
const noShots=plan();delete noShots.shots;
assert.throws(()=>ten(noShots),/撮影指示/);
assert.equal(single(noShots).id,'official-01');
assert.equal(single(plan()).id,'official-01');
const concept=fs.readFileSync('three-axis.js','utf8');
const published=fs.readFileSync('dist/index.html','utf8');
const conceptCheck=concept.match(/^function generatedConceptError\(post\).*$/m)?.[0];
assert.ok(conceptCheck&&published.includes(conceptCheck),'source and published concept validation match');
assert.ok(concept.includes("sale:null")&&published.includes("sale:null"),'sale brief has no fabricated official parent');
assert.ok(concept.includes('post.themeId=topic.id;')&&published.includes('post.themeId=topic.id;'),'generated official topic uses its official ID');
const conceptCtx={OFFICIAL_TOPICS:ctx.OFFICIAL_TOPICS,AXES:{BUSINESS:'販売'}};
vm.createContext(conceptCtx);vm.runInContext(conceptCheck,conceptCtx);
assert.equal(conceptCtx.generatedConceptError({theme:'新発売案内',parentId:null,primaryAxis:'BUSINESS'}),'');
assert.match(conceptCtx.generatedConceptError({theme:'案内',parentId:'official-999',primaryAxis:'BUSINESS'}),/親テーマID/);
const planner=fs.readFileSync('dist/period-planner.js','utf8');
const story1Check=planner.match(/^function story1Candidate\(post,attempt\).*$/m)?.[0];
assert.ok(story1Check);
const plannerCtx={OFFICIAL_TOPICS:ctx.OFFICIAL_TOPICS};vm.createContext(plannerCtx);
vm.runInContext(story1Check,plannerCtx);
assert.equal(plannerCtx.story1Candidate({parentId:null,theme:'販売ラインナップ',takeaway:'次回予定',topicGroup:null}).parentId,null);
console.log('PASS shared Plan normalizer/validator on ten-day and single-day paths');
