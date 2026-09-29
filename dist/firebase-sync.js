import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,collection,getDoc,getDocs,setDoc,onSnapshot,runTransaction,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const FIREBASE_CONFIG={apiKey:'AIzaSyCP72jrIwY4LzkdmBChyMhMQv0ew_wo0FI',authDomain:'todo-app-2-bc3f1.firebaseapp.com',projectId:'todo-app-2-bc3f1',storageBucket:'todo-app-2-bc3f1.firebasestorage.app',messagingSenderId:'1034830891831',appId:'1:1034830891831:web:b3194d6559af43369e28b2'};
const WORKSPACE_ID='cian-en-paclam',LOCAL_KEY='cian_confirmed_073538_revision_demo_v1',SCHEMA_VERSION=1;
const app=initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app),workspace=doc(db,'workspaces',WORKSPACE_ID);
let currentUser=null,unsubscribers=[],remoteDocs=new Map(),localBaseline=new Map(),conflictBases=new Map(),writeTimer=null,queuedState=null,queuedGeneration=0,applyingRemote=false,initialized=false,saving=false,pendingWrites=0,writeFailed=false,saveQueue=Promise.resolve(),authGeneration=0;

const clean=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safeId=value=>encodeURIComponent(String(value)).replaceAll('%2F','%252F');
const status=(message,error=false)=>{const el=document.querySelector('#firebaseSyncStatus');if(!el)return;clearTimeout(status.timer);el.hidden=false;el.textContent=message;el.classList.toggle('sync-error',error);if(!error&&/同期しました|保存しました|移行しました/.test(message))status.timer=setTimeout(()=>{el.hidden=true;},3200);};

function installUI(){
 const shell=document.createElement('section');shell.id='firebaseLogin';shell.innerHTML=`<p id="firebaseAuthLoading">ログイン状態を確認しています…</p><form id="firebaseLoginForm" hidden><div class="section-kicker">SHARED WORKSPACE</div><h1>Todoアプリ2 ログイン</h1><p>本人・妻の登録済みアカウントでログインしてください。</p><label>メールアドレス<input name="email" type="email" autocomplete="username" required></label><label>パスワード<input name="password" type="password" autocomplete="current-password" required></label><button class="primary full">ログイン</button><p id="firebaseLoginError" role="alert"></p></form>`;document.body.append(shell);
 const bar=document.createElement('div');bar.id='firebaseSyncBar';bar.innerHTML='<span id="firebaseSyncStatus">ログイン状態を確認中</span><button id="firebaseLogout" type="button">ログアウト</button>';document.body.append(bar);
 document.body.classList.add('firebase-locked');
 document.querySelector('#firebaseLoginForm').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.target),error=document.querySelector('#firebaseLoginError');error.textContent='';event.submitter.disabled=true;try{await signInWithEmailAndPassword(auth,String(form.get('email')).trim(),String(form.get('password')));}catch(e){error.textContent='ログインできませんでした。メールアドレスとパスワードを確認してください。';}finally{event.submitter.disabled=false;}};
 document.querySelector('#firebaseLogout').onclick=()=>signOut(auth);
}

function splitState(state){
 const copy=clean(state),posts=copy.posts||[],records=copy.records||{},voices=copy.reactions||[],months=copy.months||{};
 delete copy.posts;delete copy.records;delete copy.reactions;delete copy.months;
 const products={categories:copy.categories||[],items:copy.items||[],skus:copy.skus||[]};delete copy.categories;delete copy.items;delete copy.skus;
 const planning={events:copy.events||[],ads:copy.ads||[],salePlans:copy.salePlans||{}};delete copy.events;delete copy.ads;delete copy.salePlans;
 const shooting={shotDone:copy.shotDone||{}};delete copy.shotDone;
 const operations={salesHistory:copy.salesHistory||[],salesResults:copy.salesResults||{}};delete copy.salesHistory;delete copy.salesResults;
 const out=new Map([['state/products',{value:products}],['state/planning',{value:planning}],['state/shooting',{value:shooting}],['state/operations',{value:operations}],['state/settings',{value:copy}]]);
 posts.forEach(value=>out.set('posts/'+safeId(value.id),{entityId:value.id,value}));
 Object.entries(records).forEach(([key,value])=>out.set('reviews/'+safeId(key),{entityId:key,value}));
 voices.forEach(value=>out.set('voices/'+safeId(value.id),{entityId:value.id,value}));
 Object.entries(months).forEach(([key,value])=>out.set('months/'+safeId(key),{entityId:key,value}));
 return out;
}

function joinState(docs){
 const section=name=>docs.get('state/'+name)?.value||{};
 const state={...section('settings'),...section('products'),...section('planning'),...section('shooting'),...section('operations')};
 state.posts=[];state.records={};state.reactions=[];state.months={};
 for(const [key,data] of docs){if(data.deleted)continue;const [group]=key.split('/');if(group==='posts')state.posts.push(data.value);if(group==='reviews')state.records[data.entityId]=data.value;if(group==='voices')state.reactions.push(data.value);if(group==='months')state.months[data.entityId]=data.value;}
 state.posts.sort((a,b)=>String(a.date).localeCompare(String(b.date)));return state;
}

async function readWorkspace(){
 const groups=['state','posts','reviews','voices','months'],docs=new Map();
 for(const group of groups){const snap=await getDocs(collection(workspace,group));snap.forEach(item=>{const data=item.data();docs.set(group+'/'+item.id,{...data,updatedAt:undefined,updatedBy:undefined});});}
 return docs;
}

async function migrateLocal(state){
 const entries=[...splitState(state)];for(let offset=0;offset<entries.length;offset+=400){const batch=writeBatch(db);for(const [key,payload] of entries.slice(offset,offset+400)){const [group,id]=key.split('/');batch.set(doc(workspace,group,id),{...payload,version:1,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});}await batch.commit();}
 await setDoc(workspace,{initialized:true,schemaVersion:SCHEMA_VERSION,workspaceId:WORKSPACE_ID,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid,source:'localStorage-first-migration'});
 status('この端末の既存データを共有データへ移行しました');
}

function validExistingLocal(){try{const raw=window.__todo2LocalBeforeBoot;if(!raw)return null;const value=JSON.parse(raw);return value&&value.schema===1?value:null;}catch{return null;}}

async function ensureWorkspace(){
 const meta=await getDoc(workspace);if(meta.exists()&&meta.data().initialized)return;
 if((await readWorkspace()).size)throw Error('workspace-incomplete');
 const local=validExistingLocal();if(local){await migrateLocal(local);return;}
 await new Promise(resolve=>{const box=document.querySelector('#firebaseLoginForm');box.insertAdjacentHTML('beforeend','<div class="notice" id="firebaseMigrationConfirm"><p>共有データは空です。この端末には導入前の保存データが見つかりません。現在画面の初期データを共有開始する場合だけ押してください。</p><button type="button" class="secondary full">この端末のデータで共有を開始</button></div>');box.querySelector('#firebaseMigrationConfirm button').onclick=async event=>{event.target.disabled=true;try{await migrateLocal(window.todo2SyncBridge.read());resolve();}catch(e){event.target.disabled=false;status('共有データを開始できませんでした',true);}};});
}

function applyRemoteSoon(){clearTimeout(applyRemoteSoon.timer);applyRemoteSoon.timer=setTimeout(()=>{if(!initialized||pendingWrites||saving||writeFailed||document.querySelector('dialog[open]'))return;const state=joinState(remoteDocs);if(!state.schema)return;applyingRemote=true;try{window.todo2SyncBridge.replace(state);localBaseline=new Map([...remoteDocs].map(([key,value])=>[key,clean(value)]));}finally{applyingRemote=false;}status('共有データを同期しました');},120);}

function listen(){
 for(const group of ['state','posts','reviews','voices','months'])unsubscribers.push(onSnapshot(collection(workspace,group),snap=>{for(const change of snap.docChanges()){const key=group+'/'+change.doc.id;if(change.type==='removed')remoteDocs.delete(key);else{const data=change.doc.data();if((remoteDocs.get(key)?.version||0)>(data.version||0))continue;remoteDocs.set(key,{...data,updatedAt:undefined,updatedBy:undefined});}}applyRemoteSoon();},()=>status('共有データを受信できません。接続と権限を確認してください。',true)));
}

function mergeValue(base,local,remote){
 if(same(base,local))return remote;
 if(same(base,remote)||same(local,remote))return local;
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 if(Array.isArray(local)&&Array.isArray(remote)&&(Array.isArray(base)||base===undefined)){
  const prior=base||[],all=[...prior,...local,...remote];
  const field=['id','skuId','slot','signature'].find(name=>all.length&&all.every(value=>object(value)&&value[name]!==undefined)&&[prior,local,remote].every(values=>new Set(values.map(value=>value[name])).size===values.length));
  if(field){const b=new Map(prior.map(value=>[value[field],value])),l=new Map(local.map(value=>[value[field],value])),r=new Map(remote.map(value=>[value[field],value]));return [...new Set([...r.keys(),...l.keys()])].map(key=>mergeValue(b.get(key),l.get(key),r.get(key))).filter(value=>value!==undefined);}
  if(prior.length===local.length&&prior.length===remote.length)return local.map((value,index)=>mergeValue(prior[index],value,remote[index]));
 }
 if(object(local)&&object(remote)&&(object(base)||base===undefined)){const result={...remote};for(const key of new Set([...Object.keys(base||{}),...Object.keys(local)])){const value=mergeValue(base?.[key],local[key],remote[key]);if(value===undefined)delete result[key];else result[key]=value;}return result;}
 throw Error('sync-conflict');
}

function conflictingFields(base,local,remote,path=''){
 if(same(base,local)||same(base,remote)||same(local,remote))return [];
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 if(object(local)&&object(remote)&&(object(base)||base===undefined))return [...new Set([...Object.keys(base||{}),...Object.keys(local)])].flatMap(key=>conflictingFields(base?.[key],local[key],remote[key],path?path+'.'+key:key));
 if(Array.isArray(local)&&Array.isArray(remote)&&Array.isArray(base)&&base.length===local.length&&base.length===remote.length)return local.flatMap((value,index)=>conflictingFields(base[index],value,remote[index],`${path}[${index}]`));
 return [path||'(document)'];
}
function diagnosticEqual(a,b){
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a))return a.length===b.length&&a.every((value,index)=>diagnosticEqual(value,b[index]));
 const keys=Object.keys(a),other=Object.keys(b);return keys.length===other.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&diagnosticEqual(a[key],b[key]));
}
function shotStructure(shots){
 return Array.isArray(shots)?shots.map((shot,index)=>({index,id:typeof shot?.id==='string'?shot.id:null,media:['写真','動画'].includes(shot?.media)?shot.media:shot?.media==null?null:'other',keys:shot&&typeof shot==='object'?Object.keys(shot).sort():[]})):[];
}
function logConflict(key,stage,reason,fields,base,local,current){
 if(!key.startsWith('posts/'))return;
 const baselineShots=base?.value?.shots,localShots=local?.value?.shots,firestoreShots=current?.value?.shots;
 console.error('[TODO2_SYNC_CONFLICT]',{postId:local?.value?.id||current?.value?.id||base?.value?.id||null,date:local?.value?.date||current?.value?.date||base?.value?.date||null,stage,fields,baselineRevision:base?.value?.revision??null,localRevision:local?.value?.revision??null,firestoreRevision:current?.value?.revision??null,baselineDocumentVersion:base?.version??null,documentVersion:current?.version??null,reason,shots:{baseline:{count:Array.isArray(baselineShots)?baselineShots.length:null,structure:shotStructure(baselineShots)},firestore:{count:Array.isArray(firestoreShots)?firestoreShots.length:null,structure:shotStructure(firestoreShots)},local:{count:Array.isArray(localShots)?localShots.length:null,structure:shotStructure(localShots)},deepEqual:{baselineFirestore:diagnosticEqual(baselineShots,firestoreShots),baselineLocal:diagnosticEqual(baselineShots,localShots),firestoreLocal:diagnosticEqual(firestoreShots,localShots)},serializedEqual:{baselineFirestore:same(baselineShots,firestoreShots),baselineLocal:same(baselineShots,localShots),firestoreLocal:same(firestoreShots,localShots)}}});
}

async function safeWrite(key,payload,base,generation,uid){
 const [group,id]=key.split('/'),ref=doc(workspace,group,id);
 if(generation!==authGeneration)throw Error('session-ended');
 let conflict=null;
 try{const saved=await runTransaction(db,async tx=>{const snap=await tx.get(ref),current=snap.exists()?snap.data():null;if(generation!==authGeneration)throw Error('session-ended');if(group==='posts'&&current?.value&&((current.value.actualAt&&!base?.value?.actualAt)||(current.value.actualSnapshot&&!base?.value?.actualSnapshot))){conflict={current,reason:'保護条件',fields:['actualAt','actualSnapshot'].filter(field=>current.value[field]&&!base?.value?.[field])};throw Error('sync-conflict');}if(payload.deleted&&current&&!same(base?.value,current.value)){conflict={current,reason:'削除対象の変更',fields:conflictingFields(base?.value,payload.value,current.value)};throw Error('sync-conflict');}let value;try{value=payload.deleted?undefined:mergeValue(base?.value,payload.value,current?.value);}catch(error){if(error.message==='sync-conflict')conflict={current,reason:'mergeValue統合不能',fields:conflictingFields(base?.value,payload.value,current?.value)};throw error;}if(group==='posts'&&value&&base?.value&&current?.value&&!same(base.value,current.value)&&!same(payload.value,current.value))value.revision=Math.max(current.value.revision||0,payload.value.revision||0)+1;const next={...payload,...(payload.deleted?{}:{value}),version:(current?.version||0)+1,updatedAt:serverTimestamp(),updatedBy:uid};tx.set(ref,next);return {...next,updatedAt:undefined,updatedBy:undefined};});if(generation===authGeneration)remoteDocs.set(key,saved);return saved;}
 catch(error){if(error.message==='sync-conflict')logConflict(key,'初回transaction',conflict?.reason||'その他',conflict?.fields||['(unknown)'],base,payload,conflict?.current);throw error;}
}

async function rebaseConflicts(state){
 if(!conflictBases.size)return state;
 const entries=splitState(state),resolved=[];
 for(const [key,base] of conflictBases){
  const [group,id]=key.split('/'),snap=await getDoc(doc(workspace,group,id)),current=snap.exists()?snap.data():null,local=entries.get(key);
  if(!local||!current||current.deleted){logConflict(key,'再試行時の再評価','対象投稿がない／削除済み',['(document)'],base,local,current);throw Error('sync-conflict');}
  if(group==='posts'&&current.value&&((current.value.actualAt&&!base?.value?.actualAt)||(current.value.actualSnapshot&&!base?.value?.actualSnapshot))){logConflict(key,'再試行時の再評価','保護条件',['actualAt','actualSnapshot'].filter(field=>current.value[field]&&!base?.value?.[field]),base,local,current);throw Error('sync-conflict');}
  let value;try{value=mergeValue(base?.value,local.value,current.value);}catch(error){if(error.message==='sync-conflict')logConflict(key,'再試行時の再評価','mergeValue統合不能',conflictingFields(base?.value,local.value,current.value),base,local,current);throw error;}
  resolved.push([key,{...local,value},{...current,updatedAt:undefined,updatedBy:undefined}]);
 }
 for(const [key,local,remote] of resolved){entries.set(key,local);remoteDocs.set(key,remote);localBaseline.set(key,clean(remote));conflictBases.delete(key);}
 const rebased=joinState(entries);window.todo2SyncBridge.replace(rebased);return rebased;
}

async function saveState(state,baseline,generation){
 if(!currentUser||!initialized||applyingRemote||generation!==authGeneration)throw Error('session-ended');const uid=currentUser.uid,next=splitState(state),keys=new Set([...baseline.keys(),...next.keys()]),changed=[];
 for(const key of keys){const before=baseline.get(key),after=next.get(key);if(after&&!same(before?.value,after.value))changed.push([key,after,before]);else if(!after&&before&&!before.deleted)changed.push([key,{entityId:before.entityId,deleted:true},before]);}
 if(!changed.length){writeFailed=false;status('共有データを保存しました');return;}
 const mergedPosts=[];
 const applyMerged=()=>{if(!mergedPosts.length)return;const latest=window.todo2SyncBridge.read();let changedLocal=false;for(const [before,after] of mergedPosts){const index=latest.posts.findIndex(post=>post.id===before.id);if(index>=0&&same(latest.posts[index],before)){latest.posts[index]=after;changedLocal=true;}}if(changedLocal)window.todo2SyncBridge.replace(latest);};
 saving=true;status('共有データを保存中…');
 try{
  for(const [key,payload,before] of changed){
   let saved;
   try{saved=await safeWrite(key,payload,before,generation,uid);}
   catch(error){if(error.message==='sync-conflict'&&generation===authGeneration){conflictBases.set(key,before?clean(before):null);const [group,id]=key.split('/'),snap=await getDoc(doc(workspace,group,id));if(snap.exists())remoteDocs.set(key,{...snap.data(),updatedAt:undefined,updatedBy:undefined});}throw error;}
   if(generation!==authGeneration)throw Error('session-ended');
   localBaseline.set(key,clean(saved));conflictBases.delete(key);
   if(key.startsWith('posts/')&&saved.value&&!same(saved.value,payload.value))mergedPosts.push([payload.value,saved.value]);
  }
  await setDoc(workspace,{updatedAt:serverTimestamp(),updatedBy:uid},{merge:true});
  if(generation!==authGeneration)throw Error('session-ended');
  applyMerged();writeFailed=false;status('共有データを保存しました');
 }catch(e){if(generation===authGeneration){applyMerged();writeFailed=true;status(e.message==='sync-conflict'?'同じ項目に別端末の変更があります。再読み込み前に未保存の内容を確認してください。':'共有保存を待機しています。接続後に再度保存してください。',true);}throw e;}
 finally{if(generation===authGeneration)saving=false;}
}

function submitQueued(){
 if(!writeTimer)return saveQueue;
 clearTimeout(writeTimer);writeTimer=null;const state=queuedState,generation=queuedGeneration;queuedState=null;
 saveQueue=saveQueue.catch(()=>{}).then(()=>saveState(state,new Map(localBaseline),generation)).finally(()=>{if(generation!==authGeneration)return;pendingWrites--;applyRemoteSoon();});
 return saveQueue;
}
function queueLocalSave(state){if(writeTimer)clearTimeout(writeTimer);else pendingWrites++;queuedState=clean(state);queuedGeneration=authGeneration;writeTimer=setTimeout(()=>{submitQueued().catch(()=>{});},600);}
window.addEventListener('todo2:local-save',event=>{if(!currentUser||!initialized||applyingRemote)return;queueLocalSave(event.detail.state);});
window.todo2SyncBridge.flush=async(state,postIds=[])=>{
 if(!currentUser||!initialized)throw Error('共有データへ接続できません。ログインと接続を確認してください。');
 if(state)state=await rebaseConflicts(state);
 if(state)queueLocalSave(state);await submitQueued();
 if(!state||!postIds.length)return;
 const expected=new Map((window.todo2SyncBridge.read().posts||[]).map(post=>[post.id,post]));
 try{for(const id of postIds){const post=expected.get(id),key='posts/'+safeId(id),snap=await getDoc(doc(workspace,'posts',safeId(id))),actual=snap.exists()?snap.data():null;
  if(!post||!actual||actual.deleted||!same(actual.value,post)){
   if(actual){remoteDocs.set(key,{...actual,updatedAt:undefined,updatedBy:undefined});localBaseline.set(key,clean(actual));}else{remoteDocs.delete(key);localBaseline.delete(key);}
   throw Error('shared-save-not-confirmed');
  }
 }}catch(error){writeFailed=true;status('共有データへの保存を確認できませんでした。再試行してください。',true);throw error;}
};
document.addEventListener('close',()=>applyRemoteSoon(),true);

installUI();await setPersistence(auth,browserLocalPersistence);onAuthStateChanged(auth,async user=>{
 const generation=++authGeneration;unsubscribers.forEach(fn=>fn());unsubscribers=[];clearTimeout(writeTimer);writeTimer=null;queuedState=null;pendingWrites=0;writeFailed=false;saving=false;saveQueue=Promise.resolve();currentUser=user;initialized=false;remoteDocs.clear();localBaseline.clear();conflictBases.clear();
 if(!user){document.body.classList.add('firebase-locked');document.querySelector('#firebaseLogin').hidden=false;document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=false;document.querySelector('#firebaseSyncBar').hidden=true;return;}
 document.querySelector('#firebaseLogin').hidden=true;document.querySelector('#firebaseSyncBar').hidden=false;status('共有データを読み込み中…');
 try{await setDoc(doc(workspace,'members',user.uid),{email:user.email,active:true,lastSeenAt:serverTimestamp()},{merge:true});if(generation!==authGeneration)return;await ensureWorkspace();if(generation!==authGeneration)return;remoteDocs=await readWorkspace();if(generation!==authGeneration)return;const shared=joinState(remoteDocs);if(shared.schema!==1)throw Error('workspace-incomplete');initialized=true;window.todo2SyncBridge.replace(shared);localBaseline=new Map([...remoteDocs].map(([key,value])=>[key,clean(value)]));document.body.classList.remove('firebase-locked');listen();status('共有データを同期しました');}catch(e){if(generation!==authGeneration)return;document.body.classList.add('firebase-locked');document.querySelector('#firebaseLogin').hidden=false;document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=false;document.querySelector('#firebaseLoginError').textContent=e.message==='workspace-incomplete'?'共有データが途中まで存在します。自動移行は停止しました。データを確認してください。':'共有データを開けませんでした。Firestoreの権限と接続を確認してください。';status('共有データを開けませんでした',true);}
});
