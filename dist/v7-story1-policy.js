(function(root){
 'use strict';
 const clean=value=>String(value||'').trim();
 const similarity=(a,b)=>{const grams=value=>{const text=clean(value).replace(/[\s、。！？・「」]/g,'');return new Set(Array.from({length:Math.max(0,text.length-1)},(_,i)=>text.slice(i,i+2)))};const left=grams(a),right=grams(b);if(!left.size||!right.size)return 0;return [...left].filter(value=>right.has(value)).length/Math.min(left.size,right.size)};
 const group=value=>{const text=clean(value);if(/ファッション|服|装い/.test(text))return 'ファッション';if(/デザイン|建築|家具|インテリア/.test(text))return 'デザイン・建築';if(/AI|テクノロジー|技術/.test(text))return 'AI・テクノロジー';if(/音楽|映画|アニメ|カルチャー|文化|美術|アート|本|出版/.test(text))return 'カルチャー';if(/暮らし|生活|食|旅|街|地域|社会/.test(text))return '暮らし・日常';return ''};
 function audit(stories){
  const issues=[],add=(level,date,detail)=>issues.push({level,text:`${date}のStory1：${detail}`});
  const sorted=stories.slice().sort((a,b)=>clean(a.date).localeCompare(clean(b.date)));
  const counts={};let productDays=0;
  for(let i=0;i<sorted.length;i++){
   const story=sorted[i],date=clean(story.date)||'日付未設定',category=group(story.category||story.genre),text=clean(story.text),title=clean(story.title||story.theme),sources=story.researchSources;
   if(category)counts[category]=(counts[category]||0)+1;
   else add('要確認',date,'ジャンルが判別できません。ファッション・デザイン・AI・カルチャー・暮らし等とのバランスを確認してください。');
   const length=[...text].length;if(length<40||length>60)add('要確認',date,`本文は${length}文字です。目安は40〜60文字ですが、事実の正確さを優先して確認してください。`);
   const hasSource=Array.isArray(sources)&&sources.some(source=>source&&clean(source.name||source.title||source.publisher)&&/^https?:\/\/\S+$/i.test(clean(source.url)));
   if(!hasSource)add('要確認',date,'出典名とURLが不足しています。事実確認前の案として扱い、投稿前に確認してください。');
   if(clean(story.verificationStatus)==='verified')add('要確認',date,'確認済みの指定があります。アプリはURLの内容を照合していないため、人が出典と本文を確認してください。');
   if(/商品紹介|販売告知|革の豆知識|革の手入れ|製法/.test(title+' '+text))productDays++;
   if(i){const prev=sorted[i-1],previousTitle=clean(prev.title||prev.theme),previousText=clean(prev.text),previousCategory=group(prev.category||prev.genre);
    if(title&&previousTitle&&title===previousTitle||text&&previousText&&text===previousText)add('要修正',date,`前日（${prev.date}）と題名または本文が同じです。`);
    else if(title.length>=8&&previousTitle.length>=8&&(title.includes(previousTitle)||previousTitle.includes(title)||similarity(title,previousTitle)>.48))add('要確認',date,`前日（${prev.date}）と話題が近い可能性があります。内容と結論を確認してください。`);
    if(category&&category===previousCategory&&i>=2&&group(sorted[i-2].category||sorted[i-2].genre)===category)add('要確認',date,`${category}が3日続きます。話題の違いを確認してください。`);
    if(text.slice(0,12)&&text.slice(0,12)===previousText.slice(0,12))add('要確認',date,'前日と書き出しが同じです。');
   }
  }
  if(sorted.length>=10){for(const [category,count] of Object.entries(counts))if(count>=7)issues.push({level:'要確認',text:`10日間のStory1：${category}が${count}件です。ジャンルの偏りを確認してください。`});if(productDays>=5)issues.push({level:'要確認',text:`10日間のStory1：商品紹介・販売・革知識の話題が少なくとも${productDays}件あります。独立した情報コンテンツになっているか確認してください。`});}
  return issues;
 }
 root.V7Story1Policy={audit};
})(typeof window==='object'?window:globalThis);
