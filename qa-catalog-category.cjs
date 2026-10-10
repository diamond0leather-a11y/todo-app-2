const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlSource = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
const syncSource = fs.readFileSync(path.join(__dirname, 'dist/firebase-sync.js'), 'utf8');
function section(source, from, to) {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  assert(start >= 0 && end > start, `${from} exists`);
  return source.slice(start, end);
}

const oldCategory = {id: 'cat-old', name: 'mini wallet'};
const oldCategories = [oldCategory, ...['Round zip wallet', '長財布', 'カードケース・フラグメントケース', 'キーケース・ストラップ', 'ポーチ'].map((name, index) => ({id: `cat-existing-${index}`, name}))];
const oldItem = {id: 'item-old', categoryId: oldCategory.id, name: 'existing item'};
const oldSku = {id: 'sku-old', itemId: oldItem.id, name: 'existing color', material: '', status: 'selling'};
const initialState = {schema: 1, categories: oldCategories, items: [oldItem], skus: [oldSku], posts: [], records: {}, reactions: [], months: {}};
let state = structuredClone(initialState);
let stored = '';
let nextId = 0;
const nodes = Object.fromEntries(['#workDialog', '#workTitle', '#workBody', '#workForm', '#workError', '#catalogListWork'].map(key => [key, {innerHTML: '', textContent: '', open: false, close() {this.open = false;}, showModal() {this.open = true;}}]));
class TestFormData {
  constructor(form) {this.fields = form.fields;}
  get(key) {return this.fields[key] ?? null;}
  *[Symbol.iterator]() {yield* Object.entries(this.fields);}
}
const context = {
  demo: state,
  dx: selector => nodes[selector],
  FormData: TestFormData,
  newId: () => `cat-new-${++nextId}`,
  formInput: () => '<input>',
  formSelect: () => '<select>',
  html: value => String(value ?? ''),
  item: id => state.items.find(i => i.id === id),
  stateBadge: sku => sku.status,
  monthInfo: () => ({lineup: []}),
  monthCursor: '2026-10',
  catalogQ: '', catalogStatus: 'all', catalogOnly: false,
  persist: () => {stored = JSON.stringify(state);},
  refreshWork: () => context.renderCatalog(),
  toast: () => {},
  Map, JSON,
};
vm.createContext(context);
vm.runInContext(section(htmlSource, 'function openForm(', 'function go(name)'), context);
vm.runInContext(section(htmlSource, 'function renderCatalog(){', 'const catalogRenderBase='), context);
vm.runInContext(section(htmlSource, 'function editCategoryWork(', 'function editSkuWork('), context);

function submit(fields) {
  nodes['#workError'].textContent = '';
  nodes['#workForm'].fields = fields;
  nodes['#workForm'].onsubmit({preventDefault() {}, target: nodes['#workForm']});
  assert.equal(nodes['#workError'].textContent, '', 'save has no validation error');
}

context.editCategoryWork();
submit({name: 'DÉPLIÉ'});
assert.equal(state.categories.length, oldCategories.length + 1, 'new top-level category is appended');
const created = state.categories.at(-1);
assert.equal(created.name, 'DÉPLIÉ');
assert.equal(nodes['#workDialog'].open, false, 'save closes dialog');
assert.match(nodes['#catalogListWork'].innerHTML, /DÉPLIÉ/, 'empty category appears immediately');
assert.match(nodes['#catalogListWork'].innerHTML, new RegExp(`data-work-new-item="${created.id}"`), 'empty category can add an item');
assert.deepEqual(state.categories.slice(0, -1), oldCategories, 'all existing categories remain');
assert.deepEqual(state.items, [oldItem], 'existing item remains');
assert.deepEqual(state.skus, [oldSku], 'existing SKU remains');

state = JSON.parse(stored);
context.demo = state;
context.renderCatalog();
assert.match(nodes['#catalogListWork'].innerHTML, /DÉPLIÉ/, 'category survives local reload');
context.catalogQ = 'DÉPLIÉ';
context.renderCatalog();
assert.match(nodes['#catalogListWork'].innerHTML, /DÉPLIÉ/, 'category name search finds empty category');
context.catalogQ = '';
context.catalogStatus = 'selling';
context.renderCatalog();
assert.doesNotMatch(nodes['#catalogListWork'].innerHTML, /DÉPLIÉ/, 'empty category does not appear as selling');
context.catalogStatus = 'all';
context.catalogOnly = true;
context.renderCatalog();
assert.doesNotMatch(nodes['#catalogListWork'].innerHTML, /DÉPLIÉ/, 'empty category is not in monthly sale filter');
context.catalogOnly = false;
context.renderCatalog();
assert.match(nodes['#catalogListWork'].innerHTML, /<details[^>]*><summary class="exact">DÉPLIÉ<\/summary>/, 'normal foldable category markup remains');

context.editItemWork(null, created.id);
submit({name: 'DÉPLIÉ compact wallet', categoryId: created.id, note: '', kind: '新作'});
assert.equal(state.items.at(-1).categoryId, created.id, 'new item belongs to new top-level category');
assert.match(nodes['#catalogListWork'].innerHTML, /DÉPLIÉ compact wallet/, 'new item renders within category');

vm.runInContext(section(syncSource, 'const clean=', 'const status='), context);
vm.runInContext(section(syncSource, 'function splitState(', 'async function readWorkspace('), context);
const docs = context.splitState(state);
assert.equal(docs.get('state/products').value.categories.length, oldCategories.length + 1, 'shared products includes all categories');
const shared = context.joinState(docs);
assert.equal(shared.categories.find(c => c.id === created.id)?.name, 'DÉPLIÉ', 'shared reload retains new category');
assert.equal(shared.items.find(i => i.categoryId === created.id)?.name, 'DÉPLIÉ compact wallet', 'shared reload retains item relation');
assert.deepEqual(shared.skus, [oldSku], 'shared reload preserves existing SKU');
console.log('PASS category save, immediate render, reload, search/filter/fold, item creation, existing data, shared roundtrip');
