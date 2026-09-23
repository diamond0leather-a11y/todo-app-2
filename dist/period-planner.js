// Period-wide planning for newly generated posts only. Existing posts are never regenerated here.
(function(){
'use strict';
const PERIOD_PLAN_VERSION=1,STORY_PLAN_VERSION=5;
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/story|ストーリー|feed|reel|リール|写真|動画/g,'').replace(/[\s　・｜「」『』、。？！?!（）()：:／/\-ー]/g,'');
const concepts=value=>normalize(value)
 .replace(/この紙|この道具|これは何|何に使うと思いますか|何に使う/g,'用途質問')
 .replace(/型紙|パターン/g,'型紙').replace(/答えは次|次で答え|次の.*答え/g,'次回答')
 .replace(/財布を選ぶとき|財布選び/g,'財布選択').replace(/先に知りたい|知りたいのは/g,'知りたい項目')
 .replace(/アンケート結果|投票結果|結果をご紹介/g,'回答結果');
function grams(value){const text=concepts(value);return new Set(Array.from({length:Math.max(1,text.length-1)},(_,i)=>text.slice(i,i+2)));}
function similarity(a,b){const aa=grams(a),bb=grams(b),same=[...aa].filter(x=>bb.has(x)).length;return same/Math.max(1,Math.min(aa.size,bb.size));}
function structureOf(story){const all=[story.theme,story.text,story.asset,story.action].join(' ');if(/答えは次|次のStory|クイズ/.test(all))return 'quiz-next';if(story.reactionId||/結果|返答|お寄せいただいた声/.test(all))return 'response';if(story.participatory||story.options?.length)return 'question';if(/比較|見比べ|違い/.test(all))return 'comparison';if(/工程|型紙|裁断|縫製|仕上げ|道具/.test(all))return 'craft';if(/使う|持つ|収納|場面/.test(all))return 'use';if(/素材|革|触感|艶|シボ|厚み/.test(all))return 'material';return 'guide';}
function subjectOf(story){if(story.participatory)return normalize(story.theme).slice(0,20);if(story.angle)return ((story.skuIds||[]).slice().sort().join('|')||'workshop')+'@'+story.angle;const text=[story.theme,story.text,story.asset].join(' ');for(const [key,re] of [['pattern',/型紙|パターン/],['wallet-choice',/財布.*選|収納.*サイズ|先に知りたい/],['care',/ケア|手入れ|クリーム/],['aging',/経年|変化|艶/],['craft',/裁断|縫製|コバ|道具|工程/],['material',/素材|革|シボ|厚み|触感/],['voice',/お客様の声|質問|回答|投票結果/]])if(re.test(text))return key;return (story.skuIds||[]).slice().sort().join('|')||normalize(story.theme).slice(0,20);}
function storyConflict(candidate,used,slot){const text=[candidate.theme,candidate.text,candidate.asset,candidate.action].join(' '),question=normalize(candidate.question||''),options=normalize((candidate.options||[]).join('|')),structure=structureOf(candidate),subject=subjectOf(candidate);return used.some(entry=>{const other=entry.story,otherText=[other.theme,other.text,other.asset,other.action].join(' ');if(candidate.reactionId&&candidate.reactionId===other.reactionId)return true;if(candidate.parentId&&candidate.parentId===other.parentId&&slot===entry.slot)return true;if(slot===4&&candidate.guideType&&candidate.guideType===other.guideType)return true;if(options&&options===normalize((other.options||[]).join('|')))return true;if(question.length>12&&similarity(question,other.question||'')>.9)return true;const sameConcept=subject&&subject===subjectOf(other)&&structure===structureOf(other);if(slot===2&&['pattern','wallet-choice','voice'].includes(subject)&&subject===subjectOf(other))return true;return false;});}
function recentStoryEntries(before){return demo.posts.filter(p=>!p.deleted&&p.date<before).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).flatMap(p=>(p.actualSnapshot?.stories||p.stories||[]).map((story,index)=>({story,slot:index+1,date:p.date})))}
function mainConflict(post,used){const title=[post.theme,post.derivedTheme,post.takeaway].join(' '),product=post.skuIds.slice().sort().join('|'),lastTwo=used.slice(-2);if(lastTwo.length===2&&lastTwo.every(other=>other.topicGroup===post.topicGroup))return true;return used.some(other=>post.parentId===other.parentId||similarity(title,[other.theme,other.derivedTheme,other.takeaway].join(' '))>.68||(product&&product===other.skuIds.slice().sort().join('|')));}
function monthlyMainConflict(post,used){const recent=used.filter(other=>Math.abs(dayDiff(post.date,other.date))<=10),title=[post.theme,post.derivedTheme,post.takeaway].join(' '),product=post.skuIds.slice().sort().join('|');return recent.some(other=>(post.parentId===other.parentId&&similarity(title,[other.theme,other.derivedTheme,other.takeaway].join(' '))>.52)||similarity(title,[other.theme,other.derivedTheme,other.takeaway].join(' '))>.76||(product&&product===other.skuIds.slice().sort().join('|')&&post.role===other.role));}
function presentation(index,used){const recent=used.slice(-2).map(p=>p.format);if(recent.length===2&&recent[0]===recent[1])return recent[0]==='Reel'?'Feed':'Reel';return index%2===0?'Reel':'Feed';}
function monthlyMetadata(post){const selected=post.skuIds.map(sku).filter(Boolean),topic=OFFICIAL_TOPICS.find(t=>t.id===post.parentId);return {themeId:post.parentId,themeCategory:topic?.group||post.topicGroup,topic:topic?.title||post.theme,angle:post.role||post.derivedTheme,question:post.hook||'',conclusion:post.takeaway||'',presentationType:post.format,product:selected.map(s=>s.id),material:[...new Set(selected.map(s=>s.material).filter(Boolean))],craftProcess:(post.sequence||[]).map(x=>x.visual).filter(x=>/工程|型紙|裁断|縫|仕上|道具/.test(x)),CTA:post.cta||'',plannedDate:post.date,usedDates:demo.posts.filter(p=>!p.deleted&&p.parentId===post.parentId).map(p=>p.date)};}
function buildMonthCandidates(month,targetDates){const occupied=demo.posts.filter(p=>!p.deleted&&p.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date)),chosen=[...occupied],rows=[];for(const date of datesInMonth(month)){const existing=occupied.find(p=>p.date===date);if(existing){rows.push({...monthlyMetadata(existing),draft:null,existing:true});continue;}if(blocked(date))continue;let draft=null;for(let attempt=0;attempt<80;attempt++){const candidate=createConcept(date,Number(date.slice(8))-1,null,attempt);candidate.format=presentation(rows.length,chosen);candidate.formatReason='月間候補と10日全体の重複を確認し、Feed / Reelから選定。';if(!monthlyMainConflict(candidate,chosen)){draft=candidate;break;}}if(!draft)throw Error(short(date)+'の月間テーマ候補の重複を解消できませんでした。');chosen.push(draft);rows.push({...monthlyMetadata(draft),draft,existing:false});}
 demo.monthlyCandidatePlans||={};demo.monthlyCandidatePlans[month]={version:PERIOD_PLAN_VERSION,checkedAt:nowISO(),items:rows.map(({draft,...row})=>row)};return rows.filter(row=>targetDates.includes(row.plannedDate));}

const dialogueTemplates=[
 ['困っている場面を聞く','質問スタンプ','革小物を使う中で、今いちばん困っている場面はありますか？ 具体的な場面を一つ教えてください。',[],'困っている場面を質問箱へ'],
 ['触り心地の好み','二択','革を選ぶとき、さらりとした触感と、しっとりした触感ではどちらが好みですか？',['さらり','しっとり'],'二択で答える'],
 ['持ち歩く量','質問スタンプ','毎日必ず持ち歩くものを三つ挙げるとしたら、何を選びますか？',[],'質問箱で答える'],
 ['色の選び方','二択','革小物の色は、服になじむ色と差し色になる色のどちらを選ぶことが多いですか？',['なじむ色','差し色'],'二択で答える'],
 ['知りたい工程','アンケート','次に詳しく見たい工程はどちらですか？',['革を切る工程','縫って仕上げる工程'],'アンケートで選ぶ'],
 ['ケアの迷い','質問スタンプ','お手入れを始める前に、判断に迷うことはありますか？ 革の種類と一緒に教えてください。',[],'質問箱で答える'],
 ['収納の優先順位','二択','小物を選ぶとき、収納量と取り出しやすさのどちらを先に確かめますか？',['収納量','取り出しやすさ'],'二択で答える'],
 ['経年変化の好み','二択','革の変化は、大きく育つ表情と穏やかに続く表情のどちらに惹かれますか？',['大きな変化','穏やかな変化'],'二択で答える'],
 ['使い方のFAQ','質問スタンプ','革小物の使い方で、説明があると助かることを一つ教えてください。',[],'質問箱で答える'],
 ['次に知りたい革知識','アンケート','次に知りたいのは、革の種類と長く使うコツのどちらですか？',['革の種類','長く使うコツ'],'アンケートで選ぶ']
 ,['ポケットの使い方','質問スタンプ','普段ポケットへ入れる革小物と、入れずに持つ革小物を教えてください。',[],'使い方を質問箱へ']
 ,['雨の日の困りごと','二択','雨の日の革小物で気になるのは、水滴と乾かし方のどちらですか？',['水滴','乾かし方'],'二択で答える']
 ,['修理の相談','質問スタンプ','長く使うために、修理について先に知っておきたいことはありますか？',[],'質問箱で相談する']
 ,['贈り物の選び方','二択','贈り物なら、相手の普段の色と新しい差し色のどちらを選びますか？',['普段の色','差し色'],'二択で答える']
 ,['利き手と使いやすさ','アンケート','革小物を開くとき、利き手による使いやすさを意識しますか？',['意識する','あまりしない'],'アンケートで答える']
 ,['現金とカード','二択','財布に入れる量は、現金中心とカード中心のどちらに近いですか？',['現金中心','カード中心'],'二択で答える']
 ,['使い始めの疑問','質問スタンプ','新品の革小物を使い始める前に知りたいことを教えてください。',[],'疑問を質問箱へ']
 ,['保管場所','二択','革小物を使わない日は、棚と箱のどちらで保管することが多いですか？',['棚','箱'],'二択で答える']
 ,['気になる細部','アンケート','商品を見るとき先に目が向くのは、縫い目と革の表情のどちらですか？',['縫い目','革の表情'],'アンケートで選ぶ']
 ,['次回内容の希望','質問スタンプ','次の投稿で詳しく取り上げてほしい革や使い方を一つ教えてください。',[],'希望を質問箱へ']
];
function story2Candidate(post,attempt,usedReactions){const words=[post.theme,post.takeaway,post.subjects].join(' '),relevant=demo.reactions.filter(r=>r.date<post.date&&!r.repliedAt&&!usedReactions.has(r.id)&&similarity(words,[r.theme,r.question,r.originalText,(r.answers||[]).join(' ')].join(' '))>.22).sort((a,b)=>b.date.localeCompare(a.date))[0];if(relevant&&attempt<2){usedReactions.add(relevant.id);const follow=/結果|アンケート/.test(relevant.kind)?'この結果を踏まえると、次に詳しく知りたいのはどこですか？':'いただいた声を受けて、同じことで迷った経験や知りたい続きはありますか？';return {theme:'いただいた声から次の問いへ',text:'「'+(relevant.originalText||relevant.question)+'」という声を受け取りました。\n'+follow,question:follow,kind:'続編質問',reactionId:relevant.id,parentId:post.parentId,topicGroup:post.topicGroup,asset:'画像：声の要点と今日のテーマが分かる文字カード',skuIds:[],action:'自分の経験や知りたいことを送る',participatory:true,materialMode:'過去素材使用可'};}const subject=post.topicGroup==='CARE'?'お手入れで迷う場面':post.topicGroup==='CRAFT'?'作る途中で詳しく見たい工程':post.topicGroup==='AGING'?'使い続けて楽しみな変化':post.primaryAxis==='BUSINESS'?'選ぶ前に確かめたい点':post.primaryAxis==='INSTAGRAM_GROWTH'?'誰かに話したくなった発見':'使うときに役立ちそうな点';const kinds=['質問スタンプ','二択','商品開発への意見募集','FAQ募集'],kind=kinds[(post.parentId.charCodeAt(post.parentId.length-1)+attempt)%kinds.length],question=kind==='二択'?`「${post.theme.split('｜')[0]}」を見るとき、実物の違いと使い方の違いでは、どちらを先に知りたいですか？`:`今日の「${post.theme.split('｜')[0]}」について、${subject}を一つ教えてください。`;return {theme:subject,text:question,question,kind,options:kind==='二択'?['実物の違い','使い方の違い']:[],parentId:post.parentId,topicGroup:post.topicGroup,asset:'画像：今日のテーマを象徴する実物と質問文',skuIds:[],action:kind==='二択'?'知りたい方を選ぶ':'具体的な経験や疑問を送る',participatory:true,materialMode:'過去素材使用可'};}
const story3Angles=[
 ['素材','表面だけでなく、光を斜めから当てたときに見える革の表情を伝えます。','革の表面を正面と斜めの光で撮る'],
 ['触感','指で軽く曲げたときの柔らかさと戻り方を、手元の動きで伝えます。','革を指で曲げ、厚みと柔らかさが分かる寄り'],
 ['構造','外から見えにくい重なりや収納部を開き、形を支える構造を伝えます。','開いた状態で内側の重なりと収納部を撮る'],
 ['工程','完成品の該当箇所と、その直前の工程を並べて仕立ての意味を伝えます。','工程中の手元と完成箇所を同じ角度で撮る'],
 ['道具','道具の名前だけでなく、どの部分を整えるために使うのかを一枚で伝えます。','道具と、その道具を使う商品箇所を一緒に撮る'],
 ['ディテール','縫い目・コバ・金具のうち一箇所へ寄り、毎日触れる部分の仕立てを伝えます。','毎日触れるディテールを指で示して接写'],
 ['経年','新品と使用例を同じ光で並べ、色だけでなく艶や曲がる部分の変化を伝えます。','新品と使用例を同じ光・背景・角度で撮る'],
 ['使い方','持つ・開く・取り出すの一動作を見せ、生活のどこで使いやすいかを伝えます。','持ってから取り出すまでの一動作を撮る'],
 ['選定理由','この素材や色をこの形に合わせた理由を、全体と寄りの二場面で伝えます。','商品全体と選定理由が分かる素材の寄り'],
 ['比較','同じ条件で二つを並べ、大きさ・素材・使い方のうち一つだけを比較します。','比較対象を同じ光と背景で並べる']
];
function story3Candidate(post,attempt,exposure){const pool=demo.skus.filter(s=>!s.deleted&&!item(s.itemId)?.deleted&&!post.skuIds.includes(s.id)).sort((a,b)=>(productScore(b,post.date)-(exposure.get(b.id)||0)*12)-(productScore(a,post.date)-(exposure.get(a.id)||0)*12)),useProduct=post.primaryAxis==='BUSINESS'||attempt%3===0,product=useProduct?pool[attempt%Math.max(1,pool.length)]:null,angle=story3Angles[(Number(post.parentId.split('-')[1])+attempt)%story3Angles.length];if(product)exposure.set(product.id,(exposure.get(product.id)||0)+1);const label=product?skuLabel(product.id):post.topicGroup==='CRAFT'?'今日使う道具と工程':post.topicGroup==='AGING'?'使い込んだ革と新品':post.topicGroup==='CARE'?'手入れ前の革の状態':'裁断前の革素材';return {theme:angle[0]+'で確かめる '+post.theme.split('｜')[0],text:label+'を使い、「'+post.theme.split('｜')[0]+'」で伝えたい'+angle[0]+'の違いを一つ見せます。\n'+angle[1],angle:angle[0],parentId:post.parentId,topicGroup:post.topicGroup,asset:'写真：'+angle[2],skuIds:product?[product.id]:[],action:post.primaryAxis==='BUSINESS'?'商品選びで気になる点を確かめる':'写真から違いを一つ見つける',participatory:false,materialMode:'過去素材使用可',combinationReason:'当日の顧客価値と正式テーマに合う発見を選ぶ'};}
const story4Guides=[
 ['制作背景','完成までの背景を知ると、今日の投稿で紹介する形の理由が見えてきます。'],
 ['困りごと','使うときの迷いを一つ取り上げ、今日の投稿で確認できる解決の手がかりへつなぎます。'],
 ['使用シーン','実際に持つ場面を思い浮かべながら、今日の投稿で使い方とサイズ感をご覧ください。'],
 ['素材比較','同じ光で見た素材の違いから、今日の投稿の比較ポイントへつなぎます。'],
 ['経年変化','使い始めとその先の表情を想像しながら、今日の投稿で変化の見どころをご覧ください。'],
 ['お客様の声','いただいた疑問を入口に、今日の投稿で確認した内容をご紹介します。'],
 ['ディテール','小さな仕立ての違いへ寄ってから、今日の投稿で全体とのつながりをご覧ください。'],
 ['選ぶ理由','見た目だけで決めにくい点を整理し、今日の投稿で選ぶ理由を確かめられます。']
 ,['問いから読む','最初に一つ問いを置き、今日の投稿で答えと理由を順に確かめられます。']
 ,['手元の動き','手で触れたときの動きから、今日の投稿で使いやすさの理由へつなぎます。']
 ,['形の違い','形が変わると使い方がどう変わるかを示し、今日の投稿で詳しく比べます。']
 ,['革の選定','この形に合わせた革の特徴から、今日の投稿で素材を選んだ理由をご紹介します。']
 ,['仕立ての順序','完成までの順序を一場面だけ見せ、今日の投稿で工程の役割を掘り下げます。']
 ,['使った後','使った後に気づく変化を入口に、今日の投稿で長く使うポイントをご紹介します。']
 ,['サイズの手がかり','身近なものと大きさを比べ、今日の投稿で収納や持ち方を確認できます。']
 ,['よくある質問','よくいただく質問を一つ選び、今日の投稿で実物を見ながら答えます。']
 ,['色と光','光で変わる色の見え方から、今日の投稿で素材の表情をご覧ください。']
 ,['生活との接点','一日のどの場面で役立つかを示し、今日の投稿で具体的な使い方へつなぎます。']
 ,['お手入れ判断','今すぐケアが必要か見分ける点から、今日の投稿で判断の理由をお伝えします。']
 ,['作り手の視点','作る途中で確認する箇所を入口に、今日の投稿で完成後の違いをご紹介します。']
];
function story4Candidate(post,attempt){const reason=post.topicGroup==='CARE'?'迷ったときの判断基準':post.topicGroup==='AGING'?'使った先の変化':post.topicGroup==='CRAFT'?'完成後には見えない作り手の判断':post.primaryAxis==='BUSINESS'?'選ぶ前に確認したい実物の違い':post.primaryAxis==='INSTAGRAM_GROWTH'?'思わず誰かに話したくなる発見':'毎日の使い方に役立つ一点',verb=post.format==='Reel'?'動きで確かめる':'写真と本文で見比べる',guideType=post.parentId+'／'+reason+'／'+verb;return {theme:reason+'を今日の投稿で',text:'Storyで見た「'+post.theme.split('｜')[0]+'」の'+reason+'を、今日の'+(post.format==='Reel'?'動画':'投稿')+'では'+verb+'ことができます。',guideType,parentId:post.parentId,topicGroup:post.topicGroup,asset:post.format==='Reel'?'動画：判断の理由が最も伝わる一場面':'写真：比較する箇所が一目で分かる一枚',skuIds:[...post.skuIds],action:reason+'を具体的に確認する',participatory:false,materialMode:'過去素材使用可',shotId:post.shots?.[0]?.id};}
function story1Candidate(post,attempt){const topic=OFFICIAL_TOPICS.find(t=>t.id===post.parentId),title=topic.title,view=topic.group==='CARE'?'よくある誤解と安全な判断':topic.group==='AGING'?'使い始めと時間が経った後の違い':topic.group==='CRAFT'?'完成品の裏にある一工程':topic.group==='FASHION'?'暮らしや装いとの関係':topic.group==='CUSTOMER'?'実際に使う人の場面':topic.group==='INDUSTRY'?'資料で確認できる背景':topic.group==='ANIMAL'?'生き物と素材のつながり':'革そのものの構造',text=`「${title}」を、今日は${view}から見ます。${post.takeaway}`;return {theme:title,parentId:topic.id,topicGroup:topic.group,text,asset:'写真：'+view+'が一目で伝わる実物・工程・使用場面',action:view+'を一つ覚える',skuIds:[],participatory:false,researchRequired:!!topic.researchRequired,researchBrief:topic.researchRequired?'最新資料・出典・確認日を調べてから掲載する。':null,materialMode:'過去素材使用可'};}
function generateStoriesForBatch(posts){const used=recentStoryEntries(posts[0]?.date||TODAY),usedReactions=new Set(used.map(x=>x.story.reactionId).filter(Boolean)),exposure=new Map();for(const post of posts){const list=[];for(let slot=1;slot<=4;slot++){let selected=null;for(let attempt=0;attempt<60;attempt++){const candidate=slot===1?story1Candidate(post,attempt):slot===2?story2Candidate(post,attempt,usedReactions):slot===3?story3Candidate(post,attempt,exposure):story4Candidate(post,attempt);if(!storyConflict(candidate,used,slot)){selected=candidate;break;}}if(!selected&&slot===2)selected=story2Candidate(post,99,usedReactions);if(!selected)throw Error(short(post.date)+' Story '+slot+'の重複を解消できませんでした。');selected={...selected,slot,purpose:STORY_ROLES[slot-1],storySpecVersion:STORY_PLAN_VERSION};list.push(selected);used.push({story:selected,slot,date:post.date});}post.stories=list;post.storyVersion=STORY_PLAN_VERSION;}
 // Second pass: compare generated wording after all four slots exist.
 const history=recentStoryEntries(posts[0]?.date||TODAY),checked=[...history];for(const post of posts)for(let index=0;index<post.stories.length;index++){let story=post.stories[index],attempt=20;while(storyConflict(story,checked,index+1)&&attempt<100){story=index===0?story1Candidate(post,attempt):index===1?story2Candidate(post,attempt,usedReactions):index===2?story3Candidate(post,attempt,exposure):story4Candidate(post,attempt);story={...story,slot:index+1,purpose:STORY_ROLES[index],storySpecVersion:STORY_PLAN_VERSION};attempt++;}if(index!==1&&storyConflict(story,checked,index+1))throw Error(short(post.date)+' Story '+(index+1)+'の生成後重複を解消できませんでした。');post.stories[index]=story;checked.push({story,slot:index+1,date:post.date});}}
function duplicateReport(posts){const entries=[],issues=[];for(const p of posts)for(let i=0;i<(p.stories||[]).length;i++){const story=p.stories[i];if(storyConflict(story,entries,i+1))issues.push({date:p.date,slot:i+1,theme:story.theme});entries.push({story,slot:i+1,date:p.date});}return issues;}
const legacyGeneratePlanDates=generatePlanDates;generatePlanDates=function(dates){const targets=[...new Set(dates)].sort().filter(date=>!blocked(date)&&!demo.posts.some(p=>p.date===date&&!p.deleted));if(!targets.length)return [];const months=[...new Set(targets.map(date=>date.slice(0,7)))],monthly=months.flatMap(month=>buildMonthCandidates(month,targets)),recent=demo.posts.filter(p=>!p.deleted&&!p.paused&&p.date<targets[0]).sort((a,b)=>a.date.localeCompare(b.date)).slice(-20),created=[];for(const date of targets){let post=monthly.find(row=>row.plannedDate===date)?.draft;const used=[...recent,...created];if(!post||mainConflict(post,used)){for(let attempt=0;attempt<80;attempt++){const candidate=createConcept(date,dates.indexOf(date),null,attempt);candidate.format=presentation(created.length,used);candidate.formatReason='月間候補から10日全体へ仮配置し、Feed / Reelの連続と企画重複を確認。';if(!mainConflict(candidate,used)){post=candidate;break;}}}if(!post)throw Error(short(date)+'の投稿企画重複を解消できませんでした。');post.format=presentation(created.length,used);post.cta=post.primaryAxis==='BUSINESS'?(post.skuIds.length?'気になる仕様を商品ページで確かめる。':'販売前に知りたいことがあれば質問してください。'):post.primaryAxis==='INSTAGRAM_GROWTH'?(post.topicGroup==='FASHION'?'自分の暮らしではどう感じるか、よければ教えてください。':'役立ちそうな方が思い浮かんだら共有してください。'):(post.topicGroup==='CARE'?'まずお手元の革の状態を確認してみてください。':'今日から試せそうな点を一つ覚えてください。');post.periodPlanVersion=PERIOD_PLAN_VERSION;post.periodDedupCheckedAt=nowISO();created.push(post);}generateStoriesForBatch(created);const issues=duplicateReport(created);if(issues.some(issue=>issue.slot!==2))throw Error('期間内のStory重複を解消できませんでした。');demo.posts.push(...created);demo.periodDedupChecks||=[];demo.periodDedupChecks.push({from:targets[0],to:targets.at(-1),checkedAt:nowISO(),postIds:created.map(p=>p.id),version:PERIOD_PLAN_VERSION});return created;};
const periodPlanRender=renderPlan;renderPlan=function(){periodPlanRender();const period=salesCycleBlock(),check=period&&demo.periodDedupChecks?.find(c=>c.from>=period.from&&c.to<=period.to);if(check&&!dx('#planPeriodCard .period-dedup-ok'))dx('#planPeriodCard h3')?.insertAdjacentHTML('afterend','<p class="tiny muted period-dedup-ok">期間内の重複チェック済み</p>');};
window.periodPlannerQA={duplicateReport,normalize,similarity,structureOf,subjectOf};
refreshWork();
})();
