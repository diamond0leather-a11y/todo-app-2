// v7 date-specific Story display; Feed/Reel dates remain on the post.
const v7PreviousAllTasks=allTasks;
allTasks=function(){return v7PreviousAllTasks().filter(task=>task.stage==='7d');};
demo.storyDays ||= [];

function v7StoryEntry(id,index){
  const post=demo.posts.find(value=>value.id===id);
  if(post)return {post,story:post.stories?.[index],index};
  const standalone=demo.storyDays.find(value=>value.id===id);
  return {post:null,story:standalone,index:demo.storyDays.indexOf(standalone)};
}
function v7StoryFields(story={}){
  return formInput('テーマ','theme',story.theme||'')+`<label class="wlabel">Storyに載せる文章<textarea name="text" rows="5" required>${html(story.text||'')}</textarea></label>`+
    formInput('使う写真・動画','asset',story.asset||'')+formInput('見た方への案内','action',story.action||'')+
    formSelect('素材の用意','materialMode',['過去素材使用可','新規撮影必要','まとめ撮り対象'],story.materialMode||'新規撮影必要')+
    formSelect('参加方法','kind',['なし','会話','クイズ','アンケート','二択','質問スタンプ','返答'],story.kind||'なし')+
    `<label class="wlabel">選択肢（1行に1つ）<textarea name="options">${html((story.options||[]).join('\n'))}</textarea></label><details><summary>使用商品</summary>${skuPickerWork(story.skuIds||[])}</details>`;
}
function v7StoryContent(form,slot){
  const text=String(form.get('text')||'').trim(),asset=String(form.get('asset')||'').trim();
  if(!text||!asset)throw Error('文章と使用する写真・動画を入力してください');
  const kind=String(form.get('kind')),options=String(form.get('options')||'').split('\n').map(value=>value.trim()).filter(Boolean);
  if(slot===2&&/アンケート|二択/.test(kind)&&(options.length!==2||options[0]===options[1]))throw Error('アンケートは異なる選択肢を2つ入力してください');
  const skuIds=form.getAll?.('skuIds')||[];
  if(skuIds.some(id=>!sku(id)||sku(id).deleted))throw Error('使用商品を確認してください');
  return {theme:String(form.get('theme')||'').trim(),text,asset,action:String(form.get('action')||'').trim(),materialMode:String(form.get('materialMode')),kind,options,skuIds,purpose:STORY_ROLES[slot-1],participatory:/アンケート|二択|クイズ|質問スタンプ/.test(kind)};
}
function v7CreateStory(date,slot){
  if(!V7StoryState.validDate(date)||!Number.isSafeInteger(slot)||slot<1||slot>4){toast('Storyの日付と番号を確認してください');return;}
  if(dx('#workDialog').open)dx('#workDialog').close();
  openForm(`${short(date)}｜Story ${slot}を作成`,v7StoryFields(),form=>{
    const content=v7StoryContent(form,slot);
    const next=V7StoryState.createStandalone(demo,date,slot,content,newId);
    demo.storyDays.push(next);
  });
}
function v7EditStandalone(id){
  const current=demo.storyDays.find(story=>story.id===id);
  if(!current){toast('Storyが見つかりません');return;}
  if(dx('#workDialog').open)dx('#workDialog').close();
  openForm(`${short(current.date)}｜Story ${current.slot}を編集`,v7StoryFields(current),form=>{
    const next=v7StoryContent(form,current.slot);
    const index=demo.storyDays.findIndex(story=>story.id===id);
    if(index<0)throw Error('Storyが変更されています。開き直してください');
    V7StoryState.assertUnique(demo,current.date,current.slot,null,index);
    demo.storyDays[index]={...current,...next,...(next.asset!==current.asset||JSON.stringify(next.skuIds)!==JSON.stringify(current.skuIds||[])?{shotId:undefined}:{}),manual:true,editorialSource:'manual'};
  });
}
const v7PreviousEditFinalStory=editFinalStory;
editFinalStory=function(id,index,mode){
  const post=demo.posts.find(value=>value.id===id),current=post?.stories?.[index];
  if(!post||post.stories.length===4||mode==='draft')return v7PreviousEditFinalStory(id,index,mode);
  if(!current){toast('Storyが見つかりません');return;}
  if(dx('#dayDialog').open)dx('#dayDialog').close();
  if(dx('#workDialog').open)dx('#workDialog').close();
  openForm(`${short(current.date??post.date)}｜Story ${current.slot}を編集`,v7StoryFields(current),form=>{
    const changes=v7StoryContent(form,current.slot);
    post.stories[index]=V7StoryState.prepareStoryEdit(demo,id,index,{...changes,...(changes.asset!==current.asset||JSON.stringify(changes.skuIds)!==JSON.stringify(current.skuIds||[])?{shotId:undefined}:{}),manual:true});
    post.manual=true;post.revision=(post.revision||0)+1;
  });
};
function v7ReplaceStory(id,index){
  const entry=v7StoryEntry(id,index),old=entry.story;
  if(!old){toast('Storyが見つかりません');return;}
  if(dx('#workDialog').open)dx('#workDialog').close();
  openForm(`Story ${old.slot??index+1}を別案に変更`,v7StoryFields(old),form=>{
    const slot=old.slot??index+1,candidate=v7StoryContent(form,slot);
    const holder=entry.post||{id:old.id,date:old.date,stories:[old],storyReplacementHistory:old.replacementHistory||[]};
    const result=prepareStoryReplacement(holder,slot,{...candidate,manual:true},demo.reactions,{idFactory:newId});
    if(!result.ok)throw Error(result.reason);
    if(entry.post){
      const currentIndex=entry.post.stories.findIndex(story=>story.id===old.id);
      if(currentIndex<0)throw Error('Storyが変更されています。開き直してください');
      entry.post.stories[currentIndex]=result.story;
      entry.post.storyReplacementHistory=result.history;
      entry.post.manual=true;entry.post.revision=(entry.post.revision||0)+1;
      storyDrafts.delete(entry.post.id);
    }else{
      const currentIndex=demo.storyDays.findIndex(story=>story.id===old.id);
      if(currentIndex<0)throw Error('Storyが変更されています。開き直してください');
      demo.storyDays[currentIndex]={...result.story,replacementHistory:result.history};
    }
  });
}

const v7PreviousDraftPost=draftPost;
draftPost=function(...args){
  const post=v7PreviousDraftPost(...args);
  // Keep the Story day fixed when only the Feed/Reel date is moved later.
  post.standaloneStoryDate=post.date;
  // New posts never copy daily Stories into the legacy post.stories array.
  post.stories=[];
  return post;
};

const v7PreviousEditPostMeta=editPostMeta;
editPostMeta=function(id){
  const previousOpen=openForm;
  openForm=function(title,body,onSave,onDelete){
    openForm=previousOpen;
    previousOpen(title,body,form=>{
      const post=demo.posts.find(value=>value.id===id),oldDate=post?.date;
      const prepared=V7StoryState.preparePostMove(demo,id,form.get('date'));
      const result=onSave(form);
      if(result!==false){
        post.stories=prepared.stories;
        if(post.date!==oldDate)post.standaloneStoryDate??=oldDate;
      }
      return result;
    },onDelete);
  };
  try{return v7PreviousEditPostMeta(id);}finally{openForm=previousOpen;}
};

const v7PreviousRenderHome=renderHome;
renderHome=function(){
  v7PreviousRenderHome();
  const todayPost=demo.posts.find(post=>post.date===TODAY&&!post.deleted&&!post.paused);
  if(todayPost){
    const cuts=todayPost.shots||[],done=cuts.filter(shotDoneFor).length;
    dx('#homeTodayContent').insertAdjacentHTML('beforeend',`<p class="tiny muted">撮影 ${done}/${cuts.length}カット完了</p>`);
  }
  const entries=V7StoryState.entriesOnDate(demo,TODAY).sort((a,b)=>a.slot-b.slot);
  const preview=dx('#homeStoryPreview');
  dx('#homeStoryCount').textContent=entries.length+'案';
  preview.innerHTML=(entries.length?entries.map(({post,story,index,slot})=>`<article class="home-story-mini"><strong>Story ${slot}｜${html(story.purpose||STORY_ROLES[slot-1]||'')}</strong><p>${html(story.text||'内容を確認してください')}</p><div class="actions"><button class="ghost small" data-v7-story-edit="${html(post?.id||story.id)}|${index}">編集</button><button class="ghost small" data-v7-story-replace="${html(post?.id||story.id)}|${index}">別案に変更</button><button class="ghost small" data-v7-story-response="${html(post?.id||story.id)}|${index}">反応を記録</button>${story.manual?'<span class="badge">確認済み</span>':`<button class="ghost small" data-v7-story-confirm="${html(post?.id||story.id)}|${index}">このStoryを確認</button>`}</div></article>`).join(''):'<p class="muted">今日のStory予定はありません。</p>')+[1,2,3,4].filter(slot=>!entries.some(entry=>entry.slot===slot)).map(slot=>`<button class="ghost small" data-v7-story-create="${TODAY}|${slot}">＋Story ${slot}</button>`).join('');
};

const v7PreviousRenderMonth=renderMonthWork;
renderMonthWork=function(){
  v7PreviousRenderMonth();
  for(const button of dax('#monthWorkCalendar [data-work-date]')){
    const count=V7StoryState.entriesOnDate(demo,button.dataset.workDate).length;
    if(count)button.insertAdjacentHTML('beforeend',`<small>Story ${count}</small>`);
  }
};

const v7PreviousRenderPlan=renderPlan;
renderPlan=function(){
  v7PreviousRenderPlan();
  const heading=dx('#view-plan .section-head');
  if(heading&&!dx('#view-plan [data-v7-post-new]'))heading.insertAdjacentHTML('afterend','<div class="actions"><button type="button" class="secondary full" data-v7-post-new>＋投稿を追加</button></div>');
  const period=salesCycleBlock(),list=dx('#planList');
  if(!period||!list)return;
  const groups=list.querySelectorAll(':scope > .stack');
  const addStories=(from,to,group)=>{
    if(!group)return;
    const posts=demo.posts.filter(post=>!post.deleted&&post.date>=from&&post.date<=to);
    const dates=[...new Set((demo.storyDays||[]).map(story=>story.date))].filter(date=>date>=from&&date<=to&&!posts.some(post=>post.date===date)).sort();
    if(!dates.length)return;
    if(!posts.length)for(const card of [...group.children])if(card.textContent.includes('この期間の投稿はまだありません'))card.remove();
    for(const date of dates){
      const entries=V7StoryState.entriesOnDate(demo,date).sort((a,b)=>a.slot-b.slot);
      const card=document.createElement('article');
      card.className='card';card.dataset.v7StoryPlanDate=date;
      card.innerHTML=`<div class="row between"><span class="badge">${html(planDay(date))}</span><span class="badge">Storyだけの日</span></div><p class="tiny muted">Feed／Reelの予定はありません</p>${entries.map(({post,story,index,slot})=>`<p>Story ${slot}｜${html(story.text||story.theme||'内容を確認')}</p><button class="ghost small" data-v7-story-edit="${html(post?.id||story.id)}|${index}">Story ${slot}を編集</button>`).join('')}${[1,2,3,4].filter(slot=>!entries.some(entry=>entry.slot===slot)).map(slot=>`<button class="ghost small" data-v7-story-create="${date}|${slot}">＋Story ${slot}</button>`).join('')}`;
      const later=[...group.children].find(item=>{
        const post=demo.posts.find(value=>value.id===item.querySelector('[data-work-post]')?.dataset.workPost);
        return (post?.date||item.dataset.v7StoryPlanDate)>date;
      });
      group.insertBefore(card,later||null);
    }
  };
  addStories(period.from,period.to,groups[0]||list);
  addStories(period.nextFrom,period.nextTo,groups[1]);
  const showAllDays=(from,to,group)=>{
    if(!group)return;
    for(let date=from;date<=to;date=dayAdd(date,1)){
      const post=demo.posts.find(value=>!value.deleted&&value.date===date);
      const entries=V7StoryState.entriesOnDate(demo,date);
      let card=post?[...group.children].find(item=>item.querySelector(`[data-work-post="${post.id}"]`)):group.querySelector(`[data-v7-story-plan-date="${date}"]`);
      if(!card){card=document.createElement('article');card.className='card';card.dataset.v7StoryPlanDate=date;card.innerHTML=`<div class="row between"><span class="badge">${html(planDay(date))}</span><span class="badge">投稿なし</span></div>`;const later=[...group.children].find(item=>{const linked=demo.posts.find(value=>value.id===item.querySelector('[data-work-post]')?.dataset.workPost);return (linked?.date||item.dataset.v7StoryPlanDate)>date;});group.insertBefore(card,later||null);}
      card.querySelector('[data-v7-story-day-status]')?.remove();
      if(!post&&card.dataset.v7StoryPlanDate)card.innerHTML=`<div class="row between"><span class="badge">${html(planDay(date))}</span><span class="badge">投稿なし</span></div>`;
      const count=card.querySelector('.row .tiny');if(count&&/\d+ Story/.test(count.textContent))count.textContent=count.textContent.replace(/\d+ Story/,`${entries.length} Story`);
      const panel=document.createElement('details');panel.dataset.v7StoryDayStatus=date;panel.className='v7-story-day-status';panel.open=date===TODAY;
      panel.innerHTML=`<summary>Story1〜4｜採用済み ${entries.length}/4</summary>${[1,2,3,4].map(slot=>{const found=entries.find(entry=>entry.slot===slot),story=found?.story,status=story?(story.editorialSource==='chatgpt-ten-day'?'採用済み':story.manual?'手動編集済み':'採用済み'):'未採用';return `<div class="v7-story-day-slot"><strong>Story ${slot}｜${html(status)}</strong>${story?`<p>${html(story.text||'')}</p><button class="ghost small" data-v7-story-edit="${html(found.post?.id||story.id)}|${found.index}">編集</button>`:`<button class="ghost small" data-v7-story-create="${date}|${slot}">＋Story ${slot}を追加</button>`}</div>`;}).join('')}<p class="tiny muted">AI案は「ChatGPT用10日企画をコピー」→「JSONを貼り付ける」で確認し、枠ごとに採用できます。</p>`;
      card.append(panel);
    }
  };
  showAllDays(period.from,period.to,groups[0]||list);
  showAllDays(period.nextFrom,period.nextTo,groups[1]);
};

const v7PreviousOpenMonthDate=openMonthDate;
openMonthDate=function(date){
  const entries=V7StoryState.entriesOnDate(demo,date);
  if(!entries.length){
    v7PreviousOpenMonthDate(date);
    if(dx('#workDialog').open){
      dx('#workBody').insertAdjacentHTML('beforeend',[1,2,3,4].map(slot=>`<button class="ghost small" data-v7-story-create="${date}|${slot}">＋Story ${slot}</button>`).join(''));
      if(!demo.posts.some(post=>!post.deleted&&post.date===date))dx('#workBody').insertAdjacentHTML('beforeend',`<button class="secondary full" data-v7-post-create="${date}">＋Feed／Reel投稿</button>`);
    }
    return;
  }
  const posts=demo.posts.filter(post=>post.date===date&&!post.deleted);
  dx('#workTitle').textContent=short(date);
  dx('#workBody').innerHTML=posts.map(post=>`<button class="eventline" data-work-post="${html(post.id)}">${html(post.theme)}<small>${html(post.format)}・投稿内容を見る</small></button>`).join('')+entries.map(({post,story,index,slot})=>`<button class="eventline" data-v7-story-edit="${html(post?.id||story.id)}|${index}">Story ${slot}<small>${html(story.text||story.theme||'内容を確認')}</small></button>`).join('')+[1,2,3,4].filter(slot=>!entries.some(entry=>entry.slot===slot)).map(slot=>`<button class="ghost small" data-v7-story-create="${date}|${slot}">＋Story ${slot}</button>`).join('')+(!posts.length?`<button class="secondary full" data-v7-post-create="${date}">＋Feed／Reel投稿</button>`:'');
  dx('#workDialog').showModal();
};

const v7PreviousShowPost=showPost;
showPost=function(id){
  v7PreviousShowPost(id);
  const post=demo.posts.find(value=>value.id===id);
  const section=dx('#dayDetail .stories-always');
  if(!post||!section)return;
  const storyDate=post.standaloneStoryDate??post.date;
  const standalone=V7StoryState.entriesOnDate(demo,storyDate).filter(entry=>entry.standalone).sort((a,b)=>a.slot-b.slot);
  const canonicalSlots=new Set(standalone.map(entry=>entry.slot));
  const cards=[...section.querySelectorAll(':scope > .story-card')];
  cards.forEach((card,index)=>{
    const story=post?.stories?.[index];
    if(story&&canonicalSlots.has(story.slot??index+1)){card.remove();return;}
    if(story){
      card.insertAdjacentHTML('afterbegin',`<p class="tiny muted">Story日付：${html(V7StoryState.dateOf(story,post))}</p>`);
      if(post.stories.length<4){const title=card.querySelector('strong');if(title)title.textContent=`Story ${story.slot} · ${story.purpose||STORY_ROLES[story.slot-1]||''}`;}
    }
  });
  for(const {story,index,slot} of standalone){
    const proposalCard=cards[slot-1];
    if(proposalCard?.querySelector('[data-story-apply]'))proposalCard.remove();
    const card=document.createElement('article');
    card.className='story-card';
    card.dataset.v7StorySlot=String(slot);
    card.innerHTML=`<strong>Story ${slot}｜${html(story.purpose||STORY_ROLES[slot-1]||'')}</strong><p class="tiny muted">${html(story.date)} の独立Story</p><h4>${html(story.theme||'')}</h4><p class="story-text">${html(story.text||'')}</p><p class="tiny">${html(story.asset||'')}</p><p>見た方に：${html(story.action||'')}</p><div class="actions"><button class="ghost small" data-v7-story-edit="${html(story.id)}|${index}">編集</button><button class="ghost small" data-v7-story-response="${html(story.id)}|${index}">反応を記録</button></div>`;
    const next=[...section.querySelectorAll(':scope > .story-card')].find(existing=>{
      const position=existing.dataset.v7StorySlot?Number(existing.dataset.v7StorySlot):cards.indexOf(existing)+1;
      return position>slot;
    });
    section.insertBefore(card,next||section.querySelector(':scope > details, :scope > button')||null);
  }
  const occupied=new Set(V7StoryState.entriesOnDate(demo,storyDate).map(entry=>entry.slot));
  const emptySlots=[1,2,3,4].filter(slot=>!occupied.has(slot));
  if(emptySlots.length){
    const actions=document.createElement('div');
    actions.className='actions';
    actions.innerHTML=emptySlots.map(slot=>`<button class="ghost small" data-v7-story-create="${html(storyDate)}|${slot}">＋Story ${slot}を追加</button>`).join('');
    section.querySelector(':scope > h3')?.insertAdjacentElement('afterend',actions);
  }
  if(emptySlots.length&&(post.standaloneStoryDate||!post.stories.length)){
    const suggestions=v7PostStorySuggestions(post);
    const proposal=document.createElement('details');
    proposal.className='v7-story-suggestions';
    proposal.innerHTML=`<summary>AIのStory案を見る</summary><p class="tiny muted">内容を確認し、使いたい枠だけ採用してください。見るだけでは保存されません。</p>`+
      suggestions.map((story,index)=>{
        const slot=index+1,matches=V7StoryState.entriesOnDate(demo,storyDate).filter(entry=>entry.slot===slot),current=matches[0];
        const locked=matches.length>1||!!current?.post||!!(current&&v7StoryHasReaction(demo,current.story,current.story.id,slot));
        const reason=matches.length>1?'同じ枠に複数のStoryがあるため変更できません':current?.post?'投稿内に保存されたStoryはこの画面から置き換えできません':locked?'反応が記録されているため置き換えできません':'';
        return `<article class="story-card" data-v7-ai-story-slot="${slot}"><strong>Story ${slot}｜${html(STORY_ROLES[index])}</strong>${current?'<p class="tiny muted">保存済みのStoryを優先して表示しています</p>':''}<h4>${html(story.theme||'')}</h4><p class="story-text">${html(story.text||'文章を確認してください')}</p><p class="tiny">使う写真・動画：${html(story.asset||'素材を確認してください')}</p><p class="tiny">見た方への案内：${html(story.action||'なし')}</p>${story.kind&&story.kind!=='なし'?`<p class="tiny">参加方法：${html(story.kind)}${story.options?.length?'｜'+html(story.options.join('／')):''}</p>`:''}${story.researchRequired?'<p class="notice">出典を確認してから採用してください。</p>':''}${reason?`<p class="notice">${reason}</p>`:`<div class="actions"><button class="secondary small" data-v7-story-ai-adopt="${html(post.id)}|${slot}">この案を採用</button><button class="ghost small" data-v7-story-ai-edit="${html(post.id)}|${slot}">編集して採用</button><button class="ghost small" data-v7-story-ai-skip="${slot}">採用しない</button></div>`}</article>`;
      }).join('');
    section.append(proposal);
  }
};

function v7PostStorySuggestions(post){
  const draft=currentStoryDraft(post).stories;
  const suggestions=structuredClone(Array.isArray(draft)&&draft.length===4?draft:makeStories(post));
  const recentParticipation=storyHistory(post.date).some(story=>story.slot===2&&story.participatory&&dayDiff(post.date,story.date)<=2);
  if(!unansweredReaction(post.date)&&(recentParticipation||Math.abs(dayDiff(post.date,'2026-01-01'))%3!==0)){
    suggestions[1]={...suggestions[1],theme:'今日のひとこと',text:`今日は「${post.takeaway||post.theme||'いつもの使い方'}」を少しだけ。制作や使う場面を見て、気になったところがあれば、いつでも声をかけてください。`,asset:'写真：今日の制作や使う場面の自然な1枚',action:'気になった時だけ返信',kind:'なし',options:[],participatory:false};
  }
  return suggestions;
}
function v7AdoptPostStorySuggestion(postId,slot,edited){
  const post=demo.posts.find(value=>value.id===postId&&!value.deleted);
  if(!post||!Number.isSafeInteger(slot)||slot<1||slot>4)throw Error('対象のStoryを確認してください');
  const date=post.standaloneStoryDate??post.date;
  const matches=V7StoryState.entriesOnDate(demo,date).filter(entry=>entry.slot===slot);
  if(matches.length>1)throw Error(`Story ${slot}が重複しています。保存しませんでした`);
  const current=matches[0];
  if(current?.post)throw Error('投稿内に保存されたStoryはこの画面から置き換えできません');
  if(current&&v7StoryHasReaction(demo,current.story,current.story.id,slot))throw Error('反応が記録されたStoryは置き換えできません');
  const suggested=v7PostStorySuggestions(post)[slot-1];
  if(!suggested?.text||!suggested.asset)throw Error('文章と使用する写真・動画を確認してください');
  const next=structuredClone(demo),copy=next.posts.find(value=>value.id===postId);
  if(!copy||copy.revision!==post.revision)throw Error('投稿が変更されています。開き直してください');
  const proposed={...suggested,...(edited||{}),purpose:STORY_ROLES[slot-1]};
  const adopted=v7AdoptAiStory(current?.story,{...proposed,skuIds:[...(proposed.skuIds||[])]},slot,date);
  if(current)next.storyDays[current.index]=adopted;
  else next.storyDays.push(V7StoryState.createStandalone(next,date,slot,adopted,()=>adopted.id));
  const previous=demo;demo=next;
  try{persist();}catch(error){demo=previous;throw error;}
  refreshWork();if(!dx('#workDialog').open)showPost(postId);
}

recordStoryResponse=function(id,index,mode){
  const entry=v7StoryEntry(id,index),post=entry.post;
  const story=mode==='draft'&&post?currentStoryDraft(post).stories[index]:entry.story;
  if(!story||mode==='draft'){toast('保存済みのStoryを選んでください');return;}
  dx('#dayDialog').close();
  const storyId=story.id||newId();
  const existing=demo.reactions.find(reaction=>reaction.sourceStory?.storyId===storyId);
  editReaction(existing?.id);
  const form=dx('#workForm');
  if(!existing){
    form.elements.question.value=story.text||story.theme||'';
    form.elements.date.value=post?V7StoryState.dateOf(story,post):story.date;
    form.elements.theme.value=story.theme||'';
    form.elements.kind.value=story.kind==='二択'?'アンケート':['クイズ','アンケート','質問スタンプ'].includes(story.kind)?story.kind:'リアクション';
    for(const input of form.querySelectorAll('[name=skuIds]'))input.checked=(story.skuIds||[]).includes(input.value);
    form.querySelector('#responseOptions').innerHTML=(story.options||[]).map(text=>'<div class="optionline">'+formInput('選択肢','optionText',text)+formInput('回答数','optionCount','','number')+'</div>').join('');
  }
  const save=form.onsubmit;
  form.onsubmit=event=>{
    const count=demo.reactions.length;
    save(event);
    if(!dx('#workDialog').open){
      const reaction=existing||demo.reactions[count];
      if(reaction){
        story.id=storyId;
        story.date=post?V7StoryState.dateOf(story,post):story.date;
        story.manual=true;
        if(post){post.manual=true;post.revision=(post.revision||0)+1;}
        reaction.sourceStory={postId:id,slot:story.slot||index+1,storyId,snapshot:structuredClone(story)};
        reaction.parentId=form.elements.parentId?.value||story.parentId||null;
        persist();
      }
    }
  };
};

function v7StoryHasReaction(state,story,postId,slot){
  if(!story)return false;
  if(story.reactionId)return true;
  return (state.reactions||[]).some(reaction=>{
    const source=reaction.sourceStory;
    if(source?.storyId&&story.id&&source.storyId===story.id)return true;
    // An older response without a Story ID cannot safely be assigned to a new version.
    return source?.postId===postId&&Number(source.slot)===slot&&!source.storyId;
  });
}
function v7AdoptAiStory(old,proposal,slot,date){
  const changes=structuredClone(proposal);
  for(const key of ['id','date','slot','reactionId','shotId','sourceStory','replacementHistory'])delete changes[key];
  const result={...structuredClone(old||{}),...changes,id:old?.id||newId(),date:old?.date||date,slot,manual:true};
  if(old?.asset!==result.asset)delete result.shotId;
  return result;
}
// Single-day proposals use the same opt-in, per-field and per-Story rule as analysis proposals.
showSinglePreview=function(){
  const {postId,before,after,revision}=singlePreview,post=demo.posts.find(value=>value.id===postId);
  if(!post)throw Error('対象投稿が見つかりません。');
  const locked=!!(post.actualAt||post.actualSnapshot||post.noPostConfirmedAt||post.deleted||post.posted||post.status==='posted');
  const rows=[['meta','企画',before.mainTopic,after.mainTopic],['caption','本文',before.mainPostBody,after.mainPostBody],['cta','CTA',before.CTA||'',after.CTA||''],['products','商品',(before.products||[]).map(skuLabel).join(' / ')||'商品なし',(after.products||[]).map(skuLabel).join(' / ')||'商品なし'],['shots','撮影指示',(before.shots||[]).map(shot=>shot.what).join(' / '),(after.shots||[]).map(shot=>shot.what).join(' / ')],...[1,2,3,4].map(slot=>{const matches=V7StoryState.entriesOnDate(demo,post.standaloneStoryDate??post.date).filter(entry=>entry.slot===slot);return ['story'+slot,'Story '+slot,matches[0]?.story.text||'未登録',after['story'+slot].text,matches.length>1||matches[0]&&v7StoryHasReaction(demo,matches[0].story,matches[0].post?.id||matches[0].story.id,slot)];})];
  openForm('1日再提案｜変更前・変更後',`<p class="tiny muted">${html(short(after.date))}のうち、選んだ項目だけ変更します。初期状態はすべて現在の内容を維持します。</p>${rows.map(([key,label,current,incoming,storyLocked])=>`<label class="pick-name"><input type="checkbox" name="singleApprove" value="${key}" ${locked||storyLocked?'disabled':''}>${html(label)}をAI案へ置き換える${storyLocked?'（反応が記録されているため変更不可）':''}</label><p class="tiny">現在：${html(current)}<br>AI案：${html(incoming)}</p>`).join('')}`,form=>{
    const approved=new Set(form.getAll('singleApprove'));
    if(!approved.size)throw Error('変更する項目を選んでください。');
    const current=demo.posts.find(value=>value.id===postId);
    if(!current||current.date!==after.date||current.revision!==revision||current.actualAt||current.actualSnapshot||current.noPostConfirmedAt||current.deleted||current.posted||current.status==='posted')throw Error('投稿の状態が変わりました。開き直して確認してください。');
    const topic=validateSingle({schema:SCHEMA,scope:SINGLE_SCOPE,plan:after},current.date),next=structuredClone(demo),target=next.posts.find(value=>value.id===postId),date=target.standaloneStoryDate??target.date;
    if(approved.has('meta'))Object.assign(target,{format:after.format,primaryAxis:after.primaryPurpose,parentId:topic?.id||null,themeId:topic?.id||null,topicGroup:topic?.group||null,theme:after.mainTopic,derivedTheme:after.angle||after.mainTopic,takeaway:after.customerValue,researchRequired:!!topic?.researchRequired});
    if(approved.has('caption'))target.caption=after.mainPostBody;
    if(approved.has('cta'))target.cta=after.CTA||'';
    if(approved.has('products'))target.skuIds=[...after.products];
    if(approved.has('shots')&&Object.hasOwn(after,'shots')){
      const oldShots=target.shots||[],newShots=after.shots.map((shot,index)=>{const old=oldShots[index],same=old&&(shot.id&&shot.id===old.id||old.media===shot.media&&old.what===shot.what&&JSON.stringify(old.skuIds||[])===JSON.stringify(shot.skuIds||[]));return {...shot,id:same?old.id:newId(),signature:same?old.signature:undefined};});
      target.shots=newShots;target.sequence=newShots.map((shot,index)=>({order:index+1,words:'',shotId:shot.id}));target.shotsAuthoritative=true;
    }
    for(let slot=1;slot<=4;slot++)if(approved.has('story'+slot)){
      const matches=V7StoryState.entriesOnDate(next,date).filter(entry=>entry.slot===slot);
      if(matches.length>1)throw Error(`Story ${slot}が重複しています。保存しませんでした。`);
      const found=matches[0];if(found&&v7StoryHasReaction(next,found.story,found.post?.id||found.story.id,slot))throw Error(`Story ${slot}は反応が記録されているため置き換えできません。`);
      const proposed={...after['story'+slot],slot,purpose:STORY_ROLES[slot-1],skuIds:after['story'+slot].skuIds||[]},adopted=v7AdoptAiStory(found?.story,proposed,slot,date);
      if(found?.standalone)next.storyDays[found.index]=adopted;
      else if(found?.post)found.post.stories[found.index]=adopted;
      else next.storyDays.push(V7StoryState.createStandalone(next,date,slot,adopted,()=>adopted.id));
    }
    target.revision=(target.revision||0)+1;target.editorialSource='chatgpt-import';
    if(target.manualFields?.revision===revision&&!target.manualFields.unknown)target.manualFields.revision=target.revision;
    const previous=demo;demo=next;try{persist();}catch(error){demo=previous;throw error;}
    refreshWork();singlePreview=null;toast('選んだ項目だけ保存しました');return false;
  });
  dx('#workForm .save-foot button').textContent=locked?'投稿済みのため変更できません':'選んだ項目だけ保存';
  if(locked)dx('#workForm .save-foot button').disabled=true;
};
const v7PreviousSaveStoryDraft=saveStoryDraft;
const v7PreviousStoryCardHTML=storyCardHTML;
storyCardHTML=function(story,index,post,proposed){
  const markup=v7PreviousStoryCardHTML(story,index,post,proposed);
  if(!proposed)return markup;
  const locked=v7StoryHasReaction(demo,post.stories?.[index],post.id,index+1);
  return markup.replace(/<label class="pick-name"><input type="checkbox" data-story-apply="\d+"[^>]*>.*?<\/label>/,`<label class="pick-name"><input type="checkbox" data-story-apply="${index}" ${locked?'disabled':''}>Story ${index+1}をAI案へ置き換える${locked?'（反応が記録されているため変更不可）':''}</label>`);
};
saveStoryDraft=function(id){
  const post=demo.posts.find(value=>value.id===id);
  const selected=dax('#dayDetail > .stories-always > .story-card [data-story-apply]:checked').map(input=>Number(input.dataset.storyApply));
  if(selected.some(index=>v7StoryHasReaction(demo,post?.stories[index],post?.id,index+1))){
    toast('反応が記録されたStoryは置き換えできません。');
    return;
  }
  const draft=currentStoryDraft(post),before=selected.map(index=>draft.stories[index]);
  selected.forEach(index=>{draft.stories[index]=v7AdoptAiStory(post.stories[index],draft.stories[index],index+1,post.date);});
  const revision=post.revision;
  const result=v7PreviousSaveStoryDraft(id);
  if(post.revision===revision)selected.forEach((index,position)=>{draft.stories[index]=before[position];});
  return result;
};

const v7PreviousApplyImport=applyImport;
const aiFieldLabels={theme:'テーマ',format:'形式',caption:'本文',hook:'冒頭',cta:'CTA',skuIds:'商品',shots:'撮影指示'};
function aiFieldConflicts(post,changes){
  const fields=post.manualFields,unknown=post.manual&&(!fields||fields.unknown||fields.revision!==post.revision);
  return Object.keys(changes).filter(key=>key!=='stories'&&JSON.stringify(changes[key])!==JSON.stringify(post[key])&&(
    unknown||key==='caption'&&fields?.caption||key==='cta'&&fields?.cta||key==='skuIds'&&fields?.products||key==='shots'&&(fields?.shots||post.shots?.some(shotDoneFor))||['theme','format','hook'].includes(key)&&fields?.meta
  ));
}
const v7PreviousPreviewImport=previewImport;
previewImport=function(){
  v7PreviousPreviewImport();
  if(!pendingImport)return;
  const cards=[...dx('#importPreview').querySelectorAll('article.card')];
  pendingImport.proposals.forEach((proposal,index)=>{
    const post=demo.posts.find(value=>value.id===proposal.postId),conflicts=post?aiFieldConflicts(post,proposal.changes):[];
    if(!cards[index])return;
    if(conflicts.length)cards[index].insertAdjacentHTML('beforeend',`<p class="notice">手動編集と重なる項目は維持します。置き換える項目だけ選んでください。</p>${conflicts.map(key=>{const completed=key==='shots'&&post.shots?.some(shotDoneFor);return `<label class="pick-name"><input type="checkbox" data-ai-overwrite="${index}|${key}" ${completed?'disabled':''}>${html(aiFieldLabels[key]||key)}をAI案で置き換える${completed?'（撮影済みのため変更不可）':''}</label>`;}).join('')}`);
    if(Array.isArray(proposal.changes.stories)){
      const date=post?.standaloneStoryDate??post?.date;
      cards[index].insertAdjacentHTML('beforeend',`<p class="notice">Storyは選んだ枠だけ変更します。</p>${proposal.changes.stories.map((story,slotIndex)=>{
        if(!story)return '';
        const slot=slotIndex+1,entries=V7StoryState.entriesOnDate(demo,date).filter(entry=>entry.slot===slot),current=entries[0];
        const locked=entries.length>1||current&&v7StoryHasReaction(demo,current.story,current.post?.id||current.story.id,slot);
        return `<label class="pick-name"><input type="checkbox" data-ai-story-apply="${index}|${slotIndex}" ${locked?'disabled':''}>Story ${slot}をAI案へ置き換える${locked?'（反応が記録されているため変更不可）':''}</label>`;
      }).join('')}`);
    }
  });
};
function showStandaloneStoryProposal(plan){
  const date=plan.date,entries=V7StoryState.entriesOnDate(demo,date);
  if(!entries.length)throw Error('対象日のStoryがありません');
  const rows=[1,2,3,4].map(slot=>{
    const current=entries.find(entry=>entry.slot===slot),proposed=plan['story'+slot];
    const protectedStory=current&&v7StoryHasReaction(demo,current.story,current.post?.id||current.story.id,slot);
    return `<label class="pick-name"><input type="checkbox" name="storySlot" value="${slot}" ${protectedStory?'disabled':''}>Story ${slot}をAI案へ置き換える${protectedStory?'（反応が記録されているため変更不可）':''}</label><p class="tiny">現在：${html(current?.story.text||'未登録')}<br>新案：${html(proposed.text)}</p>`;
  }).join('');
  openForm(`${short(date)}｜Storyの単日再提案`,`<p>Storyだけの日です。選んだ枠だけ変更します。Feed／Reelは作成しません。</p>${rows}`,form=>{
    const selected=form.getAll('storySlot').map(Number);
    if(!selected.length)throw Error('変更するStoryを選んでください');
    const next=structuredClone(demo);next.storyDays||=[];
    for(const slot of selected){
      if(!Number.isSafeInteger(slot)||slot<1||slot>4)throw Error('Story番号を確認してください');
      const current=V7StoryState.entriesOnDate(next,date).find(entry=>entry.slot===slot);
      if(current&&v7StoryHasReaction(next,current.story,current.post?.id||current.story.id,slot))throw Error(`Story ${slot}は反応が記録されているため置き換えできません`);
      const candidate={...structuredClone(plan['story'+slot]),slot,purpose:STORY_ROLES[slot-1],skuIds:[...(plan['story'+slot].skuIds||[])],manual:true};
      if(!current){next.storyDays.push(V7StoryState.createStandalone(next,date,slot,candidate,newId));continue;}
      const adopted=v7AdoptAiStory(current.story,candidate,slot,date);
      if(current.post){current.post.stories[current.index]=adopted;current.post.manual=true;current.post.revision=(current.post.revision||0)+1;}
      else next.storyDays[current.index]=adopted;
    }
    localStorage.setItem(MOCK_KEY,JSON.stringify(next));demo=next;
    dx('#workDialog').close();refreshWork();toast('選んだStoryを保存しました');
    return false;
  });
}
applyImport=function(){
  const selected=dax('[data-apply-proposal]:checked').map(input=>Number(input.dataset.applyProposal));
  try{
    const analysis=validateImport(JSON.stringify(pendingImport)),next=structuredClone(demo),applied=[];
    const topics=structuredClone(analysis.newThemes||[]),batch=analysis.batchId;
    const approved=new Set(dax('[data-ai-overwrite]:checked').map(input=>input.dataset.aiOverwrite));
    const approvedStories=new Set(dax('[data-ai-story-apply]:checked').map(input=>input.dataset.aiStoryApply));
    const skipped=[];
    for(const index of selected){
      const proposal=analysis.proposals[index],post=next.posts.find(value=>value.id===proposal.postId);
      if(!post||post.revision!==proposal.expectedRevision||post.actualAt)throw Error('投稿が変更されています。再度分析用データをコピーしてください');
      const changes=structuredClone(proposal.changes),incoming=changes.stories;
      delete changes.stories;
      for(const key of aiFieldConflicts(post,changes)){
        const completed=key==='shots'&&post.shots?.some(shot=>{const stable=shotDoneKey(shot);return stable&&Object.hasOwn(next.shotDone,stable)?next.shotDone[stable]:next.shotDone?.[shot.signature];});
        if(completed||!approved.has(`${index}|${key}`)){delete changes[key];skipped.push(aiFieldLabels[key]||key);}
      }
      if(isModernPost(post)&&changes.sequence)changes.sequence=changes.sequence.map(({visual,...row})=>row);
      Object.assign(post,changes);
      let storyChanged=false;
      if(incoming){
        incoming.forEach((story,slotIndex)=>{
          if(!story||!approvedStories.has(`${index}|${slotIndex}`))return;
          const slot=slotIndex+1,date=post.standaloneStoryDate??post.date;
          const matches=V7StoryState.entriesOnDate(next,date).filter(entry=>entry.slot===slot);
          if(matches.length>1)throw Error(`Story ${slot}が重複しています。変更を保存しませんでした`);
          const current=matches[0];
          if(current&&v7StoryHasReaction(next,current.story,current.post?.id||current.story.id,slot))throw Error(`Story ${slot}は反応が記録されているため置き換えできません`);
          const adopted=v7AdoptAiStory(current?.story,story,slot,date);
          if(current?.standalone)next.storyDays[current.index]=adopted;
          else if(current?.post)current.post.stories[current.index]=adopted;
          else next.storyDays.push(V7StoryState.createStandalone(next,date,slot,adopted,()=>adopted.id));
          storyChanged=true;
        });
      }
      if(!Object.keys(changes).length&&!storyChanged)continue;
      post.analysisAppliedFields=[...new Set([...(post.analysisAppliedFields||[]),...Object.keys(changes),...(storyChanged?['stories']:[])])];
      const knownFields=!post.manual||post.manualFields?.revision===post.revision&&!post.manualFields?.unknown;
      post.revision=(post.revision||0)+1;post.manual=true;
      if(knownFields)post.manualFields={...post.manualFields,revision:post.revision};
      applied.push(post.id);
    }
    next.analyses.push({...analysis,appliedPostIds:applied,savedAt:nowISO()});
    next.extraThemes||=[];
    for(const topic of topics)next.extraThemes.push({...topic,status:topic.parentId?'派生テーマ':'追加テーマ',source:batch,uses:[]});
    for(const id of applied){
      const post=next.posts.find(value=>value.id===id);
      for(const reactionId of post.voiceIds||[]){const reaction=next.reactions.find(value=>value.id===reactionId);if(reaction&&!reaction.uses.some(use=>use.postId===id&&use.analysisId===batch))reaction.uses.push({date:post.date,note:post.theme,postId:id,analysisId:batch});}
      const topic=next.extraThemes.find(value=>value.id===post.themeId);if(topic&&!topic.uses.some(use=>use.postId===id))topic.uses.push({postId:id,date:post.date});
    }
    localStorage.setItem(MOCK_KEY,JSON.stringify(next));demo=next;pendingImport=null;
    dx('#analysisPaste').value='';dx('#importPreview').innerHTML='';refreshWork();toast(skipped.length?'手動編集の重複項目を維持して、選んだ変更を保存しました':'分析と選択した変更を保存しました');
  }catch(error){dx('#analysisImportError').textContent=error.message;}
};

function v7OpenPostCreate(date){
  if(dx('#workDialog').open)dx('#workDialog').close();
  openForm('Feed／Reel投稿を追加',
    formInput('投稿日（予定）','date',date,'date',true)+
    formSelect('投稿形式','format',[['Feed','Feed'],['Reel','Reel']],'Feed')+
    formInput('投稿の名前','theme','','text',true)+
    formInput('予定時刻','plannedTime','18:00','time')+
    formInput('撮影する内容（任意・1カット）','shotWhat',''),form=>{
      const planned=String(form.get('date')||''),theme=String(form.get('theme')||'').trim();
      if(!V7StoryState.validDate(planned)||!theme)throw Error('予定日と投稿の名前を入力してください');
      if(demo.posts.some(post=>!post.deleted&&post.date===planned))throw Error('この日には投稿があります。日付を確認してください');
      const id=newId(),shotWhat=String(form.get('shotWhat')||'').trim();
      const post={id,date:planned,plannedTime:String(form.get('plannedTime')||'18:00'),actualAt:null,
        format:String(form.get('format')),theme,derivedTheme:theme,primaryAxis:null,purpose:'',
        parentId:null,themeId:null,topicGroup:null,skuIds:[],caption:'',hook:'',cta:'',
        stories:[],shots:shotWhat?[{id:newId(),media:'写真',what:shotWhat,skuIds:[],count:1}]:[],
        sequence:[],shotsAuthoritative:true,revision:1,manual:true,paused:false,
        standaloneStoryDate:planned};
      demo.posts.push(post);
      queueMicrotask(()=>showPost(id));
    });
}

document.addEventListener('click',event=>{
  const newPost=event.target.closest('[data-v7-post-new]');
  if(newPost){event.preventDefault();event.stopImmediatePropagation();v7OpenPostCreate(TODAY);return;}
  const createPost=event.target.closest('[data-v7-post-create]');
  if(createPost){
    event.preventDefault();event.stopImmediatePropagation();
    v7OpenPostCreate(createPost.dataset.v7PostCreate);
    return;
  }
  const create=event.target.closest('[data-v7-story-create]');
  if(create){
    event.preventDefault();event.stopImmediatePropagation();
    const [date,slot]=create.dataset.v7StoryCreate.split('|');
    if(dx('#dayDialog').open&&dx('#dayDialog').contains(create)){
      returnPostId=dx('#dayDialog').dataset.postId||null;
      dx('#dayDialog').close();
    }
    v7CreateStory(date,Number(slot));
    return;
  }
  const adopt=event.target.closest('[data-v7-story-ai-adopt]');
  if(adopt){
    event.preventDefault();event.stopImmediatePropagation();
    const [id,slot]=adopt.dataset.v7StoryAiAdopt.split('|');
    try{v7AdoptPostStorySuggestion(id,Number(slot));toast(`Story ${slot}の案を保存しました`);}catch(error){toast(error.message);}
    return;
  }
  const editSuggestion=event.target.closest('[data-v7-story-ai-edit]');
  if(editSuggestion){
    event.preventDefault();event.stopImmediatePropagation();
    const [id,slotText]=editSuggestion.dataset.v7StoryAiEdit.split('|'),slot=Number(slotText);
    const post=demo.posts.find(value=>value.id===id),suggested=post&&v7PostStorySuggestions(post)[slot-1];
    if(!suggested){toast('Story案を開き直してください');return;}
    returnPostId=id;dx('#dayDialog').close();
    openForm(`Story ${slot}｜AI案を編集して採用`,v7StoryFields(suggested),form=>{
      v7AdoptPostStorySuggestion(id,slot,v7StoryContent(form,slot));
      dx('#workDialog').close();toast(`Story ${slot}の案を保存しました`);
      return false;
    });
    return;
  }
  const skip=event.target.closest('[data-v7-story-ai-skip]');
  if(skip){event.preventDefault();event.stopImmediatePropagation();skip.closest('[data-v7-ai-story-slot]')?.remove();return;}
  const replace=event.target.closest('[data-v7-story-replace]');
  if(replace){event.preventDefault();event.stopImmediatePropagation();const [id,index]=replace.dataset.v7StoryReplace.split('|');v7ReplaceStory(id,Number(index));return;}
  const response=event.target.closest('[data-v7-story-response]');
  if(response){event.preventDefault();event.stopImmediatePropagation();const [id,index]=response.dataset.v7StoryResponse.split('|');recordStoryResponse(id,Number(index),'saved');return;}
  const confirm=event.target.closest('[data-v7-story-confirm]');
  if(confirm){
    event.preventDefault();event.stopImmediatePropagation();
    const [id,indexText]=confirm.dataset.v7StoryConfirm.split('|'),index=Number(indexText),entry=v7StoryEntry(id,index),post=entry.post;
    try{if(post){post.stories[index]=V7StoryState.prepareStoryEdit(demo,id,index,{manual:true});post.manual=true;post.revision++;}else if(entry.story){entry.story.manual=true;}else throw Error('Storyが見つかりません');persist();refreshWork();toast('Storyを確認済みにしました');}catch(error){toast(error.message);}
    return;
  }
  const button=event.target.closest('[data-v7-story-edit]');
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const [id,index]=button.dataset.v7StoryEdit.split('|');
  if(dx('#dayDialog').open&&dx('#dayDialog').contains(button)){
    returnPostId=dx('#dayDialog').dataset.postId||null;
    dx('#dayDialog').close();
  }
  dx('#workDialog').close();
  if(demo.posts.some(post=>post.id===id))editFinalStory(id,Number(index),'saved');else v7EditStandalone(id);
},true);
if(dx('#view-home')?.classList.contains('active'))refreshWork();

// Record only fields changed by an explicit post-edit form. Older manual posts with
// no reliable field history stay fully protected instead of guessing their edits.
const v7ManualOpenForm=openForm;
openForm=function(title,body,onSave,onDelete){
  if(!['投稿の日程・商品','冒頭・CTA','撮影指示','企画の意図'].includes(title)&&!/^Story [1-4](?:｜|を|$)/.test(title)&&!/｜Story [1-4]を編集$/.test(title))return v7ManualOpenForm(title,body,onSave,onDelete);
  const before=new Map(demo.posts.map(post=>[post.id,structuredClone(post)]));
  return v7ManualOpenForm(title,body,form=>{
    const result=onSave(form);
    if(result===false)return result;
    for(const post of demo.posts){
      const old=before.get(post.id);
      if(!old||!post.manual||post.revision===old.revision)continue;
      const known=!old.manual||!!old.manualFields&&!old.manualFields.unknown&&old.manualFields.revision===old.revision;
      const fields=known?{...old.manualFields}:{...old.manualFields,unknown:true};
      const changed=key=>JSON.stringify(old[key])!==JSON.stringify(post[key]);
      if(changed('date')||changed('plannedTime')||changed('paused'))fields.schedule=true;
      if(changed('date'))fields.scheduleDates=[...new Set([...(fields.scheduleDates||[]),old.date])];
      if(changed('skuIds'))fields.products=true;
      if(changed('cta'))fields.cta=true;
      if(changed('shots')||changed('sequence'))fields.shots=true;
      if(changed('stories')){fields.stories||=[];for(let index=0;index<Math.max(old.stories?.length||0,post.stories?.length||0);index++)if(JSON.stringify(old.stories?.[index])!==JSON.stringify(post.stories?.[index]))fields.stories[index]=true;}
      if(['format','theme','derivedTheme','primaryAxis','parentId','topicGroup','takeaway','subjects'].some(changed))fields.meta=true;
      fields.revision=post.revision;
      post.manualFields=fields;
    }
    return result;
  },onDelete);
};

// The post detail and batch-shoot list share shotDone and its stable shot ID.
function v7RenderPostShotChecks(id){
  const post=demo.posts.find(value=>value.id===id&&!value.deleted);
  const details=dx('#dayDetail .v7-post-shoot details');
  if(!post||!details)return;
  for(const paragraph of details.querySelectorAll(':scope > p'))paragraph.remove();
  const cuts=specificShootDirections(post);
  const cards=cuts.map((shot,index)=>`<div class="v7-post-shot-card">
    <label class="v7-post-shot-toggle"><input type="checkbox" data-v7-post-shot="${html(id)}|${index}" ${shotDoneFor(shot)?'checked':''}><span>${shotDoneFor(shot)?'撮影済み':'未完了'}</span></label>
    <p>${html(shot.media)} · ${html(shot.what)} · ${shot.count}カット</p>
    <p class="tiny muted">${html((shot.skuIds||[]).map(skuLabel).join(' ＋ ')||'商品紹介以外')}</p>
  </div>`).join('')||'<p class="tiny muted">撮影カットは未登録です。</p>';
  details.querySelector('[data-work-shots]')?.insertAdjacentHTML('beforebegin',cards);
}
const v7ShotDetailShowPost=showPost;
showPost=function(id){v7ShotDetailShowPost(id);v7RenderPostShotChecks(id);};
document.addEventListener('change',event=>{
  const input=event.target.closest?.('[data-v7-post-shot]');
  if(!input)return;
  event.stopImmediatePropagation();
  const [id,indexText]=input.dataset.v7PostShot.split('|');
  const post=demo.posts.find(value=>value.id===id&&!value.deleted);
  const shot=post&&specificShootDirections(post)[Number(indexText)];
  if(!shot||!shot.id&&!shot.signature){toast('撮影カットを確認してください');return;}
  const wasOpen=!!dx('#dayDetail .v7-post-shoot details')?.open;
  markShotGroup({members:[{id:shot.id,signature:shot.signature}]},input.checked);
  persist();renderShoot();renderHome();showPost(id);
  const details=dx('#dayDetail .v7-post-shoot details');if(details)details.open=wasOpen;
},true);
document.head.insertAdjacentHTML('beforeend','<style>#dayDetail .v7-post-shot-card{min-width:0;overflow-wrap:anywhere;border-top:1px solid #d6dccb;padding:8px 0}#dayDetail .v7-post-shot-card p{margin:4px 0 6px}#dayDetail .v7-post-shot-toggle{display:flex;align-items:center;gap:10px;min-height:44px;font-weight:700}#dayDetail .v7-post-shot-toggle input{flex:none;width:22px;height:22px;margin:0}</style>');
document.head.insertAdjacentHTML('beforeend','<style>#dayDetail .v7-story-suggestions{margin:12px 0}#dayDetail .v7-story-suggestions>.story-card{min-width:0;overflow-wrap:anywhere;margin:10px 0;padding:12px;border:1px solid #d6dccb;border-radius:12px}#dayDetail .v7-story-suggestions .actions button,#dayDetail [data-v7-story-create]{min-height:44px}</style>');
