const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

for(const file of ['three-axis.js','dist/index.html']){
  const source=fs.readFileSync(file,'utf8');
  const lines=source.split(/\r?\n/);
  const show=lines.find(line=>line.startsWith('showPost=function(id)'));
  const edit=lines.find(line=>line.startsWith('function editConcept(id)'));
  assert.ok(show&&edit,`${file}: 投稿詳細と構成編集`);
  const authoritative={id:'new',revision:1,shotsAuthoritative:true,shots:[
    {id:'shot-1',media:'写真',what:'正本の1カット目',skuIds:[],signature:'old-1'},{id:'shot-2',media:'写真',what:'正本の2カット目',skuIds:[],signature:'old-2'}
  ],sequence:[
    {order:1,visual:'古い複製1',words:'載せる言葉1',shotId:'shot-1'},
    {order:2,visual:'古い複製2',words:'載せる言葉2',shotId:'shot-2'}
  ],stories:[],format:'Feed',theme:'企画',derivedTheme:'企画'};
  const legacy={id:'old',revision:1,shots:[{id:'old-shot',what:'旧shot内容',skuIds:[]}],sequence:[
    {order:1,visual:'旧構成の画面',words:'旧構成の言葉',shotId:'old-shot'}
  ],stories:[],format:'Feed',theme:'旧企画',derivedTheme:'旧企画'};
  const quality={id:'quality',revision:1,contentQualityVersion:1,shots:[{id:'quality-shot',media:'写真',what:'工程を撮る',skuIds:[],signature:'quality-old'}],sequence:[
    {order:1,words:'載せる言葉',shotId:'quality-shot'}
  ],stories:[],format:'Feed',theme:'新規企画',derivedTheme:'新規企画'};
  const posts=[authoritative,quality,legacy],detail={markup:'',insertAdjacentHTML(_where,value){this.markup+=value;}};
  const context={demo:{posts},oldShowPost(){},dax:()=>[],dx:selector=>selector==='#dayDetail'?detail:{close(){}},
    html:value=>String(value??''),topicLabel:()=>'',AXES:{},OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],officialTopicOptions:()=>[],officialTopicById:()=>null,
    formSelect:()=>'',formInput:()=>'',openForm(_title,markup,save){context.form={markup,save};}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('dist/content-quality.js','utf8').split('(function () {')[0],context);
  vm.runInContext(show+'\n'+edit,context);
  context.showPost('new');
  assert.match(detail.markup,/正本の1カット目/);
  assert.match(detail.markup,/載せる言葉：載せる言葉1/);
  assert.doesNotMatch(detail.markup,/古い複製/);
  context.editConcept('new');
  assert.match(context.form.markup,/正本の2カット目｜載せる言葉2/);
  const form=sequence=>({get:key=>({primaryAxis:'',parentId:'',topicGroup:'',derivedTheme:'企画',takeaway:'',subjects:'',sequence})[key]});
  context.form.save(form('更新した1カット目｜更新した言葉1\n更新した2カット目｜更新した言葉2'));
  assert.deepEqual(authoritative.shots.map(s=>s.what),['更新した1カット目','更新した2カット目']);
  assert.equal(authoritative.shots[0].signature,'写真|更新した1カット目|');
  assert.equal(JSON.stringify(authoritative.sequence.map(s=>s.words)),JSON.stringify(['更新した言葉1','更新した言葉2']));
  assert.ok(authoritative.sequence.every(s=>!Object.hasOwn(s,'visual')));
  assert.equal(JSON.stringify(authoritative.sequence.map(s=>s.order)),JSON.stringify([1,2]));
  assert.equal(JSON.stringify(authoritative.sequence.map(s=>s.shotId)),JSON.stringify(['shot-1','shot-2']));
  detail.markup='';context.showPost('quality');
  assert.match(detail.markup,/工程を撮る/);
  context.editConcept('quality');
  assert.match(context.form.markup,/工程を撮る｜載せる言葉/);
  context.form.save(form('更新した工程｜更新した言葉'));
  assert.equal(quality.shots[0].what,'更新した工程');
  assert.equal(quality.sequence[0].words,'更新した言葉');
  assert.equal(quality.sequence[0].order,1);
  assert.equal(quality.sequence[0].shotId,'quality-shot');
  assert.equal(Object.hasOwn(quality.sequence[0],'visual'),false);
  detail.markup='';context.showPost('old');
  assert.match(detail.markup,/旧構成の画面/);
  assert.doesNotMatch(detail.markup,/旧shot内容/);
  context.editConcept('old');
  assert.match(context.form.markup,/旧構成の画面｜旧構成の言葉/);
  context.form.save(form('編集した旧画面｜編集した旧言葉'));
  assert.equal(legacy.sequence[0].visual,'編集した旧画面');
  assert.equal(legacy.sequence[0].words,'編集した旧言葉');
  assert.equal(legacy.shots[0].what,'旧shot内容');
  const monthly=fs.readFileSync('dist/period-planner.js','utf8').split(/\r?\n/).find(line=>line.startsWith('function monthlyMetadata(post)'));
  assert.ok(monthly,`${file}: 月間メタデータ`);
  const metadataContext={demo:{posts},sku:()=>null,OFFICIAL_TOPICS:[],ALL_OFFICIAL_TOPICS:[],isModernPost:context.isModernPost};
  quality.skuIds=[];legacy.skuIds=[];
  vm.createContext(metadataContext);
  vm.runInContext(monthly,metadataContext);
  assert.equal(JSON.stringify(metadataContext.monthlyMetadata(quality).craftProcess),JSON.stringify(['更新した工程']));
  assert.equal(JSON.stringify(metadataContext.monthlyMetadata(legacy).craftProcess),JSON.stringify([]));
  legacy.sequence[0].visual='旧工程の画面';
  assert.equal(JSON.stringify(metadataContext.monthlyMetadata(legacy).craftProcess),JSON.stringify(['旧工程の画面']));
}
console.log('PASS modern shots.what display/edit, legacy sequence.visual fallback, monthly metadata, and sequence.words');
