import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,collection,getDoc,getDocs,setDoc,onSnapshot,runTransaction,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const FIREBASE_CONFIG={apiKey:'AIzaSyCP72jrIwY4LzkdmBChyMhMQv0ew_wo0FI',authDomain:'todo-app-2-bc3f1.firebaseapp.com',projectId:'todo-app-2-bc3f1',storageBucket:'todo-app-2-bc3f1.firebasestorage.app',messagingSenderId:'1034830891831',appId:'1:1034830891831:web:b3194d6559af43369e28b2'};
const WORKSPACE_ID='cian-en-paclam',LOCAL_KEY='cian_confirmed_073538_revision_demo_v1',SCHEMA_VERSION=1;
const app=initializeApp(FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app),workspace=doc(db,'workspaces',WORKSPACE_ID);
let currentUser=null,unsubscribers=[],remoteDocs=new Map(),baseVersions=new Map(),writeTimer=null,applyingRemote=false,initialized=false;

const clean=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safeId=value=>encodeURIComponent(String(value)).replaceAll('%2F','%252F');
const status=(message,error=false)=>{const el=document.querySelector('#firebaseSyncStatus');if(el){el.textContent=message;el.classList.toggle('sync-error',error);}};

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
 for(const group of groups){const snap=await getDocs(collection(workspace,group));snap.forEach(item=>{const data=item.data();docs.set(group+'/'+item.id,{...data,updatedAt:undefined,updatedBy:undefined});baseVersions.set(group+'/'+item.id,data.version||0);});}
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
 const local=validExistingLocal();if(local){await migrateLocal(local);return;}
 await new Promise(resolve=>{const box=document.querySelector('#firebaseLoginForm');box.insertAdjacentHTML('beforeend','<div class="notice" id="firebaseMigrationConfirm"><p>共有データは空です。この端末には導入前の保存データが見つかりません。現在画面の初期データを共有開始する場合だけ押してください。</p><button type="button" class="secondary full">この端末のデータで共有を開始</button></div>');box.querySelector('#firebaseMigrationConfirm button').onclick=async event=>{event.target.disabled=true;try{await migrateLocal(window.todo2SyncBridge.read());resolve();}catch(e){event.target.disabled=false;status('共有データを開始できませんでした',true);}};});
}

function applyRemoteSoon(){clearTimeout(applyRemoteSoon.timer);applyRemoteSoon.timer=setTimeout(()=>{if(!initialized)return;const state=joinState(remoteDocs);if(!state.schema)return;applyingRemote=true;window.todo2SyncBridge.replace(state);applyingRemote=false;status('共有データを同期しました');},120);}

function listen(){
 for(const group of ['state','posts','reviews','voices','months'])unsubscribers.push(onSnapshot(collection(workspace,group),snap=>{for(const change of snap.docChanges()){const key=group+'/'+change.doc.id;if(change.type==='removed'){remoteDocs.delete(key);baseVersions.delete(key);}else{const data=change.doc.data();remoteDocs.set(key,{...data,updatedAt:undefined,updatedBy:undefined});baseVersions.set(key,data.version||0);}}applyRemoteSoon();},()=>status('共有データを受信できません。接続と権限を確認してください。',true)));
}

async function safeWrite(key,payload){
 const [group,id]=key.split('/'),ref=doc(workspace,group,id),expected=baseVersions.get(key)||0;
 const version=await runTransaction(db,async tx=>{const snap=await tx.get(ref),current=snap.exists()?(snap.data().version||0):0;if(current!==expected)throw Error('sync-conflict');const next=current+1;tx.set(ref,{...payload,version:next,updatedAt:serverTimestamp(),updatedBy:currentUser.uid});return next;});baseVersions.set(key,version);remoteDocs.set(key,{...payload,version});
}

async function saveState(state){
 if(!currentUser||!initialized||applyingRemote)return;const next=splitState(state),keys=new Set([...remoteDocs.keys(),...next.keys()]),changed=[];
 for(const key of keys){const before=remoteDocs.get(key),after=next.get(key);if(after&&!same(before?.value,after.value))changed.push([key,after]);else if(!after&&before&&!before.deleted)changed.push([key,{entityId:before.entityId,deleted:true}]);}
 if(!changed.length)return;status('共有データを保存中…');try{for(const [key,payload] of changed)await safeWrite(key,payload);await setDoc(workspace,{updatedAt:serverTimestamp(),updatedBy:currentUser.uid},{merge:true});status('共有データを保存しました');}catch(e){status(e.message==='sync-conflict'?'別端末の新しい変更を受信しました。内容を確認してもう一度保存してください。':'共有保存を待機しています。接続後に再度保存してください。',true);}
}

window.addEventListener('todo2:local-save',event=>{clearTimeout(writeTimer);writeTimer=setTimeout(()=>saveState(event.detail.state),600);});

installUI();await setPersistence(auth,browserLocalPersistence);onAuthStateChanged(auth,async user=>{
 unsubscribers.forEach(fn=>fn());unsubscribers=[];currentUser=user;initialized=false;remoteDocs.clear();baseVersions.clear();
 if(!user){document.body.classList.add('firebase-locked');document.querySelector('#firebaseLogin').hidden=false;document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=false;document.querySelector('#firebaseSyncBar').hidden=true;return;}
 document.querySelector('#firebaseLogin').hidden=true;document.querySelector('#firebaseSyncBar').hidden=false;status('共有データを読み込み中…');
 try{await setDoc(doc(workspace,'members',user.uid),{email:user.email,active:true,lastSeenAt:serverTimestamp()},{merge:true});await ensureWorkspace();remoteDocs=await readWorkspace();initialized=true;window.todo2SyncBridge.replace(joinState(remoteDocs));document.body.classList.remove('firebase-locked');listen();status('共有データを同期しました');}catch(e){document.body.classList.add('firebase-locked');document.querySelector('#firebaseLogin').hidden=false;document.querySelector('#firebaseAuthLoading').hidden=true;document.querySelector('#firebaseLoginForm').hidden=false;document.querySelector('#firebaseLoginError').textContent='共有データを開けませんでした。Firestoreの権限と接続を確認してください。';status('共有データを開けませんでした',true);}
});
