const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=__dirname;
const source=fs.readFileSync(path.join(root,'daily-cycle.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const between=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return text.slice(a,b);};
const logic=between(source,'function salesResult(month){','function showSaleTargets(month){');
assert.equal(logic,between(html,'function salesResult(month){','function showSaleTargets(month){'),'source/public parity');
assert(!logic.includes('saleTargetSnapshot')&&!logic.includes('.lineup'),'saved snapshot and monthly lineup do not decide targets');
assert(!html.includes('ensureFutureSaleTargetSnapshots('),'render and sync do not regenerate snapshots');

function fixture(){return {
 categories:[{id:'c'},{id:'deleted-category',deleted:true}],
 items:[{id:'i',categoryId:'c'},{id:'deleted-item',categoryId:'c',deleted:true},{id:'hidden-parent',categoryId:'deleted-category'}],
 skus:[
  {id:'oct',itemId:'i',status:'restock',restockDate:'2026-10-04',price:100},
  {id:'nov',itemId:'i',status:'restock',restockDate:'2026-11-08',price:110},
  {id:'always',itemId:'i',status:'selling',price:120},
  {id:'both',itemId:'i',status:'selling',restockDate:'2026-10-04',price:130},
  {id:'dec',itemId:'i',status:'restock',restockDate:'2026-12-06'},
  {id:'soldout',itemId:'i',status:'soldout'},
  {id:'deleted',itemId:'i',status:'selling',deleted:true},
  {id:'deleted-item-sku',itemId:'deleted-item',status:'selling'},
  {id:'deleted-category-sku',itemId:'hidden-parent',status:'selling'}
 ],
 months:{
  '2026-10':{date:'2026-10-04',time:'21:00',lineup:[{skuId:'dec',saleKind:'再販'}],saleTargetSnapshot:{saleDate:'2026-10-04',skuIds:['dec']}},
  '2026-11':{date:'2026-11-08',time:'21:00',lineup:[{skuId:'oct',saleKind:'再販'}]}
 },salesResults:{}
};}
function run(text){
 const demo=fixture(),search={},visibleRows=[];
 const form={querySelector:()=>search,querySelectorAll:selector=>selector==='.sales-result-row'?visibleRows:[],addEventListener:()=>{}};
 const nodes={'#monthSaleSummary':{innerHTML:''},'#saleWork':{textContent:''}};
 let body='',save;
 const ctx={demo,structuredClone,Map,
  sku:id=>demo.skus.find(s=>s.id===id),monthInfo:month=>demo.months[month],
  activeCatalogSku:s=>{const item=demo.items.find(i=>i.id===s.itemId);return !s.deleted&&item&&!item.deleted&&demo.categories.some(c=>c.id===item.categoryId&&!c.deleted);},
  openForm:(_title,markup,callback)=>{body=markup;save=callback;},dx:key=>nodes[key]||form,short:date=>date.slice(5),html:String,skuLabel:id=>id,
  formInput:(_label,name)=>name+';',formSelect:()=>'',fmt:value=>String(value??''),numberOrBlank:value=>value===''?null:Number(value),nowISO:()=> '2026-11-10T00:00:00Z',FormData:class{}
 };
 vm.createContext(ctx);
 vm.runInContext(text+'\nthis.api={monthlyResultRows}',ctx);
 vm.runInContext(between(source,'function showSaleTargets(month){','const priceSkuEdit='),ctx);
 const ids=(month,stage)=>Array.from(ctx.api.monthlyResultRows(month,stage),row=>row.skuId);
 assert.deepEqual(ids('2026-10','initial'),['oct','always','both'],'10/4 includes matching restock and current selling only');
 assert.deepEqual(ids('2026-11','initial'),['nov','always','both'],'11/8 switches to matching restock plus current selling');
 assert.equal(new Set(ids('2026-10','initial')).size,3,'same SKU appears once even when both conditions match');
 assert.deepEqual(ids('2026-10','final'),ids('2026-10','initial'),'monthly final uses the same target set');
 ctx.showSaleTargets('2026-10');
 assert(body.includes('販売対象：3SKU')&&['oct','always','both'].every(id=>body.includes(id+'<small>')),'target list uses the same set');
 ctx.editSalesResult('2026-10','initial');
 assert(['oct','always','both'].every(id=>body.includes('data-sku="'+id+'"'))&&!body.includes('data-sku="nov"'),'initial form uses the same set');
 assert(body.includes('対象合計：3SKU')&&[...body.matchAll(/class="sales-result-row"/g)].length===3,'monthly, initial total, and actual SKU rows agree');
 visibleRows.push(...['oct','always','both'].map(id=>({dataset:{resultSearch:id},hidden:false})));
 search.oninput({target:{value:'oct'}});
 assert.deepEqual(visibleRows.map(row=>row.hidden),[false,true,true],'search hides only unmatched rows');
 assert(body.includes('対象合計：3SKU'),'search does not change the full target total');
 ctx.editSalesResult('2026-10','final');
 assert(['oct','always','both'].every(id=>body.includes('data-sku="'+id+'"'))&&!body.includes('data-sku="dec"'),'final form uses the same set');
 assert(body.includes('対象合計：3SKU')&&[...body.matchAll(/class="sales-result-row"/g)].length===3,'final total and actual SKU rows agree');
 vm.runInContext(between(source,'const targetMonthRender=renderMonthWork;','document.addEventListener(')+'\nrenderMonthWork()',Object.assign(ctx,{renderMonthWork:()=>{},monthCursor:'2026-10'}));
 assert(nodes['#monthSaleSummary'].innerHTML.includes('販売対象：3SKU'));
 assert.equal(nodes['#saleWork'].textContent,'販売対象3SKUを確認');
 demo.salesResults['2026-10']={initial:{saleDate:'2026-10-04',rows:[{skuId:'oct',quantity:2,price:100},{skuId:'legacy',quantity:4,price:50}]}};
 assert.equal(ctx.api.monthlyResultRows('2026-10','initial').find(row=>row.skuId==='oct').quantity,2,'saved target quantity is restored');
 ctx.editSalesResult('2026-10','initial');
 save({get:key=>({'qty-oct':'3','price-oct':'100'})[key]??'',has:()=>false});
 assert.equal(demo.salesResults['2026-10'].initial.rows.find(row=>row.skuId==='legacy').quantity,4,'previously saved out-of-target row is not deleted');
 demo.skus.find(s=>s.id==='always').status='soldout';
 assert.deepEqual(ids('2026-10','initial'),['oct','both'],'current selling status is reflected without rewriting stored snapshot');
 assert.deepEqual(demo.months['2026-10'].saleTargetSnapshot.skuIds,['dec'],'legacy snapshot data is retained untouched');
 return ids('2026-11','initial');
}
assert.deepEqual(run(logic),['nov','both']);
assert.deepEqual(run(between(html,'function salesResult(month){','function showSaleTargets(month){')),['nov','both']);
const cycleCode=between(html,'function saleCandidateCycle(date=TODAY){','const salesMonthRender=renderMonthWork;');
const cycleDemo=fixture();
const cycle=vm.runInNewContext(cycleCode+'\nsaleCandidateCycle',{demo:cycleDemo,dayAdd:(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10),saleRestockLineup:()=>[]});
assert.equal(cycle('2026-10-04').saleDate,'2026-10-04','sale day still targets 10/4');
assert.equal(cycle('2026-10-05').saleDate,'2026-11-08','next cycle automatically targets 11/8');
console.log('PASS sale-day restock + current selling, rollover, deduplication, shared monthly/initial/final set, saved values');
