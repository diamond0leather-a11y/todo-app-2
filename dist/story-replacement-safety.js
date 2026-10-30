// Pure preparation only. Callers must decide whether and when to persist the result.
function prepareStoryReplacement(post, slot, candidate, reactions = [], options = {}) {
  const fail = reason => ({ok: false, reason});
  if (!post || typeof post.id !== 'string' || !Number.isSafeInteger(slot) || slot < 1 || !Array.isArray(post.stories) || !Array.isArray(reactions)) return fail('Storyの識別情報が不足しています');
  const originals = post.stories.filter((story, index) => (story?.slot ?? index + 1) === slot);
  if (originals.length !== 1 || !candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return fail('元Storyを一意に特定できません');
  const original = originals[0];
  const date = original.date ?? post.date;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  if (!validDate(date) || original.id != null && (typeof original.id !== 'string' || !original.id.trim())) return fail('元Storyの日付またはIDが不正です');
  const history = post.storyReplacementHistory ?? [];
  if (!Array.isArray(history)) return fail('Story履歴を確認できません');
  if (history.some(entry => !entry || typeof entry !== 'object' || !entry.story)) return fail('Story履歴を確認できません');
  if (history.some(entry => entry.story.id === original.id && entry.slot === slot)) return fail('元Storyの履歴が重複しています');
  for (const reaction of reactions) {
    if (!reaction || typeof reaction !== 'object') return fail('反応の出典を確認できません');
    const source = reaction.sourceStory;
    if (!source && reaction.postId === post.id && reaction.source === 'Story') return fail('元Storyを特定できない反応があります');
    if (source?.postId !== post.id || source.slot !== slot) continue;
    if (!original.id || source.storyId !== original.id) return fail('元Storyを特定できない反応があります');
  }
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const id = idFactory();
  if (typeof id !== 'string' || !id.trim() || id === original.id || post.stories.some(story => story?.id === id) || history.some(entry => entry.story.id === id || entry.replacedBy === id)) return fail('新Story IDを安全に発行できません');
  const next = structuredClone(candidate);
  delete next.reactionId;
  delete next.shotId;
  delete next.sourceStory;
  next.id = id;
  next.date = date;
  next.slot = slot;
  const preserved = structuredClone(original);
  const entry = {slot, date, story: preserved, replacedBy: id};
  return {ok: true, story: next, history: [...structuredClone(history), entry]};
}

if (typeof module !== 'undefined' && module.exports) module.exports = {prepareStoryReplacement};
