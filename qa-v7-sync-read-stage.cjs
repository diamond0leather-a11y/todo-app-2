const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/firebase-sync.js','utf8');
const section=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const code=section('async function readWorkspace()','async function initializeEmptyWorkspace(')+section('async function ensureWorkspace(generation)','function applyRemoteSoon(')+section('function initialReadErrorMessage(e)','async function loadSharedWorkspace(');
const groups=['state','posts','reviews','voices','months'];
const stages=['管理情報',...groups];
function contextFor(stalled){
 const messages=[],reads=[],timeouts=[];
 const context={Promise,Error,Map,setTimeout:(callback,ms)=>{timeouts.push(ms);return setImmediate(callback);},clearTimeout:clearImmediate,
  status:message=>messages.push(message),workspace:{},collection:(_workspace,group)=>group,
  getDoc:()=>{reads.push('管理情報');return stalled==='管理情報'?new Promise(()=>{}):Promise.resolve({exists:()=>true,data:()=>({initialized:true})});},
  getDocs:group=>{reads.push(group);return stalled===group?new Promise(()=>{}):Promise.resolve({forEach(){}});}};
 vm.createContext(context);vm.runInContext(code,context);
 return {context,messages,reads,timeouts};
}
(async()=>{
 for(const stage of stages){
  const {context,messages,reads,timeouts}=contextFor(stage);
  let error;
  try{await context.ensureWorkspace(1);await context.readWorkspace();}catch(value){error=value;}
  assert.equal(error?.message,'sync-read-timeout');
  assert.equal(error.readStage,stage);
  assert.equal(context.initialReadErrorMessage(error).includes(`（${stage}）`),true);
  assert.equal(messages.at(-1),`${stage}を読み込み中…`);
  assert.deepEqual(reads,stages.slice(0,stages.indexOf(stage)+1));
  assert.ok(timeouts.every(ms=>ms===15000),'timeout duration stays 15 seconds');
 }
 const {context,messages,reads,timeouts}=contextFor(null);
 await context.ensureWorkspace(1);const docs=await context.readWorkspace();
 assert.equal(docs.size,0);assert.deepEqual(reads,stages);
 assert.deepEqual(messages,stages.map(stage=>`${stage}を読み込み中…`));
 assert.ok(timeouts.every(ms=>ms===15000));
 assert.equal(context.initialReadErrorMessage(Error('workspace-incomplete')).includes('途中まで存在'),true);
 const normalMessages=[],replaced=[],shell={hidden:false},bar={hidden:true};
 const normal={Promise,Map,authGeneration:1,remoteDocs:new Map(),initialized:false,localBaseline:new Map(),
  ensureWorkspace:async()=>{},readWorkspace:async()=>new Map([['state/settings',{value:{schema:1}}]]),joinState:()=>({schema:1,posts:[]}),pendingEdit:()=>null,clean:value=>structuredClone(value),
  window:{todo2SyncBridge:{replace:value=>replaced.push(value)}},document:{body:{classList:{remove(){},add(){}}},querySelector:selector=>({'#firebaseLogin':shell,'#firebaseSyncBar':bar})[selector]},
  status:message=>normalMessages.push(message),listen(){normalMessages.push('listen');}};
 vm.createContext(normal);
 vm.runInContext('let authGeneration=1,remoteDocs=new Map(),initialized=false,localBaseline=new Map();'+section('function initialReadErrorMessage(e)','installUI();await setPersistence('),normal);
 await normal.loadSharedWorkspace({uid:'fake-user'},1);
 assert.equal(replaced.length,1);assert.equal(shell.hidden,true);assert.equal(bar.hidden,false);
 assert.equal(normalMessages.at(-1),'共有データを同期しました');
 console.log('PASS v7 sync read stages: metadata + five collections, timeout labels, normal completion, unchanged 15 seconds');
})().catch(error=>{console.error(error);process.exitCode=1;});
