const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'dist/firebase-sync.js'),'utf8');
const between=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const code=[source.match(/^const clean=.*$/m)[0],source.match(/^const safeId=.*$/m)[0],
 'const same=(a,b)=>diagnosticEqual(a,b);',between('function storyDayEntries(','async function readWorkspace('),
 between('function storyEntries(','function shotStructure('),between('async function safeWrite(','async function rebaseConflicts('),
 'globalThis.qa={splitState,joinState,mergeValue,safeWrite};'].join('\n');
let writes=0,remote=null;
const sandbox={Map,Set,JSON,Object,String,Array,encodeURIComponent,authGeneration:1,remoteDocs:new Map(),
 db:{},workspace:{},doc:()=>({}),serverTimestamp:()=>null,logConflict:()=>{},
 runTransaction:async(_,callback)=>callback({get:async()=>({exists:()=>!!remote,data:()=>remote}),set:()=>{writes++;}})};
vm.runInNewContext(code,sandbox);
const {splitState,joinState,mergeValue,safeWrite}=sandbox.qa;
const clone=value=>structuredClone(value),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const conflict=callback=>assert.throws(callback,error=>error?.message==='sync-conflict');
const old={slot:1,text:'old',asset:'old-photo',reactionId:'reaction-old',shotId:'shot-old'};
const base={id:'post-1',date:'2026-10-11',stories:[old],shots:[{id:'shot-old',signature:'sig-old'}]};
const state={schema:1,posts:[base],reactions:[{id:'reaction-old',sourceStory:{postId:'post-1',slot:1,snapshot:old}}],
 shotDone:{'sig-old':true},categories:[{id:'category-1'}],salesResults:{month:{initial:1}},records:{review:{views:2}}};
const roundtrip=value=>joinState(splitState(value));
const independent={schema:1,posts:[],storyDays:[{id:'standalone-1',date:'2026-11-05',slot:1,text:'独立Story'}]};
assert(equal(roundtrip(independent).storyDays,independent.storyDays),'standalone Story survives sync-shaped save and reload');
const dayBase={storyDays:[]},dayLeft={storyDays:[{id:'left-1',date:'2026-11-05',slot:1,text:'A'}]},dayRight={storyDays:[{id:'right-1',date:'2026-11-05',slot:1,text:'B'}]};
conflict(()=>mergeValue(dayBase,dayLeft,dayRight));
conflict(()=>splitState({...independent,storyDays:[...dayLeft.storyDays,...dayRight.storyDays]}));
const disjoint=mergeValue(dayBase,dayLeft,{storyDays:[{...dayRight.storyDays[0],slot:2}]});
assert.equal(disjoint.storyDays.length,2,'different Story slots merge without loss');
assert(equal(roundtrip(state).posts[0].stories,base.stories),'old Stories remain readable');
const mixed=clone(state);mixed.posts[0].stories.push({id:'story-2',slot:2,date:'2026-10-11',text:'new'});
assert(equal(roundtrip(mixed).posts[0].stories,mixed.posts[0].stories),'mixed and dated Stories survive');
mixed.posts[0].storyHistory=[{id:'archived-1',...old,date:'2026-10-11'}];
const restored=roundtrip(mixed);
assert(equal(restored.posts[0].storyHistory,mixed.posts[0].storyHistory),'candidate history survives');
assert(equal(restored.reactions,state.reactions)&&equal(restored.shotDone,state.shotDone)&&equal(restored.posts[0].shots,base.shots),'old records remain unchanged');
const modern={id:'post-1',stories:[{id:'story-1',slot:1,date:'2026-10-11',text:'old'}]};
const local=clone(modern),other=clone(modern);local.stories[0].text='edited';other.stories[0].date='2026-10-12';
const combined=mergeValue(modern,local,other);
assert.equal(combined.stories[0].text,'edited');assert.equal(combined.stories[0].date,'2026-10-12');
const legacy={id:'post-1',stories:[{slot:1,text:'old',asset:'old-photo'}]};
const replaced={id:'post-1',stories:[{id:'new-1',slot:1,text:'new',asset:'new-photo'}]};
const editedOld={id:'post-1',stories:[{slot:1,text:'old',asset:'edited-old-photo'}]};
for(let attempt=0;attempt<3;attempt++)conflict(()=>mergeValue(legacy,replaced,editedOld));
const prior={id:'post-1',stories:[{id:'old-1',slot:1,text:'old'}]};
const a={id:'post-1',stories:[{id:'new-a',slot:1,text:'a'}]};
const b={id:'post-1',stories:[{id:'new-b',slot:1,text:'b'}]};
conflict(()=>mergeValue(prior,a,b));
conflict(()=>mergeValue(prior,{id:'post-1',stories:[a.stories[0],b.stories[0]]},prior));
const editA=clone(legacy),editB=clone(legacy);editA.stories[0].text='local';editB.stories[0].asset='remote';
conflict(()=>mergeValue(legacy,editA,editB));
const otherBase={id:'post-1',stories:legacy.stories,categories:[{id:'category-1',name:'old'}],salesResults:{month:1},records:{review:1}};
const otherLocal=clone(otherBase),otherRemote=clone(otherBase);otherLocal.categories[0].name='new';otherRemote.records.review=2;
const otherResult=mergeValue(otherBase,otherLocal,otherRemote);
assert.equal(otherResult.categories[0].name,'new');assert.equal(otherResult.records.review,2);assert.equal(otherResult.salesResults.month,1);
const archivedBase={id:'post-1',stories:prior.stories,storyHistory:[]},archivedLocal=clone(archivedBase),archivedRemote=clone(archivedBase);
archivedLocal.stories=a.stories;archivedLocal.storyHistory=[{id:'old-1',slot:1,text:'old'}];archivedRemote.date='2026-10-11';
assert.equal(mergeValue(archivedBase,archivedLocal,archivedRemote).storyHistory[0].id,'old-1');
(async()=>{
 remote={value:editedOld,version:2};writes=0;
 await assert.rejects(safeWrite('posts/post-1',{entityId:'post-1',value:replaced},{value:legacy,version:1},1,'qa-user'),
  error=>error?.message==='sync-conflict');
 assert.equal(writes,0,'conflict stops before transaction write');
 console.log('PASS Story sync: legacy/new roundtrip, records/history, same-ID edits, replacement conflicts, repeated merges, unrelated fields, transaction stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
