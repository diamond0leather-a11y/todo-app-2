// Firestore is an in-memory stub; this QA never connects to production Firebase.
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'dist/firebase-sync.js'),'utf8')
 .replace(/^import .*;\r?\n/gm,'').split('installUI();await setPersistence')[0];
const listeners=new Map(),remote=new Map(),status={hidden:false,textContent:'',classList:{toggle(){}}};
let local=null,failKey=null,failMeta=false,writes=0,reads=0;
const browser=new EventTarget();
browser.todo2SyncBridge={read:()=>structuredClone(local),replace:value=>{local=structuredClone(value);}};
const document={querySelector:selector=>selector==='#firebaseSyncStatus'?status:null,addEventListener(){}};
const ref=(base,...parts)=>({path:[base?.path,...parts].filter(Boolean).join('/')});
const snapshot=value=>({exists:()=>value!==undefined,data:()=>structuredClone(value)});
const sdk={initializeApp:()=>({}),getAuth:()=>({}),getFirestore:()=>({}),doc:ref,collection:ref,
 getDoc:async r=>{reads++;return snapshot(remote.get(r.path));},getDocs:async()=>({forEach(){}}),setDoc:async r=>{if(failMeta)throw Error('mock-offline');writes++;remote.set(r.path,{updatedAt:'mock'});},
 onSnapshot:(r,callback)=>{listeners.set(r.path,callback);return()=>listeners.delete(r.path);},
 runTransaction:async(_db,callback)=>{const staged=[];const result=await callback({get:async r=>snapshot(remote.get(r.path)),set:(r,value)=>staged.push([r.path,structuredClone(value)])});for(const [key,value] of staged){if(key===failKey)throw Error('mock-offline');remote.set(key,value);writes++;}return result;},
 writeBatch:()=>({set(){},commit:async()=>{}}),serverTimestamp:()=>({seconds:1})};
const names=Object.keys(sdk),create=new Function('window','document',...names,`${source}\nreturn {splitState,joinState,listen,applyRemoteSoon,seed:(state)=>{currentUser={uid:'qa-user'};initialized=true;authGeneration=1;remoteDocs=new Map([...splitState(state)].map(([key,value])=>[key,{...value,version:1}]));localBaseline=new Map([...remoteDocs].map(([key,value])=>[key,clean(value)]));conflictBases.clear();writeFailed=false;}};`);
const bridge=create(browser,document,...names.map(name=>sdk[name]));
const old={schema:1,posts:Array.from({length:10},(_,i)=>({id:'post-'+i,date:`2026-10-${String(i+5).padStart(2,'0')}`,theme:i===0?'CARE #50':'旧企画 '+i,caption:'旧本文',stories:[1,2,3,4].map(slot=>({slot,text:'旧Story '+slot})),skuIds:['old-sku'],revision:1,manual:false,actualAt:null})),records:{'post-0|7d':{views:0,reach:null}},reactions:[{id:'voice-1',question:'保存済みの声'}],months:{'2026-10':{date:'2026-10-04',lineup:[{skuId:'old-sku',saleKind:'再販'}]}},categories:[],items:[],skus:[],events:[],ads:[],salePlans:{},shotDone:{},salesHistory:[],salesResults:{}};
local=structuredClone(old);bridge.seed(old);
for(const [key,value] of bridge.splitState(old))remote.set(`workspaces/cian-en-paclam/${key}`,{...value,version:1});
bridge.listen();
const fire=state=>{const event=new Event('todo2:local-save');event.detail={state:structuredClone(state)};browser.dispatchEvent(event);};
const stale=()=>{const key='workspaces/cian-en-paclam/posts/post-0';listeners.get('workspaces/cian-en-paclam/posts')({docChanges:()=>[{type:'modified',doc:{id:'post-0',data:()=>({...bridge.splitState(old).get('posts/post-0'),version:1})}}]});return key;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const next=structuredClone(old);next.posts.forEach((post,i)=>{post.theme=i===0?'CUSTOMER #96':'新企画 '+i;post.caption='新本文 '+i;post.stories=post.stories.map(story=>({...story,text:'新Story '+i+'-'+story.slot}));post.skuIds=['new-sku-'+i];post.revision++;});
 // Saving is pending: an older snapshot must not replace the new local proposal.
 local=structuredClone(next);fire(next);stale();await wait(180);assert.equal(local.posts[0].theme,'CUSTOMER #96');
 await browser.todo2SyncBridge.flush();assert.equal(status.textContent,'共有データを保存しました');
 assert.equal(remote.get('workspaces/cian-en-paclam/posts/post-0').value.theme,'CUSTOMER #96');
 stale();await wait(180);assert.equal(local.posts[0].theme,'CUSTOMER #96');
 const reloaded=bridge.joinState(new Map([...remote].filter(([key])=>key.includes('/state/')||key.includes('/posts/')||key.includes('/reviews/')||key.includes('/voices/')||key.includes('/months/')).map(([key,value])=>[key.split('/').slice(2).join('/'),value])));
 assert.deepEqual(reloaded.posts.map(post=>post.theme),next.posts.map(post=>post.theme));
 assert.deepEqual(reloaded.records,old.records);assert.deepEqual(reloaded.reactions,old.reactions);assert.deepEqual(reloaded.months,old.months);
 const repeatWrites=writes;fire(next);await browser.todo2SyncBridge.flush();assert.equal(writes,repeatWrites,'same plan must not create duplicate writes');
 const protectedState=structuredClone(next);protectedState.posts[0].actualAt='2026-10-05T18:00:00+09:00';protectedState.posts[0].actualSnapshot={theme:'投稿済み'};protectedState.posts[1].manual=true;protectedState.posts[1].caption='手動本文';protectedState.posts[2].stories[0].manual=true;protectedState.posts[2].stories[0].text='手動Story';
 fire(protectedState);await browser.todo2SyncBridge.flush();
 const changed=structuredClone(protectedState);changed.posts[3].theme='失敗する新案';local=structuredClone(changed);failKey='workspaces/cian-en-paclam/posts/post-3';fire(changed);
 await assert.rejects(browser.todo2SyncBridge.flush(),/mock-offline/);assert.equal(status.textContent.includes('共有保存を待機'),true);assert.equal(local.posts[3].theme,'失敗する新案');
 stale();await wait(180);assert.equal(local.posts[3].theme,'失敗する新案','failed write must not roll back local changes');
 failKey=null;fire(changed);await browser.todo2SyncBridge.flush();assert.equal(remote.get(failKey||'workspaces/cian-en-paclam/posts/post-3').value.theme,'失敗する新案');
 const saved=bridge.joinState(new Map([...remote].filter(([key])=>key.includes('/state/')||key.includes('/posts/')||key.includes('/reviews/')||key.includes('/voices/')||key.includes('/months/')).map(([key,value])=>[key.split('/').slice(2).join('/'),value])));
 assert.equal(saved.posts.length,10);assert.equal(saved.posts[0].actualSnapshot.theme,'投稿済み');assert.equal(saved.posts[1].caption,'手動本文');assert.equal(saved.posts[2].stories[0].text,'手動Story');
 const reset=()=>{local=structuredClone(saved);bridge.seed(saved);for(const [key,payload] of bridge.splitState(saved))remote.set(`workspaces/cian-en-paclam/${key}`,{...payload,version:1});};
 const key=i=>`workspaces/cian-en-paclam/posts/post-${i}`;
 const remoteEdit=(i,change)=>{const doc=structuredClone(remote.get(key(i)));Object.assign(doc.value,change);doc.version++;remote.set(key(i),doc);};
 // A: disjoint changes merge and remain visible locally as well as remotely.
 reset();remoteEdit(4,{remoteNote:'other device'});local.posts[4].caption='local caption';await browser.todo2SyncBridge.flush(local,['post-4']);
 assert.equal(remote.get(key(4)).value.caption,'local caption');assert.equal(remote.get(key(4)).value.remoteNote,'other device');assert.equal(local.posts[4].remoteNote,'other device');
 // B: the same field cannot be overwritten, including on a second attempt.
 reset();remoteEdit(5,{caption:'remote caption'});local.posts[5].caption='different local caption';
 await assert.rejects(browser.todo2SyncBridge.flush(local,['post-5']),/sync-conflict/);
 await assert.rejects(browser.todo2SyncBridge.flush(local,['post-5']),/sync-conflict/);assert.equal(remote.get(key(5)).value.caption,'remote caption');
 // C: retry fetches the latest shared post and rebases only after the conflicting field is resolved.
 reset();remoteEdit(8,{caption:'first remote caption'});local.posts[8].caption='new local caption';
 await assert.rejects(browser.todo2SyncBridge.flush(local,['post-8']),/sync-conflict/);
 const readsBefore=reads;remoteEdit(8,{caption:saved.posts[8].caption,remoteNote:'later shared change'});
 await browser.todo2SyncBridge.flush(local,['post-8']);assert(reads>readsBefore);assert.equal(remote.get(key(8)).value.caption,'new local caption');assert.equal(remote.get(key(8)).value.remoteNote,'later shared change');
 // D/E: posted and manually edited remote content remain protected.
 reset();remoteEdit(6,{actualAt:'2026-10-11T18:00:00+09:00'});local.posts[6].caption='must not replace posted';
 await assert.rejects(browser.todo2SyncBridge.flush(local,['post-6']),/sync-conflict/);assert.notEqual(remote.get(key(6)).value.caption,'must not replace posted');
 reset();remoteEdit(7,{manual:true,caption:'manual remote caption'});local.posts[7].caption='must not replace manual';
 await assert.rejects(browser.todo2SyncBridge.flush(local,['post-7']),/sync-conflict/);assert.equal(remote.get(key(7)).value.caption,'manual remote caption');
 // F: a successful earlier post is not written twice after a later post conflicts.
 reset();local.posts[8].caption='partial success';local.posts[9].caption='local after conflict';remoteEdit(9,{caption:'remote conflict'});
 await assert.rejects(browser.todo2SyncBridge.flush(local,['post-8','post-9']),/sync-conflict/);
 const firstVersion=remote.get(key(8)).version;remoteEdit(9,{caption:saved.posts[9].caption,remoteNote:'resolved elsewhere'});
 await browser.todo2SyncBridge.flush(local,['post-8','post-9']);assert.equal(remote.get(key(8)).version,firstVersion);assert.equal(remote.get(key(9)).value.caption,'local after conflict');assert.equal(remote.get(key(9)).value.remoteNote,'resolved elsewhere');
 console.log('PASS mocked shared save, disjoint merge, true conflict, latest-state retry, posted/manual protection, partial retry, reload, no duplicates');
})().catch(error=>{console.error(error);process.exitCode=1;});
