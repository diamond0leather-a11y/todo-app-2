const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'dist/firebase-sync.js'),'utf8');
const from=file.indexOf('window.todo2SyncBridge.saveStory1Selection=async(changes)=>{');
const to=file.indexOf('\ndocument.addEventListener(\'close\'',from);
assert(from>0&&to>from);
const source=file.slice(from,to);
const clone=value=>JSON.parse(JSON.stringify(value));
const originalStory={id:'story-1',date:'2026-11-09',slot:1,text:'元のStory',asset:'元素材',manual:true,aiPendingReview:true,editorialSource:'chatgpt-ten-day'};
const state={schema:1,posts:[{id:'post-1',date:'2026-11-09',format:'Feed',caption:'元の本文',shots:[{id:'cut-1'}],revision:1}],storyDays:[originalStory,{id:'story-2',date:'2026-11-09',slot:2,text:'守るStory2'}],reactions:[],skus:[],records:{}};
const settings={value:{schema:1,storyDays:clone(state.storyDays)},version:1};
const remote=new Map([['state/settings',clone(settings)],['posts/post-1',{entityId:'post-1',value:clone(state.posts[0]),version:1}]]);
const baseline=new Map([...remote].map(([key,value])=>[key,clone(value)]));
let app=clone(state),failed=false,writeCount=0,statusText='';
const context={window:{todo2SyncBridge:{read:()=>clone(app),replace:next=>{app=clone(next);}}},currentUser:{uid:'qa-user'},initialized:true,applyingRemote:false,saving:false,pendingWrites:0,writeTimer:null,writeFailed:false,authGeneration:1,localBaseline:baseline,remoteDocs:new Map(),workspace:'workspace',db:'db',
  pendingRaw:()=>null,clean:clone,same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),safeId:value=>value,
  splitState:()=>new Map([['state/settings',{value:{schema:1,storyDays:clone(app.storyDays)}}]]),
  getDocs:async group=>({docs:[...remote].filter(([key])=>key.startsWith(group+'/')).map(([,value])=>({data:()=>clone(value)}))}),
  collection:(_workspace,group)=>group,doc:(_workspace,group,id)=>group+'/'+id,
  runTransaction:async(_db,handler)=>{const writes=[];const result=await handler({get:async ref=>({exists:()=>remote.has(ref),data:()=>clone(remote.get(ref))}),set:(ref,value)=>writes.push([ref,clone(value)])});if(failed)throw Error('mock-write-failed');for(const [ref,value] of writes){remote.set(ref,value);writeCount++;}return result;},
  serverTimestamp:()=>({seconds:1}),status:message=>{statusText=message;},
  storyDayEntries:rows=>{const keys=new Set();for(const row of rows){const key=row.date+'|'+row.slot;if(keys.has(key))throw Error('duplicate');keys.add(key);}},
  TextEncoder,crypto:{randomUUID:()=> 'new-story-id'},Error,Set,Map,JSON};
vm.createContext(context);vm.runInContext(source,context);
const proposal={date:'2026-11-09',slot:1,category:'文化',title:'出典つき',text:'新しいStory https://example.test',action:'見る',asset:'元素材',materialMode:'既存',skuIds:[],researchSources:[{name:'資料',url:'https://example.test'}],verificationStatus:'verified'};
async function run(){
 failed=true;await assert.rejects(context.window.todo2SyncBridge.saveStory1Selection([{date:proposal.date,story:proposal}]),/mock-write-failed/);
 assert.equal(writeCount,0);assert.equal(app.storyDays[0].text,'元のStory');assert.equal(remote.get('state/settings').value.storyDays[0].text,'元のStory');
 remote.get('posts/post-1').value.actualAt='2026-11-09T10:00:00+09:00';failed=false;await assert.rejects(context.window.todo2SyncBridge.saveStory1Selection([{date:proposal.date,story:proposal}]),/sync-conflict/);delete remote.get('posts/post-1').value.actualAt;
 remote.set('voices/qa-reaction',{entityId:'qa-reaction',value:{sourceStory:{storyId:'story-1'}}});await assert.rejects(context.window.todo2SyncBridge.saveStory1Selection([{date:proposal.date,story:proposal}]),/反応/);remote.delete('voices/qa-reaction');
 failed=false;await context.window.todo2SyncBridge.saveStory1Selection([{date:proposal.date,story:proposal}]);
 assert.equal(writeCount,1);assert.equal(app.storyDays[0].text,proposal.text);assert.equal(app.storyDays[0].aiPendingReview,false);assert.equal(app.storyDays[1].text,'守るStory2');assert.equal(app.posts[0].caption,'元の本文');assert.equal(app.posts[0].shots[0].id,'cut-1');assert.equal(app.storyDays[0].researchSources[0].url,'https://example.test');
 const after=clone(app);remote.get('state/settings').value.storyDays[0].text='別端末の変更';await assert.rejects(context.window.todo2SyncBridge.saveStory1Selection([{date:proposal.date,story:{...proposal,text:'また変更'}}]),/sync-conflict/);assert.equal(JSON.stringify(app),JSON.stringify(after));
 console.log('PASS Story1 settings transaction: atomic failure, selected-only update, other data preserved');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
