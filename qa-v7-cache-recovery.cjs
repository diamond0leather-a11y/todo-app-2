const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('./dist/index.html','utf8');
assert.match(html,/<script src="\.\/v7-year-coverage\.js\?coverage=20261102-recovery"><\/script>/);
const start=html.indexOf('function nextPlanCoverage(){');
const end=html.indexOf('const coverageHomeRender=renderHome;',start);
assert(start>0&&end>start);
const source=html.slice(start,end);
const state={posts:[],storyDays:[]},before=JSON.stringify(state);
function run(module){
 const context={demo:state,nextPlanInfo:()=>({nextFrom:'2026-12-30',nextTo:'2027-01-08'}),dayDiff:(a,b)=>Math.round((Date.parse(a)-Date.parse(b))/86400000),dayAdd:(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),console:{warn(){}},V7YearCoverage:module};
 vm.createContext(context);vm.runInContext(source,context);return context.nextPlanCoverage();
}
const oldModule={day:(_state,date)=>({date,missing:['Feed/Reel'],duplicate:[]}),year(){}};
const oldResult=run(oldModule);
assert.equal(oldResult.days.length,10,'旧JSとの混在でも初期表示を継続');
assert.equal(oldResult.days[2].date,'2027-01-01');
assert.equal(oldResult.missing.length,10);
assert.equal(run({day(){throw Error('bad legacy state');}}),null,'判定例外は共有データの読み込みを妨げない');
assert.equal(run(undefined),null,'JS未取得でも初期表示を妨げない');
assert.equal(JSON.stringify(state),before,'復旧判定は保存データを変更しない');
console.log('PASS: 旧JS混在・JS未取得・判定例外で初期表示を保護、URL更新、データ不変');
