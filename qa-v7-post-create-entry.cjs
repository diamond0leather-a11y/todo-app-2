const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/v7-story-ui.js', 'utf8');
const editorial = fs.readFileSync('dist/chatgpt-editorial.js', 'utf8');
const createSource = source.slice(source.indexOf('function v7OpenPostCreate('), source.indexOf("document.addEventListener('click',event=>{", source.indexOf('function v7OpenPostCreate(')));
assert.ok(createSource.startsWith('function v7OpenPostCreate('));
assert.match(source, /data-v7-post-new>＋投稿を追加/);
assert.match(source, /if\(heading&&!dx\('#view-plan \[data-v7-post-new\]'\)\)/);
assert.match(source, /if\(!demo\.posts\.some\(post=>!post\.deleted&&post\.date===date\)\)dx\('#workBody'\)\.insertAdjacentHTML/);
assert.match(editorial, /box\.innerHTML=.*copyTenEditorial/);

// The final plan renderer must restore the entry after the editorial renderer
// replaces the old action row, including when there is no sale period yet.
let planMarkup='';
const heading={insertAdjacentHTML:(_where,html)=>{planMarkup+=html;}};
const planContext={renderPlan:()=>{},dx:selector=>selector==='#view-plan .section-head'?heading:selector==='#planList'?{}:null,salesCycleBlock:()=>null};
vm.createContext(planContext);
const planStart=source.indexOf('const v7PreviousRenderPlan=');
const planEnd=source.indexOf('  const groups=',planStart);
vm.runInContext(source.slice(planStart,planEnd)+'}',planContext);
planContext.renderPlan();
assert.match(planMarkup,/＋投稿を追加/,'empty plan still exposes creation');

// A month date with no Story also exposes the same creation entry.
let monthMarkup='';
const monthDialog={open:false,showModal(){this.open=true;}};
const monthBody={insertAdjacentHTML:(_where,html)=>{monthMarkup+=html;}};
const monthContext={
  openMonthDate:()=>{monthDialog.open=true;},
  V7StoryState:{entriesOnDate:()=>[]},demo:{posts:[]},
  dx:selector=>selector==='#workDialog'?monthDialog:selector==='#workBody'?monthBody:null
};
vm.createContext(monthContext);
vm.runInContext(source.slice(source.indexOf('const v7PreviousOpenMonthDate='),source.indexOf('const v7PreviousShowPost=')),monthContext);
monthContext.openMonthDate('2026-10-28');
assert.match(monthMarkup,/＋Feed／Reel投稿/);

const state = {posts:[],storyDays:[],reactions:[],records:{},salesResults:{},shotDone:{}};
let save, openCount=0, nextId=0;
const dialog = {open:false,close(){this.open=false;}};
const context = {
  demo:state, TODAY:'2026-10-28', V7StoryState:{validDate:date=>/^2026-\d\d-\d\d$/.test(date)},
  dx:selector=>selector==='#workDialog'?dialog:{},
  openForm:(_title,_body,onSave)=>{save=onSave;openCount++;},
  formInput:()=>'', formSelect:()=>'', newId:()=>`test-${++nextId}`,
  queueMicrotask:fn=>fn(), showPost:id=>{context.openedPost=id;}
};
vm.createContext(context);
vm.runInContext(createSource,context);
const form=values=>({get:key=>values[key]??null});
const values={date:'2026-10-28',format:'Feed',theme:'v7実機QAテスト投稿',plannedTime:'18:00',shotWhat:''};
context.v7OpenPostCreate(values.date);
assert.equal(openCount,1);
assert.equal(state.posts.length,0,'opening the form must not save');
save(form(values));
assert.equal(state.posts.length,1);
assert.equal(context.openedPost,state.posts[0].id);
assert.equal(state.posts[0].stories.length,0);
assert.equal(state.posts[0].shots.length,0);
assert.equal(state.posts[0].actualAt,null);
assert.equal(state.posts[0].standaloneStoryDate,values.date);
assert.equal(state.reactions.length,0);
assert.equal(Object.keys(state.records).length,0);
assert.equal(Object.keys(state.salesResults).length,0);
assert.throws(()=>save(form(values)),/この日には投稿があります/);
assert.equal(state.posts.length,1,'duplicate date must not add a post');

state.storyDays.push({id:'story-1',date:'2026-10-29',slot:1,text:'既存Story'});
const beforeStory=JSON.stringify(state.storyDays);
context.v7OpenPostCreate('2026-10-29');
save(form({...values,date:'2026-10-29',shotWhat:'商品を手に持つ'}));
assert.equal(state.posts.length,2);
assert.equal(state.posts[1].stories.length,0,'existing Story must not be copied');
assert.equal(state.posts[1].shots.length,1,'only the requested single cut is created');
assert.equal(state.posts[1].shots[0].count,1);
assert.equal(JSON.stringify(state.storyDays),beforeStory);
const restored=JSON.parse(JSON.stringify(state));
assert.equal(restored.posts.length,2);
assert.equal(restored.storyDays.length,1);
assert.equal(restored.posts[1].standaloneStoryDate,'2026-10-29');
console.log('PASS post creation opens before save, creates one minimal post, keeps independent Story and rejects duplicate dates');
