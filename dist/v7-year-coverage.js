// Read-only coverage of saved plans. Standalone Stories replace their legacy embedded copies.
(function (root) {
  function day(state, date, storyState = root.V7StoryState) {
    const posts = (state.posts || []).filter(post => !post.deleted && post.date === date);
    const active = {
      posts: (state.posts || []).filter(post => !post.deleted),
      storyDays: (state.storyDays || []).filter(story => !story.deleted)
    };
    const entries = storyState.entriesOnDate(active, date).filter(entry => !entry.story.deleted);
    const slots = [1, 2, 3, 4].map(slot => entries.filter(entry => Number(entry.slot) === slot).length);
    const missing = [], duplicate = [];
    if (posts.length === 0 || posts.length === 1 && !['Feed', 'Reel', 'Carousel'].includes(posts[0].format)) missing.push('Feed/Reel');
    if (posts.length > 1) duplicate.push('Feed/Reel');
    slots.forEach((count, index) => {
      if (count === 0) missing.push('Story' + (index + 1));
      if (count > 1) duplicate.push('Story' + (index + 1));
    });
    if (entries.some(entry => ![1, 2, 3, 4].includes(Number(entry.slot)))) duplicate.push('Story番号外');
    return {date, missing, duplicate, postCount: posts.length, slots};
  }
  function year(state, selectedYear, storyState = root.V7StoryState) {
    const result = [], yearNumber = Number(selectedYear);
    if (!Number.isInteger(yearNumber) || yearNumber < 1 || yearNumber > 9999) throw Error('年を確認してください');
    const end = Date.UTC(yearNumber + 1, 0, 1);
    for (let time = Date.UTC(yearNumber, 0, 1); time < end; time += 86400000) {
      result.push(day(state, new Date(time).toISOString().slice(0, 10), storyState));
    }
    return {days: result, missingDays: result.filter(value => value.missing.length).length, duplicateDays: result.filter(value => value.duplicate.length).length};
  }
  const api = {day, year};
  root.V7YearCoverage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
