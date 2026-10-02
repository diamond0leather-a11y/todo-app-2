const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const daily=fs.readFileSync(path.join(root,'daily-cycle.js'),'utf8');
const sync=fs.readFileSync(path.join(root,'dist/firebase-sync.js'),'utf8');
const editorial=fs.readFileSync(path.join(root,'dist/chatgpt-editorial.js'),'utf8');
for(const [index,script] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries())new vm.Script(script[1],{filename:`dist-inline-${index}.js`});
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`missing ${start}`);return source.slice(a,b);};

// A fresh local state must not create sample entities; an existing state remains readable.
assert(!html.includes('仮データ・操作確認用'));
assert(!html.includes('demo=seedMock()'));
assert(!html.includes('if(!demo.posts.length){for(let i=-12'));
assert(!html.includes("salesHistory.push({id:'sale-history-demo-202605'"));
assert(!fs.readFileSync(path.join(root,'story-sales.js'),'utf8').includes("salesHistory.push({id:'sale-history-demo-202605'"));
assert(html.includes('if(demo.posts.some(p=>p.briefId===b.id||p.themeId===b.id)'));
assert(fs.readFileSync(path.join(root,'three-axis.js'),'utf8').includes('if(demo.posts.some(p=>p.briefId===b.id||p.themeId===b.id)'));
const blankMatch=html.match(/if\(!demo\|\|demo\.schema!==1\)demo=(\{[^;]+\});/);
assert(blankMatch,'fresh-state initializer');
const blank=vm.runInNewContext('('+blankMatch[1]+')',{TODAY:'2026-09-29'});
for(const key of ['categories','items','skus','events','posts','ads','reactions','analyses'])assert.equal(blank[key].length,0,key);
assert.equal(Object.keys(blank.months).length,0);
assert.equal(Object.keys(blank.records).length,0);
const migrateCode=between(html,'function migrateConcepts(){','const feedReelConcept=createConcept;');
const fresh=structuredClone(blank);
vm.runInNewContext(migrateCode+'\nmigrateConcepts()',{demo:fresh,OFFICIAL_TOPICS:[],BRIEFS:[{id:'sample',title:'仮案'}],blocked:()=>false,createConcept:()=>{throw Error('fresh state must not generate a plan');},persist:()=>{}});
assert.equal(fresh.posts.length,0);
assert.equal(fresh.extraThemes.length,0);
assert.equal(fresh.conceptVersion,2);

// Exercise the actual sales form save callbacks without a DOM dependency.
function salesHarness(source){
 const code=between(source,'function salesResult(month){','const priceSkuEdit=')+between(source,'function numberOrBlank(raw){','renderReviewWork=');
 const demo={categories:[{id:'c',name:'財布'}],items:[{id:'i',categoryId:'c',name:'商品'}],skus:[{id:'a',itemId:'i',name:'A',price:100},{id:'b',itemId:'i',name:'B',price:200}],months:{'2026-10':{date:'2026-10-04',lineup:[{skuId:'a',saleKind:'再販'},{skuId:'b',saleKind:'常時販売'}]}},salesResults:{}};
 let save,body;const form={querySelector:()=>({}),addEventListener:()=>{}};
 const ctx={demo,structuredClone,openForm:(_title,markup,fn)=>{body=markup;save=fn;},dx:()=>form,sku:id=>demo.skus.find(s=>s.id===id),skuLabel:id=>id,monthInfo:month=>demo.months[month],formInput:(label,name,value)=>`${label}:${name}=${value};`,formSelect:()=>'',html:s=>s,fmt:value=>String(value??''),nowISO:()=> '2026-10-31T12:00:00Z',FormData:class{}};
 const api=vm.runInNewContext(code+'\n({editSalesResult,monthlyResultRows,saleTotals,numberOrBlank})',ctx);
 assert.equal(api.numberOrBlank('0'),0);
 assert.equal(api.numberOrBlank(''),null);
 const submit=values=>save({get:key=>Object.hasOwn(values,key)?values[key]:'',has:key=>Object.hasOwn(values,key)});
 api.editSalesResult('2026-10','initial');
 submit({'qty-a':'2','price-a':'100','revenue-a':'190','price-b':'200','orders':'1','totalActual':'190'});
 assert.equal(demo.salesResults['2026-10'].initial.rows[0].quantity,2);
 assert.equal(demo.salesResults['2026-10'].initial.rows[1].quantity,null,'blank stays unknown');
 api.editSalesResult('2026-10','final');
 assert(body.includes('引継ぎ済み 2点')&&body.includes('orders=1'),'initial inputs displayed without re-entry');
 submit({'add-a':'1','price-a':'100','addRevenue-a':'80','price-b':'200','orders':'1','totalActualAdd':'80'});
 const final=demo.salesResults['2026-10'].final;
 assert.equal(final.rows[0].quantity,3);
 assert.equal(final.rows[0].actualRevenue,270);
 assert.equal(final.rows[1].quantity,null);
 assert.equal(final.orders,1);
 assert.equal(final.actualRevenue,270);
 assert.deepEqual(JSON.parse(JSON.stringify(demo.salesResults))['2026-10'].final,JSON.parse(JSON.stringify(final)),'reload-equivalent JSON retains final values');
 return demo;
}
const sourceState=salesHarness(daily);
salesHarness(html);

// Sales results are the source of truth for history; legacy manual history remains intact.
for(const source of [fs.readFileSync(path.join(root,'story-sales.js'),'utf8'),html]){
 assert(!source.includes('recordSaleNew'),'duplicate manual sales-history entry is removed');
 assert(source.includes('salesHistory:effectiveSalesHistory()'),'analysis uses the effective history');
 const projection=between(source,'function addMonths(month,n=4){','function saleLine(id,date){');
 const demo=structuredClone(sourceState);
 demo.salesHistory=[{id:'legacy',date:'2026-09-06',skuIds:['a']}];
 demo.skus[0].restockDate='2026-11-08';
 demo.months['2026-10'].date='2026-10-04';
 const api=vm.runInNewContext(projection+'\n({effectiveSalesHistory,saleCycle})',{demo,sku:id=>demo.skus.find(s=>s.id===id),Date});
 const history=()=>JSON.parse(JSON.stringify(api.effectiveSalesHistory()));
 const savedFinal=demo.salesResults['2026-10'].final;
 delete demo.salesResults['2026-10'].final;
 assert.equal(history().filter(h=>h.date==='2026-10-04'&&h.skuIds.includes('a')).length,1,'initial result immediately generates sale-date history');
 demo.salesResults['2026-10'].final=savedFinal;
 assert.equal(history().filter(h=>h.date==='2026-10-04'&&h.skuIds.includes('a')).length,1,'initial/final create one sale-date history');
 assert(!history().some(h=>h.skuIds.includes('b')),'blank lineup SKU is not actual sale history');
 assert.equal(api.saleCycle('a').last,'2026-10-04');
 assert.equal(api.saleCycle('a').nextDate,'2026-11-08','SKU restock date is the next planned date');
 assert.equal(history().length,2,'existing legacy history is preserved');
 demo.salesHistory.push({id:'legacy-same-day',date:'2026-10-04',skuIds:['a']});
 assert.equal(history().filter(h=>h.date==='2026-10-04'&&h.skuIds.includes('a')).length,1,'legacy and result history do not duplicate the same date/SKU');
 demo.salesHistory.pop();
 const unchanged=JSON.stringify(demo.salesHistory);
 demo.salesResults['2026-10'].final.rows[0].quantity=4;
 assert.equal(history().length,2,'quantity correction does not append a sale date');
 assert.equal(JSON.stringify(demo.salesHistory),unchanged,'projection does not mutate legacy history');
 const reloaded=JSON.parse(JSON.stringify(demo));
 const afterReload=vm.runInNewContext(projection+'\neffectiveSalesHistory()',{demo:reloaded,sku:id=>reloaded.skus.find(s=>s.id===id),Date});
 assert.equal(afterReload.length,2,'history survives JSON reload without duplicate records');
}

// Adding a SKU to a monthly lineup must not replace a manually chosen next sale month.
function nextSaleMonthHarness(source){
 const code=between(source,'editSale=function(){','const currentStatus=')+'}';
 const demo={months:{'2026-10':{date:'',time:'21:00',lineup:[]}},salePlans:{a:{month:'2027-01',updatedAt:'existing'}},skus:[{id:'a',restockDate:'2027-01-12'},{id:'b',restockDate:'2026-11-03'}],salesHistory:[{id:'sale-a',date:'2026-09-01',skuIds:['a']}]};
 const originalSkus=structuredClone(demo.skus),originalHistory=structuredClone(demo.salesHistory);
 let save;
 const ctx={demo,monthCursor:'2026-10',monthInfo:month=>demo.months[month],openForm:(_title,_body,callback)=>{save=callback;},formInput:()=>'',salePickerFilters:()=>'',skuPickerWork:()=>'',nowISO:()=> '2026-10-01T00:00:00Z'};
 vm.runInNewContext(code,ctx);
 ctx.editSale();
 save({get:key=>({'date':'2026-10-04','time':'21:00','kind-a':'再販','kind-b':'新発売'})[key]||'',getAll:key=>key==='skuIds'?['a','b']:[]});
 assert.equal(demo.salePlans.a.month,'2027-01','manual next month is retained');
 assert.equal(demo.salePlans.a.updatedAt,'existing','manual plan is not rewritten');
 assert.equal(demo.salePlans.b.month,'2026-10','unset next month gets the existing monthly default');
 assert.deepEqual(demo.skus,originalSkus,'restock dates and SKU IDs are unchanged');
 assert.deepEqual(demo.salesHistory,originalHistory,'sales history is unchanged');
 const reloaded=JSON.parse(JSON.stringify(demo));
 assert.equal(reloaded.salePlans.a.month,'2027-01');
 assert.equal(reloaded.salePlans.b.month,'2026-10');
 assert.deepEqual(reloaded.skus,originalSkus);
}
nextSaleMonthHarness(fs.readFileSync(path.join(root,'story-sales.js'),'utf8'));
nextSaleMonthHarness(html);

// The same complete state is split for sharing and rejoined from mock Firestore documents.
const sharedCode=between(sync,'function splitState(state){','async function readWorkspace()');
const share=new Function('state','clean','safeId',sharedCode+'\nconst docs=splitState(state);return {docs,reloaded:joinState(docs)};');
const state={...sourceState,posts:[{id:'post-a',date:'2026-10-05',actualAt:'2026-10-05T18:00:00+09:00'}],records:{'post-a|7d':{postId:'post-a',views:0,reach:null}},reactions:[{id:'voice-a',voiceType:'商品要望',originalText:'要望'}],shotDone:{'shot-a':true},salesHistory:[{id:'sale-a'}],salePlans:{a:{month:'2027-01'}}};
const {docs,reloaded}=share(state,structuredClone,encodeURIComponent);
for(const key of ['posts/post-a','reviews/post-a%7C7d','voices/voice-a','months/2026-10','state/products','state/planning','state/shooting','state/operations'])assert(docs.has(key),key);
for(const key of ['posts','records','reactions','months','salesResults','salesHistory','salePlans','skus','categories','items','shotDone'])assert.deepEqual(JSON.parse(JSON.stringify(reloaded[key])),JSON.parse(JSON.stringify(state[key])),key);
const sharedHistory=vm.runInNewContext(between(html,'function effectiveSalesHistory(){','function saleCycle(id){')+'\neffectiveSalesHistory()',{demo:reloaded});
assert.equal(sharedHistory.filter(h=>h.date==='2026-10-04'&&h.skuIds.includes('a')).length,1,'shared reload derives the actual sale once');
assert(!sharedHistory.some(h=>(h.skuIds||[]).includes('b')),'shared reload keeps blank SKU out of actual history');

// Run the production context functions with isolated records: actual and planned are distinct,
// old comments are excluded, saved voices and sales learning remain available.
const editorialCode=between(editorial,'function postSummary(p){','function exposureSummary(history){')+between(editorial,'function feedbackContext(actualPostIds){','const baseEditorialContext=context;');
const posts=Array.from({length:22},(_,i)=>({id:'p'+i,date:`2026-09-${String(i+1).padStart(2,'0')}`,actualAt:`2026-09-${String(i+1).padStart(2,'0')}T18:00:00+09:00`,actualSnapshot:{theme:'実績'+i,caption:'実績本文'+i,format:'Feed',skuIds:[],stories:[]},theme:'予定'+i,caption:'予定本文'+i,format:'Feed',skuIds:[]}));
posts.push({id:'planned',date:'2026-10-06',theme:'予定のみ',skuIds:[],stories:[]});
const records={'p21|7d':{postId:'p21',stage:'7d',views:0,reach:null,observedAt:'2026-09-29T18:00:00'},'p20|24h':{postId:'p20',stage:'24h',views:100,observedAt:'2026-09-22T18:00:00'},'p19|7d':{postId:'p19',stage:'7d',views:80,observedAt:'2026-09-27T18:00:00'}};
posts[18].actualSnapshot=null;
records['p18|7d']={postId:'p18',stage:'7d',views:40,observedAt:'2026-09-26T18:00:00'};
const feedback={instruction:'声は判断材料で、強制採用しない',comments:[{postId:'p0',recordId:'p0|7d',text:'対象外'},{postId:'p21',recordId:'p21|7d',text:'対象内'}],savedCustomerVoices:[{id:'request',voiceType:'商品要望',originalText:'別色が欲しい'},{id:'poll',kind:'アンケート',question:'どの色？',options:[{text:'茶',count:2}]},{id:'question',kind:'質問',question:'厚みは？'},{id:'faq',voiceType:'FAQ',originalText:'修理できますか？'}]};
const learningDemo={posts,records,ads:[],months:{'2026-10':{date:'2026-10-04',lineup:[]}},events:[],analyses:[],salesResults:{'2026-10':{initial:{saleDate:'2026-10-04',actualRevenue:190},final:{actualRevenue:270},cycleReview:{reviewedAt:'2026-10-31'}}},salesHistory:[{id:'real-sale',date:'2026-10-04'}]};
const effectiveLearningHistory=vm.runInNewContext(between(html,'function effectiveSalesHistory(){','function saleCycle(id){')+'\neffectiveSalesHistory',{demo:learningDemo});
let daysUntilSale=30;
const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const tasks=posts.filter(p=>p.actualAt).flatMap(p=>['24h','7d'].map(stage=>{const at=Date.parse(p.actualAt);return {p,key:p.id+'|'+stage,stage,start:at+(stage==='7d'?156:18)*3600000,end:at+(stage==='7d'?204:36)*3600000};}));
const bandCode=between(html,'function captureBand(t,r){','function resultSummary(p){');
const captureBand=vm.runInNewContext(bandCode+'\ncaptureBand',{Date});
const planCode=between(html,'function planContext(date){','function chooseAxis(c){');
const planContext=vm.runInNewContext(planCode+'\nplanContext',{demo:learningDemo,salesContext:()=>({until:daysUntilSale,next:{lineup:[]}}),resultSummary:()=>({sevenDay:{views:1}}),voiceCandidates:()=>[],Date});
const learningCtx={demo:learningDemo,effectiveSalesHistory:effectiveLearningHistory,TODAY:'2026-10-05',SCHEMA:'cian-editorial-v1',OFFICIAL_TOPICS:[],validAxes:['CUSTOMER_VALUE','INSTAGRAM_GROWTH','BUSINESS'],RESULT_METRICS:{views:'再生',reach:'リーチ'},dayAdd:addDays,dayDiff:(to,from)=>(Date.parse(to)-Date.parse(from))/86400000,cycleDay:()=> 'Day1',blocked:()=>false,salesCycleBlock:()=>({from:'2026-10-05',to:'2026-10-14',nextFrom:'2026-10-15',nextTo:'2026-10-24',nextDayFrom:11}),planContext,allTasks:()=>tasks,recordState:t=>records[t.key]?'入力済み':'入力待ち',captureBand,nextPlanFeedbackContext:()=>feedback,exposureSummary:()=>({}),productContext:()=>[],monthlySaleStrategy:()=>[],rangePosts:()=>[],cycleData:month=>({month}),Date};
const learning=vm.runInNewContext(editorialCode+'\n({context,postHistories,reviewContext,feedbackContext})',learningCtx);
const actualChoiceCode=between(fs.readFileSync(path.join(root,'three-axis.js'),'utf8'),'function reviewActualChoice(p,f){','function reviewActualRecord(key,recordForm){');
const actualChoice=vm.runInNewContext(actualChoiceCode+'\nreviewActualChoice',{OFFICIAL_TOPICS:[],demo:learningDemo,structuredClone,nowISO:()=> '2026-09-29T00:00:00Z'});
const beforeActual=JSON.stringify(posts[21]);
const snapshot=actualChoice(posts[21],{get:key=>key==='reviewActualChoice'?'planned':null,getAll:()=>[]});
assert.equal(snapshot.theme,'予定21');
assert.equal(snapshot.caption,'予定本文21');
assert.equal(JSON.stringify(posts[21]),beforeActual,'confirming actual must not rewrite planned');
posts[21].actualSnapshot=snapshot;
assert.equal(posts[21].actualAt,'2026-09-22T18:00:00+09:00');
assert.equal(records['p21|7d'].views,0,'saved 7d metrics remain');
let generated=learning.context('ten-day');
assert.equal(generated.actualHistory.count,10);
assert.equal(generated.actualHistory.posts[0].body,'予定本文21');
assert.equal(generated.actualHistory.posts[1].body,'実績本文20');
assert.notEqual(generated.actualHistory.posts[1].body,posts[20].caption);
assert.equal(generated.actualHistory.posts[0].format,'Feed');
assert.equal(generated.plannedPosts.count,1);
assert.equal(generated.customerFeedback.entries.filter(e=>e.type==='comment').length,1);
assert(generated.customerFeedback.entries.some(e=>e.content==='別色が欲しい'));
for(const id of ['request','poll','question','faq']){const voice=feedback.savedCustomerVoices.find(v=>v.id===id);assert(generated.customerFeedback.entries.some(e=>e.content===(voice.originalText||voice.question)),id);}
assert(generated.customerFeedback.instruction.includes('強制採用しない'));
assert(generated.reviews.primary7d.some(e=>e.postId==='p21'));
assert(generated.reviews.provisional24h.some(e=>e.postId==='p20'));
assert(generated.reviews.reference.some(e=>e.postId==='p18'&&e.reason.includes('実投稿内容未確認')));
assert(!generated.reviews.primary7d.some(e=>e.postId==='p18'));
assert(generated.reviews.pending7d.includes('p17|7d'));
assert.equal(generated.reviews.records['p21|7d'].views,0);
assert.equal(generated.reviews.records['p21|7d'].reach,null);
daysUntilSale=10;generated=learning.context('ten-day');assert.equal(generated.actualHistory.count,20);
const analysisJson={schema:2,batchId:'qa-learning-cycle',period:{from:'2026-09-19',to:'2026-09-28'},facts:[{text:'保存が0件と記録された',evidence:['p21|7d'],category:'改善'}],trends:[],hypotheses:[],experiments:[{text:'次回は問いを変えて試す',evidence:['p21|7d'],category:'次回検証'}],newThemes:[],proposals:[{postId:'planned',expectedRevision:1,evidence:['p21|7d'],changes:{hook:'実績を踏まえた新しい問い'}}]};
posts.at(-1).revision=1;
learningDemo.extraThemes=[];learningDemo.reactions=[];
let persistedAnalysis='';
const fields={'#analysisPaste':{value:'json'},'#importPreview':{innerHTML:'preview'},'#analysisImportError':{textContent:''}};
const importCtx={demo:learningDemo,analysisFrom:'2026-09-19',analysisTo:'2026-09-28',ANALYSIS_ACTION_CATEGORIES:['伸ばす','継続','改善','次回検証'],OFFICIAL_TOPICS:[],AXES:{CUSTOMER_VALUE:1,INSTAGRAM_GROWTH:1,BUSINESS:1},rangePosts:()=>[posts.at(-1)],sku:()=>null,structuredClone,nowISO:()=> '2026-09-29T00:00:00Z',dax:()=>[{dataset:{applyProposal:'0'}}],dx:key=>fields[key]||{},persist:()=>{persistedAnalysis=JSON.stringify(learningDemo);},refreshWork:()=>{},toast:()=>{}};
const importCode=between(html,'function applyImport(){','function periodSummary(from,to){')+'validateImport='+between(fs.readFileSync(path.join(root,'three-axis.js'),'utf8'),'validateImport=function(raw){','const originalApply=applyImport;');
vm.runInNewContext('let pendingImport='+JSON.stringify(analysisJson)+';let validateImport;'+importCode+'\napplyImport();',importCtx);
assert.equal(fields['#analysisImportError'].textContent,'');
assert.equal(posts.at(-1).hook,'実績を踏まえた新しい問い');
assert.equal(learningDemo.analyses[0].appliedPostIds[0],'planned');
assert.equal(posts[21].theme,'予定21','actual confirmation does not overwrite planned content');
assert.equal(JSON.parse(persistedAnalysis).analyses[0].batchId,'qa-learning-cycle');
const axis=fs.readFileSync(path.join(root,'three-axis.js'),'utf8');
const schemaPost={id:'schema-post',revision:2,theme:'投稿テーマ例',derivedTheme:'異なる旧表示',conceptVersion:2,actualAt:null,deleted:false,format:'Feed'};
const schemaCtx={demo:{posts:[schemaPost],reactions:[]},rangePosts:()=>[schemaPost],analysisFrom:'2026-09-27',analysisTo:'2026-10-04',structuredClone,ANALYSIS_ACTION_CATEGORIES:['伸ばす','継続','改善','次回検証']};
const schema=vm.runInNewContext('let analysisSchema;'+between(axis,'analysisSchema=function(){','function compactAnalysisPayload(data){')+'analysisSchema()',schemaCtx);
assert.equal(schema.proposals[0].changes.theme,'投稿テーマ例');
assert.equal(schema.proposals[0].changes.derivedTheme,schema.proposals[0].changes.theme,'schema example must copy the exact theme string');
const prompt=vm.runInNewContext('let exportPrompt;'+between(axis,'exportPrompt=function(){','validateImport=function(raw){')+'exportPrompt()',{
 analysisSchema:()=>schema,compactAnalysisPayload:data=>({period:data.period,targetPlan:data.targetPlan}),analysisPayload:()=>({period:{from:'2026-09-27',to:'2026-10-04'},targetPlan:[{postId:'schema-post',revision:2}],nextSuggestedPeriod:{from:'2026-09-27',to:'2026-10-04',nextFrom:'2026-10-05',nextTo:'2026-10-14'}}),demo:{records:{'p21|7d':{}},posts:[{id:'planned'}],reactions:[{id:'reaction-1'}],analyses:[{batchId:'previous-analysis'}]},analysisFrom:'2026-09-27',analysisTo:'2026-10-04',ANALYSIS_ACTION_CATEGORIES:schemaCtx.ANALYSIS_ACTION_CATEGORIES
});
assert(prompt.includes('changes.themeとchanges.derivedThemeは必ず完全に同じ文字列'));
assert(prompt.includes('"theme":"革を長く楽しむ","derivedTheme":"革を長く楽しむ"'));
assert(prompt.includes('分析対象期間（2026-09-27～2026-10-04）'));
assert(prompt.includes('次に作成する10日プラン（2026-10-05～2026-10-14）'));
assert(prompt.includes('experimentsへ日付ごとに記載'));
assert(prompt.includes('proposalsはtargetPlanに含まれる未投稿IDの変更提案だけ'));
assert(prompt.includes('facts、trends、hypotheses、experiments、newThemes、proposalsの各evidence'));
assert(prompt.includes('evidenceIdsに実在するIDだけ'));
assert(prompt.includes('sales-2026-10、nextPlanDays、analysisPeriod、nextPlanPeriod、salesなどのJSONキー名'));
assert(prompt.includes('根拠となる実在IDがない項目は作らず'));
const copiedContext=JSON.parse(prompt.split('\n\n分析データ:\n')[1]);
assert.deepEqual(copiedContext.evidenceIds,['p21|7d','planned','reaction-1','previous-analysis']);
assert(!copiedContext.evidenceIds.includes('sales-2026-10')&&!copiedContext.evidenceIds.includes('nextPlanDays'));
assert.deepEqual(JSON.parse(JSON.stringify(copiedContext.analysisPeriod)),{from:'2026-09-27',to:'2026-10-04'});
assert.deepEqual(JSON.parse(JSON.stringify(copiedContext.nextPlanPeriod)),{from:'2026-10-05',to:'2026-10-14'});
assert.equal(copiedContext.period.from,'2026-09-27');
assert.equal(schema.schema,2);
assert(!Object.hasOwn(schema,'analysisPeriod')&&!Object.hasOwn(schema,'nextPlanPeriod'),'return schema is unchanged');
assert(html.includes(between(axis,'analysisSchema=function(){','function compactAnalysisPayload(data){')));
assert(html.includes(between(axis,'exportPrompt=function(){','validateImport=function(raw){')));
const mismatched={...analysisJson,batchId:'qa-theme-mismatch',proposals:[{postId:'planned',expectedRevision:posts.at(-1).revision,evidence:['p21|7d'],changes:{themeId:null,primaryAxis:'BUSINESS',parentId:null,topicGroup:'CUSTOMER',theme:'投稿テーマ例',derivedTheme:'異なるテーマ',takeaway:'伝えること',subjects:'対象',role:'役割',format:'Feed',caption:'本文',hook:'導入',cta:'導線',sequence:[],stories:[],shots:[],voiceIds:[],researchRequired:false}}]};
assert.throws(()=>vm.runInNewContext('validateImport('+JSON.stringify(JSON.stringify(mismatched))+')',importCtx),/派生テーマと投稿テーマを一致させてください/);
for(const invalidEvidence of ['nextPlanDays','sales-2026-10','analysisPeriod','nextPlanPeriod','sales']){
 const invalid={...analysisJson,batchId:'qa-invalid-evidence',facts:[{text:'架空の根拠',evidence:[invalidEvidence],category:'改善'}]};
 assert.throws(()=>vm.runInNewContext('validateImport('+JSON.stringify(JSON.stringify(invalid))+')',importCtx),/根拠の記録IDが見つかりません/);
}
const scopedCode=between(editorial,'const baseEditorialContext=context;','function prompt(scope){');
const nextCode=between(editorial,'function nextEditorialContext(){','function compactNextEditorialContext(data){');
const nextLearning=vm.runInNewContext(editorialCode+scopedCode+nextCode+'\nnextEditorialContext',learningCtx)();
assert.equal(nextLearning.salesLearning.results[0].initial.actualRevenue,190);
assert.equal(nextLearning.salesLearning.results[0].final.actualRevenue,270);
assert.equal(nextLearning.salesLearning.results[0].cycleReview.reviewedAt,'2026-10-31');
assert.equal(nextLearning.salesLearning.actualSales[0].id,'real-sale');
assert(nextLearning.salesLearning.instruction.includes('因果を断定せず'));
assert(nextLearning.customerFeedback.entries.some(e=>e.content==='別色が欲しい'));
assert(nextLearning.reviews.primary7d.some(e=>e.postId==='p21'));
assert(nextLearning.reviews.analyses.some(a=>a.batchId==='qa-learning-cycle'));
assert.equal(nextLearning.period.from,'2026-10-15');
console.log('PASS fresh state, sales initial→final, blank/zero, JSON reload, shared split/join, scoped learning context');
