const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const shot=(id,skuIds)=>({id,signature:id,media:'写真',what:id,skuIds,count:1});
const lineup={id:'lineup',date:'2026-10-11',theme:'ラインナップ',shotsAuthoritative:true,shots:[shot('cover',['new-a','restock-a']),shot('new',['new-a','new-b']),shot('wallet',['mini-a','mini-b']),shot('restock',['restock-b'])],stories:[
  {slot:1,asset:'既存素材',materialMode:'過去素材使用可',skuIds:[]},
  {slot:2,asset:'Story2用写真',materialMode:'新規撮影必要',skuIds:['new-a']},
  {slot:3,asset:'Story3用写真',materialMode:'まとめ撮り対象',skuIds:['new-b']},
  {slot:4,asset:'表紙を共用',materialMode:'新規撮影必要',shotId:'cover',skuIds:['new-a']}
]};
const legacy={id:'legacy',date:'2026-10-12',theme:'旧投稿',shots:[shot('old-main',['old'])],stories:[
  {slot:1,asset:'旧Story用写真',materialMode:'新規撮影必要',skuIds:['old']}
]};
const other={id:'other',date:'2026-10-13',theme:'別日の正本',shotsAuthoritative:true,shots:[shot('other-main',['other'])],stories:[]};
const posts=[lineup,legacy,other],list={innerHTML:'',insertAdjacentHTML(_position,value){this.innerHTML+=value;}},badge={textContent:''};
const context={demo:{shotDone:{}},rangePosts:()=>posts,blocked:()=>false,specificShootDirections:p=>p===legacy?[{...p.shots[0],what:'一般fallback'}]:p.shots,
  renderShoot(){},createConcept(){},makeStories(){},skuLabel:id=>id,html:value=>String(value),planDay:date=>date,
  dx:selector=>selector==='#shootList'?list:selector==='#shootProgressBadge'?badge:null};
vm.createContext(context);
const html=fs.readFileSync('dist/index.html','utf8');
const groups=html.split('\nshootGroups=function(){const groups=new Map();').at(-1)?.split('const salesRenderShoot=renderShoot;')[0];
const render=html.split('const salesRenderShoot=renderShoot;')[1]?.split('const salesHome=renderHome;')[0];
assert.ok(groups&&render,'公開版の撮影表示経路');
vm.runInContext('shootGroups=function(){const groups=new Map();'+groups,context);
vm.runInContext('renderShoot=function'+render.split('renderShoot=function')[1],context);
vm.runInContext(fs.readFileSync('dist/content-quality.js','utf8'),context);

assert.equal(context.hasAuthoritativeShots(lineup),true);
assert.equal(context.specificShootDirections(lineup),lineup.shots);
const main=context.shootGroups();
assert.equal(main.filter(group=>group.uses.some(use=>use.id==='lineup')).length,4);
assert.equal(JSON.stringify(main.slice(0,4).map(group=>[group.what,...group.skuIds])),JSON.stringify(lineup.shots.map(s=>[s.what,...s.skuIds])));
assert.equal(main.length,6,'他日の正本と旧postの一般fallbackを含む');
assert.equal(main.find(group=>group.uses.some(use=>use.id==='legacy')).what,'一般fallback');
assert.equal(main.some(group=>/Story用写真/.test(group.what)),false);
const prep=context.storyPrepGroups(posts);
assert.equal(JSON.stringify(prep.map(s=>[s.date,s.slot,s.asset])),JSON.stringify([
  ['2026-10-11',2,'Story2用写真'],['2026-10-11',3,'Story3用写真'],['2026-10-12',1,'旧Story用写真']
]));
assert.equal(prep.some(s=>s.asset==='表紙を共用'||s.asset==='既存素材'),false);
context.renderShoot();
assert.equal(badge.textContent,'0 / 6必須カット','メイン撮影のみ進捗へ算入');
const mainHtml=list.innerHTML.split('<h3>Story準備</h3>')[0];
assert.match(mainHtml,/<h3>メイン投稿<\/h3>/);
assert.match(mainHtml,/cover/);
assert.doesNotMatch(mainHtml,/Story2用写真|Story3用写真|旧Story用写真/);
assert.match(list.innerHTML,/Story2用写真/);
assert.match(list.innerHTML,/Story3用写真/);
assert.match(list.innerHTML,/旧Story用写真/);
assert.match(list.innerHTML,/過去素材で準備できるStory/);
context.demo.shotDone.cover=true;
context.renderShoot();
assert.equal(badge.textContent,'1 / 6必須カット');
console.log('PASS main/Story separation, shotId dedupe, legacy fallback, and main-only progress');
