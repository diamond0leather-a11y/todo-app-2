const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const storyState = require('./dist/v7-story-state.js');
const coverage = require('./dist/v7-year-coverage.js');

const date = '2026-11-02';
const stories = () => [1, 2, 3, 4].map(slot => ({id: 's' + slot, date, slot, text: '案'}));
const state = (posts = [], storyDays = stories()) => ({posts, storyDays});
const post = (format = 'Feed', extra = {}) => ({id: 'p', date, format, stories: [], ...extra});
const check = value => coverage.day(value, date, storyState);

assert.deepEqual(check(state([post()])).missing, []);
assert.deepEqual(check(state([post('Reel')])).missing, []);
assert.deepEqual(check(state([post('Carousel')])).missing, []); // Carousel is a Feed post format.
assert.deepEqual(check(state()).missing, ['Feed/Reel']);
assert.deepEqual(check(state([post(), post('Reel', {id: 'p2'})])).duplicate, ['Feed/Reel']);
assert.deepEqual(check(state([post()], stories().slice(1))).missing, ['Story1']);
assert.deepEqual(check(state([post()], [...stories(), {id: 'extra', date, slot: 2}])).duplicate, ['Story2']);
assert.deepEqual(check(state([post('Feed', {paused: true})])).missing, []);
assert.deepEqual(check(state([post()], [...stories(), {id: 'extra', date, slot: 2}].filter(s => s.slot !== 3))).missing, ['Story3']);
assert.deepEqual(check(state([post()], [...stories(), {id: 'extra', date, slot: 2}].filter(s => s.slot !== 3))).duplicate, ['Story2']);
assert.deepEqual(check(state([post('Feed', {deleted: true})])).missing, ['Feed/Reel']);
const legacy = post('Feed', {stories: [{id: 'old', slot: 1, text: '旧コピー'}]});
assert.deepEqual(check(state([legacy])).duplicate, []); // Independent Story 1 is canonical.
assert.deepEqual(check(state([post('Feed', {stories: stories()})], [])).missing, []);
const frozen = state([post()]);
const before = JSON.stringify(frozen);
const normalYear = coverage.year(frozen, 2026, storyState), leapYear = coverage.year(frozen, 2028, storyState);
assert.equal(normalYear.days.length, 365);
assert.equal(leapYear.days.length, 366);
assert.equal(normalYear.days[0].date, '2026-01-01');
assert.equal(normalYear.days.at(-1).date, '2026-12-31');
assert.equal(leapYear.days.find(d => d.date === '2028-02-29').date, '2028-02-29');
assert.equal(JSON.stringify(frozen), before);
const html = fs.readFileSync('./dist/index.html', 'utf8');
assert.match(html, /<script src="\.\/v7-year-coverage\.js(?:\?[^"<>]+)?"><\/script>/);
assert.match(html, /const previousYearCoverageRender=renderMonthWork/);
assert.match(html, /calendar\.before\(summary\)/);
assert.match(html, /const previousYearCoverageOpenDate=openMonthDate/);
for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (script.trim()) new vm.Script(script);
console.log('PASS: 年間5枠、重複・不足、paused、年末年始・うるう年、読み取り専用、月間表示接続');
