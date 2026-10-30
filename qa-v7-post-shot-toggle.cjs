const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const htmlSource=fs.readFileSync('dist/index.html','utf8');
const uiSource=fs.readFileSync('dist/v7-story-ui.js','utf8');
const post={id:'qa-post',date:'2026-10-28',shots:[{id:'qa-cut',signature:'old-signature',media:'写真',what:'商品を撮る',skuIds:['sku-a'],count:1}]};
const state={posts:[post],shotDone:{}};
let markup='',changeHandler,renderShootCount=0,renderHomeCount=0,saveCount=0;
const details={querySelectorAll:()=>[{remove(){}}],querySelector:()=>({insertAdjacentHTML:(_where,text)=>{markup=text;}})};
const context={
  demo:state,rangePosts:()=>[post],specificShootDirections:value=>value.shots,blocked:()=>false,
  shootGroups:()=>{},showPost:()=>{},html:String,skuLabel:()=> '架空SKU',
  dx:selector=>selector==='#dayDetail .v7-post-shoot details'?details:null,
  document:{addEventListener:(name,handler)=>{if(name==='change')changeHandler=handler;},head:{insertAdjacentHTML(){}}},
  toast:()=>{},persist:()=>{saveCount++;},renderShoot:()=>{renderShootCount++;},renderHome:()=>{renderHomeCount++;}
};
vm.createContext(context);
const helperStart=htmlSource.indexOf('function shotDoneKey(');
const helperEnd=htmlSource.indexOf('function storyPrepGroups(',helperStart);
vm.runInContext(htmlSource.slice(helperStart,helperEnd),context);
vm.runInContext(uiSource.slice(uiSource.indexOf('// The post detail and batch-shoot list share')),context);

const group=()=>context.shootGroups()[0];
const toggle=checked=>{
  const input={dataset:{v7PostShot:'qa-post|0'},checked,closest:()=>input};
  changeHandler({target:input,stopImmediatePropagation(){}});
};
context.showPost(post.id);
assert.match(markup,/未完了/);
assert.match(markup,/data-v7-post-shot="qa-post\|0"/);
toggle(true);
assert.equal(context.shotGroupDone(group()),true,'batch list sees detail completion');
assert.match(markup,/撮影済み/);
assert.match(markup,/checked/);
assert.equal(Object.keys(state.shotDone).length,1);
context.markShotGroup(group(),false);
context.showPost(post.id);
assert.match(markup,/未完了/,'detail sees batch-list uncheck');
toggle(true);
post.shots[0].skuIds=['sku-b'];post.shots[0].signature='new-sku-signature';
assert.equal(context.shotDoneFor(post.shots[0]),true,'SKU change keeps stable cut completion');
post.shots[0].what='商品を近くから撮る';
assert.equal(context.shotDoneFor(post.shots[0]),true,'wording change keeps completion');
assert.equal(Object.keys(state.shotDone).length,1,'no duplicate record');
const reload=JSON.parse(JSON.stringify(state));context.demo=reload;
assert.equal(context.shotDoneFor(reload.posts[0].shots[0]),true,'reload keeps completion');
reload.posts[0].shots[0].id='another-cut';
assert.equal(context.shotDoneFor(reload.posts[0].shots[0]),false,'different cut stays unfinished');
assert.equal(reload.shotDone['shot-id|qa-cut'],true,'old record remains');
assert.ok(saveCount>=2&&renderShootCount>=2&&renderHomeCount>=2);
assert.match(uiSource, /v7-post-shot-toggle\{[^}]*min-height:44px/);
console.log('PASS post-detail shot toggle shares stable completion with batch list, reload, SKU/wording/replacement, no duplicate keys');
