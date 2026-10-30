const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('dist/firebase-sync.js', 'utf8');
const html = fs.readFileSync('dist/index.html', 'utf8');
const functions = [
  source.slice(source.indexOf('function splitState('), source.indexOf('function joinState(')),
  source.slice(source.indexOf('function syncRead('), source.indexOf('async function initializeEmptyWorkspace(')),
  source.slice(source.indexOf('async function initializeEmptyWorkspace('), source.indexOf('async function ensureWorkspace(')),
  source.slice(source.indexOf('async function ensureWorkspace('), source.indexOf('function applyRemoteSoon(')),
].join('\n');

async function run() {
  const initial = { schema: 1, categories: [], items: [], skus: [], months: {}, events: [], posts: [], ads: [], records: {}, reactions: [], analyses: [], shotDone: {}, storyDays: [], salePlans: {}, salesHistory: [], salesResults: {}, planStart: '2026-10-24' };
  let writes = [], metaExists = false, stateExists = false, consent;
  const button = { disabled: false, onclick: null };
  const notice = { innerHTML: '', remove() {}, querySelector: () => button };
  const shell = { hidden: true, querySelector: () => null, append: value => { consent = value; } };
  const form = { hidden: false }, loading = { hidden: false };
  const context = {
    Promise, Error, Map, JSON, setTimeout, clearTimeout,
    clean: value => JSON.parse(JSON.stringify(value)),
    storyDayEntries: () => {}, safeId: value => String(value),
    workspace: { path: 'workspace' }, db: {}, SCHEMA_VERSION: 1, WORKSPACE_ID: 'v7-test',
    currentUser: { uid: 'fake-user' }, authGeneration: 1,
    window: { todo2SyncBridge: { emptyState: () => structuredClone(initial), read: () => { throw Error('old local data read'); } } },
    getDoc: async () => ({ exists: () => metaExists, data: () => ({ initialized: false }) }),
    readWorkspace: async () => new Map(),
    doc: (_parent, group, id) => ({ path: group + '/' + id }),
    serverTimestamp: () => 'fake-time',
    runTransaction: async (_db, callback) => {
      const staged = [];
      const tx = {
        get: async ref => ({ exists: () => ref.path === 'workspace' ? metaExists : stateExists }),
        set: (ref, value) => staged.push([ref.path, value]),
      };
      await callback(tx);
      writes.push(...staged);
    },
    document: {
      createElement: () => notice,
      querySelector: selector => ({ '#firebaseLogin': shell, '#firebaseLoginForm': form, '#firebaseAuthLoading': loading })[selector],
    },
    status: () => {},
  };
  vm.createContext(context);
  vm.runInContext(functions + '\nglobalThis.ensure=ensureWorkspace;globalThis.init=initializeEmptyWorkspace;', context);
  const pending = context.ensure(1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes.length, 0, 'no write before explicit choice');
  assert.equal(shell.hidden, false, 'choice is visible');
  assert.equal(consent, notice);
  assert.match(notice.innerHTML, /新しい空のデータで開始/);
  await button.onclick({ target: button });
  await pending;
  assert.equal(writes.length, 6, 'five state documents and one metadata document');
  assert.deepEqual(writes.map(([path]) => path).sort(), ['state/operations', 'state/planning', 'state/products', 'state/settings', 'state/shooting', 'workspace']);
  assert.equal(writes.find(([path]) => path === 'state/products')[1].value.skus.length, 0);

  writes = [];metaExists = true;
  await assert.rejects(context.init(1), /workspace-initialization-conflict/);
  assert.equal(writes.length, 0, 'concurrent metadata must stop atomic write');
  metaExists = false;stateExists = true;
  await assert.rejects(context.init(1), /workspace-initialization-conflict/);
  assert.equal(writes.length, 0, 'existing state document must not be overwritten');
  assert.match(html, /const MOCK_KEY='todo2_v7_shared_local_v1'/);
  assert.ok(!html.includes("localStorage.getItem('todo2_v7_local_v1')"), 'old local storage is not read');
  assert.ok(!source.includes('migrateLocal('), 'old local import is absent');
  console.log('PASS empty v7 init, explicit choice, atomic six-doc write, collision stop, old local preservation');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
