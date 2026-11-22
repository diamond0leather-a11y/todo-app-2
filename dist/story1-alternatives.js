// 一次資料で確認した直近の題材。候補追加時は「今扱う理由」と題材そのものの画像を確認する。
const STORY1_ALTERNATIVE_BANK = [
  {id:'chloe-paddington-2025',genre:'ファッション',publishedAt:'2025-09-24',title:'南京錠を残し、金具は軽くしたバッグ',summary:'2005年の形を2025年の日常に合わせて更新',body:'ChloéのPaddingtonが20年後に再登場。南京錠は残し、金具を軽くして持ちやすさを変えた。',imageInstruction:'出典ページで確認できるChloé「Paddington」のバッグが写った写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'Chloé',sourceUrl:'https://www.chloe.com/en-ca/news/chloe-unveils-the-paddington-bag-campaign.html'},
  {id:'prada-re-nylon-2026',genre:'ファッション',publishedAt:'2026-11-23',dateLabel:'2026年の資料・公開日未確認',title:'使い終えた後まで設計するナイロン',summary:'Pradaの5点のカプセルは回収・分解も想定',body:'PradaのRe-Nylon新作5点は再生素材で作られ、使用後は店頭回収と分解を経て再生する設計だ。',imageInstruction:'出典ページで確認できる「Prada Re-Nylon for SEA BEYOND」の商品そのものが写った写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'Prada',sourceUrl:'https://www.prada.com/es/en/pradasphere/special-projects/2026/prada-re-nylon.html'},
  {id:'capella-kyoto-2026',genre:'旅・ホテル',publishedAt:'2026-09-18',title:'町家の発想を取り込んだ京都のホテル',summary:'カペラ京都は宮川町の町家を現代的に再解釈',body:'カペラ京都は宮川町の町家から着想した建築。2026年のミシュランキーでは新たに2キーを獲得した。',imageInstruction:'出典ページで確認できる「カペラ京都」の建物または中庭の写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'ミシュランガイド',sourceUrl:'https://guide.michelin.com/jp/ja/article/travel/all-the-key-hotels-japan-michelin-guide'},
  {id:'vitra-water-garden-2026',genre:'デザイン・家具・建築',publishedAt:'2026-07-01',dateLabel:'2026年6月の資料・公開日未確認',title:'美術館前の池には工場の雨水を使う',summary:'VitraのWater Gardenは風景と暑さへの対応を両立',body:'Vitra美術館前のWater Gardenは、隣の工場の屋根に降った雨を池に利用。景色と暑さ対策を一緒に設計した。',imageInstruction:'出典ページで確認できる「Water Garden」の池と周囲の植栽が写った写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'Vitra',sourceUrl:'https://www.vitra.com/ja-jp/campus/architecture/water-garden'},
  {id:'rice-prices-2026',genre:'食・生活文化',publishedAt:'2026-11-20',dateLabel:'2026年11月20日更新',title:'米の値段を約千店のデータで毎週見る',summary:'農林水産省がスーパー約1000店の週次価格を公表',body:'米の値段を、農林水産省は全国約1000店の販売データで毎週公表。買い物の変化を数字で追える。',imageInstruction:'出典ページから開ける米の週次販売数量・価格のグラフ1点のみを画像候補とする。実使用時は権利条件を確認。',sourceName:'農林水産省',sourceUrl:'https://www.maff.go.jp/j/nousan/kokumotu/kome_kakaku.html'}
];

function story1Alternatives(post){
  const current=post.stories?.find((story,index)=>(story.slot??index+1)===1);
  const previous=[...(demo.storyDays||[]),...demo.posts.flatMap(row=>row.stories||[])].filter(story=>story?.date&&story.date<post.date&&story.date>=dayAdd(post.date,-30));
  return STORY1_ALTERNATIVE_BANK.filter(candidate=>candidate.publishedAt<=post.date&&candidate.sourceName&&/^https:\/\/\S+$/.test(candidate.sourceUrl)&&candidate.title!==current?.theme&&candidate.id!==current?.alternativeId&&!previous.some(story=>story.alternativeId===candidate.id||story.theme===candidate.title)).slice(0,5);
}
function openStory1AlternativePicker(id,index){
  const entry=v7StoryEntry(id,index),story=entry.story,date=story?.date||entry.post?.date;
  if(!story||v7StoryActionLocked(entry)){toast('投稿・反応の記録があるStoryは変更できません');return;}
  const target=entry.post||{id:story.id,date,stories:[story]},candidates=story1Alternatives(target),snapshot=JSON.stringify(story);
  if(dx('#workDialog').open)dx('#workDialog').close();
  openForm(`${short(date)}｜Story1を別案に変更`,`<p class="tiny">毎日ひとつ、誰かに話したくなる発見。出典ページの内容と写真の使用条件は、投稿前に確認してください。アプリは最新情報を調査していません。</p>${candidates.length?candidates.map(candidate=>`<label class="card story1-alternative"><input type="radio" name="story1Candidate" value="${html(candidate.id)}"><strong>${html(candidate.title)}</strong><p class="story-text">${html(candidate.body)}</p><p class="tiny">何が面白い？ ${html(candidate.summary)}</p><p class="tiny">出典：<a href="${html(candidate.sourceUrl)}" target="_blank" rel="noopener noreferrer">${html(candidate.sourceName)}</a> · ${html(candidate.dateLabel||candidate.publishedAt)} · 要再確認</p><p class="tiny">写真：${html(candidate.imageInstruction)}</p></label>`).join(''):'<p class="notice">確認できる別案はありません。出典を確認したStory1専用JSONを取り込むか、「編集」で手動入力してください。</p>'}`,form=>{
    const selected=form.get('story1Candidate');if(!selected)throw Error('変更する候補を選んでください。');
    const latest=v7StoryEntry(id,index);if(!latest.story||JSON.stringify(latest.story)!==snapshot)throw Error('Story1が変更されました。開き直してください。');
    if(!applyStory1Alternative(id,selected,date))throw Error('Story1を変更できませんでした。投稿・反応の状態を確認してください。');
  });
}
function renderStory1Alternatives(){
  const heading=dx('#view-plan .section-head');if(!heading)return;
  let section=dx('#story1Alternatives');
  if(!section){section=document.createElement('section');section.id='story1Alternatives';section.className='card';}
  heading.after(section);
  const post=demo.posts.find(p=>p.stories?.some((story,index)=>(story.slot??index+1)===1&&(story.date??p.date)===TODAY));
  const standalone=!post&&demo.storyDays?.find(story=>story.date===TODAY&&story.slot===1);
  if(!post&&!standalone){section.hidden=true;return;}
  const target=post||{id:standalone.id,date:TODAY,stories:[standalone]};
  section.hidden=false;
  section.innerHTML=`<details><summary>今日のStory1 サブ候補を見る</summary><p class="tiny muted">今日のStory1だけを差し替えます。出典と写真の使用権を投稿前に確認してください。</p>`+story1Alternatives(target).map(candidate=>`<article class="story1-alternative"><span class="badge">${html(candidate.genre)}</span><h4>${html(candidate.title)}</h4><p class="tiny muted">${html(candidate.summary)}</p><p class="story-text">${html(candidate.body)}</p><p><strong>写真：</strong>${html(candidate.imageInstruction)}</p><p class="tiny">出典：<a href="${html(candidate.sourceUrl)}" target="_blank" rel="noopener noreferrer">${html(candidate.sourceName)}</a></p><button class="secondary full" data-story1-alternative="${candidate.id}" data-story1-post="${target.id}">この案に変更</button></article>`).join('')+'</details>';
}
function applyStory1Alternative(postId,candidateId,date=TODAY){
  const post=demo.posts.find(p=>p.id===postId&&p.stories?.some((story,index)=>(story.slot??index+1)===1&&(story.date??p.date)===date));
  const standalone=!post&&demo.storyDays?.find(story=>story.id===postId&&story.date===date&&story.slot===1);
  const holder=post||standalone&&{id:standalone.id,date:standalone.date,stories:[standalone],storyReplacementHistory:standalone.replacementHistory||[]};
  const candidate=story1Alternatives(holder||{date,stories:[]}).find(c=>c.id===candidateId);
  if(!holder||!candidate)return false;
  const original=post?.stories?.find((story,index)=>(story.slot??index+1)===1&&(story.date??post.date)===date)||standalone;
  if(v7StoryActionLocked({post,story:original,index:0}))return false;
  const replacement={slot:1,purpose:STORY_ROLES[0],theme:candidate.title,title:candidate.title,summary:candidate.summary,angle:candidate.summary,text:candidate.body,body:candidate.body,asset:candidate.imageInstruction,imageInstruction:candidate.imageInstruction,sourceName:candidate.sourceName,sourceUrl:candidate.sourceUrl,researchSources:[{name:candidate.sourceName,url:candidate.sourceUrl,...(candidate.dateLabel?{}:{publishedAt:candidate.publishedAt})}],verificationStatus:'unverified',genre:candidate.genre,alternativeId:candidate.id,action:'出典を読んで、気になった点を見つける',skuIds:[],participatory:false,materialMode:'新規撮影必要',manual:true,aiPendingReview:false,storySpecVersion:4};
  const prepared=prepareStoryReplacement(holder,1,replacement,demo.reactions);
  if(!prepared.ok){toast(prepared.reason);return false;}
  if(post){const index=post.stories.findIndex((story,i)=>(story.slot??i+1)===1&&(story.date??post.date)===date);post.stories=[...post.stories];post.stories[index]=prepared.story;post.storyReplacementHistory=prepared.history;post.manual=true;post.revision=(post.revision||0)+1;storyDrafts.delete(post.id);}
  else{demo.storyDays[demo.storyDays.findIndex(story=>story.id===standalone.id)]={...prepared.story,replacementHistory:prepared.history};}
  persist();refreshWork();toast('Story1だけ変更しました');
  return true;
}
const story1OriginalDraft=currentStoryDraft;
currentStoryDraft=function(post){const draft=story1OriginalDraft(post);if(post.stories?.[0]?.alternativeId&&draft.stories[0]!==post.stories[0])draft.stories[0]=structuredClone(post.stories[0]);else if(draft.stories?.[0]?.text?.includes('は調査待ちです')&&!post.stories?.[0]?.manual)draft.stories[0]=makeStories(post)[0];return draft;};
const story1OriginalPlan=renderPlan;
renderPlan=function(){story1OriginalPlan();renderStory1Alternatives();};
document.addEventListener('click',event=>{const button=event.target.closest('[data-story1-alternative]');if(button)applyStory1Alternative(button.dataset.story1Post,button.dataset.story1Alternative);});
if(dx('#view-plan')?.classList.contains('active'))renderPlan();
