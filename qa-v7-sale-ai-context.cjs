const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('dist/index.html','utf8');
const editorial=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,start);return source.slice(a,b);};
const saleCode=between(html,'function saleScheduleMonthIndex(month){','function renderSaleSchedule(){')+html.match(/^function scheduledSaleEntries\(month\).*$/m)?.[0];
const contextCode=between(editorial,'monthlySaleStrategy=function(from,to){','function reviewContext(');
const addMonths=(month,n=4)=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7);};
const dayAdd=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const demo={months:{},salePlans:{one:{month:'2026-12'},cycle:{cycleStartMonth:'2026-12'}},skus:[
 {id:'fixed',itemId:'i',name:'確定',status:'restock',restockDate:'2026-12-06'},
 {id:'one',itemId:'i',name:'月のみ',status:'soldout',restockDate:''},
 {id:'cycle',itemId:'i',name:'周期',status:'soldout',restockDate:''}
 ],items:[{id:'i',categoryId:'c',name:'商品'}],categories:[{id:'c',name:'分類'}],salesHistory:[]};
const before=JSON.stringify(demo);
const ctx={demo,TODAY:'2026-11-12',Map,Set,Object,addMonths,dayAdd,
 activeCatalogSku:s=>!s.deleted,item:id=>demo.items.find(row=>row.id===id),skuLabel:id=>id,
 effectiveSalesHistory:()=>[],sku:id=>demo.skus.find(row=>row.id===id),monthlySaleStrategy:()=>[],
 saleScheduleMonthIndex:undefined};
vm.createContext(ctx);
vm.runInContext(saleCode+'\n'+contextCode,ctx);
const read=(from='2026-11-09',to='2026-11-18')=>vm.runInContext(`monthlySaleStrategy('${from}','${to}')`,ctx);
let dec=read().find(row=>row.month==='2026-12');
assert(dec,'月間販売日なしでも12月候補を渡す');
assert.equal(JSON.stringify(demo),before,'販売予定の読み取りで保存データを変更しない');
const byId=id=>dec.lineup.find(row=>row.skuId===id);
assert.equal(byId('fixed').dateStatus,'日付確定');
assert.equal(byId('fixed').confirmedDate,'2026-12-06');
assert.equal(byId('one').dateStatus,'月のみ確定');
assert.equal(byId('one').confirmedDate,'');
assert.equal(byId('cycle').dateStatus,'4か月周期からの予測');
assert.equal(byId('cycle').confirmedDate,'');
demo.months['2026-12']={date:'2026-12-07',time:'21:00',lineup:[{skuId:'fixed'}]};
dec=read().find(row=>row.month==='2026-12');
assert.equal(dec.saleDate,'2026-12-07','月間販売日は維持');
assert.equal(dec.lineup.find(row=>row.skuId==='fixed').skuRestockDate,'2026-12-06');
assert.equal(dec.lineup.find(row=>row.skuId==='fixed').dateMismatch,true,'日付の不一致を勝手に統一しない');
assert.equal(demo.skus[0].restockDate,'2026-12-06','SKUの日付は不変');
assert.equal(demo.months['2026-12'].date,'2026-12-07','月間の日付は不変');
const original='販売目的の商品候補は monthly.saleStrategy の対象販売日とSKU個別のrestockDateが一致するlineup全件を検討してください。';
const auditCtx={prompt:()=>original,qualityAudit:()=>({issues:[]}),monthlySaleStrategy:()=>[{month:'2026-12',saleDate:'',lineup:[{skuId:'fixed'}]}],Set};
vm.createContext(auditCtx);
vm.runInContext(between(editorial,'const salePromptBefore=prompt;','window.editorialPlanner='),auditCtx);
assert.match(auditCtx.prompt('ten-day'),/月のみ・予測・未定の販売日や時刻を創作しない/,'未確定日の生成を禁止する');
assert(!auditCtx.prompt('ten-day').includes(original),'旧来の日付一致限定の指示を除く');
assert.equal(auditCtx.qualityAudit([{date:'2026-11-09',products:[]}]).issues.length,1,'販売候補ゼロ露出を警告する');
assert.equal(auditCtx.qualityAudit([{date:'2026-11-09',products:['fixed']}]).issues.length,0,'登場する場合は警告しない');
assert.match(html,/chatgpt-editorial\.js\?sale-ai-context=20261112/,'新しいJSを読み込む');
console.log('PASS sale AI context: month-only, cycle, fixed date, mismatch, warning and cache version');
