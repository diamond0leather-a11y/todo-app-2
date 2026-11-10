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
      // A standalone Story is already the visible record for this day/slot.
      // Keep the legacy copy in place without treating that existing pair as a move conflict.
      if (!(state.storyDays || []).some(value => value.date === storyDate && value.slot === slot))
        assertUnique(state, storyDate, slot, postId, index);
      return {...story, id: story.id || idFactory(), date: storyDate, slot};
    });
    if (new Set(stories.map(story => story.id)).size !== stories.length) throw Error('Story IDが重複しています');
    return {date, stories};
  }
  function preparePostSwap(state, postId, date, idFactory = () => crypto.randomUUID()) {
    const source=(state.posts||[]).find(post=>post.id===postId&&!post.deleted);
    const target=(state.posts||[]).find(post=>post.id!==postId&&!post.deleted&&post.date===date);
    if(!source||!target||source.date===target.date)throw Error('交換する2件の投稿を確認してください');
    for(const post of [source,target]){
      if(post.actualAt||post.actualSnapshot||post.noPostConfirmedAt||post.posted||post.status==='posted'||
        Object.keys(state.records||{}).some(key=>key.startsWith(post.id+'|')))
        throw Error('投稿済み・評価済みの企画は交換できません');
    }
    const withoutTarget={...state,posts:state.posts.filter(post=>post.id!==target.id)};
    const withoutSource={...state,posts:state.posts.filter(post=>post.id!==source.id)};
    const sourceStories=preparePostMove(withoutTarget,source.id,target.date,idFactory).stories;
    const targetStories=preparePostMove(withoutSource,target.id,source.date,idFactory).stories;
    return [
      {...source,date:target.date,stories:sourceStories,standaloneStoryDate:source.standaloneStoryDate??source.date,manual:true,revision:(source.revision||0)+1},
      {...target,date:source.date,stories:targetStories,standaloneStoryDate:target.standaloneStoryDate??target.date,manual:true,revision:(target.revision||0)+1}
    ];
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
  const api = {validDate, dateOf, historyEntries, entriesOnDate, assertUnique, createStandalone, preparePostMove, preparePostSwap, prepareStoryEdit};
  root.V7StoryState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
