const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/v7-story-ui.js','utf8');
const code=source.slice(source.indexOf('recordStoryResponse=function'),source.indexOf('const v7PreviousSaveStoryDraft='));
const story={id:'new-story',date:'2026-11-05',slot:1,text:'新Story',theme:'文化',skuIds:[],options:[]};
const oldReaction={id:'old-reaction',sourceStory:{postId:'post-1',slot:1,snapshot:{text:'旧Story'}},question:'旧質問'};
const post={id:'post-1',date:'2026-11-07',stories:[story],revision:1};
const dialog={open:true},options={innerHTML:''};
const form={elements:{question:{value:''},date:{value:''},theme:{value:''},kind:{value:''},parentId:{value:''}},querySelectorAll:()=>[],querySelector:()=>options,onsubmit:null};
const state={posts:[post],reactions:[oldReaction]};
let editedId='unset',saved=0;
const ctx={demo:state,structuredClone,V7StoryState:require('./dist/v7-story-state.js'),currentStoryDraft:()=>({stories:[]}),newId:()=> 'generated',formInput:()=>'',persist(){saved++;},
 dx:selector=>selector==='#dayDialog'?{close(){}}:selector==='#workForm'?form:dialog,
 editReaction(id){editedId=id;dialog.open=true;form.onsubmit=()=>{if(!id)state.reactions.push({id:'new-reaction',question:form.elements.question.value});dialog.open=false;};}};
vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function v7StoryEntry('),source.indexOf('function v7StoryFields(')),ctx);vm.runInContext(code,ctx);
ctx.recordStoryResponse('post-1',0,'saved');
assert.equal(editedId,undefined,'legacy slot-only reaction is not selected');
assert.equal(form.elements.date.value,'2026-11-05','Story date is used, not the moved Feed date');
form.onsubmit({});
assert.equal(state.reactions.length,2);
assert.equal(state.reactions[0].sourceStory.storyId,undefined,'old reaction is not rewritten');
assert.equal(state.reactions[1].sourceStory.storyId,'new-story');
assert.equal(state.reactions[1].sourceStory.snapshot.text,'新Story');
assert.equal(saved,1);
assert.deepEqual(JSON.parse(JSON.stringify(state)).reactions[1].sourceStory.storyId,'new-story');
console.log('PASS v7 Story reaction: ID-only lookup, moved-date input, no legacy mislink, saved source identity');
