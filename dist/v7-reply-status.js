// Individual reply tracking is separate from repliedAt (a published response).
(function (root) {
  const statuses = ['needed', 'replied', 'not-needed'];
  const aggregate = reaction => /アンケート|二択|クイズ|投票/.test(String(reaction?.kind || ''));
  const eligible = reaction => !!reaction && !aggregate(reaction);
  const label = reaction => ({needed: '要返信', replied: '返信済み', 'not-needed': '返信不要'})[reaction?.replyStatus] || '未設定';
  function pending(reactions) {
    const seen = new Set();
    return (reactions || []).filter(reaction => {
      if (!eligible(reaction) || reaction.replyStatus !== 'needed' || !reaction.id || seen.has(reaction.id)) return false;
      seen.add(reaction.id);
      return true;
    });
  }
  function change(reactions, id, status, save) {
    if (!statuses.includes(status)) throw Error('返信状態を確認してください');
    const reaction = (reactions || []).find(value => value.id === id);
    if (!eligible(reaction)) throw Error('個別返信の対象を確認してください');
    const previous = reaction.replyStatus;
    reaction.replyStatus = status;
    try { save(); } catch (error) {
      if (previous === undefined) delete reaction.replyStatus;
      else reaction.replyStatus = previous;
      throw error;
    }
    return reaction;
  }
  const api = {eligible, label, pending, change};
  root.V7ReplyStatus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
