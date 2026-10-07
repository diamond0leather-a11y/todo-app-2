const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=__dirname;
const source=fs.readFileSync(path.join(root,'daily-cycle.js'),'utf8');
const sales=fs.readFileSync(path.join(root,'story-sales.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const sync=fs.readFileSync(path.join(root,'dist/firebase-sync.js'),'utf8');
const between=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return text.slice(a,b);};
const logic=between(source,'function salesResult(month){','function showSaleTargets(month){');
assert.equal(logic,between(html,'function salesResult(month){','function showSaleTargets(month){'),'source/public sales target parity');
assert(html.includes('const saleTargetPersist=persist;persist=function(){ensureFutureSaleTargetSnapshots();saleTargetPersist();};'),'normal saves refresh future snapshots');
assert(html.includes('snapshotChanged=ensureFutureSaleTargetSnapshots()'),'shared reload refreshes future snapshots');

function fixture(){return {
 schema:1,categories:[{id:'c'},{id:'deleted-category',deleted:true}],
 items:[{id:'i',categoryId:'c'},{id:'deleted-item',categoryId:'c',deleted:true},{id:'hidden-parent',categoryId:'deleted-category'}],
 skus:[
  {id:'restock',itemId:'i',status:'restock',restockDate:'2026-11-08',price:100},
  {id:'new',itemId:'i',status:'restock',restockDate:'2026-11-08',price:110},
  {id:'always',itemId:'i',status:'selling',price:120},
  {id:'other-day',itemId:'i',status:'restock',restockDate:'2026-12-06'},
  {id:'soldout',itemId:'i',status:'soldout',restockDate:'2026-11-08'},
  {id:'deleted',itemId:'i',status:'selling',deleted:true},
  {id:'deleted-item-sku',itemId:'deleted-item',status:'selling'},
  {id:'deleted-category-sku',itemId:'hidden-parent',status:'selling'}
 ],
 months:{'2026-11':{date:'2026-11-08',time:'21:00',lineup:[{skuId:'restock',saleKind:'再販'},{skuId:'new',saleKind:'新発売'},{skuId:'new',saleKind:'新発売'},{skuId:'other-day',saleKind:'再販'}]},'2026-10':{date:'2026-10-04',time:'21:00',lineup:[]}},
 salesResults:{},posts:[],records:{},reactions:[],events:[],ads:[],salesHistory:[]
};}
function run(text){
 const demo=fixture(),context={demo,structuredClone,Date,JSON,Object,Set,
  sku:id=>demo.skus.find(s=>s.id===id),item:id=>demo.items.find(i=>i.id===id),monthInfo:month=>demo.months[month],
  activeCatalogSku:s=>{const item=demo.items.find(i=>i.id===s.itemId);return !s.deleted&&item&&!item.deleted&&demo.categories.some(c=>c.id===item.categoryId&&!c.deleted);}
 };
 vm.createContext(context);
 vm.runInContext(text+'\nthis.api={ensureFutureSaleTargetSnapshots,monthlyResultRows}',context);
 let body='',save;
 const form={querySelector:()=>({}),addEventListener:()=>{}};
 Object.assign(context,{openForm:(_title,markup,callback)=>{body=markup;save=callback;},dx:()=>form,short:date=>date.slice(5),html:String,skuLabel:id=>id,
  formInput:(_label,name)=>name+';',formSelect:()=>'',fmt:value=>String(value??''),numberOrBlank:value=>value===''?null:Number(value),nowISO:()=> '2026-11-10T00:00:00Z',FormData:class{}});
 vm.runInContext(between(source,'function showSaleTargets(month){','const priceSkuEdit='),context);
 const api=context.api,before=Date.parse('2026-11-08T20:00:00+09:00'),after=Date.parse('2026-11-08T21:01:00+09:00');
 assert.equal(api.ensureFutureSaleTargetSnapshots(before),true);
 assert.equal(demo.months['2026-10'].saleTargetSnapshot,undefined,'past 10/4 is not inferred');
 const snap=demo.months['2026-11'].saleTargetSnapshot;
 assert.equal(snap.saleDate,'2026-11-08');
 assert.deepEqual([...snap.skuIds].sort(),['always','new','restock'],'continuing + new + restock, excluding other date and deleted/soldout');
 assert.equal(new Set(snap.skuIds).size,snap.skuIds.length,'no duplicate SKU');
 assert.equal(snap.saleKinds.new,'新発売');
 assert.equal(snap.saleKinds.always,'常時販売');
 assert.equal(api.ensureFutureSaleTargetSnapshots(before),false,'unchanged state causes no repeat save');
 demo.skus.find(s=>s.id==='always').status='soldout';
 assert.equal(api.ensureFutureSaleTargetSnapshots(before),true,'pre-sale product edit updates draft snapshot');
 assert(!demo.months['2026-11'].saleTargetSnapshot.skuIds.includes('always'));
 demo.skus.find(s=>s.id==='always').status='selling';
 assert.equal(api.ensureFutureSaleTargetSnapshots(before),true);
 const frozen=JSON.stringify(demo.months['2026-11'].saleTargetSnapshot);
 demo.skus.find(s=>s.id==='always').status='soldout';
 demo.skus.find(s=>s.id==='restock').status='selling';
 demo.skus.find(s=>s.id==='restock').restockDate='2026-12-06';
 assert.equal(api.ensureFutureSaleTargetSnapshots(after),false,'sale-start snapshot is immutable');
 assert.equal(JSON.stringify(demo.months['2026-11'].saleTargetSnapshot),frozen);
 const ids=stage=>Array.from(api.monthlyResultRows('2026-11',stage),row=>row.skuId);
 assert.deepEqual(ids('initial'),Array.from(snap.skuIds),'initial uses frozen snapshot');
 assert.deepEqual(ids('final'),Array.from(snap.skuIds),'final uses same frozen snapshot');
 context.showSaleTargets('2026-11');
 assert(body.includes('販売対象：3SKU')&&snap.skuIds.every(id=>body.includes(id+'<small>')),'target list uses snapshot');
 context.editSalesResult('2026-11','initial');
 assert(snap.skuIds.every(id=>body.includes('data-sku="'+id+'"'))&&!body.includes('data-sku="other-day"'),'initial form uses snapshot');
 context.editSalesResult('2026-11','final');
 assert(snap.skuIds.every(id=>body.includes('data-sku="'+id+'"'))&&!body.includes('data-sku="soldout"'),'final form uses same snapshot');
 demo.salesResults['2026-11']={initial:{saleDate:'2026-11-08',rows:[{skuId:'always',quantity:2,price:120,remaining:null,soldOut:null,actualRevenue:240}]}};
 assert.equal(api.ensureFutureSaleTargetSnapshots(before),false,'entered initial results also lock the snapshot');
 assert.equal(api.monthlyResultRows('2026-11','initial').find(row=>row.skuId==='always').quantity,2,'existing sales result survives');
 const docs=vm.runInNewContext(between(sync,'function splitState(state){','async function readWorkspace()')+'\n({splitState,joinState})',{clean:structuredClone,safeId:id=>id});
 const reloaded=docs.joinState(docs.splitState(demo));
 assert.equal(JSON.stringify(reloaded.months['2026-11'].saleTargetSnapshot),JSON.stringify(snap),'Firestore split/join retains snapshot');
 assert.equal(reloaded.salesResults['2026-11'].initial.rows[0].quantity,2,'sales results survive shared reload');
 const history=vm.runInNewContext(between(sales,'function effectiveSalesHistory(){','function saleCycle(')+'\neffectiveSalesHistory()', {demo:reloaded,Set,Object});
 assert.equal(history.filter(entry=>entry.date==='2026-11-08'&&entry.skuIds.includes('always')).length,1,'existing automatic sales history remains deduplicated');
 return {demo,ids:ids('initial')};
}
const first=run(logic);
run(between(html,'function salesResult(month){','function showSaleTargets(month){'));
{
 const demo=fixture(),fixedNow=Date.parse('2026-10-07T12:00:00+09:00');let saves=0;
 class FixedDate extends Date{static now(){return fixedNow;}}
 const context={demo,Date:FixedDate,JSON,Object,Set,structuredClone,
  sku:id=>demo.skus.find(s=>s.id===id),item:id=>demo.items.find(i=>i.id===id),monthInfo:month=>demo.months[month],
  activeCatalogSku:s=>{const item=demo.items.find(i=>i.id===s.itemId);return !s.deleted&&item&&!item.deleted&&demo.categories.some(c=>c.id===item.categoryId&&!c.deleted);},
  persist:()=>saves++,firebaseSyncApplying:false,localStorage:{setItem(){}},MOCK_KEY:'test',storyDrafts:{clear(){}},refreshWork(){},setTimeout:fn=>fn(),window:{}};
 vm.createContext(context);
 vm.runInContext(logic,context);
 vm.runInContext(between(source,'const saleTargetPersist=persist;','refreshWork();'),context);
 assert.equal(saves,1,'startup creates and saves future snapshot once');
 context.persist();assert.equal(saves,2,'normal save remains available');
 vm.runInContext(between(html,'window.todo2SyncBridge={','</script>'),context);
 context.window.todo2SyncBridge.replace(fixture());
 assert.equal(saves,3,'shared reload creates and saves future snapshot');
 assert.equal(context.window.todo2SyncBridge.read().months['2026-11'].saleTargetSnapshot.skuIds.length,3);
}
const wrapper=between(source,'const targetMonthRender=renderMonthWork;','document.addEventListener(');
const nodes={'#monthSaleSummary':{innerHTML:''},'#saleWork':{textContent:''}};
vm.runInNewContext(wrapper+'\nrenderMonthWork()',{
 renderMonthWork:()=>{},monthCursor:'2026-11',monthInfo:month=>first.demo.months[month],
 monthlyResultRows:()=>first.ids.map(skuId=>({skuId})),dx:key=>nodes[key],short:date=>date.slice(5)
});
assert(nodes['#monthSaleSummary'].innerHTML.includes('販売対象：3SKU'));
assert.equal(nodes['#saleWork'].textContent,'販売対象3SKUを確認');
console.log('PASS future sale snapshot, freeze, shared reload, initial/final and monthly count (fixture: 3 SKU)');
