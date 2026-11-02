const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const status = require('./dist/v7-reply-status.js');

const poll = {id:'poll-1',kind:'アンケート',question:'どちら？',options:[{text:'A',count:2}],answers:['自由回答'],sourceStory:{storyId:'story-1'},replyStatus:'replied',repliedAt:'2026-11-01'};
const duplicate = {...poll};
const question = {id:'question-1',kind:'質問スタンプ',question:'質問',replyStatus:'needed'};
const reactions = [poll, duplicate, question, {id:'poll-2',kind:'クイズ',shareStatus:'shared'}, {id:'poll-3',kind:'二択',shareStatus:'not-needed'}];
assert.equal(status.shareEligible(poll),true);
assert.equal(status.shareEligible(question),false);
assert.equal(status.shareLabel(poll),'未設定');
assert.equal(status.sharePending(reactions).length,0);
assert.throws(()=>status.changeShare(reactions,question.id,'needed',()=>{}));
assert.throws(()=>status.changeShare(reactions,poll.id,'invalid',()=>{}));
status.changeShare(reactions,poll.id,'needed',()=>{});
assert.deepEqual(status.sharePending(reactions).map(item=>item.id),['poll-1']);
assert.equal(JSON.parse(JSON.stringify(reactions))[0].shareStatus,'needed','再読み込み後も保持');
assert.equal(poll.replyStatus,'replied');
assert.equal(poll.repliedAt,'2026-11-01');
assert.deepEqual(poll.options,[{text:'A',count:2}]);
assert.deepEqual(poll.answers,['自由回答']);
assert.equal(poll.sourceStory.storyId,'story-1');
assert.throws(()=>status.changeShare(reactions,poll.id,'shared',()=>{throw Error('save failed');}));
assert.equal(poll.shareStatus,'needed','保存失敗時は元の状態を保持');
status.changeShare(reactions,poll.id,'shared',()=>{});
assert.equal(status.sharePending(reactions).length,0);
status.changeShare(reactions,poll.id,'not-needed',()=>{});
assert.equal(status.sharePending(reactions).length,0);
status.changeShare(reactions,poll.id,'unset',()=>{});
assert.equal(Object.hasOwn(poll,'shareStatus'),false,'過去データと同じ未設定へ戻せる');

const html = fs.readFileSync('./dist/index.html','utf8');
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(script.trim())new vm.Script(script);
const start=html.indexOf('const shareHomeRender=renderHome;');
const end=html.indexOf('</script>',start);
assert(start>0&&end>start);
const notices={hidden:true,innerHTML:'',insertAdjacentHTML(_where,content){this.innerHTML+=content;}};
const card={open:false,after(row){this.row=row;},querySelector(){return {dataset:{workReaction:poll.id}};},scrollIntoView(){this.scrolled=true;}};
const list={querySelectorAll(){return [card];}};
const handlers=[];
let saves=0,rendered=0,navigated='';
const ctx={
 V7ReplyStatus:status,demo:{reactions},voiceFilter:'all',reactionQuery:'',
 renderHome(){},renderResults(){rendered++;},
 dx(selector){return selector==='#dailyNotices'?notices:list;},
 document:{createElement(){return {innerHTML:''};},addEventListener(_type,handler){handlers.push(handler);}},
 html:String,go(name){navigated=name;ctx.renderResults();},refreshWork(){ctx.renderHome();ctx.renderResults();},persist(){saves++;},toast(){}
};
vm.createContext(ctx);
vm.runInContext(html.slice(start,end),ctx);
ctx.renderHome();
assert.equal(notices.innerHTML,'','未設定は通知しない');
status.changeShare(reactions,poll.id,'needed',()=>{});
ctx.renderHome();
assert.match(notices.innerHTML,/1件/,'同じIDを二重通知しない');
assert.equal(notices.hidden,false);
ctx.renderResults();
assert.match(card.row.innerHTML,/data-share-status="needed"/);
assert.match(card.row.innerHTML,/未設定/);
handlers[0]({target:{closest(){return {dataset:{shareOpen:poll.id},hasAttribute(name){return name==='data-share-open';}};}}});
assert.equal(navigated,'results');
assert.equal(card.open,true);
assert.equal(card.scrolled,true);
handlers[0]({target:{closest(){return {dataset:{shareId:poll.id,shareStatus:'shared'},hasAttribute(name){return name==='data-share-id';}};}}});
assert.equal(poll.shareStatus,'shared');
assert.equal(saves,1);
assert.equal(status.sharePending(reactions).length,0);
assert.equal(status.pending(reactions).length,1,'個別返信には影響しない');
const editorial=fs.readFileSync('./dist/chatgpt-editorial.js','utf8');
assert.match(editorial,/customerFeedback:feedbackContext\(/);
assert.match(editorial,/const key=v\.id\|\|/,'10日プラン用反応はIDで重複を避ける');
console.log('PASS: 共有状態、HOME通知、反応一覧、保存・再読み込み、重複ID、個別返信・既存データ保護');
