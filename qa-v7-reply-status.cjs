const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const reply = require('./dist/v7-reply-status.js');

const voice = {id: 'voice-1', kind: 'お客様の声', question: '使い方を教えてください', originalText: '使い方を教えてください', answers: [], options: [], dm: [], uses: [], skuIds: [], repliedAt: '2026-11-01'};
const poll = {id: 'poll-1', kind: 'アンケート', question: 'どちらが好き？', options: [{text: 'A', count: 2}], answers: [], dm: []};
const duplicate = {...voice};
const state = {reactions: [voice, duplicate, poll, {id: 'voice-2', kind: 'DM誘導', replyStatus: 'replied'}, {id: 'voice-3', kind: 'お客様の声', replyStatus: 'not-needed'}]};
assert.equal(reply.pending(state.reactions).length, 0, 'Old records stay unset');
assert.equal(reply.label(voice), '未設定');
assert.equal(reply.eligible(poll), false, 'Poll totals do not need individual replies');
assert.equal(reply.eligible({id: 'comment', kind: 'お客様の声', source: 'コメント'}), true);
assert.equal(reply.eligible({id: 'dm', kind: 'お客様の声', source: 'DM'}), true);
assert.throws(() => reply.change(state.reactions, poll.id, 'needed', () => {}));
reply.change(state.reactions, voice.id, 'needed', () => {});
assert.deepEqual(reply.pending(state.reactions).map(value => value.id), ['voice-1']);
assert.equal(voice.repliedAt, '2026-11-01', 'Published response status is untouched');
assert.equal(voice.question, '使い方を教えてください');
const saved = JSON.parse(JSON.stringify(state));
assert.equal(saved.reactions[0].replyStatus, 'needed', 'Status survives reload');
reply.change(state.reactions, voice.id, 'replied', () => {});
assert.equal(reply.pending(state.reactions).length, 0);
reply.change(state.reactions, voice.id, 'not-needed', () => {});
assert.equal(reply.pending(state.reactions).length, 0);
assert.throws(() => reply.change(state.reactions, voice.id, 'needed', () => {throw Error('save failed');}));
assert.equal(voice.replyStatus, 'not-needed', 'Failed save rolls back');
reply.change(state.reactions, voice.id, 'needed', () => {});

const html = fs.readFileSync('./dist/index.html', 'utf8');
assert.match(html, /<script src="\.\/v7-reply-status\.js"><\/script>/);
assert.match(html, /\.reply-quick-actions button\{min-width:78px;min-height:44px/);
assert.match(html, /\['home','⌂','ホーム'\],\['catalog','□','商品管理'\],\['month','31','月間'\],\['plan','10','投稿一覧'\]/);
assert.match(html, /navigate=go;/);
for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (script.trim()) new vm.Script(script);

const entryStart = html.indexOf('const previousReactionEntryHomeRender=renderHome;');
const entryEnd = html.indexOf('const previousReplyHomeRender=renderHome;', entryStart);
assert(entryStart > 0 && entryEnd > entryStart);
const storyPanel = {entries: [], querySelector(selector){return this.entries.find(node => '#' + node.id === selector);}, append(node){this.entries.push(node);}};
const entryContext = {renderHome(){}, dx(selector){return selector === '#dailyStories' ? storyPanel : null;}, document: {createElement(){return {dataset: {}};}}};
vm.createContext(entryContext);
vm.runInContext(html.slice(entryStart, entryEnd), entryContext);
entryContext.renderHome();
entryContext.renderHome();
assert.equal(storyPanel.entries.length, 1, 'HOME link is not duplicated');
assert.equal(storyPanel.entries[0].textContent, 'お客様の反応一覧を見る');
assert.equal(storyPanel.entries[0].dataset.nav, 'results');
assert.equal(storyPanel.entries[0].type, 'button');

const start = html.indexOf('const previousReplyHomeRender=renderHome;');
const end = html.indexOf('</script>', start);
assert(start > 0 && end > start);
const panel = {children: [], placeholder: {textContent: '今日入力するものはありません', remove(){panel.placeholder = null;}}, querySelector(){return this.placeholder;}, append(node){this.children.push(node);}};
const cards = state.reactions.map(reaction => ({reaction, removed: false, row: null, querySelector(){return {dataset: {workReaction: reaction.id}};}, remove(){this.removed = true;}, after(row){this.row = row;}}));
const chips = {html: '', querySelector(){return {classList: {replace(){}}};}, insertAdjacentHTML(where, text){this.html += text;}};
const list = {querySelector(){return chips;}, querySelectorAll(){return cards;}, insertAdjacentHTML(){}};
const handlers = [];
let renderedFilter = '', refreshed = 0, navigated = '';
const context = {
  V7ReplyStatus: reply, demo: state, voiceFilter: 'all', reactionQuery: '',
  renderHome(){}, renderResults(){renderedFilter = context.voiceFilter;},
  dx(selector){return selector === '#dailyInputs' ? panel : list;},
  document: {createElement(){return {dataset: {}, innerHTML: ''};}, addEventListener(type, callback){if(type === 'click') handlers.push(callback);}},
  html: String, go(name){navigated = name;}, refreshWork(){refreshed++;}, persist(){JSON.stringify(state);}, toast(){}
};
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);
context.renderHome();
assert.equal(panel.children.length, 1);
assert.match(panel.children[0].innerHTML, /1件/, 'Same ID is counted once');
assert.equal(panel.placeholder, null);
context.renderResults();
assert.match(chips.html, /要返信 1/);
assert.match(cards[0].row.innerHTML, /data-reply-status="needed"/);
assert.equal(cards[2].row, null, 'Poll totals have no reply controls');
handlers[0]({target: {closest(){return {dataset: {replyOpen: ''}, hasAttribute(){return true;}};}}});
assert.equal(navigated, 'results');
context.renderResults();
assert.equal(renderedFilter, 'all');
assert.equal(cards[0].removed, false);
assert.equal(cards[2].removed, true);
handlers[0]({target: {closest(){return {dataset: {replyId: voice.id, replyStatus: 'replied'}, hasAttribute(){return false;}};}}});
assert.equal(state.reactions[0].replyStatus, 'replied');
assert.equal(refreshed, 1);
panel.children = [];
panel.placeholder = null;
context.renderHome();
assert.equal(panel.children.length, 0, 'No HOME notice when all individual replies are complete');
console.log('PASS: 返信状態、HOME件数、一覧導線、重複ID、アンケート除外、再読み込み、保存失敗時保護');
