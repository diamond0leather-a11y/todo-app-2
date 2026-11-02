// Saved Story 2 results. Existing reactions remain the single linked record.
(function(root){
 const planned=story=>!!story&&/質問|アンケート|二択/.test(String(story.kind||story.stickerType||''));
 function linked(reactions,entry){
  const id=entry.story?.id;
  return (reactions||[]).find(r=>r.sourceStory?.storyId&&r.sourceStory.storyId===id)||
   (reactions||[]).find(r=>r.sourceStory?.postId===entry.post?.id&&r.sourceStory?.slot===2&&r.date===entry.date);
 }
 function completed(reaction){
  if(!reaction)return false;
  if(['entered','none','not-posted'].includes(reaction.story2ResultStatus))return true;
  return !!(String(reaction.story2ResultText||'').trim()||
   (reaction.answers||[]).some(value=>String(value).trim())||
   (reaction.options||[]).some(option=>Number.isFinite(option.count)));
 }
 function entries(state,today,storyState=root.V7StoryState){
  const dates=new Set([...(state.posts||[]).filter(post=>!post.deleted).flatMap(post=>[post.date,...(post.stories||[]).map(story=>story.date).filter(Boolean)]),...(state.storyDays||[]).filter(story=>!story.deleted).map(story=>story.date)]);
  return [...dates].filter(date=>date&&date<today).sort().flatMap(date=>storyState.entriesOnDate(state,date)
   .filter(entry=>Number(entry.slot)===2&&planned(entry.story))
   .map(entry=>({...entry,date,reaction:linked(state.reactions,{...entry,date})})));
 }
 function pending(state,today,storyState=root.V7StoryState){return entries(state,today,storyState).filter(entry=>!completed(entry.reaction));}
 function save(state,entry,status,text,persist,newId){
  if(!['entered','none','not-posted'].includes(status))throw Error('結果を選んでください');
  if(status==='entered'&&!String(text||'').trim())throw Error('結果の文章を入力してください');
  const existing=linked(state.reactions,entry),record=existing||{
   id:newId(),kind:/アンケート|二択/.test(String(entry.story.kind||''))?'アンケート':'質問スタンプ',date:entry.date,
   question:entry.story.text||entry.story.theme||'',options:(entry.story.options||[]).map(value=>({text:value,count:null})),
   answers:[],dm:[],uses:[],skuIds:[...(entry.story.skuIds||[])],source:'Story',
   sourceStory:{postId:entry.post?.id||null,slot:2,storyId:entry.story.id||null,snapshot:structuredClone(entry.story)}
  };
  const before={status:record.story2ResultStatus,text:record.story2ResultText};
  record.story2ResultStatus=status;
  record.story2ResultText=status==='entered'?String(text).trim():'';
  if(!existing)state.reactions.push(record);
  try{persist();}catch(error){
   if(!existing)state.reactions.splice(state.reactions.indexOf(record),1);
   else{if(before.status===undefined)delete record.story2ResultStatus;else record.story2ResultStatus=before.status;
    if(before.text===undefined)delete record.story2ResultText;else record.story2ResultText=before.text;}
   throw error;
  }
  return record;
 }
 const api={planned,linked,completed,entries,pending,save};
 root.V7Story2Result=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
