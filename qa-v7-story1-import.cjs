const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'dist/v7-story1-import.js'),'utf8');
const days=Array.from({length:10},(_,index)=>`2026-11-${String(index+9).padStart(2,'0')}`);
const story=date=>({date,slot:1,category:'文化',title:'検証済みの話題',text:'確認済みの本文 https://example.test/source',action:'知る',asset:'写真',materialMode:'既存素材',skuIds:[],researchSources:[{name:'資料',url:'https://example.test/source'}],verificationStatus:'verified'});
const data={schema:'cian-story1-verified-review-v1',scope:'story1-only',period:{from:days[0],to:days[9]},stories:days.map(story)};
let body='',submit,selected=[],calls=[],failure=false,alert={textContent:''};
const button={disabled:false,textContent:''},form={querySelector:()=>button,querySelectorAll:()=>selected.map(date=>({dataset:{story1Date:date}}))},dialog={close(){this.closed=true;}};
const state={skus:[],posts:days.map((date,index)=>({id:'p'+index,date,format:'Feed',caption:'既存本文',shots:[{id:'shot'+index}],revision:1})),storyDays:days.map((date,index)=>({id:'s'+index,date,slot:1,text:'既存Story1',asset:'旧素材',manual:true})),reactions:[]};
const context={demo:state,window:{todo2SyncBridge:{async saveStory1Selection(changes){if(failure)throw Error('通信失敗');calls.push(changes.map(change=>change.date));for(const change of changes){const row=state.storyDays.find(value=>value.date===change.date);row.text=change.story.text;row.researchSources=structuredClone(change.story.researchSources);}}},},
  openForm(title,html,onSave){body=html;submit=onSave;},dx(selector){return selector==='#workForm'?form:selector==='#workError'?alert:dialog;},
  V7StoryState:{entriesOnDate(value,date){return value.storyDays.filter(row=>row.date===date).map((row,index)=>({story:row,index,slot:row.slot,standalone:true}));}},
  v7StoryHasReaction(value,row){return value.reactions.some(reaction=>reaction.sourceStory?.storyId===row.id);},
  html(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');},short:value=>value,
  dayAdd(value,n){const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);},
  structuredClone,confirm:()=>true,refreshWork(){},toast(){},console};
vm.createContext(context);vm.runInContext(source,context);
const check=context.window.V7Story1Review;
assert.equal(check.validate(data,state).length,10);
assert.throws(()=>check.validate({...data,scope:'ten-day'},state),/scope/);
assert.throws(()=>check.validate({...data,stories:data.stories.slice(1)},state),/10件/);
assert.throws(()=>check.validate({...data,stories:[data.stories[0],...data.stories.slice(0,9)]},state),/重複/);
assert.throws(()=>check.validate({...data,stories:data.stories.map((row,index)=>index===0?{...row,slot:2}:row)},state),/slot/);
assert.throws(()=>check.validate({...data,stories:data.stories.map((row,index)=>index===0?{...row,researchSources:[{name:'資料',url:'invalid'}]}:row)},state),/出典/);
assert.throws(()=>check.validate({...data,stories:data.stories.map((row,index)=>index===0?{...row,skuIds:['missing']}:row)},state),/SKU/);
assert.equal(check.accepts({schema:'cian-editorial-v1',scope:'ten-day'}),false);
check.show(data);assert.equal((body.match(/data-story1-date=/g)||[]).length,10);assert(body.includes('https://example.test/source'));
assert.equal(check.problem(state,days[0]),'');state.posts[0].actualAt='2026-11-09T10:00:00+09:00';assert.match(check.problem(state,days[0]),/実績/);delete state.posts[0].actualAt;
state.reactions.push({sourceStory:{storyId:'s0'}});assert.match(check.problem(state,days[0]),/反応/);state.reactions=[];
async function run(){
 selected=[days[1]];submit();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.stringify(calls),JSON.stringify([[days[1]]]));assert.equal(state.storyDays[1].text,data.stories[1].text);assert.equal(state.storyDays[0].text,'既存Story1');assert.equal(state.posts[1].caption,'既存本文');assert.equal(state.posts[1].shots[0].id,'shot1');assert.equal(state.storyDays[1].researchSources[0].url,'https://example.test/source');
 check.show(data);selected=[days[2]];failure=true;submit();await new Promise(resolve=>setImmediate(resolve));assert.equal(state.storyDays[2].text,'既存Story1');assert.match(alert.textContent,/通信失敗/);
 check.show(data);selected=[days[3]];failure=false;state.storyDays[3].text='別端末で編集';submit();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);assert.match(alert.textContent,/変わりました/);
 console.log('PASS Story1専用形式・10件表示・選択更新・保護・失敗・出典・従来形式');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
