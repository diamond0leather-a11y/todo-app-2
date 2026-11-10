const FIREBASE_CONFIG=window.todo2V7FirebaseConfig;
const V6_PROJECT_ID='todo-app-2-bc3f1';
const V7_PROJECT_ID='todo-app-2-v7';
function v7ConfigError(config){
 if(!config||config.environment!=='todo-app-2-v7')return 'v7専用Firebase設定が未登録です。firebase-config-v7.jsを設定してください。';
 const fields=['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
 if(fields.some(key=>typeof config[key]!=='string'||!config[key].trim()))return 'v7専用Firebase設定に不足があります。firebase-config-v7.jsを確認してください。';
 if(config.projectId===V6_PROJECT_ID||config.authDomain===`${V6_PROJECT_ID}.firebaseapp.com`||config.storageBucket.startsWith(`${V6_PROJECT_ID}.`))return 'v6本番Firebaseの設定はv7で使用できません。v7専用プロジェクトを指定してください。';
 if(config.projectId!==V7_PROJECT_ID)return 'Firebaseの接続先がv7専用プロジェクトではありません。firebase-config-v7.jsを確認してください。';
 if(config.authDomain!==`${config.projectId}.firebaseapp.com`||!config.storageBucket.startsWith(`${config.projectId}.`))return 'Firebase設定のprojectIdとドメインが一致しません。v7専用設定を確認してください。';
 return '';
}
const configError=v7ConfigError(FIREBASE_CONFIG);
if(configError){
 document.body.classList.add('firebase-locked');
 const notice=document.createElement('section');notice.id='firebaseConfigError';notice.setAttribute('role','alert');notice.style.cssText='position:fixed;inset:0;z-index:1001;background:#f5f4f0;padding:40px 20px;color:#9c2e29';
 notice.textContent=configError;document.body.append(notice);
 throw Error(configError);
}
const [{initializeApp},{getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut},{getFirestore,doc,collection,getDoc,getDocs,setDoc,onSnapshot,runTransaction,writeBatch,serverTimestamp}]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
]);
const WORKSPACE_ID='cian-en-paclam-v7',LOCAL_KEY='todo2_v7_shared_local_v1',PENDING_KEY='todo2_v7_pending_shared_v1',SCHEMA_VERSION=1;
const app=initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app),workspace=doc(db,'workspaces',WORKSPACE_ID);
let currentUser=null,unsubscribers=[],remoteDocs=new Map(),localBaseline=new Map(),conflictBases=new Map(),writeTimer=null,queuedState=null,queuedGeneration=0,applyingRemote=false,initialized=false,saving=false,pendingWrites=0,writeFailed=false,saveQueue=Promise.resolve(),authGeneration=0;

const clean=value=>JSON.parse(JSON.stringify(value));
const existingEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const same=(a,b)=>diagnosticEqual(a,b);
const safeId=value=>encodeURIComponent(String(value)).replaceAll('%2F','%252F');
const status=(message,error=false)=>{const el=document.querySelector('#firebaseSyncStatus');if(!el)return;clearTimeout(status.timer);el.hidden=false;el.textContent=message;el.classList.toggle('sync-error',error);const retry=document.querySelector('#firebaseRetrySave');if(retry)retry.hidden=!(initialized&&writeFailed&&pendingRaw());if(!error&&/同期しました|保存しました|移行しました/.test(message))status.timer=setTimeout(()=>{el.hidden=true;},3200);};
function pendingRaw(){try{return localStorage.getItem(PENDING_KEY);}catch{return 'unavailable';}}
function pendingEdit(){const raw=pendingRaw();if(!raw)return null;let entry;try{entry=JSON.parse(raw);}catch{throw Error('端末内の未同期データを確認できません。画面を閉じず、端末の保存容量を確認してください。');}if(entry?.projectId!==V7_PROJECT_ID||entry?.workspaceId!==WORKSPACE_ID||entry?.state?.schema!==1||!Array.isArray(entry?.baseline))throw Error('端末内の未同期データを確認できません。共有データは上書きしません。');return entry;}
function stageLocalEdit(state){if(!initialized||!currentUser)throw Error('共有データへの接続を確認できません。編集内容はまだ保存していません。');const previous=pendingEdit();if(previous&&previous.uid!==currentUser.uid)throw Error('別のアカウントの未同期データがあります。共有保存せず停止しました。');const entry={projectId:V7_PROJECT_ID,workspaceId:WORKSPACE_ID,uid:currentUser.uid,baseline:previous?.baseline||[...localBaseline],state:clean(state)};try{localStorage.setItem(PENDING_KEY,JSON.stringify(entry));}catch{throw Error('端末内に編集内容を保存できません。空き容量を確認してください。');}status('端末に保存済み・共有保存中…');}
function clearSavedEdit(state){const entry=pendingEdit();if(entry&&entry.uid===currentUser?.uid&&same(entry.state,state))localStorage.removeItem(PENDING_KEY);}

function installUI(){
 const shell=document.createElement('section');shell.id='firebaseLogin';shell.innerHTML=`<p id="firebaseAuthLoading">ログイン状態を確認しています…</p><form id="firebaseLoginForm" hidden><div class="section-kicker">SHARED WORKSPACE</div><h1>Todoアプリ2 ログイン</h1><p>本人・妻の登録済みアカウントでログインしてください。</p><label>メールアドレス<input name="email" type="email" autocomplete="username" required></label><label>パスワード<input name="password" type="password" autocomplete="current-password" required></label><button class="primary full">ログイン</button><p id="firebaseLoginError" role="alert"></p></form>`;document.body.append(shell);
  const bar=document.createElement('div');bar.id='firebaseSyncBar';bar.innerHTML='<span id="firebaseSyncStatus">ログイン状態を確認中</span><button id="firebaseRetrySave" type="button" hidden>共有保存を再試行</button><button id="firebaseLogout" type="button">ログアウト</button>';document.body.append(bar);
 document.body.classList.add('firebase-locked');
 document.querySelector('#firebaseLoginForm').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.target),error=document.querySelector('#firebaseLoginError');error.textContent='';event.submitter.disabled=true;try{await signInWithEmailAndPassword(auth,String(form.get('email')).trim(),String(form.get('password')));}catch(e){error.textContent='ログインできませんでした。メールアドレスとパスワードを確認してください。';}finally{event.submitter.disabled=false;}};
  document.querySelector('#firebaseLogout').onclick=()=>{if(pendingRaw()){status('共有未保存の編集があります。共有保存を再試行してからログアウトしてください。',true);return;}signOut(auth);};
  document.querySelector('#firebaseRetrySave').onclick=async event=>{event.target.disabled=true;try{await window.todo2SyncBridge.flush(window.todo2SyncBridge.read());}catch{}finally{event.target.disabled=false;}};
}
window.addEventListener('beforeunload',event=>{if(!pendingRaw())return;event.preventDefault();event.returnValue='';});

function storyDayEntries(rows){
 if(!Array.isArray(rows))throw Error('sync-conflict');
 const ids=new Set(),slots=new Set();
 for(const story of rows){
  if(!story||typeof story.id!=='string'||!story.id||typeof story.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(story.date)||!Number.isSafeInteger(story.slot)||story.slot<1||story.slot>4)throw Error('sync-conflict');
  const key=story.date+'|'+story.slot;
  if(ids.has(story.id)||slots.has(key))throw Error('sync-conflict');
  ids.add(story.id);slots.add(key);
 }
 return new Map(rows.map(story=>[story.id,story]));
}
function splitState(state){
 const copy=clean(state),posts=copy.posts||[],records=copy.records||{},voices=copy.reactions||[],months=copy.months||{};
 storyDayEntries(copy.storyDays||[]);
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
 storyDayEntries(state.storyDays||[]);
 state.posts.sort((a,b)=>String(a.date).localeCompare(String(b.date)));return state;
}

async function readWorkspace(){
 const groups=['state','posts','reviews','voices','months'],docs=new Map();
 for(const group of groups){const snap=await syncRead(getDocs(collection(workspace,group)),group);snap.forEach(item=>{const data=item.data();docs.set(group+'/'+item.id,{...data,updatedAt:undefined,updatedBy:undefined});});}
 return docs;
}

function syncRead(promise,stage){if(stage)status(`${stage}を読み込み中…`);let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const error=Error('sync-read-timeout');error.readStage=stage;reject(error);},15000);})]).finally(()=>clearTimeout(timer));}

async function initializeEmptyWorkspace(generation){
 const entries=[...splitState(window.todo2SyncBridge.emptyState())];
 const refs=entries.map(([key])=>{const [group,id]=key.split('/');return doc(workspace,group,id);});
 await runTransaction(db,async tx=>{
  const meta=await tx.get(workspace);
  const existing=await Promise.all(refs.map(ref=>tx.get(ref)));
  if(generation!==authGeneration||meta.exists()||existing.some(snap=>snap.exists()))throw Error('workspace-initialization-conflict');
  entries.forEach(([,payload],index)=>tx.set(refs[index],{...payload,version:1,updatedAt:serverTimestamp(),updatedBy:currentUser.uid}));
  tx.set(workspace,{initialized:true,schemaVersion:SCHEMA_VERSION,workspaceId:WORKSPACE_ID,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid,source:'empty-v7-start'});
 });
}

async function ensureWorkspace(generation){
 const meta=await syncRead(getDoc(workspace),'管理情報');if(meta.exists()&&meta.data().initialized)return;
 if(meta.exists())throw Error('workspace-incomplete');
 if((await readWorkspace()).size)throw Error('workspace-incomplete');
 await new Promise((resolve,reject)=>{const shell=document.querySelector('#firebaseLogin');shell.querySelector('#firebaseMigrationConfirm')?.remove();const notice=document.createElement('div');notice.id='firebaseMigrationConfirm';notice.className='notice';notice.innerHTML='<h1>共有データの開始確認</h1><p>この端末の古い保存データは取り込まず、v7の空データを新しく作成します。既存のローカル保存値は変更しません。</p><button type="button" class="secondary full">新しい空のデータで開始</button>';shell.append(notice);shell.hidden=false;document.querySelector('#firebaseLoginForm').hidden=true;document.querySelector('#firebaseAuthLoading').hidden=true;status('共有データの開始には確認が必要です',true);notice.querySelector('button').onclick=async event=>{if(generation!==authGeneration||!currentUser){reject(Error('session-ended'));return;}event.target.disabled=true;try{await initializeEmptyWorkspace(generation);notice.remove();shell.hidden=true;resolve();}catch(e){reject(e);}};});
}

function applyRemoteSoon(){clearTimeout(applyRemoteSoon.timer);applyRemoteSoon.timer=setTimeout(()=>{if(!initialized||pendingWrites||saving||writeFailed||pendingRaw()||document.querySelector('dialog[open]'))return;const state=joinState(remoteDocs);if(!state.schema)return;applyingRemote=true;try{window.todo2SyncBridge.replace(state);localBaseline=new Map([...remoteDocs].map(([key,value])=>[key,clean(value)]));}finally{applyingRemote=false;}status('共有データを同期しました');},120);}

function listen(){
 for(const group of ['state','posts','reviews','voices','months'])unsubscribers.push(onSnapshot(collection(workspace,group),snap=>{for(const change of snap.docChanges()){const key=group+'/'+change.doc.id;if(change.type==='removed')remoteDocs.delete(key);else{const data=change.doc.data();if((remoteDocs.get(key)?.version||0)>(data.version||0))continue;remoteDocs.set(key,{...data,updatedAt:undefined,updatedBy:undefined});}}applyRemoteSoon();},()=>status('共有データを受信できません。接続と権限を確認してください。',true)));
}

function storyEntries(stories){
  if(!Array.isArray(stories))throw Error('sync-conflict');
  const slots=new Map(),ids=new Set();
  stories.forEach((story,index)=>{
   if(!story||typeof story!=='object'||Array.isArray(story))throw Error('sync-conflict');
   const slot=story.slot??index+1;
   if(!Number.isSafeInteger(slot)||slot<1||slots.has(slot))throw Error('sync-conflict');
   if(story.id!==undefined){if(typeof story.id!=='string'||!story.id.trim()||ids.has(story.id))throw Error('sync-conflict');ids.add(story.id);}
   slots.set(slot,story);
  });
  return slots;
}
function mergeStories(base,local,remote){
 const prior=storyEntries(base||[]),left=storyEntries(local),right=storyEntries(remote),result=[];
 for(const slot of new Set([...prior.keys(),...left.keys(),...right.keys()])){
  const original=prior.get(slot),a=left.get(slot),b=right.get(slot);
  if(same(a,b)){if(a!==undefined)result.push(a);continue;}
  if(same(original,a)){if(b!==undefined)result.push(b);continue;}
  if(same(original,b)){if(a!==undefined)result.push(a);continue;}
  // Two changed versions of an ID-less Story cannot be identified safely by slot alone.
  if(!a||!b||!a.id||a.id!==b.id||original?.id!==a.id)throw Error('sync-conflict');
  result.push(mergeValue(original,a,b));
 }
 return result;
}
function mergeStoryDays(base,local,remote){
 const prior=storyDayEntries(base||[]),left=storyDayEntries(local||[]),right=storyDayEntries(remote||[]);
 const merged=[...new Set([...right.keys(),...left.keys()])].map(id=>mergeValue(prior.get(id),left.get(id),right.get(id))).filter(Boolean);
 storyDayEntries(merged);
 return merged;
}
function mergeValue(base,local,remote){
 if(typeof local?.id==='string'&&local.id===remote?.id&&Array.isArray(local.stories)&&Array.isArray(remote.stories)){
  storyEntries(local.stories);storyEntries(remote.stories);
 }
 if(same(base,local))return remote;
 if(same(base,remote)||same(local,remote))return local;
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 if(Array.isArray(local)&&Array.isArray(remote)&&(Array.isArray(base)||base===undefined)){
  const prior=base||[],all=[...prior,...local,...remote];
  const field=['id','skuId','slot','signature'].find(name=>all.length&&all.every(value=>object(value)&&value[name]!==undefined)&&[prior,local,remote].every(values=>new Set(values.map(value=>value[name])).size===values.length));
  if(field){const b=new Map(prior.map(value=>[value[field],value])),l=new Map(local.map(value=>[value[field],value])),r=new Map(remote.map(value=>[value[field],value]));return [...new Set([...r.keys(),...l.keys()])].map(key=>mergeValue(b.get(key),l.get(key),r.get(key))).filter(value=>value!==undefined);}
  if(prior.length===local.length&&prior.length===remote.length)return local.map((value,index)=>mergeValue(prior[index],value,remote[index]));
 }
 if(object(local)&&object(remote)&&(object(base)||base===undefined)){const result={...remote};const postStories=typeof local.id==='string'&&local.id===remote.id&&Array.isArray(local.stories)&&Array.isArray(remote.stories);for(const key of new Set([...Object.keys(base||{}),...Object.keys(local)])){const value=key==='storyDays'&&(!same(base?.storyDays,local.storyDays)||!same(base?.storyDays,remote.storyDays))?mergeStoryDays(base?.storyDays,local.storyDays,remote.storyDays):key==='stories'&&postStories&&!same(base?.stories,local.stories)&&!same(base?.stories,remote.stories)?mergeStories(base?.stories,local.stories,remote.stories):mergeValue(base?.[key],local[key],remote[key]);if(value===undefined)delete result[key];else result[key]=value;}return result;}
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
 const shotDetails=reason==='mergeValue統合不能'&&(fields.length===0||fields.some(field=>field==='shots'||field.startsWith('shots[')))?{diagnosticVersion:'shots-flat-v2',baselineDocumentVersion:base?.version??null,firestoreDocumentVersion:current?.version??null,baselineShotsCount:Array.isArray(baselineShots)?baselineShots.length:null,localShotsCount:Array.isArray(localShots)?localShots.length:null,firestoreShotsCount:Array.isArray(firestoreShots)?firestoreShots.length:null,baselineShotsSummary:JSON.stringify(shotStructure(baselineShots)),localShotsSummary:JSON.stringify(shotStructure(localShots)),firestoreShotsSummary:JSON.stringify(shotStructure(firestoreShots)),baselineVsFirestoreDeepEqual:diagnosticEqual(baselineShots,firestoreShots),baselineVsLocalDeepEqual:diagnosticEqual(baselineShots,localShots),localVsFirestoreDeepEqual:diagnosticEqual(localShots,firestoreShots),baselineVsFirestoreExistingEqual:existingEqual(baselineShots,firestoreShots),baselineVsLocalExistingEqual:existingEqual(baselineShots,localShots),localVsFirestoreExistingEqual:existingEqual(localShots,firestoreShots)}:{};
 console.error('[TODO2_SYNC_CONFLICT]',{postId:local?.value?.id||current?.value?.id||base?.value?.id||null,date:local?.value?.date||current?.value?.date||base?.value?.date||null,stage,fields,baselineRevision:base?.value?.revision??null,localRevision:local?.value?.revision??null,firestoreRevision:current?.value?.revision??null,documentVersion:current?.version??null,reason,...shotDetails});
}

async function safeWrite(key,payload,base,generation,uid){
 const [group,id]=key.split('/'),ref=doc(workspace,group,id);
 if(generation!==authGeneration)throw Error('session-ended');
 if(group==='posts'&&!payload.deleted&&Array.isArray(payload.value?.stories))storyEntries(payload.value.stories);
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
  if(!changed.length){writeFailed=false;return;}
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
   applyMerged();writeFailed=false;
 }catch(e){if(generation===authGeneration){applyMerged();writeFailed=true;status(e.message==='sync-conflict'?'同じ項目に別端末の変更があります。再読み込み前に未保存の内容を確認してください。':'共有保存を待機しています。接続後に再度保存してください。',true);}throw e;}
 finally{if(generation===authGeneration)saving=false;}
}

function submitQueued(){
 if(!writeTimer)return saveQueue;
 clearTimeout(writeTimer);writeTimer=null;const state=queuedState,generation=queuedGeneration;queuedState=null;
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{await saveState(state,new Map(localBaseline),generation);if(generation===authGeneration){clearSavedEdit(state);status(pendingRaw()?'この端末に共有未保存の編集が残っています':'共有データを保存しました',!!pendingRaw());}}).finally(()=>{if(generation!==authGeneration)return;pendingWrites--;applyRemoteSoon();});
 return saveQueue;
}
function queueLocalSave(state){if(writeTimer)clearTimeout(writeTimer);else pendingWrites++;queuedState=clean(state);queuedGeneration=authGeneration;writeTimer=setTimeout(()=>{submitQueued().catch(()=>{});},600);}
window.addEventListener('todo2:local-save',event=>{if(!currentUser||!initialized||applyingRemote)return;queueLocalSave(event.detail.state);});
window.todo2SyncBridge.stage=stageLocalEdit;
window.todo2SyncBridge.hasPending=()=>!!pendingRaw();
window.todo2SyncBridge.flush=async(state,postIds=[])=>{
 if(!currentUser||!initialized)throw Error('共有データへ接続できません。ログインと接続を確認してください。');
  if(state)state=await rebaseConflicts(state);
  if(state){stageLocalEdit(state);queueLocalSave(state);}await submitQueued();
 if(!state||!postIds.length)return;
 const expected=new Map((window.todo2SyncBridge.read().posts||[]).map(post=>[post.id,post]));
 try{for(const id of postIds){const post=expected.get(id),key='posts/'+safeId(id),snap=await getDoc(doc(workspace,'posts',safeId(id))),actual=snap.exists()?snap.data():null;
  if(!post||!actual||actual.deleted||!same(actual.value,post)){
   if(actual){remoteDocs.set(key,{...actual,updatedAt:undefined,updatedBy:undefined});localBaseline.set(key,clean(actual));}else{remoteDocs.delete(key);localBaseline.delete(key);}
   throw Error('shared-save-not-confirmed');
  }
 }}catch(error){writeFailed=true;status('共有データへの保存を確認できませんでした。再試行してください。',true);throw error;}
};
// Exchange two planned posts in one Firestore transaction. Do not stage a partial local edit.
window.todo2SyncBridge.swapPosts=async(nextPosts)=>{
 if(!currentUser||!initialized||applyingRemote||saving||pendingWrites||writeTimer||writeFailed||pendingRaw())throw Error('共有保存中の編集があります。完了後に交換してください。');
 if(!Array.isArray(nextPosts)||nextPosts.length!==2||nextPosts[0].id===nextPosts[1].id)throw Error('交換する2件を確認してください。');
 const generation=authGeneration,uid=currentUser.uid,local=window.todo2SyncBridge.read();
 const entries=nextPosts.map(value=>{const key='posts/'+safeId(value.id),base=localBaseline.get(key),current=local.posts.find(post=>post.id===value.id&&!post.deleted);if(!base||!current||!same(base.value,current)||current.actualAt||current.actualSnapshot||current.noPostConfirmedAt||current.posted||current.status==='posted'||Object.keys(local.records||{}).some(record=>record.startsWith(value.id+'|')))throw Error('投稿の保存状態を確認できません。交換を中止しました。');return {key,base,current,value,ref:doc(workspace,'posts',safeId(value.id))};});
 if(entries[0].current.date!==entries[1].value.date||entries[1].current.date!==entries[0].value.date)throw Error('交換する日付を確認してください。');
 saving=true;status('2件の投稿を交換中…');
 try{
  const saved=await runTransaction(db,async tx=>{
   const snapshots=[];
   for(const entry of entries)snapshots.push(await tx.get(entry.ref));
   if(generation!==authGeneration)throw Error('session-ended');
   const updates=entries.map((entry,index)=>{const current=snapshots[index].exists()?snapshots[index].data():null;if(!current||current.deleted||!same(current.value,entry.base.value)||current.value?.actualAt||current.value?.actualSnapshot||current.value?.noPostConfirmedAt||current.value?.posted||current.value?.status==='posted')throw Error('sync-conflict');return {...current,entityId:entry.value.id,value:clean(entry.value),version:(current.version||0)+1,updatedAt:serverTimestamp(),updatedBy:uid};});
   updates.forEach((value,index)=>tx.set(entries[index].ref,value));
   tx.set(workspace,{updatedAt:serverTimestamp(),updatedBy:uid},{merge:true});
   return updates.map(value=>({...value,updatedAt:undefined,updatedBy:undefined}));
  });
  if(generation!==authGeneration)throw Error('session-ended');
  const next=clean(local);for(const value of nextPosts){const index=next.posts.findIndex(post=>post.id===value.id);next.posts[index]=clean(value);}
  saved.forEach((value,index)=>{remoteDocs.set(entries[index].key,value);localBaseline.set(entries[index].key,clean(value));});
  window.todo2SyncBridge.replace(next);status('2件の投稿を共有保存しました');
 }catch(error){status('2件の交換を確認できませんでした。投稿を開き直して確認してください。',true);throw error;}
 finally{if(generation===authGeneration)saving=false;}
};
document.addEventListener('close',()=>applyRemoteSoon(),true);

function showPendingRecovery(entry,user,generation){
 const shell=document.querySelector('#firebaseLogin');shell.hidden=false;document.querySelector('#firebaseSyncBar').hidden=false;
 document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=true;
 let notice=shell.querySelector('#firebasePendingRecovery');if(!notice){notice=document.createElement('div');notice.id='firebasePendingRecovery';notice.className='notice';shell.append(notice);}
 notice.replaceChildren();const message=document.createElement('p');message.textContent=entry.uid===user.uid?'この端末に共有未保存の編集があります。共有データで上書きせず保護しています。通信を確認し、再保存してください。別端末で同じ項目を変更していた場合は保存を止めます。':'別のアカウントの共有未保存データがあります。上書きを防ぐため、この画面では共有データを開けません。';notice.append(message);
 if(entry.uid!==user.uid){status('別アカウントの未同期データを保護しています',true);return;}
 const retry=document.createElement('button');retry.type='button';retry.className='secondary full';retry.textContent='未同期の編集を共有へ再保存';notice.append(retry);
 retry.onclick=async()=>{retry.disabled=true;try{localBaseline=new Map(entry.baseline);initialized=true;queueLocalSave(entry.state);await submitQueued();if(pendingRaw())throw Error('共有保存を確認できませんでした');window.todo2SyncBridge.replace(joinState(remoteDocs));notice.remove();shell.hidden=true;document.body.classList.remove('firebase-locked');listen();status('共有データを保存しました');}catch(error){initialized=false;status(error.message==='sync-conflict'?'別端末と同じ項目が変更されています。端末内の編集は保持しました。上書きせず、内容を確認してください。':'共有保存できませんでした。端末内の編集は保持しています。通信を確認して再試行してください。',true);}finally{retry.disabled=false;}};
 status('共有未保存の編集を保護しています',true);
}
function initialReadErrorMessage(e){return e.message==='workspace-incomplete'?'共有データが途中まで存在します。初期化は停止しました。データを確認してください。':e.message==='workspace-initialization-conflict'?'別の端末で共有データが作成されました。上書きせず停止しました。再読み込みして確認してください。':e.message==='sync-read-timeout'?`共有データの読み込みが時間切れになりました${e.readStage?`（${e.readStage}）`:''}。接続を確認して再試行してください。`:e.code==='permission-denied'?'Firestoreへのアクセスが拒否されました。権限を確認してください。':'共有データを開けませんでした。接続と権限を確認してください。';}
async function loadSharedWorkspace(user,generation){
 document.querySelector('#firebaseLogin').hidden=true;document.querySelector('#firebaseSyncBar').hidden=false;status('共有データを読み込み中…');
 try{
  await ensureWorkspace(generation);if(generation!==authGeneration)return;
  remoteDocs=await readWorkspace();if(generation!==authGeneration)return;
  const shared=joinState(remoteDocs);if(shared.schema!==1)throw Error('workspace-incomplete');
  const pending=pendingEdit();if(pending){showPendingRecovery(pending,user,generation);return;}
  initialized=true;window.todo2SyncBridge.replace(shared);
  localBaseline=new Map([...remoteDocs].map(([key,value])=>[key,clean(value)]));
  document.body.classList.remove('firebase-locked');listen();status('共有データを同期しました');
 }catch(e){
  if(generation!==authGeneration)return;
  document.body.classList.add('firebase-locked');
  const shell=document.querySelector('#firebaseLogin');shell.hidden=false;shell.querySelector('#firebaseMigrationConfirm')?.remove();
  document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=true;
  let notice=shell.querySelector('#firebaseLoadError');
  if(!notice){notice=document.createElement('div');notice.id='firebaseLoadError';notice.className='notice';shell.append(notice);}
   const message=initialReadErrorMessage(e);
   notice.replaceChildren(document.createElement('p'));notice.querySelector('p').textContent=message+(pendingRaw()?' この端末の未同期編集は保護されています。接続を確認して再試行してください。':'');
  if(e.message!=='workspace-incomplete'){
   const retry=document.createElement('button');retry.type='button';retry.className='secondary full';retry.textContent='再試行';
   retry.onclick=()=>{notice.remove();loadSharedWorkspace(user,generation);};notice.append(retry);
  }
  status('共有データを開けませんでした',true);
 }
}

installUI();await setPersistence(auth,browserLocalPersistence);onAuthStateChanged(auth,async user=>{
 const generation=++authGeneration;unsubscribers.forEach(fn=>fn());unsubscribers=[];clearTimeout(writeTimer);writeTimer=null;queuedState=null;pendingWrites=0;writeFailed=false;saving=false;saveQueue=Promise.resolve();currentUser=user;initialized=false;remoteDocs.clear();localBaseline.clear();conflictBases.clear();
 if(!user){document.body.classList.add('firebase-locked');const shell=document.querySelector('#firebaseLogin');shell.hidden=false;shell.querySelector('#firebaseMigrationConfirm')?.remove();shell.querySelector('#firebaseLoadError')?.remove();document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=false;document.querySelector('#firebaseSyncBar').hidden=true;return;}
 await loadSharedWorkspace(user,generation);
});
