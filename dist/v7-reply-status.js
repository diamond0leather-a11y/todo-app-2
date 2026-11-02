// Individual reply tracking is separate from repliedAt (a published response).
(function (root) {
  const statuses = ['needed', 'replied', 'not-needed'];
  const aggregate = reaction => /アンケート|二択|クイズ|投票/.test(String(reaction?.kind || ''));
  const eligible = reaction => !!reaction && !aggregate(reaction);
  const shareStatuses = ['needed', 'shared', 'not-needed'];
  const shareEligible = reaction => !!reaction && aggregate(reaction);
  const shareLabel = reaction => ({needed: '要共有', shared: '共有済み', 'not-needed': '共有不要'})[reaction?.shareStatus] || '未設定';
  function sharePending(reactions) {
    const seen = new Set();
    return (reactions || []).filter(reaction => {
      if (!shareEligible(reaction) || reaction.shareStatus !== 'needed' || !reaction.id || seen.has(reaction.id)) return false;
      seen.add(reaction.id);
      return true;
    });
  }
  function changeShare(reactions, id, status, save) {
    if (status !== 'unset' && !shareStatuses.includes(status)) throw Error('結果共有の状態を確認してください');
    const reaction = (reactions || []).find(value => value.id === id);
    if (!shareEligible(reaction)) throw Error('アンケート結果を確認してください');
    const previous = reaction.shareStatus;
    if (status === 'unset') delete reaction.shareStatus;
    else reaction.shareStatus = status;
    try { save(); } catch (error) {
      if (previous === undefined) delete reaction.shareStatus;
      else reaction.shareStatus = previous;
      throw error;
    }
    return reaction;
  }
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
  function saveBasic(reaction, values, save) {
    if (!reaction || !String(values.question || '').trim()) throw Error('お客様の声・質問を入力してください');
    if (values.replyStatus && !statuses.includes(values.replyStatus)) throw Error('返信状態を確認してください');
    const previous = {question: reaction.question, source: reaction.source, replyStatus: reaction.replyStatus};
    reaction.question = String(values.question);
    reaction.source = String(values.source || 'その他');
    if (eligible(reaction)) {
      if (values.replyStatus) reaction.replyStatus = values.replyStatus;
      else delete reaction.replyStatus;
    }
    try { save(); } catch (error) {
      reaction.question = previous.question;
      reaction.source = previous.source;
      if (previous.replyStatus === undefined) delete reaction.replyStatus;
      else reaction.replyStatus = previous.replyStatus;
      throw error;
    }
    return reaction;
  }
  const api = {eligible, label, pending, change, saveBasic, shareEligible, shareLabel, sharePending, changeShare};
  root.V7ReplyStatus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
