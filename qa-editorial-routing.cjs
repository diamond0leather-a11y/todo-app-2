const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to));
const post={id:'post-1',date:'2026-10-11',revision:2};
const calls=[];
const context={
 SCHEMA:'cian-editorial-v1',SINGLE_SCOPE:'single-day-reproposal',previewSaving:false,
 demo:{posts:[post]},
 openForm(title,body,save){context.title=title;context.body=body;context.save=save;},
 validate(data){calls.push('ten-day');if(!Array.isArray(data.plans))throw Error('10日企画のplansを確認してください。');return [];},
 validateSingle(data,date){calls.push('single-day');if(data.plan?.date!==date||data.plan?.format==='invalid')throw Error('単日再提案の形式を確認してください。');},
 savedPlan:()=>({date:post.date}),importPeriod:()=>({from:post.date,to:post.date}),
 showPreview(){calls.push('ten-preview');},showSinglePreview(){calls.push('single-preview');}
};
vm.createContext(context);
vm.runInContext('let preview=null;let singlePreview=null;'+section('function normalizeJsonQuotes(', 'function warnings(')+section('function openImport(', 'function showPreview('),context);
const submit=(raw,target)=>{context.openImport(target);assert.equal(context.title,'ChatGPT JSONを取り込む');assert.match(context.body,/textarea name="json"/);return context.save({get:()=>raw});};
const ten={schema:context.SCHEMA,scope:'ten-day',plans:[{date:post.date}]};
const single={schema:context.SCHEMA,scope:context.SINGLE_SCOPE,plan:{date:post.date,format:'Feed'}};
submit('説明文\n```json\n'+JSON.stringify(ten)+'\n```');
assert.deepEqual(calls.splice(0),['ten-day','ten-preview']);
submit('説明文\n'+JSON.stringify(single));
assert.deepEqual(calls.splice(0),['single-day','single-preview']);
assert.equal(vm.runInContext('singlePreview.postId',context),post.id);
submit(JSON.stringify(single),post.id);
assert.deepEqual(calls.splice(0),['single-day','single-preview']);
assert.throws(()=>submit(JSON.stringify({...single,schema:'invalid'})),/schemaまたはscope/);
assert.throws(()=>submit(JSON.stringify({...single,scope:'invalid'})),/schemaまたはscope/);
assert.throws(()=>submit(JSON.stringify({...ten,plans:null})),/10日企画のplans/);
assert.deepEqual(calls.splice(0),['ten-day']);
assert.throws(()=>submit(JSON.stringify({...single,plan:{...single.plan,format:'invalid'}})),/単日再提案の形式/);
assert.deepEqual(calls.splice(0),['single-day']);
assert.equal(context.demo.posts[0],post,'読み込み時に投稿を変更しない');
console.log('PASS shared editorial JSON entry, scope routing, extraction, and errors');
