const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/ten-day-period.js','utf8');
const context={
  TODAY:'2026-09-16',
  demo:{months:{'2026-09':{date:'2026-09-06'},'2026-10':{date:'2026-10-04'}},posts:[]},
  dayAdd(d,n){const date=new Date(d+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);},
  dayDiff(a,b){return Math.round((new Date(a+'T12:00:00Z')-new Date(b+'T12:00:00Z'))/86400000);},
  short:d=>`${Number(d.slice(5,7))}/${Number(d.slice(8,10))}`,
  rangePosts(){},renderPlan(){},refreshWork(){},
  document:{head:{insertAdjacentHTML(){}}}
};
vm.createContext(context);vm.runInContext(source,context);
const period=JSON.parse(JSON.stringify(context.salesCycleBlock('2026-09-16')));
assert.deepEqual(period,{from:'2026-09-07',to:'2026-09-16',dayFrom:1,dayTo:10,nextFrom:'2026-09-17',nextTo:'2026-09-26',nextDayFrom:11,nextDayTo:20});
context.demo.months['2026-09-next']={date:'2026-09-22'};
const clipped=JSON.parse(JSON.stringify(context.salesCycleBlock('2026-09-21')));
assert.deepEqual(clipped,{from:'2026-09-17',to:'2026-09-22',dayFrom:11,dayTo:16,nextFrom:'2026-09-23',nextTo:'2026-10-02',nextDayFrom:1,nextDayTo:10});
console.log('PASS current 9/7-9/16 Day1-10, next 9/17-9/26 Day11-20, next sale clips and resets Day1');
