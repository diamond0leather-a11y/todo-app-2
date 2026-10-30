const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const storyState = require('./dist/v7-story-state.js');

const source = fs.readFileSync('dist/v7-story-ui.js', 'utf8');
const day = '2026-10-27';
const state = {posts: [], storyDays: [1, 2, 3, 4].map(slot => ({
  id: `story-${slot}`, date: day, slot, text: `架空Story ${slot}`, asset: `写真 ${slot}`,
  purpose: `役割 ${slot}`, skuIds: [], manual: true
})), reactions: [], shotDone: {}};
const form = values => ({get: key => values[key] ?? null});
let save, nextId = 0;
const context = {
  demo: state, V7StoryState: storyState, structuredClone,
  newId: () => `new-${++nextId}`, STORY_ROLES: ['見る', '話す', '商品', '案内'],
  html: String, short: String, formInput: () => '', formSelect: () => '', skuPickerWork: () => '',
  sku: () => null, toast: () => {}, storyDrafts: new Map(),
  editFinalStory: () => {},
  dx: () => ({open: false}), openForm: (_title, _body, onSave) => {save = onSave;},
  draftPost: date => ({id: 'post-1', date, stories: [1, 2, 3, 4].map(slot => ({slot, text: '提案'}))}),
  newStoryIdentity: (_post, story) => story,
  editPostMeta: () => {context.openForm('投稿の日程・商品', '', data => {
    state.posts[0].date = data.get('date'); return true;
  });}
};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const v7PreviousDraftPost='), source.indexOf('const v7PreviousRenderHome=')), context);

const post = context.draftPost(day);
state.posts.push(post);
assert.equal(post.stories.length, 0, '独立Storyと投稿内Storyを複製しない');
assert.equal(post.standaloneStoryDate, day);
const before = JSON.stringify(state.storyDays);

let detailInitialized = false;
function detailCards() {
  const cards = [];
  const section = {
    querySelectorAll: () => cards,
    querySelector: () => null,
    insertBefore(card, next) {
      const at = next ? cards.indexOf(next) : -1;
      if (at < 0) cards.push(card); else cards.splice(at, 0, card);
    }
  };
  context.document = {createElement: () => ({className: '', dataset: {}, innerHTML: ''})};
  context.dx = selector => selector === '#dayDetail .stories-always' ? section : {open: false};
  context.dax = () => [];
  if (!detailInitialized) {
    context.showPost = () => {};
    vm.runInContext(source.slice(source.indexOf('const v7PreviousShowPost='), source.indexOf('recordStoryResponse=function')), context);
    detailInitialized = true;
  }
  context.showPost(post.id);
  return cards;
}

let cards = detailCards();
assert.deepEqual(cards.map(card => card.dataset.v7StorySlot), ['1', '2', '3', '4']);
for (let slot = 1; slot <= 4; slot++) {
  assert.match(cards[slot - 1].innerHTML, new RegExp(`架空Story ${slot}`));
  assert.match(cards[slot - 1].innerHTML, new RegExp(`data-v7-story-edit="story-${slot}\\|${slot - 1}"`));
}

vm.runInContext(source.slice(source.indexOf('function v7StoryEntry('), source.indexOf('const v7PreviousDraftPost=')), context);
context.v7EditStandalone('story-1');
save(form({theme: '編集後', text: '投稿詳細から編集した架空Story', asset: '写真 1',
  action: '', materialMode: '新規撮影必要', kind: 'なし', options: ''}));
assert.equal(state.storyDays.length, 4);
assert.equal(state.storyDays[0].id, 'story-1');
assert.equal(state.storyDays[0].text, '投稿詳細から編集した架空Story');
assert.equal(storyState.entriesOnDate(state, day)[0].story.text, state.storyDays[0].text,
  'HOMEと同じ独立Storyを参照');
assert.notEqual(JSON.stringify(state.storyDays), before, '編集したStoryだけ更新');

context.editPostMeta(post.id);
save(form({date: '2026-10-28'}));
assert.equal(post.date, '2026-10-28');
assert.equal(post.standaloneStoryDate, day, '投稿日移動でStoryの参照日を変えない');
assert.equal(state.storyDays.every(story => story.date === day), true);
assert.equal(state.posts.length, 1, '投稿日移動で投稿を複製しない');
cards = detailCards();
assert.equal(cards.length, 4, '移動後も元の日付のStoryを確認できる');
state.storyDays.push({id: 'destination-story', date: '2026-10-28', slot: 1, text: '移動先Story', asset: '写真'});
cards = detailCards();
assert.equal(cards.length, 4, '移動先のStoryを勝手に紐づけない');
assert.doesNotMatch(cards[0].innerHTML, /移動先Story/);
post.deleted = true;
assert.equal(state.storyDays.length, 5, '投稿削除後も独立Storyを保持');
const reloaded = JSON.parse(JSON.stringify(state));
assert.equal(reloaded.posts[0].standaloneStoryDate, day);
assert.equal(storyState.historyEntries(reloaded).filter(entry => entry.date === day).length, 4,
  '10日プラン向け履歴でも元の日付に残る');
console.log('PASS post detail uses independent Story IDs, editing, move/delete, reload, history');
