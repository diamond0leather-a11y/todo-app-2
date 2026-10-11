const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const cases = [
  {date:'2026-09-24', format:'Reel', topicGroup:'CARE', parentId:'official-45', theme:'革の種類によってケア方法は違う', primaryAxis:'CUSTOMER_VALUE', skuIds:[]},
  {date:'2026-09-25', format:'Feed', topicGroup:'LEATHER', parentId:'official-14', theme:'黒い革の表情を比べる', primaryAxis:'INSTAGRAM_GROWTH', skuIds:[]},
  {date:'2026-09-26', format:'Reel', topicGroup:'CUSTOMER', parentId:'official-99', theme:'革小物を選ぶときの疑問', primaryAxis:'BUSINESS', skuIds:['sku-test']}
];
const oldShootTexts=['現在使われている革小物と、これから試したい形・素材見本を横に並べる','手持ち・バッグ収納・机上の三場面で、今後も必要になる使い方を撮る','革の表情、修理できる箇所、交換しやすい部位へ順に寄り、長く残せる作りを示す','11.08 21:00 NEW & RESTOCKと入れたラインナップ一覧の写真','DÉPLIÉと再販予定商品の一部を並べ、質問スタンプ用の余白を残した写真','DÉPLIÉ / horse と DÉPLIÉ / emboss dark brown を並べ、外形とL字ファスナーが分かる写真','今日のFeedの1枚目またはラインナップ全体が分かる写真'];
const lineupPost={id:'oct-11',date:'2026-10-11',format:'Feed',skuIds:[],shots:oldShootTexts.slice(0,3).map((what,i)=>({id:`old-shot-${i}`,signature:`old-${i}`,media:'写真',what,skuIds:[],count:1})),stories:oldShootTexts.slice(3).map((asset,i)=>({text:`保存済みStory${i+1}`,asset,skuIds:[],materialMode:'新規撮影必要'}))};
const otherPost={id:'other',date:'2026-10-12',format:'Feed',skuIds:[],shots:[{id:'other-shot',signature:'other',media:'写真',what:'別日の撮影',skuIds:[],count:1}],stories:[]};
const oldStoryParagraph={textContent:'2026-10-11 · 旧Story素材',removed:false,remove(){this.removed=true;}};
const otherStoryParagraph={textContent:'2026-10-12 · 別日のStory素材',removed:false,remove(){this.removed=true;}};
const storySection={querySelector(selector){return selector==='summary'?{textContent:'追加撮影が不要なStory候補'}:null;},querySelectorAll(selector){return selector==='p'?[oldStoryParagraph,otherStoryParagraph]:[];}};
const context = {
  demo:{reactions:[]},
  OFFICIAL_TOPICS:cases.map(p=>({id:p.parentId,title:p.theme})),
  sku:id=>id==='sku-test'?{material:'牛革'}:null,
  skuLabel:id=>id==='sku-test'?'test wallet / brown':id,
  storyKeywords:s=>/縫い目/.test(s.text||'')?['縫い目']:[],
  specificShootDirections:p=>p.shots,
  shootGroups:()=>[],
  rangePosts:()=>[lineupPost,otherPost],
  blocked:()=>false,
  renderShoot:()=>{},
  dx:()=>({querySelectorAll:()=>[storySection]}),
  planDay:date=>date,
  createConcept:(date,index,forced)=>({id:'test-'+date,...cases.find(p=>p.date===date),caption:'以前の汎用本文',takeaway:'選ぶ・使うために役立つ視点',stories:[],shots:[],manual:false,actualAt:null}),
  makeStories:p=>[
    {text:'革の違いを別の切り口で見る',asset:'写真：革見本',action:'知る',skuIds:[]},
    {text:'使う場面で知りたいことは？',kind:'質問スタンプ',options:[],participatory:true,asset:'写真：工房',action:'回答する',skuIds:[]},
    {text:'縫い目と端の仕上げに注目',asset:'写真：縫い目',action:'見る',skuIds:[...p.skuIds]},
    {text:'投稿を見る',asset:'投稿の表紙',action:'開く',skuIds:[]}
  ]
};
vm.createContext(context);
// Execute the actual final shootGroups implementation from the published HTML.
const inlineShootGroups=fs.readFileSync('dist/index.html','utf8').split(/\r?\n/).find(line=>line.startsWith('const oldStoryShootGroups=shootGroups;shootGroups=function'));
assert.ok(inlineShootGroups,'公開版の撮影リスト生成処理');
vm.runInContext(inlineShootGroups.slice(inlineShootGroups.indexOf('shootGroups=function')),context);
assert.equal(context.shootGroups().filter(group=>group.uses.some(use=>use.date==='2026-10-11')).length,7,'修正前の実表示経路は旧7件');
vm.runInContext(fs.readFileSync('dist/content-quality.js','utf8'),context);
const results=cases.map(p=>context.createConcept(p.date,0));
for(const p of results){
  assert.ok([...p.caption].length>=300,p.date+' 本文');
  assert.ok(!/アンケートでは|お客様から.*声/.test(p.caption),p.date+' 根拠なき声');
  assert.equal(p.stories.length,4);
  assert.equal(p.stories[1].kind,'質問スタンプ');
  assert.notEqual(p.stories[0].text,p.stories[2].text);
  assert.notEqual(p.stories[2].text,p.stories[3].text);
  assert.equal(p.shots.length,3);
  assert.ok(p.shots.every((s,i)=>s.what.includes(`${i+1}カット目｜`)&&['目的：','カメラ：','被写体：','配置・向き：'].every(label=>s.what.includes(label))));
  assert.ok(p.shots.every(s=>!/三場面|3場面/.test(s.what)));
  assert.ok(p.shots.every(s=>s.media===(p.format==='Reel'?'動画':'写真')));
  assert.equal(context.specificShootDirections(p),p.shots);
}
assert.equal(new Set(results.map(p=>p.caption)).size,3);
assert.equal(results[2].stories[2].skuIds.length,1);
assert.equal(results[0].stories[2].skuIds.length,0);
const forced=context.createConcept(cases[0].date,0,'forced');
assert.equal(forced.caption,'以前の汎用本文');
assert.equal(forced.contentQualityVersion,undefined);
assert.equal(context.hasAuthoritativeShots(lineupPost),false);
assert.equal(context.specificShootDirections(lineupPost),lineupPost.shots,'旧postは一般fallback');
assert.equal(context.shootGroups().filter(group=>group.uses.some(use=>use.date==='2026-10-11')).length,7,'旧postのStory素材追加は維持');
const shotProducts=[['new-a','new-b','restock-a','restock-b','restock-c','restock-d','restock-e','restock-f'],['new-a','new-b'],Array.from({length:12},(_,i)=>`mini-${i}`),['restock-g','restock-h','restock-i','restock-j','restock-k','restock-l']];
lineupPost.shots=shotProducts.map((skuIds,i)=>({id:`confirmed-${i}`,signature:`confirmed-${i}`,media:'写真',what:`保存済み${i+1}カット目`,skuIds,count:1}));
lineupPost.stories=lineupPost.stories.map((story,i)=>({...story,shotId:lineupPost.shots[i].id}));
lineupPost.shotsAuthoritative=true;
assert.equal(context.hasAuthoritativeShots(lineupPost),true);
assert.equal(context.specificShootDirections(lineupPost),lineupPost.shots);
const authoritative=context.shootGroups().filter(group=>group.uses.some(use=>use.date==='2026-10-11'));
assert.equal(authoritative.length,4);
assert.ok(authoritative.every((group,i)=>group.what===lineupPost.shots[i].what&&JSON.stringify(group.skuIds)===JSON.stringify(shotProducts[i])));
lineupPost.shotsAuthoritative=false;
assert.equal(context.shootGroups().filter(group=>group.uses.some(use=>use.date==='2026-10-11')).length,4);
assert.equal(context.shootGroups().filter(group=>group.what==='別日の撮影').length,1);
context.renderShoot();assert.equal(oldStoryParagraph.removed,false);assert.equal(otherStoryParagraph.removed,false);
assert.doesNotMatch(fs.readFileSync('dist/content-quality.js','utf8'),/2026-10-11|lineupShots/,'10/11専用撮影処理を残さない');
cases[2].theme='オンライン販売ラインナップ';cases[2].skuIds=['a','b','c','d'];
const sale=context.createConcept(cases[2].date,0);
assert.equal(sale.shots.length,4);
cases[2].skuIds=['a','b','c','d','e','f','g','h','i'];
assert.equal(context.createConcept(cases[2].date,0).shots.length,5);
// General display fallback does not mutate the stored post or its Story slots.
const saved={shots:[{id:'old',what:'保存済み'}],stories:[{text:'Story1'}],date:'2026-10-11',id:'saved',skuIds:[],actualAt:null};
context.specificShootDirections(saved);
assert.equal(saved.shots[0].what,'保存済み');assert.equal(saved.stories[0].text,'Story1');
console.log(JSON.stringify(results.map(p=>({date:p.date,theme:p.parentId,format:p.format,captionLength:[...p.caption].length,story2:p.stories[1].kind,story3Products:p.stories[2].skuIds.length,shots:p.shots.map(s=>s.what)})),null,2));
console.log('PASS content quality and authoritative four-cut 10/11 shooting list');
