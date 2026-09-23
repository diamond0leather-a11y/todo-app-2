const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const cases = [
  {date:'2026-09-24', format:'Reel', topicGroup:'CARE', parentId:'official-45', theme:'革の種類によってケア方法は違う', primaryAxis:'CUSTOMER_VALUE', skuIds:[]},
  {date:'2026-09-25', format:'Feed', topicGroup:'LEATHER', parentId:'official-14', theme:'黒い革の表情を比べる', primaryAxis:'INSTAGRAM_GROWTH', skuIds:[]},
  {date:'2026-09-26', format:'Reel', topicGroup:'CUSTOMER', parentId:'official-99', theme:'革小物を選ぶときの疑問', primaryAxis:'BUSINESS', skuIds:['sku-test']}
];
const context = {
  demo:{reactions:[]},
  OFFICIAL_TOPICS:cases.map(p=>({id:p.parentId,title:p.theme})),
  sku:id=>id==='sku-test'?{material:'牛革'}:null,
  skuLabel:id=>id==='sku-test'?'test wallet / brown':id,
  storyKeywords:s=>/縫い目/.test(s.text||'')?['縫い目']:[],
  specificShootDirections:p=>p.shots,
  createConcept:(date,index,forced)=>({id:'test-'+date,...cases.find(p=>p.date===date),caption:'以前の汎用本文',takeaway:'選ぶ・使うために役立つ視点',stories:[],shots:[],manual:false,actualAt:null}),
  makeStories:p=>[
    {text:'革の違いを別の切り口で見る',asset:'写真：革見本',action:'知る',skuIds:[]},
    {text:'使う場面で知りたいことは？',kind:'質問スタンプ',options:[],participatory:true,asset:'写真：工房',action:'回答する',skuIds:[]},
    {text:'縫い目と端の仕上げに注目',asset:'写真：縫い目',action:'見る',skuIds:[...p.skuIds]},
    {text:'投稿を見る',asset:'投稿の表紙',action:'開く',skuIds:[]}
  ]
};
vm.createContext(context);
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
  assert.ok(p.shots.every(s=>s.what.includes('伝えること：')&&s.what.includes('撮る')));
  assert.ok(p.shots.every(s=>s.media===(p.format==='Reel'?'動画':'写真')));
  assert.equal(context.specificShootDirections(p),p.shots);
}
assert.equal(new Set(results.map(p=>p.caption)).size,3);
assert.equal(results[2].stories[2].skuIds.length,1);
assert.equal(results[0].stories[2].skuIds.length,0);
const forced=context.createConcept(cases[0].date,0,'forced');
assert.equal(forced.caption,'以前の汎用本文');
assert.equal(forced.contentQualityVersion,undefined);
console.log(JSON.stringify(results.map(p=>({date:p.date,theme:p.parentId,format:p.format,captionLength:[...p.caption].length,story2:p.stories[1].kind,story3Products:p.stories[2].skuIds.length,shots:p.shots.map(s=>s.what)})),null,2));
console.log('PASS future-only content quality cases');
