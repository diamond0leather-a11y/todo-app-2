const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const coverage=require('./dist/v7-year-coverage.js');
const storyState=require('./dist/v7-story-state.js');
const dates=Array.from({length:10},(_,index)=>new Date(Date.UTC(2026,11,28+index)).toISOString().slice(0,10));
const state={posts:dates.map((date,index)=>({id:'p'+index,date,format:index===2?'Reel':'Feed',paused:index===3,stories:[]})),storyDays:dates.flatMap((date,index)=>[1,2,3,4].filter(slot=>!(index===1&&slot===3)).map(slot=>({id:date+'-'+slot,date,slot,text:'案'})))};
state.posts.splice(0,1); // 投稿なし
state.posts.push({id:'duplicate',date:dates[2],format:'Feed',stories:[]});
state.storyDays.push({id:'duplicate-story',date:dates[4],slot:2,text:'案'});
const before=JSON.stringify(state);
const result=coverage.period(state,dates[0],dates.at(-1),storyState);
assert.equal(result.days.length,10);
assert.equal(result.days[0].date,'2026-12-28');
assert.equal(result.days.at(-1).date,'2027-01-06');
assert.deepEqual(result.missing.map(day=>day.date),[dates[0],dates[1]]);
assert.deepEqual(result.duplicate.map(day=>day.date),[dates[2],dates[4]]);
assert.equal(result.days[3].missing.length,0,'投稿しない企画も保存済みとして扱う');
assert.equal(JSON.stringify(state),before,'判定で保存データを変更しない');
const complete={posts:dates.map((date,index)=>({id:'complete-'+index,date,format:'Feed',stories:[]})),storyDays:dates.flatMap(date=>[1,2,3,4].map(slot=>({id:date+'-'+slot,date,slot,text:'案'})))};
assert.equal(coverage.period(complete,dates[0],dates.at(-1),storyState).missing.length,0,'5枠OKの日は再作成不要');
complete.posts.push({id:'extra',date:dates[2],format:'Reel',stories:[]});
const duplicateOnly=coverage.period(complete,dates[0],dates.at(-1),storyState);
assert.equal(duplicateOnly.missing.length,0,'重複日を不足として数えない');
assert.deepEqual(duplicateOnly.duplicate.map(day=>day.date),[dates[2]]);

const html=fs.readFileSync('./dist/index.html','utf8');
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(script.trim())new vm.Script(script);
const start=html.indexOf('function nextPlanCoverage(){');
const end=html.indexOf('// Story2の結果は',start);
assert(start>0&&end>start);
const oldButton={remove(){notices.oldButton=null;}};
const notices={hidden:false,html:'',oldButton,querySelector(selector){return selector==='[data-prepare-next]'?this.oldButton:null;},insertAdjacentHTML(_where,text){this.html+=text;}};
const periodCard={append(node){this.detail=node;}};
const handlers=[];
let navigated='',saved=0;
const context={
 demo:state,V7YearCoverage:{period:(value,from,to)=>coverage.period(value,from,to,storyState)},
 nextPlanInfo(){return {nextFrom:dates[0],nextTo:dates.at(-1),progress:8,to:'2026-12-27'};},
 renderHome(){},renderPlan(){},dayDiff(){return 0;},TODAY:'2026-12-26',
 dx(selector){return selector==='#dailyNotices'?notices:periodCard;},
 html:String,document:{createElement(){return {innerHTML:'',className:'',id:''};},addEventListener(_type,handler){handlers.push(handler);}},
 go(name){navigated=name;context.renderPlan();},persist(){saved++;}
};
vm.createContext(context);
vm.runInContext(html.slice(start,end),context);
context.renderHome();
assert.equal(notices.oldButton,null,'旧案内の自動下書き作成ボタンは外す');
assert.match(notices.html,/不足 2日/);
assert.doesNotMatch(notices.html,/重複 2日/,'重複は不足数へ混ぜない');
handlers[0]({target:{closest(selector){return selector==='[data-next-plan-coverage]'?{}:null;}}});
assert.equal(navigated,'plan');
assert.equal(periodCard.detail,undefined,'10日プランには次期の長い不足一覧を追加しない');
assert.doesNotMatch(html,/id='nextPlanCoverage'|id="nextPlanCoverage"/,'日付が変わっても不要表示を作らない');
assert.equal(saved,0,'表示・移動で保存しない');
assert.match(html,/button\{min-height:44px\}/,'iPhone向けタップ領域');
console.log('PASS: 次期10日・不足・重複・paused・年末年始・HOME条件・画面遷移・保存なし');
