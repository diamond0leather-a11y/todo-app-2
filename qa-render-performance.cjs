const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const start=html.indexOf('function go(name){');
const end=html.indexOf('renderHome=function(){',start);
assert(start>=0&&end>start,'navigation/render dispatcher exists');
const code=html.slice(start,end);
const names=['home','plan','shoot','review','results','month','analysis','catalog'];
const views=names.map(name=>({id:'view-'+name,active:name==='home',classList:{
 contains(value){return value==='active'&&this.owner.active;},
 toggle(value,on){if(value==='active')this.owner.active=on;}
}}));
for(const view of views)view.classList.owner=view;
const nav=names.map(name=>({dataset:{nav:name},classList:{toggle(){}}}));
const counts=Object.fromEntries(names.map(name=>[name,0]));
const context={
 dax:selector=>selector==='.view'?views:selector==='.nav-item'?nav:[],
 dx:selector=>selector==='.view.active'?views.find(view=>view.active):views.find(view=>'#'+view.id===selector),
 window:{scrollTo(){}},TODAY:'2026-10-07',reviewDate:'',reviewMonth:'',
 ...Object.fromEntries(names.map(name=>['render'+name[0].toUpperCase()+name.slice(1),()=>counts[name]++])),
 renderReviewWork:()=>counts.review++,renderMonthWork:()=>counts.month++
};
vm.createContext(context);
vm.runInContext(code,context);
context.refreshWork();
assert.deepEqual(counts,{home:1,plan:0,shoot:0,review:0,results:0,month:0,analysis:0,catalog:0},'startup renders only active home');
for(const name of names.slice(1)){
 const before={...counts};
 context.go(name);
 for(const other of names)assert.equal(counts[other],before[other]+Number(other===name),name+' navigation redraws only '+name);
}
const before={...counts};
context.refreshWork();
assert.equal(counts.catalog,before.catalog+1,'product edit redraws active catalog');
for(const name of names.filter(name=>name!=='catalog'))assert.equal(counts[name],before[name],'product edit does not redraw hidden '+name);
context.go('review');
assert.equal(context.reviewDate,context.TODAY,'review navigation resets date as before');
console.log('PASS active-view rendering on startup, navigation, and edit refresh');
