const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const axis=read('three-axis.js'),daily=read('daily-cycle.js'),editorial=read('dist/chatgpt-editorial.js'),sync=read('dist/firebase-sync.js'),published=read('dist/index.html');
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`missing ${start}`);return source.slice(a,b);};
for(const start of ['const postingStatusDetail=showPost;','const postingStatusActualEdit=editActual;','const compactPostingStatus=compactAnalysisPayload;'])assert(published.includes(between(axis,start,start==='const postingStatusDetail=showPost;'?'function editConcept':start==='const postingStatusActualEdit=editActual;'?'function reviewActualChoice':'exportPrompt=function')));
for(const start of ['const actualProductRecordForm=editRecord;','const postingStatusLearning=analysisPayload;'])assert(published.includes(between(daily,start,start==='const actualProductRecordForm=editRecord;'?'const recordedSevenDayCard=':'\n')));

const planned='naki-navy',actual='berry';
const post={id:'post-1',date:'2026-09-10',theme:'予定テーマ',format:'Feed',caption:'予定本文',skuIds:[planned],revision:2,actualAt:'2026-09-10T09:00:00.000Z',actualSnapshot:{theme:'実際のテーマ',format:'Reel',caption:'実際の本文',skuIds:[planned],confirmedAt:'2026-09-10T10:00:00.000Z'},stories:[]};
const demo={posts:[post],records:{'post-1|7d':{postId:'post-1',stage:'7d',saves:0,reach:null,observedAt:'2026-09-17T18:00'},'post-1|24h':{postId:'post-1',stage:'24h',saves:1}},skus:[{id:planned},{id:actual}],reactions:[],ads:[]};
let formBody='',saveForm;
const context={demo,JSON,Error,structuredClone,html:x=>x,skuLabel:id=>id,sku:id=>demo.skus.find(s=>s.id===id),skuPickerWork:ids=>`picker:${ids.join(',')}`,allTasks:()=>[{p:post,stage:'7d',key:'post-1|7d'}],openForm:(_title,body,save)=>{formBody=body;saveForm=save;},editRecord:key=>context.openForm('7d','saved:'+demo.records[key].saves,f=>{demo.records[key]={...demo.records[key],saves:Number(f.get('saves'))};})};
vm.runInNewContext(between(daily,'const actualProductRecordForm=editRecord;','const recordedSevenDayCard='),context);
context.editRecord('post-1|7d');
assert(formBody.includes(`予定商品：${planned}`)&&formBody.includes(`picker:${planned}`));
saveForm({get:key=>key==='saves'?'4':'',getAll:key=>key==='skuIds'?[actual]:[]});
assert.deepEqual(post.skuIds,[planned]);assert.deepEqual(post.actualSnapshot.skuIds,[actual]);assert.equal(post.revision,3);assert.equal(demo.records['post-1|7d'].saves,4);
const restored=JSON.parse(JSON.stringify(demo));assert.equal(restored.posts[0].skuIds[0],planned);assert.equal(restored.posts[0].actualSnapshot.skuIds[0],actual);assert.equal(restored.records['post-1|7d'].reach,null);
context.editRecord('post-1|7d');assert(formBody.includes(`picker:${actual}`));
// The existing 7d editor restores and replaces the same record key, without touching 24h.
const reviewContext={demo,editRecord:()=>{},allTasks:context.allTasks,actualPost:p=>({...p,...p.actualSnapshot}),openForm:(_title,body,save)=>{formBody=body;saveForm=save;},planDay:x=>x,jstDate:x=>String(x).slice(0,10),formats:{Feed:'Feed',Reel:'Reel'},html:x=>x,postLabel:p=>p.skuIds.join(' + '),RESULT_METRICS:{saves:'保存',reach:'リーチ'},formInput:(label,key,value)=>`${label}:${key}=${value};`,AXES:{CUSTOMER_VALUE:'価値'},jstInput:()=> '2026-09-17T18:00',nowISO:()=> '2026-09-18T00:00:00.000Z',captureBand:()=> '期間内',numberOrBlank:raw=>raw===''?null:Number(raw),emptyVoice:()=>({}),Date};
vm.runInNewContext(between(daily,'editRecord=function(key){','function numberOrBlank(raw){'),reviewContext);
reviewContext.editRecord('post-1|7d');assert(formBody.includes('saves=4;')&&formBody.includes('reach=;'));
saveForm({get:key=>({saves:'6',reach:'',observedAt:'2026-09-17T18:00',commentContents:'',voices:'','meaning-CUSTOMER_VALUE':''})[key]??'',has:()=>false});
assert.equal(demo.records['post-1|7d'].saves,6);assert.equal(demo.records['post-1|7d'].reach,null);assert.equal(Object.keys(demo.records).length,2);assert.equal(demo.records['post-1|24h'].saves,1);

let detail='',editSave,clickHandler,persisted=0;
const noPost={id:'post-2',date:'2026-09-12',skuIds:[planned],revision:1,theme:'予定',caption:'予定本文',format:'Feed',stories:[]};demo.posts.push(noPost);
const button={textContent:'投稿済みにする',insertAdjacentHTML:(_where,html)=>{detail+=html;}};
const noPostContext={demo,TODAY:'2026-09-29',nowISO:()=> '2026-09-29T00:00:00.000Z',showPost:()=>{},dx:()=>button,document:{addEventListener:(_event,handler)=>{clickHandler=handler;}},persist:()=>{persisted++;},refreshWork:()=>{},editActual:id=>noPostContext.openForm('actual','actual fields',f=>{const p=demo.posts.find(x=>x.id===id);p.actualAt='2026-09-12T09:00:00.000Z';p.actualSnapshot={theme:f.get('theme'),skuIds:f.getAll('skuIds'),confirmedAt:'2026-09-29T00:00:00.000Z'};p.revision++;}),openForm:(_title,_body,save)=>{editSave=save;}};
vm.runInNewContext(between(axis,'const postingStatusDetail=showPost;','function editConcept'),noPostContext);
clickHandler({target:{closest:()=>({dataset:{workNotPosted:'post-2'}})},stopImmediatePropagation(){}});
assert.equal(noPost.noPostConfirmedAt,'2026-09-29T00:00:00.000Z');assert.equal(noPost.actualAt,undefined);assert.equal(demo.records['post-2|7d'],undefined);assert.equal(persisted,1);
const taskContext={demo,Date,jstDate:value=>String(value).slice(0,10)};
vm.runInNewContext(between(daily,"const captureWindows={'24h'",'recordState=function'),taskContext);
assert(!taskContext.allTasks().some(task=>task.p.id==='post-2'),'confirmed no-post must not have overdue review tasks');
detail='';noPostContext.showPost('post-2');assert(detail.includes('投稿していないことを確認済み'));assert.equal(button.textContent,'実際は投稿していた');
vm.runInNewContext(between(axis,'const postingStatusActualEdit=editActual;','function reviewActualChoice'),noPostContext);
noPostContext.editActual('post-2');editSave({get:key=>key==='theme'?'実際の投稿':'',getAll:()=>[actual]});
assert(!('noPostConfirmedAt' in noPost));assert.equal(noPost.actualSnapshot.skuIds[0],actual);assert.equal(noPost.skuIds[0],planned);
assert(taskContext.allTasks().some(task=>task.key==='post-2|7d'),'corrected post must enter normal 7d workflow');

const missed={id:'post-3',date:'2026-09-11',skuIds:[planned],theme:'予定',noPostConfirmedAt:'2026-09-11T12:00:00.000Z'};demo.posts.push(missed);
const analysisContext={demo,analysisFrom:'2026-09-01',analysisTo:'2026-09-20',analysisPayload:()=>({targetPlan:[missed],posts:[],unconfirmedActualPosts:[]})};
vm.runInNewContext(between(daily,'const postingStatusLearning=analysisPayload;','\n'),analysisContext);
const analysis=analysisContext.analysisPayload();assert.equal(analysis.notPostedPlans.length,1);assert.equal(analysis.targetPlan.length,0);assert.equal(analysis.posts.length,0);assert.equal(analysis.unconfirmedActualPosts.length,0);
const compactContext={compactAnalysisPayload:()=>({schema:2})};vm.runInNewContext(between(axis,'const compactPostingStatus=compactAnalysisPayload;','exportPrompt=function'),compactContext);assert.equal(compactContext.compactAnalysisPayload(analysis).notPostedPlans[0].postId,'post-3');
const editorialContext={demo,dayAdd:(day,offset)=>offset<0?'2026-09-01':'2026-10-10',planContext:()=>({recent:[post,missed]}),context:()=>({period:{from:'2026-09-20'}})};
vm.runInNewContext(between(editorial,'function postSummary(p){','const scopedPostingContext=context;'),editorialContext);
assert.equal(editorialContext.postSummary(post).products[0],actual);
assert.equal(editorialContext.postHistories('2026-09-20','2026-09-30').plannedPosts.some(p=>p.postId==='post-3'),false);
assert.equal(editorialContext.noPostHistory('2026-09-20')[0].postId,'post-3');
const protection=vm.runInNewContext(between(editorial,'function importProtection(post,choice){','function validate(data){')+'\nimportProtection',{ });assert.equal(protection(missed).whole,true);
const singleProtection=vm.runInNewContext(between(editorial,'const protectedPost=p=>','function savedPlan(p){')+'\nprotectedPost',{});assert(singleProtection(missed));

// Shared-state round trip uses the same split/join functions as the Firebase module; no live connection.
const shared=vm.runInNewContext("const clean=value=>JSON.parse(JSON.stringify(value));const safeId=value=>encodeURIComponent(String(value)).replaceAll('%2F','%252F');"+between(sync,'function splitState(state){','async function readWorkspace(){')+'\n({splitState,joinState})',{});
const joined=shared.joinState(shared.splitState(demo));
assert.equal(joined.posts.find(p=>p.id==='post-1').actualSnapshot.skuIds[0],actual);
assert.equal(joined.posts.find(p=>p.id==='post-1').skuIds[0],planned);
assert.equal(joined.posts.find(p=>p.id==='post-3').noPostConfirmedAt,missed.noPostConfirmedAt);
assert.equal(joined.records['post-1|7d'].saves,6);
assert.equal(Object.keys(joined.records).length,2);
console.log('posting outcome QA passed: actual SKU, no-post correction, saved 7d, analysis, import protection, shared round trip');
