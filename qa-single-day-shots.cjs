const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const editorial = fs.readFileSync('dist/chatgpt-editorial.js', 'utf8');
const between = (start, end) => editorial.slice(editorial.indexOf(start), editorial.indexOf(end));
const oldShot = {id:'old-shot',media:'写真',what:'旧撮影',count:1,skuIds:['sku-a']};
const post = {id:'post-11',date:'2026-10-11',revision:1,shots:[oldShot],sequence:[{order:1,visual:'旧撮影',shotId:'old-shot'}],stories:[{text:'旧Story'}],skuIds:['sku-a']};
const ctx = {
  demo:{posts:[post]},SCHEMA:'test-schema',SINGLE_SCOPE:'single-day-reproposal',
  OFFICIAL_TOPICS:[{id:'official-01',group:'LEATHER'}],validAxes:['BUSINESS'],STORY_ROLES:['知る','参加','発見','導線'],
  sku:id=>['sku-a','sku-b'].includes(id)?{id}:null,blocked:()=>false,cycleDay:()=> 'Day7',story2Issue:()=>'',
  protectedPost:()=>false,html:value=>String(value),short:value=>value,planComparison:()=>'',
  openForm(_title,_body,save){ctx.save=save;},dx:()=>({close(){},textContent:'',type:'button'}),
  persist(){ctx.saved=JSON.parse(JSON.stringify(post));},refreshWork(){ctx.refreshed=true;},
  periodReview:()=>[],rangePosts:()=>[]
};
vm.createContext(ctx);
vm.runInContext(between('function validateEditorialShots(', 'function validate(data)'),ctx);
vm.runInContext(between('function validateSingle(data,date)', 'function planComparison('),ctx);
vm.runInContext(between('function showSinglePreview()', 'function openSingleImport('),ctx);

const plan = () => ({date:post.date,format:'Feed',primaryPurpose:'BUSINESS',themeId:'official-01',themeCategory:'LEATHER',mainTopic:'新しいテーマ',customerValue:'価値',mainPostBody:'新しい本文',products:['sku-a'],CTA:null,
  story1:{text:'Story1'},story2:{text:'Story2'},story3:{text:'Story3'},story4:{text:'Story4'}});
const preview = input => {ctx.singlePreview={postId:post.id,before:{},after:input,revision:post.revision};ctx.showSinglePreview();ctx.save();};

// Legacy JSON does not supply shots. Neither shots nor sequence may change.
const oldShots=JSON.stringify(post.shots),oldSequence=JSON.stringify(post.sequence);
preview(plan());
assert.equal(JSON.stringify(post.shots),oldShots);
assert.equal(JSON.stringify(post.sequence),oldSequence);
assert.equal(post.theme,'新しいテーマ');

const shotPlan=plan();
shotPlan.shots=[{id:'new-a',media:'写真',what:'1カット目｜表紙',count:1,skuIds:['sku-a']},{id:'new-b',media:'写真',what:'2カット目｜商品',count:1,skuIds:['sku-b']}];
shotPlan.story3.shotId='new-b';
for(const [label,mutate] of [
  ['empty',p=>p.shots=[]],['media',p=>p.shots[0].media='音声'],
  ['count',p=>p.shots[0].count=0],['sku',p=>p.shots[0].skuIds=['missing']],
  ['shot reference',p=>p.story3.shotId='missing']
]){
  const bad=structuredClone(shotPlan);mutate(bad);
  assert.throws(()=>ctx.validateSingle({schema:ctx.SCHEMA,scope:ctx.SINGLE_SCOPE,plan:bad},post.date),undefined,label);
}
preview(shotPlan);
assert.equal(post.shots.length,2);
assert.equal(post.shots[1].skuIds[0],'sku-b');
assert.equal(post.stories[2].shotId,post.shots[1].id);
assert.deepEqual(post.sequence.map(item=>item.shotId),post.shots.map(shot=>shot.id));
assert.equal(post.shots[0].signature,`single-editorial|${post.id}|${post.revision}|1`);
assert.equal(ctx.saved.shots[1].what,'2カット目｜商品');
const reload=JSON.parse(JSON.stringify(ctx.saved));
assert.equal(reload.stories[2].shotId,reload.shots[1].id);

// The published shooting-list wrappers must consume these saved shots on 10/11.
const list={innerHTML:'',insertAdjacentHTML(_position,text){this.innerHTML+=text;},querySelectorAll:()=>[]},badge={textContent:''};
const ui={demo:{reactions:[],shotDone:{}},OFFICIAL_TOPICS:[],sku:()=>null,skuLabel:id=>id,storyKeywords:()=>[],html:value=>String(value),
  specificShootDirections:p=>p.shots,shootGroups:()=>[],rangePosts:()=>[reload],blocked:()=>false,
  renderShoot:()=>{},dx:selector=>selector==='#shootList'?list:selector==='#shootProgressBadge'?badge:{querySelectorAll:()=>[]},planDay:date=>date,
  createConcept:()=>({}),makeStories:()=>[]};
vm.createContext(ui);
const htmlSource=fs.readFileSync('dist/index.html','utf8');
const actualRender=htmlSource.split(/\r?\n/).find(line=>line.startsWith('const salesRenderShoot=renderShoot;renderShoot=function'));
assert.ok(actualRender);
vm.runInContext(actualRender.slice(actualRender.indexOf('renderShoot=function')),ui);
const inline=htmlSource.split(/\r?\n/).find(line=>line.startsWith('const oldStoryShootGroups=shootGroups;shootGroups=function'));
assert.ok(inline);
vm.runInContext(inline.slice(inline.indexOf('shootGroups=function')),ui);
vm.runInContext(fs.readFileSync('dist/content-quality.js','utf8'),ui);
assert.equal(ui.specificShootDirections(reload),reload.shots);
const visible=ui.shootGroups().filter(group=>group.uses.some(use=>use.date===post.date));
assert.equal(visible.length,2);
assert.ok(visible.some(group=>group.what==='2カット目｜商品'));
assert.ok(!visible.some(group=>group.what==='旧撮影'));
ui.renderShoot();
assert.match(list.innerHTML,/2カット目｜商品/);
assert.doesNotMatch(list.innerHTML,/旧撮影/);
console.log('PASS single-day optional shots, validation, persistence, references, and published shooting list');
