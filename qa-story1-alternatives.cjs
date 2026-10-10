const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'dist/story1-alternatives.js'),'utf8');
const page=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const sync=fs.readFileSync(path.join(__dirname,'dist/firebase-sync.js'),'utf8');
assert.match(page,/<script src="\.\/story1-alternatives\.js"><\/script>/,'published page loads Story1 alternatives');
const story1={slot:1,theme:'old Story1',text:'original',skuIds:[],storySpecVersion:3};
const post={id:'post-today',date:'2026-10-11',revision:2,theme:'Feed theme',format:'Reel',caption:'Feed caption',skuIds:['sku-1'],shots:[{id:'shot-1'}],stories:[story1,{slot:2,text:'Story2',skuIds:[]},{slot:3,text:'Story3',skuIds:[]},{slot:4,text:'Story4',skuIds:[]}]};
let state={categories:[{id:'cat-1'}],items:[{id:'item-1'}],skus:[{id:'sku-1'}],posts:[post],records:{'post-today|7d':{views:20}},months:{'2026-10':{date:'2026-10-04'}},reactions:[]};
const original=structuredClone(state);
let saved='',toastMessage='',clickHandler,section,afterExtras=false;
const extras={after(node){section=node;afterExtras=true;}};
const document={createElement:()=>({innerHTML:'',hidden:false}),addEventListener(type,listener){if(type==='click')clickHandler=listener;}};
const context={document,demo:state,TODAY:'2026-10-11',STORY_ROLES:['知る・役立つ・楽しむ','参加・対話する','発見','投稿へ'],storyDrafts:new Map(),structuredClone,html:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),dx:selector=>selector==='#dailyExtras'?extras:selector==='#story1Alternatives'?section:selector==='#view-home'?{classList:{contains:()=>false}}:null,currentStoryDraft:p=>({stories:[{theme:'unsaved proposal'},...p.stories.slice(1)]}),renderHome:()=>{},persist:()=>{saved=JSON.stringify(context.demo);},refreshWork:()=>context.renderHome(),toast:message=>{toastMessage=message;},Map,JSON};
vm.createContext(context);
vm.runInContext(source,context);
const bank=vm.runInContext('STORY1_ALTERNATIVE_BANK',context);
assert.equal(bank.length,6,'recently sourced candidate bank is available');
for(const candidate of bank){
  for(const field of ['id','genre','title','summary','body','imageInstruction','sourceName','sourceUrl'])assert(candidate[field],`${candidate.id} ${field}`);
  assert.match(candidate.imageInstruction,/1枚のみ|1点のみ/,'one directly related image per candidate');
  assert.match(candidate.imageInstruction,/権利条件を確認/,'image rights are not assumed');
  assert(candidate.publishedAt<='2026-10-11','source is already available on the target date');
  assert.match(candidate.sourceUrl,/^https:\/\//,'source URL is HTTPS');
}
const candidates=context.story1Alternatives(post);
assert.equal(candidates.length,5,'five alternatives for today');
assert.deepEqual(Array.from(candidates,c=>c.id),['chloe-paddington-2025','prada-re-nylon-2026','capella-kyoto-2026','vitra-water-garden-2026','japan-food-spending-2026'],'the approved five are displayed on October 11');
assert.match(candidates[1].body,/回収した製品を分解し、ナイロン6を化学的に再生/,'Prada adds a concrete primary-source fact');
assert.equal(new Set(candidates.map(c=>c.id)).size,5,'no duplicate alternative');
assert(new Set(candidates.map(c=>c.genre)).size>=4,'several different genres each day');
let fashionSlots=0;
for(let offset=0;offset<4;offset++){
  const day=new Date(Date.parse(post.date+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
  const selected=context.story1Alternatives({...post,date:day});
  assert.equal(selected.length,5);
  assert(new Set(selected.map(c=>c.genre)).size>=4,'genre mix is kept on every rotation');
  fashionSlots+=selected.filter(candidate=>candidate.genre==='ファッション').length;
}
assert.equal(fashionSlots,7,'fashion uses 35% of the four-day candidate rotation');
context.renderHome();
assert(afterExtras,'candidate section is placed after 撮影・プラン・予定');
assert.match(section.innerHTML,/Story1 サブ候補/);
assert.equal((section.innerHTML.match(/data-story1-alternative=/g)||[]).length,5,'five choice buttons render');
for(const candidate of candidates){assert(section.innerHTML.includes(candidate.title));assert(section.innerHTML.includes(candidate.sourceUrl));}

const choice=candidates[0];
const button={dataset:{story1Post:post.id,story1Alternative:choice.id}};
clickHandler({target:{closest:selector=>selector==='[data-story1-alternative]'?button:null}});
assert.equal(toastMessage,'今日のStory1だけ変更しました');
assert.equal(post.stories[0].alternativeId,choice.id);
assert.equal(post.stories[0].text,choice.body);
assert.equal(post.stories[0].asset,choice.imageInstruction);
assert.equal(post.stories[0].sourceName,choice.sourceName);
assert.equal(post.stories[0].sourceUrl,choice.sourceUrl);
assert.equal(post.stories[0].skuIds.length,0,'no product is forced into Story1');
assert.equal(context.story1Alternatives(post).length,5,'five new choices remain after replacement');
assert(!context.story1Alternatives(post).some(candidate=>candidate.title===choice.title),'current Story1 is not repeated as an alternative');
assert.equal(post.revision,3,'post revision records the edit');
const expected=structuredClone(original);
expected.posts[0].stories[0]=structuredClone(post.stories[0]);
expected.posts[0].revision=3;
assert.deepEqual(JSON.parse(JSON.stringify(state)),expected,'Story2–4, Feed/Reel, shots, products and other data are unchanged');
assert.equal(context.currentStoryDraft(post).stories[0].alternativeId,choice.id,'old automatic draft cannot mask saved Story1');

state=JSON.parse(saved);context.demo=state;context.refreshWork();
assert.equal(state.posts[0].stories[0].alternativeId,choice.id,'local reload keeps selected Story1');
assert.match(section.innerHTML,/Story1 サブ候補/,'home section survives reload');
const start=sync.indexOf('const clean='),end=sync.indexOf('const status=',start);
vm.runInContext(sync.slice(start,end),context);
const splitStart=sync.indexOf('function splitState('),splitEnd=sync.indexOf('async function readWorkspace(',splitStart);
vm.runInContext(sync.slice(splitStart,splitEnd),context);
const roundtrip=context.joinState(context.splitState(state));
assert.equal(roundtrip.posts[0].stories[0].alternativeId,choice.id,'Firestore-shaped roundtrip keeps selected Story1');
assert.deepEqual(JSON.parse(JSON.stringify(roundtrip.posts[0].stories.slice(1))),original.posts[0].stories.slice(1),'shared roundtrip keeps Story2–4');

state.posts[0].actualAt='2026-10-10T18:00:00+09:00';context.demo=state;
const beforePosted=JSON.stringify(state);
assert.equal(context.applyStory1Alternative(post.id,choice.id),false,'posted history is protected');
assert.equal(JSON.stringify(state),beforePosted);
console.log('PASS Story1 alternative UI, source/genre/one-photo rules, click replacement, isolation, local/shared reload, posted protection');
