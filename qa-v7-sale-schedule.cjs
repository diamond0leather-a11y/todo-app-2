const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'dist','index.html'),'utf8');
let inlineCount=0;
for(const block of source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)){
 if(block[1].trim()){new vm.Script(block[1]);inlineCount++;}
}
assert(inlineCount>0,'画面内スクリプトを構文確認');
const match=source.match(/<script>\s*\/\/ 商品管理の保存済み予定を起点に、将来だけ4か月固定周期を表示する。[\s\S]*?<\/script>/);
assert(match,'販売予定一覧の処理が存在する');
const script=match[0].replace(/^<script>/,'').replace(/<\/script>$/,'').split('const previousYearCoverageRender=renderMonthWork;')[0];
new vm.Script(script);
const nodes=new Map();
let saleTargetsMarkup='';
const node=selector=>{
 if(!nodes.has(selector))nodes.set(selector,{id:selector==='.view.active'?'view-sale-schedule':'',textContent:'',innerHTML:'',classList:{add(){}},hidden:false,insertAdjacentHTML(_where,markup){this.innerHTML+=markup;}});
 return nodes.get(selector);
};
const demo={
 categories:[{id:'c1',name:'架空カテゴリ'}],
 items:[{id:'i1',categoryId:'c1',name:'架空バッグ'}],
 skus:[
  {id:'s1',itemId:'i1',name:'青',material:'架空素材',restockDate:'2026-11-08',status:'restock'},
  {id:'s2',itemId:'i1',name:'赤',material:'',restockDate:'',status:'soldout'},
  {id:'s3',itemId:'i1',name:'白',material:'',restockDate:'',status:'soldout'},
  {id:'s4',itemId:'i1',name:'緑',material:'',restockDate:'2026-07-08',status:'soldout'},
  {id:'s5',itemId:'i1',name:'廃番',material:'',restockDate:'2026-11-08',status:'restock',deleted:true},
  {id:'s6',itemId:'i1',name:'新商品',material:'',restockDate:'',status:'soldout'}
 ],
 salePlans:{s2:{month:'2026-11'},s6:{month:'2027-01',cycleStartMonth:'2027-01'}},
 months:{'2026-11':{date:'2026-11-08',time:'21:00',lineup:[{skuId:'s1'}]}},
 salesHistory:[{date:'2026-07-08',skuIds:['s4']}]
};
const listeners={};let monthNavCapture;
const context={
 TODAY:'2026-11-01',demo,dx:node,structuredClone,Map,Set,openForm(_title,markup){saleTargetsMarkup=markup;},
 saleRestockLineup(){return [];},monthlyResultRows(){return [];},renderPlan(){},renderMonthWork(){},
 salesResult(month){return demo.salesResults?.[month]||{};},monthInfo(month){return demo.months[month]||{date:'',time:'21:00',lineup:[]};},
 sku(id){return demo.skus.find(s=>s.id===id);},short(date){return date.slice(5);},
 document:{addEventListener(name,handler,capture){if(name==='click'&&capture)monthNavCapture=handler;else listeners[name]=handler;}},
 activeCatalogSku(s){return !s.deleted&&!!demo.items.find(i=>i.id===s.itemId);},
 item(id){return demo.items.find(i=>i.id===id);},
 skuLabel(id){const s=demo.skus.find(s=>s.id===id);return s?'架空バッグ / '+s.name:'商品情報なし';},
 effectiveSalesHistory(){return demo.salesHistory.slice().sort((a,b)=>a.date.localeCompare(b.date));},
 addMonths(month,n=4){const [year,number]=month.split('-').map(Number);return new Date(Date.UTC(year,number-1+n,1)).toISOString().slice(0,7);},
 html(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));},
 refreshWork(){}
};
vm.createContext(context);
vm.runInContext(script,context);
const read=code=>vm.runInContext(code,context);
assert(node('#view-catalog .row').innerHTML.includes('販売予定一覧を見る'));
assert(node('#monthSaleSummary').innerHTML.includes('data-sale-schedule-from-month'),'月間から再販予定一覧への導線');
assert(node('main').innerHTML.includes('id="view-sale-schedule"'));
assert.equal(read('saleScheduleData("2026-11").planned.length'),3);
assert.equal(read('saleScheduleData("2026-11").actualIds.length'),0);
read('renderSaleSchedule()');
assert.equal(node('#saleScheduleCount').textContent,'販売予定 3SKU');
assert(node('#saleScheduleCommon').textContent.includes('2026-11-08 21:00'));
assert(node('#saleSchedulePlans').innerHTML.includes('架空バッグ / 青'));
assert(node('#saleSchedulePlans').innerHTML.includes('架空バッグ / 赤'));
assert(!node('#saleSchedulePlans').innerHTML.includes('架空バッグ / 白'));
assert(!node('#saleSchedulePlans').innerHTML.includes('架空バッグ / 廃番'));
assert(node('#saleSchedulePlans').innerHTML.includes('data-work-sku="s1"'));
assert(node('#saleSchedulePlans').innerHTML.includes('架空バッグ / 緑'));
assert(node('#saleSchedulePlans').innerHTML.includes('次回周期：2027-03'));
assert(!node('main').innerHTML.includes('4か月後の目安'));
assert.equal(read('saleScheduleData("2026-07").actualIds.length'),1);
assert.equal(read('saleScheduleData("2026-07").planned.length'),1);
assert.equal(read('saleScheduleData("2026-03").planned.length'),0,'過去月に周期をさかのぼらない');
for(const month of ['2027-03','2027-07','2027-11']){
 assert.equal(read(`saleScheduleData("${month}").planned.length`),2,'翌年も4か月周期を継続');
}
assert.equal(read('saleScheduleData("2027-01").planned.length'),1,'新商品は明示した開始月から固定周期');
assert.equal(read('saleScheduleData("2027-05").planned.length'),1,'新商品の周期は4か月後も継続');
demo.salePlans.s2.month='2027-01';
assert.equal(read('saleScheduleData("2026-11").planned.length'),2,'今回だけの指定は元月に残さない');
assert.equal(read('saleScheduleData("2027-01").planned.length'),2,'手動指定月を表示');
assert.equal(read('saleScheduleData("2027-05").planned.length'),1,'今回だけの指定を周期化しない');
demo.salePlans.s1={month:'2027-01',cycleStartMonth:'2027-01'};
assert.equal(read('saleScheduleData("2027-03").planned.length'),1,'固定周期の手動変更後は旧周期を続けない');
assert.equal(read('saleScheduleData("2027-05").planned.length'),2,'固定周期の手動変更を以後に反映');
read('saleScheduleMonth="2026-12"');
listeners.click({target:{closest(selector){return selector==='[data-sale-schedule-step]'?{dataset:{saleScheduleStep:'1'}}:null;}}});
assert.equal(read('saleScheduleMonth'),'2027-01','年をまたいで次月へ');
assert.equal(node('#saleScheduleCount').textContent,'販売予定 3SKU');
listeners.click({target:{closest(selector){return selector==='[data-sale-schedule-step]'?{dataset:{saleScheduleStep:'12'}}:null;}}});
assert.equal(read('saleScheduleMonth'),'2028-01','翌年へ直接移動');
listeners.click({target:{closest(selector){return selector==='[data-sale-schedule-step]'?{dataset:{saleScheduleStep:'-12'}}:null;}}});
assert.equal(read('saleScheduleMonth'),'2027-01','前年へ直接移動');
assert(source.includes("formSelect('販売月の変更範囲','cycleMode'"),'既存の商品編集に変更範囲を表示');
assert(source.includes("plan.cycleStartMonth=nextMonth"),'固定周期の明示指定だけを保存');
const editor=source.match(/editSkuWork=function\(id,iid\)\{[\s\S]*?\n\};/);
assert(editor,'既存の商品編集処理を利用');
let capturedSave;
const editContext={
 demo,editSkuWork:null,sku:id=>demo.skus.find(s=>s.id===id),saleCycle:()=>({last:null,next:null,history:[]}),
 openForm(_title,_body,onSave){capturedSave=onSave;},
 formInput:()=>'',formSelect:()=>'',html:context.html,nowISO:()=> '2026-11-01T00:00:00Z',dx:node
};
vm.createContext(editContext);
vm.runInContext(editor[0],editContext);
const fields=(nextMonth,cycleMode)=>({get(key){return {name:'青',material:'架空素材',status:'restock',restockDate:'2026-11-08',nextMonth,cycleMode}[key]??'';}});
editContext.editSkuWork('s1');
capturedSave(fields('2027-01','fixed'));
assert.equal(demo.salePlans.s1.cycleStartMonth,'2027-01','明示した固定周期を保存');
editContext.editSkuWork('s1');
capturedSave(fields('2027-02','once'));
assert.equal(demo.salePlans.s1.month,'2027-02','今回だけの指定を保存');
assert(!Object.hasOwn(demo.salePlans.s1,'cycleStartMonth'),'今回だけに戻したら固定周期指定を除外');
demo.skus=Array.from({length:23},(_,index)=>({id:'test-'+index,itemId:'i1',name:'架空色'+index,material:'架空素材',status:'restock',restockDate:'2026-11-08'}));
demo.salePlans={};
demo.months['2026-11'].lineup=demo.skus.map(s=>({skuId:s.id}));
assert.equal(read('saleScheduleData("2026-11").planned.length'),23,'架空の23SKUを重複なく表示');
assert.equal(read('saleScheduleData("2027-03").planned.length'),23,'架空の23SKUが翌年3月にも継続');
demo.skus.push(...Array.from({length:80},(_,index)=>({id:'always-'+index,itemId:'i1',name:'常時'+index,status:'selling',restockDate:''})));
assert.equal(read('scheduledSaleEntries("2026-11").length'),23,'常時販売は販売予定に加えない');
read('monthCursor="2026-11";renderMonthWork()');
assert(node('#monthSaleSummary').innerHTML.includes('再販予定：23SKU · 現在販売中：80SKU · 合計（重複除外）：103SKU'),'月間で予定・現在販売中・重複除外合計を分ける');
assert(node('#saleWork').textContent.includes('販売初動の対象を確認（23件）'),'販売初動の対象件数を維持');
demo.skus[0].status='selling';
read('renderMonthWork()');
assert(node('#monthSaleSummary').innerHTML.includes('再販予定：23SKU · 現在販売中：81SKU · 合計（重複除外）：103SKU'),'同一SKUを合計で二重計上しない');
demo.skus[0].status='restock';
read('monthCursor="2027-03";renderMonthWork()');
assert(node('#monthSaleSummary').innerHTML.includes('再販予定：23SKU'),'共通販売日が未登録でも固定周期を月間に表示');
assert(node('#monthSaleSummary').innerHTML.includes('選択月の販売実績を示すものではありません'),'現在販売中を過去・未来の販売実績と混同しない');
monthNavCapture({target:{closest(selector){return selector==='[data-sale-schedule-from-month]'?{}:null;}}});
assert.equal(read('saleScheduleMonth'),'2027-03','月間の選択年月を再販予定一覧へ引き継ぐ');
assert.equal(read('saleRestockLineup("2026-11-08").length'),23,'AI販売コンテキストと予定件数を一致');
assert.equal(read('monthlyResultRows("2026-11","initial").length'),23,'販売初動に常時販売を自動追加しない');
assert.equal(read('monthlyResultRows("2026-11","final").length'),103,'月次確定では常時販売を維持');
assert.equal(read('scheduledSaleEntries("2027-03").length'),23,'翌年3月の固定周期を維持');
demo.salesResults={'2026-11':{initial:{rows:[{skuId:'always-0',quantity:2,price:100,actualRevenue:180}]}}};
assert.equal(read('monthlyResultRows("2026-11","initial").length'),24,'保存済み初動行を残す');
assert.equal(read('monthlyResultRows("2026-11","initial").find(row=>row.skuId==="always-0").quantity'),2,'保存済み数値を保持');
assert.equal(read('monthlyResultRows("2026-11","final").find(row=>row.skuId==="always-0").actualRevenue'),180,'初動の売上金額を月次確定へ引き継ぐ');
assert.equal(read('monthlyResultRows("2026-11","final").length'),103,'月次確定へ保存済み行を引き継ぐ');
const targetFunction=source.match(/^function showSaleTargets\(month\)\{.*\}$/m);
assert(targetFunction,'月間の販売予定詳細が存在する');
vm.runInContext(targetFunction[0],context);
read('showSaleTargets("2026-11")');
assert(saleTargetsMarkup.includes('販売予定：23SKU'),'保存済み行を販売予定件数に混ぜない');
assert(saleTargetsMarkup.includes('保存済みの販売初動行：1SKU'),'保存済み行は別表示する');
demo.salesResults={};
demo.skus=['01','02','03','04'].map((number,index)=>({id:'group-'+number,itemId:'i1',name:'周期'+number,status:'restock',restockDate:`2027-${number}-08`}));
demo.months={};
for(const month of ['2027-05','2027-06','2027-07','2027-08','2027-09','2027-10','2027-11','2027-12','2028-01','2028-02','2028-03','2028-04']){
 assert.equal(read(`saleScheduleData("${month}").planned.length`),1,'1～4月を起点とする4つの固定周期');
}
assert(!targetFunction[0].includes('persist()'),'一覧は保存しない');
console.log('PASS sale schedule: four-month groups, future only, manual once/fixed, discontinued, new SKU, dedup, year navigation, actual separation, read-only view');
