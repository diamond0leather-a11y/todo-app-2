// v7 Story dates are independent from the Feed/Reel planned date.
(function (root) {
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  const dateOf = (story, post) => story.date ?? post.date;
  function historyEntries(state, {from, to, before, limitDays} = {}) {
    const entries = [];
    const canonicalSlots = new Set((state.storyDays || []).map(story => JSON.stringify([story.date, story.slot])));
    for (const post of state.posts || []) {
      if (post.deleted) continue;
      for (const [index, story] of (post.actualSnapshot?.stories || post.stories || []).entries()) {
        const current = story.id ? post.stories?.find(value => value.id === story.id) : post.stories?.[index];
        const date = story.date ?? current?.date ?? post.date, slot = story.slot ?? index + 1;
        // An independent Story is the current source of truth; retain the legacy copy only in saved data.
        if (!post.actualSnapshot && canonicalSlots.has(JSON.stringify([date, slot]))) continue;
        entries.push({postId: post.id, story, date, slot, status: post.actualSnapshot ? '実績' : '予定'});
      }
    }
    for (const story of state.storyDays || []) entries.push({postId: null, story, date: story.date, slot: story.slot, status: '独立Story'});
    const seenIds = new Set(), seenContents = new Set();
    const selected = entries.filter(entry => validDate(entry.date) && (!from || entry.date >= from) && (!to || entry.date <= to) && (!before || entry.date < before))
      .sort((a, b) => b.date.localeCompare(a.date) || a.slot - b.slot)
      .filter(entry => {
        const id = entry.story.id;
        const content = JSON.stringify([entry.date, entry.slot, entry.story.theme || '', entry.story.text || '', entry.story.asset || '', entry.story.action || '', entry.story.kind || '']);
        if (id && seenIds.has(id) || seenContents.has(content)) return false;
        if (id) seenIds.add(id);
        seenContents.add(content);
        return true;
      });
    if (!limitDays) return selected;
    const dates = new Set();
    return selected.filter(entry => { if (!dates.has(entry.date) && dates.size >= limitDays) return false; dates.add(entry.date); return true; });
  }
  function entriesOnDate(state, date) {
    const posts = (state.posts || []).flatMap(post => (post.stories || []).map((story, index) => ({post, story, index, slot: story.slot ?? index + 1})));
    const independent = (state.storyDays || []).map((story, index) => ({post: null, story, index, slot: story.slot, standalone: true}));
    const canonical = independent.filter(entry => entry.story.date === date);
    const canonicalSlots = new Set(canonical.map(entry => entry.slot));
    return [...canonical, ...posts.filter(entry => dateOf(entry.story, entry.post) === date && !canonicalSlots.has(entry.slot))];
  }
  function assertUnique(state, date, slot, exceptPost, exceptIndex) {
    if (entriesOnDate(state, date).some(entry => entry.slot === slot && ((entry.post?.id ?? null) !== exceptPost || entry.index !== exceptIndex))) throw Error(date + ' のStory ' + slot + 'は登録済みです');
  }
  function createStandalone(state, date, slot, content, idFactory = () => crypto.randomUUID()) {
    if (!validDate(date) || !Number.isSafeInteger(slot) || slot < 1 || slot > 4) throw Error('Storyの日付または番号を確認してください');
    assertUnique(state, date, slot);
    const id = idFactory();
    if (typeof id !== 'string' || !id.trim() || (state.storyDays || []).some(story => story.id === id)) throw Error('Story IDが重複しています');
    return {...content, id, date, slot, manual: true};
  }
  function preparePostMove(state, postId, date, idFactory = () => crypto.randomUUID()) {
    if (!validDate(date)) throw Error('投稿日を確認してください');
    const post = (state.posts || []).find(value => value.id === postId && !value.deleted);
    if (!post) throw Error('対象の投稿がありません');
    if ((state.posts || []).some(value => value.id !== postId && !value.deleted && value.date === date)) throw Error('変更先にはすでに投稿があります');
    const stories = (post.stories || []).map((story, index) => {
      const storyDate = dateOf(story, post);
      if (!validDate(storyDate)) throw Error('Storyの日付を確認してください');
      const slot = story.slot ?? index + 1;
      if (!Number.isSafeInteger(slot) || slot < 1 || slot > 4) throw Error('Story番号を確認してください');
      assertUnique(state, storyDate, slot, postId, index);
      return {...story, id: story.id || idFactory(), date: storyDate, slot};
    });
    if (new Set(stories.map(story => story.id)).size !== stories.length) throw Error('Story IDが重複しています');
    return {date, stories};
  }
  function prepareStoryEdit(state, postId, index, changes, idFactory = () => crypto.randomUUID()) {
    const post = (state.posts || []).find(value => value.id === postId);
    const old = post?.stories?.[index];
    if (!old || !changes || typeof changes !== 'object') throw Error('対象Storyを確認してください');
    const date = changes.date ?? dateOf(old, post), slot = old.slot ?? index + 1;
    if (!validDate(date)) throw Error('Storyの日付を確認してください');
    assertUnique(state, date, slot, postId, index);
    const id = old.id || idFactory();
    if ((state.posts || []).some(p => (p.stories || []).some((s, i) => s.id === id && (p.id !== postId || i !== index)))) throw Error('Story IDが重複しています');
    return {...old, ...changes, id, date, slot};
  }
  const api = {validDate, dateOf, historyEntries, entriesOnDate, assertUnique, createStandalone, preparePostMove, prepareStoryEdit};
  root.V7StoryState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
