// Story1-only review files use the existing JSON dialog, but never the full-plan save path.
(function(){
  const STORY1_SCHEMA='cian-story1-verified-review-v1';
  let story1Review=null,story1Saving=false;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const storyOn=(state,date)=>V7StoryState.entriesOnDate(state,date).filter(entry=>entry.slot===1);
  const postsOn=(state,date)=>(state.posts||[]).filter(post=>!post.deleted&&(post.date===date||post.standaloneStoryDate===date));
  function story1Problem(state,date){
    const matches=storyOn(state,date),posts=postsOn(state,date);
    if(matches.length>1)return 'Story1が重複しています';
    if(matches[0]?.post)return '旧形式のStory1は個別に確認してください';
    if(posts.some(post=>post.actualAt||post.actualSnapshot||post.noPostConfirmedAt||post.posted||post.status==='posted'))return '投稿済み・実績ありのため変更できません';
    const current=matches[0]?.story;
    if(current&&(current.actualAt||current.postedAt||current.publishedAt||current.performedAt||current.completedAt||current.posted||current.performed||current.status==='posted'||current.status==='done'))return '実施済みのStory1は変更できません';
    if(current&&v7StoryHasReaction(state,current,current.id,1))return '反応が記録されたStory1は変更できません';
    return '';
  }
  function validateStory1Review(data,state){
    if(data?.schema!==STORY1_SCHEMA)throw Error('Story1専用JSONのschemaはcian-story1-verified-review-v1にしてください。');
    if(data.scope!=='story1-only')throw Error('Story1専用JSONのscopeはstory1-onlyにしてください。');
    const from=data.period?.from,to=data.period?.to;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||dayAdd(from,9)!==to)throw Error('periodは連続する10日間のfromとtoを指定してください。');
    if(!Array.isArray(data.stories)||data.stories.length!==10)throw Error('storiesには対象期間のStory1を10件指定してください。');
    const seen=new Set();
    for(const story of data.stories){
      const date=story?.date;
      if(typeof date!=='string'||date<from||date>to||dayAdd(date,0)!==date)throw Error(`${date||'日付未設定'}：Story1の日付が対象期間外です。`);
      if(seen.has(date))throw Error(`${date}：Story1が重複しています。`);seen.add(date);
      if(story.slot!==1)throw Error(`${date}：slotは1にしてください。`);
      for(const field of ['category','title','text','action','asset','materialMode','verificationStatus'])if(typeof story[field]!=='string'||!story[field].trim())throw Error(`${date}：${field}が未設定です。`);
      if(!Array.isArray(story.skuIds)||story.skuIds.some(id=>typeof id!=='string'||!state.skus?.some(sku=>sku.id===id&&!sku.deleted)))throw Error(`${date}：skuIdsに商品管理にないSKUがあります。`);
      if(!Array.isArray(story.researchSources)||!story.researchSources.length||story.researchSources.some(source=>!source||typeof source.name!=='string'||!source.name.trim()||typeof source.url!=='string'||!/^https?:\/\/[^\s]+$/i.test(source.url)))throw Error(`${date}：出典名またはURLを確認してください。`);
    }
    for(let date=from;date<=to;date=dayAdd(date,1))if(!seen.has(date))throw Error(`${date}：Story1がありません。`);
    return data.stories.slice().sort((a,b)=>a.date.localeCompare(b.date));
  }
  function showStory1Review(data){
    const stories=validateStory1Review(data,demo);
    story1Review={data,stories,snapshot:structuredClone(demo),selected:new Set()};
    const rows=stories.map(story=>{
      const problem=story1Problem(demo,story.date),current=storyOn(demo,story.date)[0]?.story;
      const sources=story.researchSources.map(source=>`${source.name} / ${source.url}`).join('\n');
      return `<article class="card editorial-day-preview"><label class="pick-name"><input type="checkbox" data-story1-date="${html(story.date)}" ${problem?'disabled':''}>${html(short(story.date))} のStory1を更新${problem?'（'+html(problem)+'）':''}</label><details><summary>${html(story.title)}｜本文と出典を見る</summary><p class="tiny muted">現在：${html(current?.text||'未登録')}</p><p class="story-text">${html(story.text)}</p><p class="tiny" style="overflow-wrap:anywhere">出典：${html(sources)}</p><p class="tiny">検証状態：${html(story.verificationStatus)}</p><p class="tiny">素材：${html(story.asset)}／${html(story.materialMode)}</p></details></article>`;
    }).join('');
    openForm('Story1だけ確認・更新',`<p class="tiny muted">${html(data.period.from)}〜${html(data.period.to)}の10件です。更新したい日だけ選んでください。未選択の日とFeed／Reel・Story2〜4は変更しません。</p>${rows}<p class="tiny muted">確定済み・手動編集済みのStory1も、選択して確認するまで変更しません。</p>`,()=>{saveStory1Review();return false;});
    dx('#workForm .save-foot button').textContent='選んだStory1を確認して保存';
  }
  function verifyCurrent(review,dates){
    for(const date of dates){
      const previous=review.snapshot,current=demo;
      if(!same(storyOn(previous,date).map(entry=>entry.story),storyOn(current,date).map(entry=>entry.story))||!same(postsOn(previous,date),postsOn(current,date))||!same((previous.reactions||[]).filter(reaction=>reaction.sourceStory?.storyId===storyOn(previous,date)[0]?.story?.id),(current.reactions||[]).filter(reaction=>reaction.sourceStory?.storyId===storyOn(current,date)[0]?.story?.id)))throw Error(`${date}の保存内容がプレビュー後に変わりました。開き直してください。`);
      const problem=story1Problem(current,date);if(problem)throw Error(`${date}：${problem}。保存を中止しました。`);
    }
  }
  async function saveStory1Review(){
    if(story1Saving||!story1Review)return;
    const form=dx('#workForm'),alert=dx('#workError'),button=form.querySelector('.save-foot button'),dates=[...form.querySelectorAll('[data-story1-date]:checked')].map(input=>input.dataset.story1Date);
    if(!dates.length){alert.textContent='更新する日を選んでください。';return;}
    if(!confirm(`${dates.length}日分のStory1だけを更新します。本文と出典を確認しましたか？`))return;
    const review=story1Review;story1Saving=true;button.disabled=true;button.textContent='共有保存を確認中…';alert.textContent='';
    try{
      validateStory1Review(review.data,demo);verifyCurrent(review,dates);
      if(!window.todo2SyncBridge?.saveStory1Selection)throw Error('共有保存の準備ができていません。再読み込みして確認してください。');
      const changes=dates.map(date=>({date,story:review.stories.find(story=>story.date===date)}));
      await window.todo2SyncBridge.saveStory1Selection(changes);
      story1Review=null;dx('#workDialog').close();refreshWork();toast(`${dates.length}日分のStory1を共有保存しました`);
    }catch(error){alert.textContent=error?.message||'共有保存を確認できませんでした。再読み込みして結果を確認してください。';}
    finally{story1Saving=false;button.disabled=false;button.textContent='選んだStory1を確認して保存';}
  }
  window.V7Story1Review={accepts:data=>data?.schema===STORY1_SCHEMA||data?.scope==='story1-only',show:showStory1Review,validate:validateStory1Review,problem:story1Problem};
})();
