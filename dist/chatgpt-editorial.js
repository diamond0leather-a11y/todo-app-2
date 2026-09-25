(function(){
'use strict';
const SCHEMA='cian-editorial-v1',validAxes=['CUSTOMER_VALUE','INSTAGRAM_GROWTH','BUSINESS'];let preview=null;
function postSummary(p){const a=p.actualSnapshot||p;return {date:p.date,postedAt:p.actualAt||null,themeId:a.parentId,category:a.topicGroup,purpose:a.primaryAxis,format:a.format,products:a.skuIds||[],body:a.caption||a.body||'',stories:a.stories||[],cta:a.cta||''};}
function postHistories(from,to){const posts=demo.posts.filter(p=>!p.deleted),actual=posts.filter(p=>p.actualAt&&String(p.actualAt).slice(0,10)<from).sort((a,b)=>String(b.actualAt).localeCompare(String(a.actualAt))).slice(0,20).map(postSummary),planned=posts.filter(p=>!p.actualAt&&p.date>=dayAdd(from,-20)&&p.date<=dayAdd(to,20)).sort((a,b)=>a.date.localeCompare(b.date)).map(postSummary);return {actualHistory:actual,plannedPosts:planned};}
function exposureSummary(history){const summarize=posts=>{const result={postCount:posts.length,miniWallet:0,wallet:0,bag:0,black:0,bySku:{},byCategory:{},lastExposureDate:{}};for(const p of posts){const ids=new Set([...(p.products||[]),...(p.stories||[]).flatMap(s=>s.skuIds||[])]);let mini=false,wallet=false,bag=false,black=false;for(const id of ids){const s=sku(id),i=s&&item(s.itemId),category=demo.categories.find(c=>c.id===i?.categoryId)?.name||'未分類',label=[i?.name,s?.name,s?.color,s?.material,category].filter(Boolean).join(' ');if(!s)continue;result.bySku[id]=(result.bySku[id]||0)+1;result.byCategory[category]=(result.byCategory[category]||0)+1;if(!result.lastExposureDate[id])result.lastExposureDate[id]=p.postedAt||p.date;mini ||= /mini wallet/i.test(label);wallet ||= /wallet|財布/i.test(label);bag ||= /bag|バッグ/i.test(label);black ||= /black|noir|黒/i.test(label);}result.miniWallet+=Number(mini);result.wallet+=Number(wallet);result.bag+=Number(bag);result.black+=Number(black);}return result;};return {last10:summarize(history.slice(0,10)),last20:summarize(history.slice(0,20))};}
function productContext(){return demo.skus.filter(s=>!s.deleted).map(s=>({id:s.id,item:item(s.itemId)?.name||'',category:demo.categories.find(c=>c.id===item(s.itemId)?.categoryId)?.name||'',name:skuLabel(s.id),color:s.color||'',material:s.material||'',status:s.status,priority:!!s.priority,adCandidate:!!s.adCandidate}));}
function monthlySaleStrategy(from,to){return Object.entries(demo.months).filter(([month,m])=>(month>=from.slice(0,7)&&month<=to.slice(0,7))||(m.date&&m.date>=dayAdd(from,-31)&&m.date<=dayAdd(to,31))).map(([month,m])=>({month,saleDate:m.date,lineup:(m.lineup||[]).filter(l=>sku(l.skuId)&&!sku(l.skuId).deleted).map(l=>{const product=sku(l.skuId),theItem=item(product.itemId);return {skuId:l.skuId,name:skuLabel(l.skuId),item:theItem?.name||'',category:demo.categories.find(c=>c.id===theItem?.categoryId)?.name||'',priority:!!(l.priority||product.priority),adCandidate:!!(l.adCandidate||product.adCandidate),saleKind:l.saleKind||product.kind||'未設定',status:product.status||'未設定'};}).sort((a,b)=>a.category.localeCompare(b.category,'ja')||a.item.localeCompare(b.item,'ja')||a.name.localeCompare(b.name,'ja'))}));}
function feedbackContext(){const source=nextPlanFeedbackContext(),entries=[],seen=new Set();for(const c of source.comments){const key=['comment',c.recordId,c.text].join('|');if(seen.has(key))continue;seen.add(key);entries.push({type:'comment',date:c.observedAt||'',source:c.recordId,content:c.text,linkedPost:c.postId,stage:c.stage,captureBand:c.captureBand});}for(const v of source.savedCustomerVoices){const key=v.id||[v.date,v.originalText,v.question].join('|');if(seen.has(key))continue;seen.add(key);entries.push({type:v.voiceType||v.kind||'voice',date:v.date,source:v.source||v.sourceStory||'',content:v.originalText||v.question||'',question:v.question,answers:v.answers,options:v.options,dm:v.dm,linkedProduct:v.skuIds,linkedTheme:v.parentId,status:v.route,uses:v.uses});}return {instruction:source.instruction,entries};}
function context(scope){const period=salesCycleBlock(),from=scope==='month'?TODAY.slice(0,7)+'-01':period?.from||demo.planStart,to=scope==='month'?dayAdd(dayAdd(from,32).slice(0,7)+'-01',-1):period?.to||dayAdd(from,9),histories=postHistories(from,to),records=Object.fromEntries(Object.entries(demo.records||{}).map(([key,r])=>[key,{...r,commentContents:undefined}]));return {schema:SCHEMA,scope,period:{from,to,days:Array.from({length:dayDiff(to,from)+1},(_,i)=>({date:dayAdd(from,i),dayNumber:Number(cycleDay(dayAdd(from,i)).replace(/\D/g,'')),blocked:blocked(dayAdd(from,i))}))},officialTopics:OFFICIAL_TOPICS.map(t=>({id:t.id,number:t.number,category:t.group,theme:t.title,researchRequired:!!t.researchRequired})),actualHistory:{count:histories.actualHistory.length,posts:histories.actualHistory},plannedPosts:{count:histories.plannedPosts.length,posts:histories.plannedPosts},productExposure:exposureSummary(histories.actualHistory),products:productContext(),monthly:{months:demo.months,saleStrategy:monthlySaleStrategy(from,to),events:demo.events,ads:demo.ads||[]},customerFeedback:feedbackContext(),reviews:{records,analyses:demo.analyses||[],pending7d:allTasks().filter(t=>t.stage==='7d'&&recordState(t)!=='done').map(t=>t.key)},balance:{purposes:validAxes,existing:rangePosts().reduce((a,p)=>(a[p.primaryAxis]=(a[p.primaryAxis]||0)+1,a),{})}};}
function prompt(scope){const data=context(scope);return `あなたはcian en paclamのInstagram編集者です。以下の事実だけを根拠に${scope==='month'?'1か月の上位編集計画':'10日分のFeed / Reel / Story1〜4'}を設計してください。\n\n実投稿履歴：${data.actualHistory.count}件（実投稿日時があるものだけ、日時の新しい順）。予定投稿：${data.plannedPosts.count}件（実績ではありません）。Storyも実施済みと予定を混ぜず、重複回避には実投稿・実施済みを優先してください。\n\n1日ずつ作らず、最初に期間全体を仮作成し、完成後に全日を読み返してください。人が毎日見て「また同じ」と感じる問い・結論・見せ方・CTA・Story構成は差し替えてください。商品を毎日出す必要はありません。同商品・同色・mini wallet・財布・黒の偏りを確認してください。100テーマを番号順に使わないでください。顧客の声は判断材料であり強制採用しません。販売と関係ない毎日見る理由も入れてください。CTAなしも認めます。投稿不可日はplansへ含めず、投稿可能日はすべてplansに含めてください。Carouselは禁止し、Feed / Reelだけを使ってください。\n\nStory1：革を知る・役立つ知識・楽しさ。Story2：参加・対話。Story3：商品・革・ものづくりの発見であり、単なる商品紹介欄ではありません。Story4：今日のメイン投稿への自然な導線で、投稿タイトルの言い換えにしないでください。正式テーマ66〜80（INDUSTRY）は要リサーチ。出典を確認できない事実を断定しないでください。BUSINESS目的の日も販売だけに寄せず、必ず具体的なcustomerValueを持たせてください。\n\n返答は説明文を付けずJSONだけにしてください。形式：${scope==='month'?'{"schema":"'+SCHEMA+'","scope":"month","plans":[{"date":"YYYY-MM-DD","themeId":"official-01","primaryPurpose":"CUSTOMER_VALUE","customerValue":"...","format":"Feed","products":[],"mainTopic":"...","angle":"..."}]}':'{"schema":"'+SCHEMA+'","scope":"ten-day","plans":[{"date":"YYYY-MM-DD","dayNumber":'+data.period.days.find(d=>!d.blocked).dayNumber+',"format":"Feed","primaryPurpose":"CUSTOMER_VALUE","customerValue":"...","themeId":"official-01","themeCategory":"LEATHER","mainTopic":"...","angle":"...","products":[],"mainPostBody":"...","story1":{"text":"...","action":"..."},"story2":{"text":"...","action":"...","kind":"質問箱"},"story3":{"text":"...","action":"..."},"story4":{"text":"...","action":"..."},"CTA":""}]}'}\n\n編集コンテキスト：\n${JSON.stringify(data,null,2)}`;}
function normalizeJsonQuotes(text){let inside=false,quote='',escaped=false,result='';for(let i=0;i<text.length;i++){const ch=text[i],next=text.slice(i+1);if(!inside){if(ch==='"'||'“”＂‘’'.includes(ch)){inside=true;quote=ch;result+='"';}else result+=ch;continue;}if(escaped){result+=ch;escaped=false;continue;}if(ch==='\\'){result+=ch;escaped=true;continue;}const closing=quote==='"'?ch==='"':quote==='‘'?ch==='’'||ch==='‘':quote==='“'?ch==='”'||ch==='“':'“”＂'.includes(ch);if(closing&&/^\s*(?:[:,}\]]|$)/.test(next)){inside=false;result+='"';}else result+=ch;}return result;}
function jsonObjects(text){const objects=[];for(let start=0;start<text.length;start++){if(text[start]!=='{')continue;let depth=0,inside=false,quote='',escaped=false;for(let i=start;i<text.length;i++){const ch=text[i],next=text.slice(i+1);if(inside){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}const closing=quote==='"'?ch==='"':quote==='‘'?ch==='’'||ch==='‘':quote==='“'?ch==='”'||ch==='“':'“”＂'.includes(ch);if(closing&&/^\s*(?:[:,}\]]|$)/.test(next))inside=false;continue;}if(ch==='"'||'“”＂‘’'.includes(ch)){inside=true;quote=ch;continue;}if(ch==='{')depth++;else if(ch==='}'&&--depth===0){objects.push(text.slice(start,i+1));break;}}}return objects;}
function extract(raw){const text=String(raw||'').trim();try{return JSON.parse(text)}catch{}const candidates=[text];for(const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))candidates.push(match[1].trim());const parsed=[];for(const candidate of [...candidates,...candidates.flatMap(jsonObjects)]){try{parsed.push(JSON.parse(candidate));continue;}catch{}if(/[“”＂‘’]/.test(candidate))try{parsed.push(JSON.parse(normalizeJsonQuotes(candidate)))}catch{}}const result=parsed.find(value=>value?.schema===SCHEMA)||parsed[0];if(result)return result;throw Error('ChatGPTの返答からJSON部分を読み取れませんでした。JSON部分のみ貼り付けてください。');}
function extractSingle(raw){return extract(raw);}
function warnings(plans){const result=[],dates=rows=>rows.map(p=>short(p.date)).join('、');for(const axis of validAxes){const count=plans.filter(p=>p.primaryPurpose===axis).length;if(count)result.push({level:'情報',text:`主目的 ${axis}：${count}件（固定比率なし）`});}const noCta=plans.filter(p=>!p.CTA);if(noCta.length)result.push({level:'情報',text:`CTAなし：${noCta.length}件（CTAは任意、対象日：${dates(noCta)}）`});return result;}
function contentText(story){return [story?.text,story?.action,story?.theme,story?.what].filter(Boolean).join(' ');}
function normalizedContent(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/この紙|裁断用の紙|型紙/g,'型紙').replace(/リール/g,'reel').replace(/[\s。、，．!！?？「」『』（）()・：:―ー〜～]/g,'');}
function contentSimilarity(left,right){const a=normalizedContent(left),b=normalizedContent(right);if(!a||!b)return 0;if(a===b)return 1;if(Math.min(a.length,b.length)>=14&&(a.includes(b)||b.includes(a)))return .9;const grams=text=>{const result=new Set();for(let i=0;i<text.length-2;i++)result.add(text.slice(i,i+3));return result;},x=grams(a),y=grams(b);return x.size&&y.size?2*[...x].filter(part=>y.has(part)).length/(x.size+y.size):0;}
const motifs=[['型紙',/型紙|この紙|裁断用の紙/],['革見本',/革見本|サンプル革/],['手入れ',/手入れ|ケア|クリーム/],['裁断',/裁断|切り出/],['縫製',/縫製|縫い目|ステッチ/],['シボ',/シボ|表面の凹凸/],['艶',/艶|つや|光沢/],['収納',/収納|入る量|収まり/],['大きさ',/サイズ|大きさ|寸法/],['経年変化',/経年変化|使い込|色の変化/],['色比較',/色の違い|色比較|色を比べ/],['革比較',/革の違い|革を比べ|革比較/]];
function sharedMotifs(a,b){return motifs.filter(([,pattern])=>pattern.test(a)&&pattern.test(b)).map(([name])=>name);}
function answerable(text){return /[?？]|教えて|選んで|投票|答えて|どれ|どちら|何を|どう/.test(text);}
function storyQuality(plans){const issues=[],add=(date,message)=>issues.push({level:'要修正',text:`${short(date)}：${message}`});
 for(const plan of plans){const stories=[1,2,3,4].map(n=>plan['story'+n]),texts=stories.map(contentText),second=stories[1],kind=String(second?.kind||second?.stickerType||''),question=String(second?.text||'');
  if(contentSimilarity(texts[0],plan.mainPostBody)>.78)add(plan.date,'Story1がメイン本文の要約になっています。別の学びにしてください。');
  if(!answerable(question))add(plan.date,'Story2に回答できる問いがありません。');
  if(/クイズ/.test(kind+question)){if(!/[?？]|何|どれ|当て/.test(question)||!Array.isArray(second.options)||second.options.length<2||!String(second.correctAnswer||'').trim()||!/同じStory|Story2|正解|答え/.test(String(second.answerLocation||second.action||''))||/Story4/.test(String(second.answerLocation||second.action||'')))add(plan.date,'Story2のクイズは質問・選択肢・正解・同枠内の回答場所を揃えてください。');}
  else if(/アンケート/.test(kind)&&(!answerable(question)||!Array.isArray(second.options)||second.options.length<2||second.options.length>4))add(plan.date,'Story2のアンケートは質問と2〜4個の選択肢が必要です。');
  else if(/質問スタンプ/.test(kind)&&!answerable(question))add(plan.date,'Story2の質問スタンプに回答できる問いがありません。');
  if(contentSimilarity(texts[0],texts[2])>.67)add(plan.date,'Story1とStory3が同じ学び・被写体です。');
  if(contentSimilarity(texts[2],texts[3])>.58||(/答え|正解/.test(texts[3])&&(/[?？]|クイズ|当て/.test(texts[2])||sharedMotifs(texts[2],texts[3]).length)))add(plan.date,'Story3とStory4が同じ企画の続き・答え合わせです。Story4はメイン投稿への独立した導線にしてください。');
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)if((a!==0||b!==2)&&(a!==2||b!==3)&&contentSimilarity(texts[a],texts[b])>.72)add(plan.date,`Story${a+1}とStory${b+1}の問い・結論・行動が近すぎます。`);
  if(!/投稿|reel|feed|リール|動画|本文|メイン/i.test(texts[3])||normalizedContent(texts[3]).length<18||/^(今日の)?投稿を見て(ください|ね)?[。!！]*$/.test(String(stories[3]?.text||'').trim()))add(plan.date,'Story4にメイン投稿で確かめられる具体的な理由がありません。');
 }
 for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++){const a=plans[i],b=plans[j],a2=contentText(a.story2),b2=contentText(b.story2);
  if(contentSimilarity(a2,b2)>.64)issues.push({level:'要修正',text:`${short(a.date)}と${short(b.date)}：Story2の質問・企画が重複しています。`});
  for(const slot of [1,3,4]){const left=contentText(a['story'+slot]),right=contentText(b['story'+slot]);if(contentSimilarity(left,right)>.72||(sharedMotifs(left,right).length>=2&&contentSimilarity(left,right)>.42))issues.push({level:'要修正',text:`${short(a.date)}と${short(b.date)}：Story${slot}の学び・被写体が近すぎます。`});}
  if(contentSimilarity([a.mainTopic,a.angle,a.customerValue].join(' '),[b.mainTopic,b.angle,b.customerValue].join(' '))>.68||contentSimilarity(a.mainPostBody,b.mainPostBody)>.78)issues.push({level:'要修正',text:`${short(a.date)}と${short(b.date)}：メイン投稿の企画・顧客価値が近すぎます。`});
 }
 const ctas={};for(const plan of plans){const key=normalizedContent(plan.CTA);if(key)(ctas[key]||=[]).push(plan.date);}for(const dates of Object.values(ctas))if(dates.length>=3)issues.push({level:'要修正',text:`同じCTAが${dates.length}日あります（${dates.map(short).join('、')}）。`});
 return issues;
}
function exposureAudit(plans){const products=productContext(),dates=plans.map(plan=>plan.date).sort(),history=postHistories(dates[0],dates.at(-1)),recent=exposureSummary(history.actualHistory),sale=monthlySaleStrategy(dates[0],dates.at(-1)),counts={sku:{},item:{},category:{},color:{},miniWallet:0,wallet:0,black:0},issues=[],days=plans.length;
 for(const plan of plans){const ids=[...new Set([...(plan.products||[]),...[1,2,3,4].flatMap(n=>plan['story'+n]?.skuIds||[])])],items=new Set(),categories=new Set(),colors=new Set();let mini=false,wallet=false,black=false;
  for(const id of ids){const product=products.find(row=>row.id===id);if(!product)continue;counts.sku[id]=(counts.sku[id]||0)+1;items.add(product.item);categories.add(product.category);if(product.color)colors.add(product.color);const label=[product.item,product.category,product.name,product.color].join(' ');mini||=/mini wallet/i.test(label);wallet||=/wallet|財布/i.test(label);black||=/black|noir|黒/i.test(label);}
  for(const name of items)counts.item[name]=(counts.item[name]||0)+1;for(const name of categories)counts.category[name]=(counts.category[name]||0)+1;for(const name of colors)counts.color[name]=(counts.color[name]||0)+1;counts.miniWallet+=+mini;counts.wallet+=+wallet;counts.black+=+black;
 }
 const limit=Math.ceil(days/2),activeProducts=products.filter(row=>row.status==='selling'||row.status==='restock'||sale.some(month=>month.lineup.some(entry=>entry.skuId===row.id)));
 const check=(map,label,alternatives)=>{if(alternatives<2)return;for(const [key,count] of Object.entries(map))if(count>=limit)issues.push({level:'商品露出要確認',text:`${label}「${label==='SKU'?skuLabel(key):key}」が${count}/${days}日です。各日の企画理由と別カテゴリを含む候補を確認してください。`});};
 check(counts.sku,'SKU',activeProducts.length);check(counts.item,'アイテム',new Set(activeProducts.map(row=>row.item)).size);check(counts.category,'商品カテゴリ',new Set(activeProducts.map(row=>row.category)).size);check(counts.color,'色',new Set(activeProducts.map(row=>row.color).filter(Boolean)).size);
 for(const [id,count] of Object.entries(counts.sku))if(count>=3&&(recent.last10.bySku[id]||0)>=4&&activeProducts.length>1)issues.push({level:'商品露出要確認',text:`${skuLabel(id)}は直近10実投稿で${recent.last10.bySku[id]}回、今回も${count}日です。priority・広告候補でも、露出理由と代替候補を確認してください。`});
 for(const [label,count] of [['mini wallet',counts.miniWallet],['財布',counts.wallet],['黒系',counts.black]])if(count>=limit&&activeProducts.some(row=>!/mini wallet|wallet|財布|black|noir|黒/i.test([row.item,row.category,row.name,row.color].join(' '))))issues.push({level:'商品露出要確認',text:`${label}が${count}/${days}日です。別カテゴリの商品や商品なしの日も検討してください。`});
 const sets=new Map();for(const plan of plans){const ids=[...new Set([...(plan.products||[]),...[1,2,3,4].flatMap(n=>plan['story'+n]?.skuIds||[])])].sort();if(ids.length<2)continue;const key=ids.join('|');if(!sets.has(key))sets.set(key,[]);sets.get(key).push(plan);}for(const repeated of sets.values())if(repeated.length>1)issues.push({level:'商品露出要確認',text:`${repeated.map(plan=>short(plan.date)).join('・')}で同じ${repeated[0].products.length||'複数'}商品セットを再利用しています。各日でこの組み合わせが必要な別の企画理由を確認してください。`});
 const summary=[...Object.entries(counts.sku).sort((a,b)=>b[1]-a[1]).map(([id,count])=>{const row=products.find(product=>product.id===id),lineup=sale.flatMap(month=>month.lineup).find(entry=>entry.skuId===id);return `${skuLabel(id)}：${count}日（直近10投稿${recent.last10.bySku[id]||0}回／20投稿${recent.last20.bySku[id]||0}回、${lineup?.saleKind||'月間販売対象外'}、${row?.status||'状態不明'}${row?.priority?'、優先':''}${row?.adCandidate?'、広告候補':''}）`;}),`mini wallet：${counts.miniWallet}日`,`財布：${counts.wallet}日`,`黒系：${counts.black}日`,...Object.entries(counts.category).map(([name,count])=>`${name}カテゴリ：${count}日`)];
 return {issues,summary,context:{monthlySale:sale,recent10:recent.last10,recent20:recent.last20,priority:products.filter(row=>row.priority).map(row=>row.id),adCandidates:products.filter(row=>row.adCandidate).map(row=>row.id)}};
}
function editorialSections(text){const sentences=String(text||'').split(/(?<=[。！？?])/).map(part=>part.trim()).filter(Boolean);return {question:sentences.find(part=>/[？?]/.test(part))||'',conclusion:sentences.at(-1)||'',body:String(text||'')};}
function themeAudit(plans){const issues=[],ordered=plans.slice().sort((a,b)=>a.date.localeCompare(b.date)),topics=ordered.map(plan=>OFFICIAL_TOPICS.find(topic=>topic.id===plan.themeId)),counts={};
 for(const topic of topics)if(topic)(counts[topic.id]=(counts[topic.id]||0)+1);
 for(const [id,count] of Object.entries(counts))if(count>=3)issues.push({level:'注意',text:`正式テーマ ${id} が${count}日あります。切り口と顧客価値の違いを確認してください。`});
 let sequence=1;for(let i=1;i<topics.length;i++){sequence=topics[i]&&topics[i-1]&&topics[i].number===topics[i-1].number+1?sequence+1:1;if(sequence>=5){issues.push({level:'要修正',text:`${short(ordered[i-sequence+1].date)}〜${short(ordered[i].date)}で正式テーマ番号を連続消費しています。企画に合わせて選び直してください。`});break;}}
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){const first=ordered[i],second=ordered[j],a=editorialSections(first.mainPostBody),b=editorialSections(second.mainPostBody);
  if(a.question&&b.question&&contentSimilarity(a.question,b.question)>.6)issues.push({level:'要修正',text:`${short(first.date)}と${short(second.date)}：本文の問いが近すぎます。`});
  if(a.conclusion&&b.conclusion&&contentSimilarity(a.conclusion,b.conclusion)>.72)issues.push({level:'要修正',text:`${short(first.date)}と${short(second.date)}：本文の結論・構成が近すぎます。`});
  if(first.themeId===second.themeId&&contentSimilarity([first.angle,first.customerValue].join(' '),[second.angle,second.customerValue].join(' '))>.52)issues.push({level:'要修正',text:`${short(first.date)}と${short(second.date)}：同じ正式テーマを近い切り口で繰り返しています。`});
 }
 return issues;
}
function researchSourceText(source){return typeof source==='string'?source:source&&typeof source==='object'?[source.title,source.url,source.publisher].filter(Boolean).join(' / '):'';}
function researchAudit(plans){return plans.flatMap(plan=>{const topic=OFFICIAL_TOPICS.find(entry=>entry.id===plan.themeId);if(!topic||topic.number<66||topic.number>80)return [];return Array.isArray(plan.researchSources)&&plan.researchSources.some(source=>researchSourceText(source).trim().length>=10)?[{level:'注意',text:`${short(plan.date)}：INDUSTRYの出典をプレビューで人が確認してください。`}]:[{level:'要修正',text:`${short(plan.date)}：INDUSTRYは出典未確認です。researchSourcesに確認可能な出典を記載してください。`}];});}
function qualityAudit(plans){const exposure=exposureAudit(plans);return {issues:[...storyQuality(plans),...themeAudit(plans),...researchAudit(plans),...exposure.issues],exposure};}
function importPeriod(data){
 const block=salesCycleBlock();
 if(!block||!Array.isArray(data?.plans)||!data.plans.length)throw Error('対象期間の投稿案がありません。');
 const periods=[{from:block.from,to:block.to,dayFrom:block.dayFrom},{from:block.nextFrom,to:block.nextTo,dayFrom:block.nextDayFrom}];
 const first=data.plans[0]?.date,target=periods.find(period=>first>=period.from&&first<=period.to);
 if(!target)throw Error(`${first||'日付未設定'}は現在期間・次の期間の対象外です。`);
 return target;
}
function importProtection(post,choice){
 if(!post)return {whole:false,meta:false,caption:false,stories:[]};
 if(post.actualAt||post.actualSnapshot||post.deleted||post.posted||post.status==='posted'||post.edited)return {whole:true,meta:true,caption:true,stories:[true,true,true,true]};
 const fields=post.manualFields;
 if((post.manual&&!fields)||(fields&&fields.revision!==post.revision))return choice?{whole:choice.meta&&choice.caption&&choice.stories.every(Boolean),meta:choice.meta,caption:choice.caption,stories:choice.stories}:{whole:true,meta:true,caption:true,stories:[true,true,true,true]};
 return {whole:false,meta:false,caption:!!fields?.caption,stories:[0,1,2,3].map(i=>!!(post.stories?.[i]?.manual||fields?.stories?.[i]))};
}
function validate(data){
 if(!data||data.schema!==SCHEMA||data.scope!=='ten-day'||!Array.isArray(data.plans))throw Error('10日企画JSONのschemaまたは形式が一致しません。');
 const period=importPeriod(data),seen=new Set();
 for(const p of data.plans){
  if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.date||'')||p.date<period.from||p.date>period.to)throw Error(`${p?.date||'日付未設定'}は選択された期間の対象外です。`);
  if(seen.has(p.date))throw Error(`${short(p.date)}の日付が重複しています。`);
  if(blocked(p.date))throw Error(`${short(p.date)}は投稿不可日のためplansに含められません。`);
  const expectedDay=period.dayFrom+dayDiff(p.date,period.from);
  if(p.dayNumber!==expectedDay)throw Error(`${short(p.date)}のDayは${expectedDay}にしてください。`);
  seen.add(p.date);
  const topic=OFFICIAL_TOPICS.find(t=>t.id===p.themeId);
  if(!topic||!validAxes.includes(p.primaryPurpose)||!['Feed','Reel'].includes(p.format))throw Error(`${p.date}のテーマ・主目的・形式を確認してください。`);
  if(p.themeCategory&&p.themeCategory!==topic.group)throw Error(`${p.date}のテーマ分類が正式100テーマと一致しません。`);
  if(typeof p.mainTopic!=='string'||!p.mainTopic.trim()||typeof p.mainPostBody!=='string'||!p.mainPostBody.trim()||typeof p.customerValue!=='string'||!p.customerValue.trim()||![p.story1,p.story2,p.story3,p.story4].every(s=>typeof s?.text==='string'&&s.text.trim()))throw Error(`${p.date}のテーマ・本文・customerValue・Story1〜4を確認してください。`);
  if([...p.mainPostBody].length<300)throw Error(`${short(p.date)}の本文は300文字以上にしてください。`);
  if(!Array.isArray(p.products)||p.products.some(id=>!sku(id)||sku(id).deleted))throw Error(`${p.date}の商品IDが商品管理にありません。`);
  for(const story of [p.story1,p.story2,p.story3,p.story4])if(story.skuIds!==undefined&&(!Array.isArray(story.skuIds)||story.skuIds.some(id=>!sku(id)||sku(id).deleted)))throw Error(`${p.date}のStoryの商品IDが商品管理にありません。`);
 }
 for(let date=period.from;date<=period.to;date=dayAdd(date,1))if(!blocked(date)&&!seen.has(date))throw Error(`${short(date)}の企画がありません。`);
 return [...warnings(data.plans),...qualityAudit(data.plans).issues];
}
function openImport(){openForm('ChatGPTの10日企画を取り込む','<p>ChatGPTのJSON返答を貼り付けてください。確定前に10日全体をプレビューします。</p><label class="wlabel">JSON<textarea name="json" rows="12" required></textarea></label>',f=>{const data=extract(f.get('json')),warn=validate(data),revisions=Object.fromEntries(data.plans.map(plan=>{const post=demo.posts.find(p=>p.date===plan.date&&!p.deleted);return [plan.date,post?{id:post.id,revision:post.revision}:null];})),legacyChoices={};for(const plan of data.plans){const post=demo.posts.find(p=>p.date===plan.date&&!p.deleted);if(post?.manual&&!post.manualFields&&!post.actualAt&&!post.actualSnapshot)legacyChoices[plan.date]={meta:true,caption:true,stories:[true,true,true,true]};}preview={data,warn,period:importPeriod(data),revisions,legacyChoices,researchConfirmed:false};showPreview();return false;});}
function showPreview(){const d=preview.data,group=level=>preview.warn.filter(w=>w.level===level);openForm('10日全体プレビュー',`<p class="tiny muted">投稿可能な${d.plans.length}日分を確認してから確定してください。確定後は編集済み・投稿済みの内容を維持します。</p>`+(['要確認','情報'].map(level=>group(level).length?`<details class="card" ${level==='要確認'?'open':''}><summary>${level} · ${group(level).length}件</summary>${group(level).map(w=>`<p class="tiny">${html(w.text)}</p>`).join('')}</details>`:'').join(''))+d.plans.map(p=>{const topic=OFFICIAL_TOPICS.find(t=>t.id===p.themeId);return `<details class="card editorial-day-preview"><summary>Day${html(Number(cycleDay(p.date).replace(/\D/g,'')))}｜${html(short(p.date))} · ${html(p.format)} · ${html(topic?.group||'')} #${html(topic?.number||'')}</summary><p class="tiny muted">正式テーマ：${html(topic?.title||'未確認')}</p><h3>${html(p.mainTopic)}</h3><p><strong>主目的：</strong>${html(p.primaryPurpose)}</p><p><strong>お客様に届ける価値：</strong>${html(p.customerValue)}</p><p><strong>使用商品：</strong>${html((p.products||[]).map(skuLabel).join(' / ')||'商品なし')}</p><p><strong>メイン本文</strong><br>${html(p.mainPostBody)}</p>${[1,2,3,4].map(n=>`<p><strong>Story ${n}</strong><br>${html(p['story'+n].text)}</p>`).join('')}<p><strong>CTA：</strong>${html(p.CTA||'CTAなし')}</p></details>`;}).join('')+'<p class="tiny muted">以下の「保存する」で確定します。内容と保護対象を確認してください。</p>',()=>applyPreview());}
const renderPeriodPreview=showPreview;
showPreview=function(){
  renderPeriodPreview();
  const {period,data}=preview,form=dx('#workForm');
  form.insertAdjacentHTML('afterbegin',`<p class="tiny muted">対象期間：${html(short(period.from))}〜${html(short(period.to))}・Day${period.dayFrom}〜${period.dayFrom+dayDiff(period.to,period.from)}</p>`);
  const protectedDays=data.plans.map(plan=>{const post=demo.posts.find(p=>p.date===plan.date&&!p.deleted),lock=importProtection(post);if(!post||!lock.whole&&!post.manual&&!lock.stories.some(Boolean))return null;return `${short(plan.date)}：${lock.whole?'既存投稿全体を維持':[lock.caption?'手動本文を維持':'',...lock.stories.flatMap((value,i)=>value?[`Story${i+1}を維持`]:[])].filter(Boolean).join('・')}`;}).filter(Boolean);
  if(protectedDays.length)form.insertAdjacentHTML('afterbegin',`<div class="notice"><strong>保存時に維持する編集内容</strong>${protectedDays.map(line=>`<p class="tiny">${html(line)}</p>`).join('')}</div>`);
  for(const date of Object.keys(preview.legacyChoices)){const post=demo.posts.find(p=>p.date===date&&!p.deleted),controls=[['meta','企画・商品・CTA'],['caption','本文'],...[0,1,2,3].map(i=>['story'+i,`Story${i+1}`])];form.insertAdjacentHTML('afterbegin',`<details class="card" open><summary>${html(short(date))}｜従来の手動編集を確認</summary><p class="tiny">旧データは編集箇所を特定できません。初期状態は全項目を維持します。新案に置き換えてよい項目だけチェックを外してください。投稿済みは変更できません。</p><p class="tiny">現在：${html(post.theme||'')} ／ 新案：${html(data.plans.find(p=>p.date===date).mainTopic)}</p>${controls.map(([key,label])=>`<label class="pick-name"><input type="checkbox" data-legacy-preserve="${html(date)}|${key}" checked>${label}を維持</label>`).join('')}</details>`);}
  form.querySelectorAll('[data-legacy-preserve]').forEach(input=>input.onchange=()=>{const [date,key]=input.dataset.legacyPreserve.split('|'),choice=preview.legacyChoices[date];if(key.startsWith('story'))choice.stories[Number(key.slice(5))]=input.checked;else choice[key]=input.checked;});
  form.querySelectorAll('.editorial-day-preview summary').forEach((summary,i)=>{summary.textContent=summary.textContent.replace(/^Day\d+/,`Day${data.plans[i].dayNumber}`);});
  const audit=qualityAudit(data.plans),issues=preview.warn.filter(note=>note.level==='要修正'),topics={},formats={},purposes={},research=data.plans.filter(plan=>{const topic=OFFICIAL_TOPICS.find(entry=>entry.id===plan.themeId);return topic?.number>=66&&topic.number<=80;});
  for(const plan of data.plans){const topic=OFFICIAL_TOPICS.find(entry=>entry.id===plan.themeId);topics[topic?.group||'未分類']=(topics[topic?.group||'未分類']||0)+1;formats[plan.format]=(formats[plan.format]||0)+1;purposes[plan.primaryPurpose]=(purposes[plan.primaryPurpose]||0)+1;}
  const questionIssues=issues.filter(note=>/Story2/.test(note.text)).length,story34Issues=issues.filter(note=>/Story3とStory4/.test(note.text)).length,quizIssues=issues.filter(note=>/クイズ/.test(note.text)).length,ctaIssues=issues.filter(note=>/CTA/.test(note.text)).length;
  const overview=`<details class="card" open><summary>期間全体の確認｜${data.plans.length}投稿</summary><p class="tiny">主目的：${html(Object.entries(purposes).map(([key,count])=>`${key} ${count}件`).join(' / '))}（固定比率なし）</p><p class="tiny">正式テーマ分類：${html(Object.entries(topics).map(([key,count])=>`${key} ${count}件`).join(' / '))}</p><p class="tiny">形式：${html(Object.entries(formats).map(([key,count])=>`${key} ${count}件`).join(' / '))}</p><p class="tiny">Story2質問 ${questionIssues}件・Story3/4 ${story34Issues}件・クイズ ${quizIssues}件・CTA ${ctaIssues}件の要修正</p></details>`;
  const researchPanel=research.length?`<div class="card"><strong>要リサーチ｜出典確認前</strong>${research.map(plan=>`<p class="tiny">${html(short(plan.date))}：${html((plan.researchSources||[]).map(researchSourceText).join(' / ')||'出典なし')}</p>`).join('')}<label class="pick-name"><input type="checkbox" id="editorialResearchConfirm">出典と事実を自分で確認しました</label></div>`:'';
  const exposureNotes=audit.exposure.issues.filter(note=>note.level==='商品露出要確認');
  const panel=overview+`<details class="card" open><summary>商品露出チェック</summary>${audit.exposure.summary.map(line=>`<p class="tiny">${html(line)}</p>`).join('')}${exposureNotes.map(note=>`<p class="notice">${html(note.text)}</p>`).join('')}${exposureNotes.length?'<label class="pick-name"><input type="checkbox" id="editorialExposureConfirm">繰り返す各日のangle・顧客価値・商品との関連性を確認し、同じ商品の再利用が企画上必要と判断しました</label>':''}<p class="tiny muted">月間販売予定・販売状態・priority・広告候補・直近10/20実投稿の露出を参照。数値だけで一律NGにせず、理由を確認します。</p></details>`+researchPanel+`${issues.length?`<div class="notice"><strong>要修正 ${issues.length}件：このまま保存できません。ChatGPTで10日全体を再作成してください。</strong>${issues.slice(0,24).map(note=>`<p>${html(note.text)}</p>`).join('')}${issues.length>24?`<p>ほか${issues.length-24}件。繰り返しの多い企画は期間全体で見直してください。</p>`:''}</div>`:''}`;
  form.querySelector('.editorial-day-preview')?.insertAdjacentHTML('beforebegin',panel);
  const save=form.querySelector('.save-foot button'),ready=()=>!issues.length&&(!research.length||preview.researchConfirmed)&&(!exposureNotes.length||preview.exposureConfirmed);save.disabled=!ready();if(issues.length)save.textContent='要修正・保存できません';else if(research.length||exposureNotes.length)save.textContent='確認後に保存';
  if(research.length)form.querySelector('#editorialResearchConfirm').onchange=event=>{preview.researchConfirmed=event.target.checked;save.disabled=!ready();};
  if(exposureNotes.length)form.querySelector('#editorialExposureConfirm').onchange=event=>{preview.exposureConfirmed=event.target.checked;save.disabled=!ready();};
};
function applyPreview(){
  if(!preview)throw Error('プレビューを開き直してください。');
  const period=importPeriod(preview.data);
  if(period.from!==preview.period.from||period.to!==preview.period.to)throw Error('対象期間が変わりました。プレビューを開き直してください。');
  if(validate(preview.data).some(note=>note.level==='要修正'))throw Error('10日全体の内容を修正してから再度取り込んでください。');
  if(qualityAudit(preview.data.plans).exposure.issues.some(note=>note.level==='商品露出要確認')&&!preview.exposureConfirmed)throw Error('商品露出の企画理由を確認してください。');
  if(preview.data.plans.some(plan=>{const topic=OFFICIAL_TOPICS.find(entry=>entry.id===plan.themeId);return topic?.number>=66&&topic.number<=80;})&&!preview.researchConfirmed)throw Error('INDUSTRYの出典確認が必要です。');
  for(const plan of preview.data.plans){const old=demo.posts.find(p=>p.date===plan.date&&!p.deleted),seen=preview.revisions[plan.date];if((old?.id||null)!==(seen?.id||null)||(old?.revision||null)!==(seen?.revision||null))throw Error(`${short(plan.date)}の投稿がプレビュー中に変更されました。開き直して確認してください。`);}
  displayedPeriod=period.from===salesCycleBlock().nextFrom?'next':'current';
  for(const x of preview.data.plans){
    const old=demo.posts.find(p=>p.date===x.date&&!p.deleted),lock=importProtection(old,preview.legacyChoices[x.date]);
    if(lock.whole)continue;
    const topic=OFFICIAL_TOPICS.find(t=>t.id===x.themeId),base=old||{id:newId(),date:x.date,plannedTime:'18:00',actualAt:null,revision:0,manual:false,shots:[],reviewNeeded:[]};
    const stories=[x.story1,x.story2,x.story3,x.story4].map((story,i)=>lock.stories[i]?base.stories[i]:({...story,slot:i+1,purpose:STORY_ROLES[i],skuIds:story.skuIds||[],storySpecVersion:4}));
    if(!lock.meta)Object.assign(base,{format:x.format,primaryAxis:x.primaryPurpose,parentId:x.themeId,topicGroup:topic.group,theme:x.mainTopic,derivedTheme:x.mainTopic,takeaway:x.customerValue,cta:x.CTA||'',skuIds:[...(x.products||[])],researchRequired:!!topic.researchRequired,researchSources:x.researchSources||[],researchVerified:topic.number>=66&&topic.number<=80?preview.researchConfirmed:false});
    Object.assign(base,{caption:lock.caption?base.caption:x.mainPostBody,stories,revision:(base.revision||0)+1,editorialSource:'chatgpt-import'});
    if(!old)demo.posts.push(base);else if(!base.manual&&!lock.stories.some(Boolean))base.shots=[];
    if(base.manualFields)base.manualFields.revision=base.revision;
  }
  persist();refreshWork();preview=null;
}
function copyText(scope){const selected=scope==='ten-day'&&displayedPeriod==='next'?nextEditorialPrompt():prompt(scope);navigator.clipboard.writeText(selected).then(()=>toast((scope==='month'?'月間':'表示中の期間の')+'編集コンテキストをコピーしました'));}
const oldPlan=renderPlan;renderPlan=function(){oldPlan();for(const button of document.querySelectorAll('#planList [data-work-post]')){const post=demo.posts.find(p=>p.id===button.dataset.workPost),badge=button.closest('article')?.querySelector('.row.between .badge:last-child');if(post&&badge)badge.textContent=post.format==='Reel'?'Reel':'Feed';}const box=dx('#planPeriodCard .actions');if(box){box.innerHTML='<button class="secondary" id="copyTenEditorial">ChatGPT用10日企画をコピー</button><button class="ghost" id="importTenEditorial">JSONを貼り付ける</button>';dx('#copyTenEditorial').onclick=()=>copyText('ten-day');dx('#importTenEditorial').onclick=openImport;}};
const oldMonth=renderMonthWork;renderMonthWork=function(){oldMonth();const head=dx('#view-month > .row');if(head&&!dx('#copyMonthEditorial'))head.insertAdjacentHTML('afterend','<article class="card"><h3>月間編集計画</h3><p>販売・商品・履歴・反応をまとめてChatGPTへ渡します。</p><button class="secondary full" id="copyMonthEditorial">ChatGPT用月間コンテキストをコピー</button></article>');dx('#copyMonthEditorial')?.addEventListener('click',()=>copyText('month'),{once:true});};
const SINGLE_SCOPE='single-day-reproposal';
const protectedPost=p=>!!(p?.manual||p?.actualAt||p?.actualSnapshot||p?.deleted||p?.stories?.some(s=>s.manual));
function savedPlan(p){const topic=OFFICIAL_TOPICS.find(t=>t.id===p.parentId);return {date:p.date,dayNumber:Number(cycleDay(p.date).replace(/\D/g,'')),format:p.format,primaryPurpose:p.primaryAxis,customerValue:p.takeaway||'',themeId:p.parentId||'',themeCategory:topic?.group||p.topicGroup||'',editorialSource:p.editorialSource||null,mainTopic:p.theme||'',angle:p.derivedTheme||'',products:[...(p.skuIds||[])],mainPostBody:p.caption||'',story1:p.stories?.[0]||{text:''},story2:p.stories?.[1]||{text:''},story3:p.stories?.[2]||{text:''},story4:p.stories?.[3]||{text:''},CTA:p.cta||''};}
function periodReview(posts){
 const plans=posts.map(savedPlan),notes=warnings(plans).map(w=>w.text),dates=rows=>rows.map(p=>short(p.date)).join('、');
 const exposure=plans.map(p=>({plan:p,ids:[...new Set([...p.products,...[1,2,3,4].flatMap(n=>p['story'+n]?.skuIds||[])])]}));
 const bySku={},byCategory={};
 for(const row of exposure)for(const id of row.ids){
  (bySku[id]||=[]).push(row.plan);
  const product=sku(id),category=demo.categories.find(c=>c.id===item(product?.itemId)?.categoryId)?.name;
  if(category)(byCategory[category]||=[]).push(row.plan);
 }
 for(const [id,rows] of Object.entries(bySku))if(rows.length>=4)notes.push(`同一SKU「${skuLabel(id)}」が${rows.length}日（対象日：${dates(rows)}）`);
 for(const [category,rows] of Object.entries(byCategory)){const days=[...new Set(rows)];if(days.length>=4)notes.push(`商品カテゴリ「${category}」が${days.length}日（対象日：${dates(days)}）`);}
 for(const [label,test] of [['mini wallet',id=>/mini wallet/i.test(skuLabel(id))],['黒系商品',id=>/black|noir|黒/i.test(skuLabel(id))],['財布カテゴリ',id=>/wallet|財布/i.test(skuLabel(id))]]){
  const rows=exposure.filter(row=>row.ids.some(test)).map(row=>row.plan);
  if(rows.length>=4)notes.push(`${label}が${rows.length}日（対象日：${dates(rows)}）`);
 }
 const ctas=plans.reduce((groups,p)=>{const key=String(p.CTA||'').trim().replace(/\s+/g,'');if(key)(groups[key]||=[]).push(p);return groups;},{});
 for(const rows of Object.values(ctas))if(rows.length>=3)notes.push(`同じCTAが${rows.length}件（対象日：${dates(rows)}）`);
 for(const p of posts){const local=[...storyCheck(p,p.stories||[]),...storyWarnings(p)];for(const note of new Set(local))notes.push(`${short(p.date)}：${note}`);}
 return [...new Set(notes)];
}
function singleContext(p){const broad=context('ten-day'),currentWarnings=periodReview(rangePosts()),others=rangePosts().filter(other=>other.id!==p.id&&!other.deleted).map(savedPlan);return {schema:SCHEMA,scope:SINGLE_SCOPE,target:savedPlan(p),currentWarnings,targetWarnings:currentWarnings.filter(note=>note.includes(short(p.date))),otherDays:others,actualHistory:broad.actualHistory,productExposure:broad.productExposure,monthlySaleStrategy:broad.monthly.saleStrategy,officialTopics:broad.officialTopics,products:broad.products};}
function singlePrompt(p){const data=singleContext(p);return `cian en paclamの10日企画のうち、対象日だけを修正してください。他の日は変更しないでください。対象日のメインテーマを維持するか変更するかは、警告と10日全体のバランスを見て判断し、変更不要ならthemeIdを維持してください。重複語句の言い換えだけで済ませず、問い・結論・見せ方・企画構造まで確認し、企画角度そのものを変えてください。他の日と似ない内容にしてください。Story1は知識・有益・楽しさ、Story2は参加・対話、Story3は商品・革・ものづくりの発見、Story4は今日のメイン投稿への導線です。Story2は顧客とのコミュニケーションとして設計してください。Story3を商品紹介欄に固定しないでください。Story4を投稿タイトルの言い換えだけにしないでください。商品を出さないStoryも、CTAなしの日も認めます。Feed / Reelのみを使い、INDUSTRY 66〜80は出典確認が必要です。顧客価値を明示し、既存の手動編集・投稿済みデータは変更しないでください。\n\n返答は説明なしの1日分JSONだけ：{"schema":"${SCHEMA}","scope":"${SINGLE_SCOPE}","plan":{"date":"${p.date}","dayNumber":${data.target.dayNumber},"format":"Reel","primaryPurpose":"CUSTOMER_VALUE","customerValue":"...","themeId":"official-01","themeCategory":"LEATHER","mainTopic":"...","angle":"...","products":[],"mainPostBody":"...","story1":{"text":"...","action":"..."},"story2":{"text":"...","action":"..."},"story3":{"text":"...","action":"..."},"story4":{"text":"...","action":"..."},"CTA":null}}\n\n再提案コンテキスト：\n${JSON.stringify(data,null,2)}`;}
function validateSingle(data,date){if(data?.schema!==SCHEMA||data.scope!==SINGLE_SCOPE||!data.plan||Array.isArray(data.plan)||data.plans)throw Error('1日再提案用JSONのschema・scope・planを確認してください。');const p=data.plan,topic=OFFICIAL_TOPICS.find(t=>t.id===p.themeId);if(p.date!==date)throw Error('対象日以外の企画は取り込めません。');if(blocked(date))throw Error('投稿不可日は再提案を確定できません。');if(p.dayNumber!=null&&Number(p.dayNumber)!==Number(cycleDay(date).replace(/\D/g,'')))throw Error('Day表示が対象日と一致しません。');if(!topic||!validAxes.includes(p.primaryPurpose)||!['Feed','Reel'].includes(p.format))throw Error('正式テーマ・主目的・形式を確認してください。');if(p.themeCategory&&p.themeCategory!==topic.group)throw Error('正式テーマのカテゴリがthemeIdと一致しません。');if(!p.mainTopic?.trim()||!p.customerValue?.trim()||!p.mainPostBody?.trim()||![1,2,3,4].every(n=>p['story'+n]?.text?.trim()))throw Error('テーマ・顧客価値・本文・Story1〜4が不足しています。');if(!Array.isArray(p.products)||p.products.some(id=>!sku(id)||sku(id).deleted))throw Error('商品IDを商品管理と照合してください。');if([1,2,3,4].some(n=>p['story'+n].skuIds!==undefined&&(!Array.isArray(p['story'+n].skuIds)||p['story'+n].skuIds.some(id=>!sku(id)||sku(id).deleted))))throw Error('Storyの商品IDを商品管理と照合してください。');if(p.CTA!=null&&typeof p.CTA!=='string')throw Error('CTAは文章またはnullにしてください。');return topic;}
function planComparison(p,before){
 const topic=OFFICIAL_TOPICS.find(t=>t.id===p.themeId);
 const changed=key=>before&&JSON.stringify(p[key]??'')!==JSON.stringify(before[key]??'');
 const row=(label,value,keys)=>`<p class="${keys.some(changed)?'editorial-diff':''}"><strong>${label}</strong>${keys.some(changed)?'<span class="badge">変更</span>':''}<br>${value}</p>`;
 return row('日付・Day・形式',`${html(p.date)} · Day${html(p.dayNumber)} · ${html(p.format)}`,['date','dayNumber','format'])+
 row('正式テーマ',`${html(topic?.group||'')} #${html(topic?.number||'')} ${html(topic?.title||'未確認')}`,['themeId'])+
 row('主目的',html(p.primaryPurpose),['primaryPurpose'])+
 row('顧客価値',html(p.customerValue),['customerValue'])+
 row('企画・切り口',`${html(p.mainTopic)}<br>${html(p.angle||'未指定')}`,['mainTopic','angle'])+
 row('商品',html(p.products.map(skuLabel).join(' / ')||'商品なし'),['products'])+
 row('本文',html(p.mainPostBody),['mainPostBody'])+
 [1,2,3,4].map(n=>row('Story'+n,html(p['story'+n].text),['story'+n])).join('')+
 row('CTA',html(p.CTA||'CTAなし'),['CTA']);
}
let singlePreview=null;
function showSinglePreview(){const {postId,before,after,revision}=singlePreview,post=demo.posts.find(p=>p.id===postId),protectedNow=protectedPost(post);openForm('1日再提案｜変更前・変更後',`<p class="tiny muted">${html(short(after.date))}だけを差し替えます。他の日は変更しません。</p>${protectedNow?'<p class="notice">この投稿は保護されています。ChatGPT案を見ることはできますが、自動確定できません。</p>':''}<details class="card"><summary>変更前｜保存済み</summary>${planComparison(before)}</details><details class="card" open><summary>変更後｜ChatGPT案</summary>${planComparison(after,before)}</details><p class="tiny muted">確定後に10日全体の重複・偏りを再確認します。</p>`,()=>{const current=demo.posts.find(p=>p.id===postId);if(!current||current.date!==after.date||protectedPost(current))throw Error('この投稿は保護されています。自動確定できません。');if(current.revision!==revision)throw Error('プレビュー中に投稿が更新されました。開き直して確認してください。');const topic=validateSingle({schema:SCHEMA,scope:SINGLE_SCOPE,plan:after},current.date);Object.assign(current,{format:after.format,primaryAxis:after.primaryPurpose,parentId:topic.id,topicGroup:topic.group,theme:after.mainTopic,derivedTheme:after.angle||after.mainTopic,takeaway:after.customerValue,caption:after.mainPostBody,cta:after.CTA||'',skuIds:[...after.products],subjects:'',stories:[1,2,3,4].map((n,i)=>({...after['story'+n],slot:n,purpose:STORY_ROLES[i],skuIds:after['story'+n].skuIds||[],storySpecVersion:4})),researchRequired:!!topic.researchRequired,revision:(current.revision||0)+1,editorialSource:'chatgpt-import'});persist();refreshWork();singlePreview=null;const notes=periodReview(rangePosts());dx('#workDialog').close();openForm('10日全体の再チェック',notes.length?`<p class="notice">要確認 ${notes.length}件</p><div class="card">${notes.map(note=>`<p class="tiny">${html(note)}</p>`).join('')}</div>`:'<p>10日全体の重複・偏り警告はありません。</p>',()=>false);dx('#workForm .save-foot button').textContent='確認しました';dx('#workForm .save-foot button').type='button';dx('#workForm .save-foot button').onclick=()=>dx('#workDialog').close();return false;});const save=dx('#workForm .save-foot button');save.textContent=protectedNow?'保護中・自動確定できません':'この日だけ確定する';if(protectedNow)save.disabled=true;}
function openSingleImport(id){const post=demo.posts.find(p=>p.id===id&&!p.deleted);if(!post)return;openForm('1日分のChatGPT案を貼り付ける',`<p>${html(short(post.date))}の1日分JSONを貼り付けてください。確定前に変更前／変更後を表示します。</p>${protectedPost(post)?'<p class="notice">この投稿は保護されています。案は確認できますが、自動確定できません。</p>':''}<label class="wlabel">1日分JSON<textarea name="singleJson" rows="12" required></textarea></label>`,f=>{const data=extractSingle(f.get('singleJson'));validateSingle(data,post.date);singlePreview={postId:post.id,before:savedPlan(post),after:data.plan,revision:post.revision};showSinglePreview();return false;});dx('#workForm .save-foot button').textContent='変更前／変更後を見る';}
function openSingle(id){const post=demo.posts.find(p=>p.id===id&&!p.deleted);if(!post)return;dx('#dayDialog').close();openForm('ChatGPTでこの日を再提案',`<p><strong>${html(planDay(post.date))}</strong></p>${protectedPost(post)?'<p class="notice">この投稿は保護されています。ChatGPT案を見ることはできますが、自動確定できません。</p>':''}<p>現在の警告と10日全体、実投稿・商品履歴を一緒にコピーします。</p><button type="button" class="secondary full" id="copySingleEditorial">再提案用プロンプトをコピー</button><button type="button" class="ghost full" id="pasteSingleEditorial">1日分JSONを貼り付ける</button>`,()=>false);dx('#workForm .save-foot').hidden=true;dx('#copySingleEditorial').onclick=()=>navigator.clipboard.writeText(singlePrompt(post)).then(()=>toast('1日再提案用プロンプトをコピーしました'));dx('#pasteSingleEditorial').onclick=()=>openSingleImport(post.id);}
const editorialShowPost=showPost;showPost=function(id){
 editorialShowPost(id);
 const post=demo.posts.find(p=>p.id===id);
 if(post&&rangePosts().some(p=>p.id===id))dx('#dialogDayLabel').textContent=planDay(post.date)+' · '+(post.format==='Reel'?'Reel':'Feed');
 if(!post||!['Feed','Reel'].includes(post.format)||!rangePosts().some(p=>p.id===id))return;
 const concept=dx('#dayDetail .concept-detail'),section=dx('#dayDetail .stories-always');
 if(!concept||!section)return;
 concept.insertAdjacentHTML('afterend','<button type="button" class="secondary full" id="singleDayEditorial">ChatGPTでこの日を再提案</button>');
 dx('#singleDayEditorial').onclick=()=>openSingle(id);
 const warning=[...section.querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent.startsWith('4枠の重複チェック'));
 if(warning&&/\d+件/.test(warning.querySelector('summary')?.textContent||'')){
  warning.open=true;
  warning.insertAdjacentHTML('beforeend','<button type="button" class="secondary full" id="singleDayWarningEditorial">ChatGPTで再提案</button>');
  dx('#singleDayWarningEditorial').onclick=()=>openSingle(id);
 }
};
document.head.insertAdjacentHTML('beforeend','<style>.editorial-diff{border-left:3px solid #53695f;background:#f0f2ef;padding:8px 10px;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere}.editorial-diff .badge{margin-left:8px}#singleDayEditorial{margin:8px 0 16px}#singleDayWarningEditorial{margin-top:8px}</style>');
const originalPrompt=prompt;
prompt=function(scope){return originalPrompt(scope).replace('返答は説明文を付けずJSONだけにしてください。', `本文は300文字以上。文字数の水増しではなく、cian en paclamの元タンナー・作り手として確認できる素材、仕上げ、工程、構造、実際の使用場面を具体的に扱ってください。一般論だけにせず、疑問→実物で確かめる知識→暮らしでの使い道を投稿ごとに自然につないでください。未確認の経験や商品性能は創作しません。保存記録に根拠がないアンケート結果・質問回答・お客様の声は事実として書かず、記録があっても意味を変えません。顧客反応は判断材料であり毎日強制採用しません。\n\nStory1はメインの要約ではなく別の知識。Story2は自由回答なら質問スタンプ、2〜4択ならアンケートかクイズを選び、直近と同じ質問を避けます。Story3はStory1と別の被写体・学びを示し、商品が主役なら商品紹介、例示だけなら非商品として扱います。Story4はStory3の言い換えや単なる「投稿を見て」ではなく、今日のメイン投稿で具体的に何を確かめられるかを示します。撮影指示は各カットに何を・どう撮る・何を伝えるを含め、Feedは写真、Reelは動画に合わせます。完成後に本文・Story1〜4・撮影を再読し、同じ行動・学び・被写体、根拠のない声、回答形式や商品分類の不一致を解消してください。\n\n返答は説明文を付けずJSONだけにしてください。`);};
const originalSinglePrompt=singlePrompt;
singlePrompt=function(post){return originalSinglePrompt(post).replace('返答は説明なしの1日分JSONだけ：', `本文は300文字以上で、その日固有の素材・仕上げ・工程・構造・使う場面を具体的に扱い、一般論の水増しにしないでください。保存された記録に根拠のないアンケート結果・お客様の声を創作しないでください。Story1〜4は同じ行動・学び・被写体を繰り返さず、Story2の選択肢と回答方法、Story3の商品分類、Story4の投稿を見る具体的理由を確認してください。Feedは写真、Reelは動画に合う撮影案を考えてください。\n\n返答は説明なしの1日分JSONだけ：`);};
const contentPrompt=prompt;
prompt=function(scope){const text=contentPrompt(scope);if(scope!=='ten-day')return text;return text.replace('返答は説明文を付けずJSONだけにしてください。',`商品候補は monthly.saleStrategy の対象月のlineup全件を、新発売・再販・常時販売を含めて検討してください。lineupの配列順・productsの配列順は推薦順位ではありません。priority / adCandidate は判断材料であり、先頭SKUや同一SKUを繰り返す理由にはなりません。その日のテーマ・顧客価値・販売戦略に合う場合だけ選び、選んだ理由をangleや本文に具体化してください。Storyの商品も含め、同じSKUや同じ商品セットを再利用する場合は各日で異なる企画上の必要性を明確にしてください。商品なしの日も認め、均等ローテーションにはしないでください。\n\n次の順序で編集してください。1. 過去の実投稿・実施済みStory・7日後評価・お客様の声を、予定投稿とは区別して読む。直近10投稿、必要な場合のみ最大20投稿の露出も確認する。2. 投稿可能な全日を一度に仮作成し、1日ずつ確定しない。3. 日付順の一覧で、親テーマ・派生テーマ・問い・結論・顧客価値・本文構造・被写体・撮影・CTAを全日比較する。4. 同じ企画や定型本文、正式テーマ番号順の消費があれば別の学びへ差し替える。5. Story1〜4を全日再比較し、特にStory3の発見とStory4の投稿を見る理由を分け、クイズの答えをStory4へ押し込まない。6. 月間販売予定、priority、広告候補、直近露出を見てSKU・アイテム・カテゴリ・色・財布・mini wallet・黒の偏りを再確認する。同一SKU・同一商品セットや特定カラーの集中があれば、別カテゴリを含む候補と比較し、企画理由が弱い日は差し替える。商品を出さない日も認め、均等ローテーションはしない。7. 問題が残る間はJSONを返さず再編集し、すべて解消してからJSONだけを出力する。\n\n本文は全日300文字以上。クイズには問題文・選択肢・正解・同じStory内での回答場所を含め、kind・text・options・correctAnswer・actionを一致させてください。INDUSTRY #66〜80は出典を確認し、各planのresearchSourcesに出典名とURL等を入れてください。出典のない事実を完成原稿として書かないでください。BUSINESSでもcustomerValueを具体化し、CTAなしの日も認めます。\n\n返答は説明文を付けずJSONだけにしてください。`);};
function nextEditorialContext(){
 const block=salesCycleBlock();if(!block)throw Error('次の期間を計算できません。販売日を確認してください。');
 const from=block.nextFrom,to=block.nextTo,data=context('ten-day'),history=postHistories(from,to);
 data.period={from,to,days:Array.from({length:dayDiff(to,from)+1},(_,i)=>{const date=dayAdd(from,i);return {date,dayNumber:block.nextDayFrom+i,blocked:blocked(date)};})};
 data.actualHistory={count:history.actualHistory.length,posts:history.actualHistory};
 data.plannedPosts={count:history.plannedPosts.length,posts:history.plannedPosts};
 data.productExposure=exposureSummary(history.actualHistory);
 data.monthly.saleStrategy=monthlySaleStrategy(from,to);
 data.balance.existing=demo.posts.filter(p=>!p.deleted&&p.date>=from&&p.date<=to).reduce((counts,p)=>(counts[p.primaryAxis]=(counts[p.primaryAxis]||0)+1,counts),{});
 return data;
}
function nextEditorialPrompt(){
 const data=nextEditorialContext(),base=prompt('ten-day'),marker='\n\n編集コンテキスト：\n',split=base.lastIndexOf(marker);
 if(split<0)throw Error('編集コンテキストを作成できません。');
 const first=data.period.days.find(day=>!day.blocked)?.dayNumber||data.period.days[0]?.dayNumber||1;
 const intro=base.slice(0,split).replace('10日分のFeed / Reel / Story1〜4',`${data.period.days.length}日分のFeed / Reel / Story1〜4`).replace(/実投稿履歴：\d+件/,`実投稿履歴：${data.actualHistory.count}件`).replace(/予定投稿：\d+件/,`予定投稿：${data.plannedPosts.count}件`).replace(/"dayNumber":\d+/,`"dayNumber":${first}`);
 return intro+marker+JSON.stringify(data,null,2);
}
const planWithNextEditorial=renderPlan;
let displayedPeriod='current';
renderPlan=function(){
 planWithNextEditorial();
 const next=dx('#planPeriodCard .next-plan-period');if(!next)return;
 const period=salesCycleBlock(),list=dx('#planList');
 const nextPosts=demo.posts.filter(post=>!post.deleted&&post.date>=period.nextFrom&&post.date<=period.nextTo).sort((a,b)=>a.date.localeCompare(b.date));
 if(!list||!nextPosts.length)return;
 const currentCards=[...list.children],currentGroup=document.createElement('div'),nextGroup=document.createElement('div');
 currentGroup.className=nextGroup.className='stack';
 currentCards.forEach(card=>currentGroup.append(card));
 list.append(currentGroup,nextGroup);
 for(let date=period.nextFrom;date<=period.nextTo;date=dayAdd(date,1)){
  const post=nextPosts.find(entry=>entry.date===date),day=`Day${period.nextDayFrom+dayDiff(date,period.nextFrom)}｜${short(date)}`;
  if(!post){if(blocked(date))nextGroup.insertAdjacentHTML('beforeend',`<article class="card blocked-day-card"><span class="badge">${html(day)}</span><h3>投稿不可</h3></article>`);continue;}
  nextGroup.insertAdjacentHTML('beforeend',`<article class="card"><div class="row between"><span class="badge">${html(day)}</span><span class="badge">${post.format==='Reel'?'Reel':'Feed'}</span></div><p class="tiny muted">${html(topicLabel(post))}</p><h3>${html(post.derivedTheme||post.theme)}</h3><p>${html(post.takeaway||'伝えることは未確認')}</p><p class="exact muted">${html(post.skuIds?.length?postLabel(post):post.subjects||'革・工程・道具')}</p><div class="row"><span class="badge">${html(axisShort[post.primaryAxis]||'主目的未確認')}</span><span class="tiny">${post.stories?.length||0} Story · ${(post.shots||[]).reduce((count,shot)=>count+(shot.count||0),0)}カット</span></div>${post.researchRequired?'<p class="notice">要リサーチ</p>':''}<p class="tiny">${post.actualAt?'投稿済み':post.paused?'投稿休止':blocked(date)?'投稿不可日':'予定'}${post.manual?' / 編集済み':''}</p><button class="secondary full" data-work-post="${html(post.id)}">投稿内容を見る・編集</button></article>`);
 }
 const switcher=document.createElement('div');switcher.className='actions';switcher.innerHTML=`<button type="button" class="secondary" data-editorial-period="current">現在：${html(short(period.from))}〜${html(short(period.to))}</button><button type="button" class="secondary" data-editorial-period="next">次：${html(short(period.nextFrom))}〜${html(short(period.nextTo))}</button>`;
 next.after(switcher);
 const select=target=>{displayedPeriod=target;currentGroup.hidden=target!=='current';nextGroup.hidden=target!=='next';dx('#planAxisSummary').hidden=target==='next';dx('#planDateWork').textContent=target==='next'?planPeriodLabel(period.nextFrom,period.nextTo,period.nextDayFrom,period.nextDayTo):planPeriodLabel(period.from,period.to,period.dayFrom,period.dayTo);dx('#copyTenEditorial').textContent=`ChatGPT用10日企画をコピー（${target==='next'?'次':'現在'}）`;switcher.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.editorialPeriod===target));};
 switcher.querySelectorAll('button').forEach(button=>button.onclick=()=>select(button.dataset.editorialPeriod));select(displayedPeriod);
};
document.head.insertAdjacentHTML('beforeend','<style>#planList .stack[hidden],#planAxisSummary[hidden]{display:none!important}[data-editorial-period].active{background:#384f3b;color:#fff}</style>');
let pendingManualStory=null;
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.finalStoryEdit){const [id,index,mode]=button.dataset.finalStoryEdit.split('|');pendingManualStory=mode==='saved'?{id,index:Number(index)}:null;}
 if(button.dataset.workSaveCaption){const post=demo.posts.find(p=>p.id===button.dataset.workSaveCaption);if(post&&(!post.manual||post.manualFields?.revision===post.revision)){post.manualFields||={};post.manualFields.caption=true;post.manualFields.revision=post.revision+1;}}
},true);
document.addEventListener('submit',event=>{
 if(event.target.id!=='workForm'||!pendingManualStory||!/^Story \d+/.test(dx('#workTitle').textContent))return;
 const post=demo.posts.find(p=>p.id===pendingManualStory.id);if(post&&(!post.manual||post.manualFields?.revision===post.revision)){post.manualFields||={};post.manualFields.stories||=[];post.manualFields.stories[pendingManualStory.index]=true;post.manualFields.revision=post.revision+1;}
 pendingManualStory=null;
},true);
window.editorialPlanner={context,prompt,nextContext:nextEditorialContext,nextPrompt:nextEditorialPrompt,extract,validate,warnings,singleContext,singlePrompt,validateSingle,periodReview};refreshWork();
})();
