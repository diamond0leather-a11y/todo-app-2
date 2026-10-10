// 一次資料で確認した直近の題材。候補追加時は「今扱う理由」と題材そのものの画像を確認する。
const STORY1_ALTERNATIVE_BANK = [
  {id:'chloe-paddington-2025',genre:'ファッション',publishedAt:'2025-09-24',title:'20年前のバッグが、今の形で戻ってきた',summary:'ChloéのPaddingtonを日常向けに更新',body:'Chloéの「Paddington」は2005年に登場し、2025年に再登場しました。象徴的な南京錠は残しながら、金具を軽くし、持ちやすさを調整。懐かしい形をそのまま復刻するのではなく、今の日常で使えるよう更新した点が面白い。',imageInstruction:'出典ページで確認できるChloé「Paddington」のバッグが写った写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'Chloé',sourceUrl:'https://www.chloe.com/en-ca/news/chloe-unveils-the-paddington-bag-campaign.html'},
  {id:'prada-re-nylon-2026',genre:'ファッション',publishedAt:'2026-01-01',title:'「再生素材」の次は、使い終えた後まで設計する',summary:'Prada Re-Nylonの5点のカプセル',body:'Pradaが2026年に紹介したRe-Nylonの新しい5点のカプセルコレクションは、再生素材の使用だけでなく、使用後のリサイクルも視野に入れています。具体的には、回収した製品を分解し、ナイロン6を化学的に再生する工程を想定しています。素材の出自だけでなく、使い終えた後の循環まで設計に入っているのが新しい点です。',imageInstruction:'出典ページで確認できる「Prada Re-Nylon for SEA BEYOND」の商品そのものが写った写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'Prada',sourceUrl:'https://www.prada.com/es/en/pradasphere/special-projects/2026/prada-re-nylon.html'},
  {id:'capella-kyoto-2026',genre:'旅・ホテル',publishedAt:'2026-09-18',title:'ホテル選びの評価に「その土地らしさ」も入る',summary:'2026年のミシュランキーとカペラ京都',body:'2026年のミシュランキーホテル選定では、3月開業のカペラ京都が2キーに選ばれました。宮川町の町家から着想を得た建築です。ホテルを設備の豪華さだけでなく、「その土地をどう体験できるか」で見る視点が見えてきます。',imageInstruction:'出典ページで確認できる「カペラ京都」の建物または中庭の写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'ミシュランガイド',sourceUrl:'https://guide.michelin.com/jp/ja/article/travel/all-the-key-hotels-japan-michelin-guide'},
  {id:'vitra-water-garden-2026',genre:'デザイン・家具・建築',publishedAt:'2026-06-01',title:'美術館の前に、建物ではなく「涼しさ」を設計する',summary:'Vitraの新しいWater Garden',body:'Vitraは2026年6月、デザインミュージアムの前に、水辺と植物を組み合わせた「Water Garden」を開きました。隣接する建物の屋根に降った雨水を利用しています。見た目を整えるだけでなく、生き物の居場所や暑さへの対応まで風景の役割にしているのが新しいところです。',imageInstruction:'出典ページで確認できる「Water Garden」の池と周囲の植栽が写った写真1枚のみを使用候補とする。実使用時は権利条件を確認。',sourceName:'Vitra',sourceUrl:'https://www.vitra.com/ja-jp/campus/architecture/water-garden'},
  {id:'japan-food-spending-2026',genre:'その他・経済・社会',publishedAt:'2026-10-09',title:'食費は増えたのに、実質では減っている',summary:'家計調査で見る買い物の変化',body:'10月9日公表の総務省「家計調査」では、2026年8月の二人以上の世帯の食料支出は、前年同月比で名目1.7％増、物価の影響を除くと実質1.4％減でした。「支払う金額が増えた」ことと「食に使える量・価値が増えた」ことは同じではない。日々の買い物を数字から見直せる話です。',imageInstruction:'出典PDFの2ページ目で確認できる、食料支出の名目・実質増減率を示す表の該当部分1点のみを画像候補とする。実使用時は権利条件を確認。',sourceName:'総務省統計局「家計調査報告 2026年8月分」',sourceUrl:'https://www.stat.go.jp/data/kakei/sokuhou/tsuki/pdf/fies_mr.pdf'},
  {id:'rice-prices-2026',genre:'食・生活文化',publishedAt:'2026-10-09',title:'お米の値段を「週ごと」に見る理由',summary:'農林水産省のスーパー約1000店のデータ',body:'農林水産省は、全国約1000店のスーパーの販売データを使い、米の販売数量と価格を週ごとに公表しています。年に一度の印象だけでは分からない食卓の変化を、実際の店頭データで追える仕組みです。値札を見た感覚と数字を比べてみると、買い物の見方が少し変わります。',imageInstruction:'出典ページから開ける米の週次販売数量・価格のグラフ1点のみを画像候補とする。実使用時は権利条件を確認。',sourceName:'農林水産省',sourceUrl:'https://www.maff.go.jp/j/nousan/kokumotu/kome_kakaku.html'}
];

function story1Alternatives(post){
  const day=Math.floor(Date.parse(post.date+'T00:00:00Z')/86400000);
  const available=STORY1_ALTERNATIVE_BANK.filter(candidate=>candidate.publishedAt<=post.date);
  const fashions=available.filter(candidate=>candidate.genre==='ファッション');
  const others=available.filter(candidate=>candidate.genre!=='ファッション');
  // 4日20枠中7枠をファッションにし、それ以外は日をまたいでジャンルを巡らせる。
  const fashionCount=day%4===0?1:2;
  const chosen=[...Array.from({length:fashionCount},(_,i)=>fashions[(day+i)%fashions.length]),...Array.from({length:5-fashionCount},(_,i)=>others[(day+i)%others.length])];
  // 10/11は編集者が確認した5件を固定。食・生活文化案は別日に巡らせる。
  if(post.date==='2026-10-11')chosen.splice(0,chosen.length,...STORY1_ALTERNATIVE_BANK.slice(0,5));
  const current=post.stories?.[0];
  if(current){for(let i=0;i<chosen.length;i++)if(chosen[i].title===current.theme){const spare=available.find(candidate=>!chosen.includes(candidate)&&candidate.title!==current.theme&&!chosen.some(item=>item.genre===candidate.genre));if(spare)chosen[i]=spare;}}
  return chosen;
}
function renderStory1Alternatives(){
  const extras=dx('#dailyExtras');if(!extras)return;
  let section=dx('#story1Alternatives');
  if(!section){section=document.createElement('section');section.id='story1Alternatives';section.className='card';extras.after(section);}
  const post=demo.posts.find(p=>p.date===TODAY&&!p.paused&&!p.deleted);
  if(!post||!post.stories?.length){section.hidden=true;return;}
  section.hidden=false;
  section.innerHTML=`<h3>Story1 サブ候補</h3><p class="tiny muted">今日のStory1だけを差し替えます。出典と写真の使用権を投稿前に確認してください。</p>${post.actualAt?'<p class="notice">投稿済みのため差し替えできません。</p>':''}`+story1Alternatives(post).map(candidate=>`<article class="story1-alternative"><span class="badge">${html(candidate.genre)}</span><h4>${html(candidate.title)}</h4><p class="tiny muted">${html(candidate.summary)}</p><p class="story-text">${html(candidate.body)}</p><p><strong>写真：</strong>${html(candidate.imageInstruction)}</p><p class="tiny">出典：<a href="${html(candidate.sourceUrl)}" target="_blank" rel="noopener noreferrer">${html(candidate.sourceName)}</a></p><button class="secondary full" data-story1-alternative="${candidate.id}" data-story1-post="${post.id}" ${post.actualAt?'disabled':''}>この案に変更</button></article>`).join('');
}
function applyStory1Alternative(postId,candidateId){
  const post=demo.posts.find(p=>p.id===postId&&p.date===TODAY&&!p.deleted&&!p.paused);
  const candidate=story1Alternatives(post||{date:TODAY,stories:[]}).find(c=>c.id===candidateId);
  if(!post||post.actualAt||!post.stories?.length||!candidate)return false;
  const replacement={slot:1,purpose:STORY_ROLES[0],theme:candidate.title,title:candidate.title,summary:candidate.summary,angle:candidate.summary,text:candidate.body,body:candidate.body,asset:candidate.imageInstruction,imageInstruction:candidate.imageInstruction,sourceName:candidate.sourceName,sourceUrl:candidate.sourceUrl,genre:candidate.genre,alternativeId:candidate.id,action:'出典を読んで、気になった点を見つける',skuIds:[],participatory:false,materialMode:'新規撮影必要',manual:true,storySpecVersion:4};
  post.stories=[...post.stories];post.stories[0]=replacement;
  post.revision=(post.revision||0)+1;
  persist();storyDrafts.delete(post.id);refreshWork();toast('今日のStory1だけ変更しました');
  return true;
}
const story1OriginalDraft=currentStoryDraft;
currentStoryDraft=function(post){const draft=story1OriginalDraft(post);if(post.stories?.[0]?.alternativeId&&draft.stories[0]!==post.stories[0])draft.stories[0]=structuredClone(post.stories[0]);return draft;};
const story1OriginalHome=renderHome;
renderHome=function(){story1OriginalHome();renderStory1Alternatives();};
document.addEventListener('click',event=>{const button=event.target.closest('[data-story1-alternative]');if(button)applyStory1Alternative(button.dataset.story1Post,button.dataset.story1Alternative);});
if(dx('#view-home')?.classList.contains('active'))refreshWork();
