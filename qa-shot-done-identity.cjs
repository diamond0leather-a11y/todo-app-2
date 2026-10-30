const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('dist/index.html', 'utf8');
const start = source.indexOf('function shotDoneKey(');
const end = source.indexOf('function storyPrepGroups(', start);
assert(start >= 0 && end > start, 'stable shot helpers are present');

const post = {id:'post-1', date:'2026-10-27', shots:[
  {id:'post-1-shot-1', signature:'photo|front|sku-a', media:'写真', what:'正面', skuIds:['sku-a'], count:1},
  {id:'post-1-shot-2', signature:'photo|side|sku-a', media:'写真', what:'側面', skuIds:['sku-a'], count:1}
]};
const context = {demo:{shotDone:{}}, rangePosts:()=>[post], specificShootDirections:p=>p.shots, blocked:()=>false, shootGroups:()=>{}};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
const groups = () => context.shootGroups();
const done = id => context.shotGroupDone(groups().find(group=>group.id===id));

assert.equal(done('post-1-shot-1'),false);
assert.equal(done('post-1-shot-2'),false,'uncompleted cut stays uncompleted');
context.markShotGroup(groups()[0],true);
assert.equal(done('post-1-shot-1'),true);
assert.equal(Object.keys(context.demo.shotDone).length,1);
post.shots[0].signature='photo|front|sku-b';
post.shots[0].skuIds=['sku-b'];
assert.equal(done('post-1-shot-1'),true,'SKU change keeps completion by shot ID');
context.markShotGroup(groups()[0],true);
assert.equal(Object.keys(context.demo.shotDone).length,1,'repeated marking creates no duplicate record');
post.shots[0].what='正面を寄りで撮る';
post.shots[0].signature='photo|closeup|sku-b';
assert.equal(done('post-1-shot-1'),true,'instruction wording change keeps the same cut');
assert.equal(done('post-1-shot-2'),false);

const formerId=post.shots[0].id;
post.shots[0].id='post-1-shot-replaced';
assert.equal(done('post-1-shot-replaced'),false,'a replacement cut does not inherit completion');
assert.equal(context.demo.shotDone['shot-id|'+formerId],true,'old completion is retained');

context.demo.shotDone={'photo|legacy|sku-a':true};
post.shots=[{id:'legacy-shot',signature:'photo|legacy|sku-a',media:'写真',what:'旧カット',skuIds:['sku-a'],count:1}];
assert.equal(done('legacy-shot'),true,'legacy signature is readable without migration');
context.retainLegacyShotDone(post.shots[0]);
post.shots[0].signature='photo|legacy|sku-b';
assert.equal(done('legacy-shot'),true,'legacy completion is safely linked before editing');
assert.equal(context.demo.shotDone['photo|legacy|sku-a'],true,'legacy record is not removed or overwritten');

const reload=JSON.parse(JSON.stringify(context.demo));
context.demo=reload;
assert.equal(done('legacy-shot'),true,'completion survives JSON reload');
context.markShotGroup(groups()[0],false);
assert.equal(done('legacy-shot'),false,'explicit uncheck overrides the old signature');
assert.equal(context.demo.shotDone['photo|legacy|sku-a'],true,'old record is still preserved');
console.log('PASS stable shot completion, SKU/wording changes, replacement, legacy, reload, no duplicate keys');
