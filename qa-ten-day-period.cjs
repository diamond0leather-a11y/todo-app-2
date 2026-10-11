const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/dist/index.html','utf8');
const start=source.indexOf('function salesCycleBlock(date=TODAY)');
const end=source.indexOf('\nfunction planPeriodLabel',start);
assert(start>=0&&end>start,'salesCycleBlock must exist in dist/index.html');
const context={
  TODAY:'2026-09-16',
  demo:{months:{'2026-09':{date:'2026-09-06'},'2026-10':{date:'2026-10-04'}}},
  dayAdd(d,n){const date=new Date(d+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);},
  dayDiff(a,b){return Math.round((new Date(a+'T12:00:00Z')-new Date(b+'T12:00:00Z'))/86400000);}
};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const period=JSON.parse(JSON.stringify(context.salesCycleBlock('2026-09-16')));
assert.deepEqual(period,{from:'2026-09-07',to:'2026-09-16',dayFrom:1,dayTo:10,nextFrom:'2026-09-17',nextTo:'2026-09-26',nextDayFrom:11,nextDayTo:20});
context.demo.months['2026-09-next']={date:'2026-09-22'};
const clipped=JSON.parse(JSON.stringify(context.salesCycleBlock('2026-09-21')));
assert.deepEqual(clipped,{from:'2026-09-17',to:'2026-09-22',dayFrom:11,dayTo:16,nextFrom:'2026-09-23',nextTo:'2026-10-02',nextDayFrom:1,nextDayTo:10});
delete context.demo.months['2026-09-next'];
context.TODAY='2026-10-02';
const nearSale=JSON.parse(JSON.stringify(context.salesCycleBlock()));
assert.deepEqual(nearSale,{from:'2026-09-27',to:'2026-10-04',dayFrom:21,dayTo:28,nextFrom:'2026-10-05',nextTo:'2026-10-14',nextDayFrom:1,nextDayTo:10});
const daily=fs.readFileSync(__dirname+'/daily-cycle.js','utf8');
const section=(from,to)=>{const a=daily.indexOf(from),b=daily.indexOf(to,a);assert(a>=0&&b>a,from);return daily.slice(a,b);};
const renderLine=daily.split(/\r?\n/).find(line=>line.startsWith('const analysisPeriodRender=renderAnalysis;'));
assert(renderLine&&source.includes(renderLine),'published period labels match source');
const labels={'#analysisPeriodWork':{textContent:''},'#analysisNextPeriodWork':{textContent:''}};
Object.assign(context,{analysisFrom:'',analysisTo:'',renderAnalysis:()=>{},dx:key=>labels[key],generatePlanDates:dates=>{context.generatedDates=dates;},persist:()=>{},go:view=>{context.openedView=view;},toast:message=>{throw Error(message);}});
vm.runInContext(section('function nextPlanInfo(date=TODAY){','const dailyHomeRender=renderHome;')+section('function prepareNext(){','const analysisPeriodRender=renderAnalysis;')+renderLine,context);
context.prepareNext();
assert.equal(context.analysisFrom,'2026-09-27');assert.equal(context.analysisTo,'2026-10-04');
assert.equal(context.demo.planStart,'2026-10-05');assert.equal(context.generatedDates.length,10);assert.equal(context.generatedDates.at(-1),'2026-10-14');assert.equal(context.openedView,'analysis');
context.renderAnalysis();
assert.equal(labels['#analysisPeriodWork'].textContent,'分析対象期間：2026/09/27 ～ 2026/10/04');
assert.equal(labels['#analysisNextPeriodWork'].textContent,'次に作成する10日プラン：2026/10/05 ～ 2026/10/14');
context.analysisFrom='2026-09-17';context.renderAnalysis();assert(labels['#analysisPeriodWork'].textContent.includes('2026/09/17'),'manual analysis period remains visible');
assert(source.includes('振り返り開始')&&source.includes('振り返り終了')&&source.includes('別の期間を分析する場合だけ日付を変更'));
assert(!source.includes('planStartWork'));
assert(!source.includes('開始日を選び'));
console.log('PASS current and sale-clipped periods, notification analysis/next labels, editable analysis dates');
const editorial=fs.readFileSync(__dirname+'/dist/chatgpt-editorial.js','utf8');
const rulesStart=editorial.indexOf('const currentEditorialRules='),rulesEnd=editorial.indexOf('window.editorialPlanner=',rulesStart);
assert(rulesStart>=0&&rulesEnd>rulesStart,'published generation-rule wrapper exists');
const prompts={prompt:()=> '商品を毎日出す必要はありません。Story1：革を知る・役立つ知識・楽しさ。Story1はメインの要約ではなく別の知識。返答は説明文を付けずJSONだけにしてください。',singlePrompt:()=> 'Story1は知識・有益・楽しさ。返答は説明なしの1日分JSONだけ：'};
vm.createContext(prompts);vm.runInContext(editorial.slice(rulesStart,rulesEnd),prompts);
const ten=prompts.prompt('ten-day'),single=prompts.singlePrompt({date:'2026-10-11'});
for(const generated of [ten,single]){
  assert(generated.includes('7｜商品・販売・信頼')&&generated.includes('永久固定比率ではない'));
  assert(generated.includes('ファッション35%')&&generated.includes('写真1枚'));
  assert(generated.includes('themeとderivedThemeが共存する場合は完全一致'));
  assert(generated.includes('全カットへ投稿全体のSKUを機械的に複製しない'));
  assert(generated.includes('最終的に画面へ渡る主目的'));
  assert(!generated.includes('Story1：革を知る・役立つ知識・楽しさ'));
  assert(!generated.includes('Story1は知識・有益・楽しさ'));
}
assert(!ten.includes('商品を毎日出す必要はありません'));
assert(!prompts.prompt('month').includes('7｜商品・販売・信頼'),'ten-day guideline must not alter month scope');
const rootAnalysis=fs.readFileSync(__dirname+'/three-axis.js','utf8');
for(const published of [source,rootAnalysis]){
  assert(published.includes('7｜商品・販売・信頼'));
  assert(published.includes('Story1は革の毎日解説や販売枠にせず'));
  assert(published.includes('各shot／Storyの実際に写るskuIdsを区別する'));
  assert(!published.includes('CUSTOMER VALUE / INSTAGRAM GROWTH / BUSINESSを10日と販売周期で同時に考えてください。固定比率なし。'));
}
console.log('PASS final ten-day/single-day/analysis generation instructions and source-public parity');
