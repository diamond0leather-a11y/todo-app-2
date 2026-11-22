const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const policySource=fs.readFileSync(path.join(__dirname,'dist/v7-story1-policy.js'),'utf8');
const editorial=fs.readFileSync(path.join(__dirname,'dist/chatgpt-editorial.js'),'utf8');
const storyImport=fs.readFileSync(path.join(__dirname,'dist/v7-story1-import.js'),'utf8');
const page=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(policySource,context);
const audit=context.window.V7Story1Policy.audit;
const dates=Array.from({length:10},(_,i)=>`2026-11-${String(i+9).padStart(2,'0')}`);
// 調査済みニュースではない、取り込み試験専用の具体的な10日編成。
const topics=[
 ['ファッション','制服の色を選ぶ視点','制服の色が変わると街の印象も変わる。身近な装いを、色と使う場所から見直してみる。'],
 ['デザイン・建築','駅の椅子と待つ時間','駅の椅子は座るためだけの道具ではない。待つ時間の過ごし方まで考えると形の理由が見えてくる。'],
 ['AI・テクノロジー','音声案内の作り方','音声案内は言葉の速さでも印象が変わる。聞く人の立場から、伝わりやすさを考えてみる。'],
 ['音楽・映画・カルチャー','映画の字幕と余白','映画の字幕は文字の大きさだけでは決まらない。画面の余白を見ると、読みやすさの工夫が見えてくる。'],
 ['暮らし・日常','朝の光と部屋の色','朝の光が入る向きで、同じ部屋の色も違って見える。家具を選ぶ前に光の時間を見てみたい。'],
 ['ファッション','ポケットの位置と動き','服のポケットは小さな場所でも使い心地を変える。歩くときの手の動きから、形を見直してみる。'],
 ['デザイン・建築','橋の手すりの形','橋の手すりには景色の見え方を変える役割もある。立ち止まる場所から形を眺めると面白い。'],
 ['暮らし・日常','食卓の器と会話','器を変えると食卓で目に入る色が変わる。いつもの食事にも、小さな発見が生まれるかもしれない。'],
 ['ファッション','靴ひもの結び方','靴ひもの結び目は足元の印象を変える。普段の装いを、いつもと少し違う角度から眺めてみる。'],
 ['デザイン・建築','本棚の高さと視線','本棚の高さが変わると、手に取る本も変わる。部屋の中の視線をたどると配置の工夫が見えてくる。']
];
const good=dates.map((date,i)=>({date,category:topics[i][0],title:topics[i][1],text:topics[i][2],action:'発見を読む',asset:'題材を示す写真1枚',materialMode:'新規撮影必要',skuIds:[],researchSources:[{name:'試験用の仮出典',url:`https://example.test/story${i}`}],verificationStatus:'unverified'}));
assert.equal(good.length,10);
assert(!audit(good).some(x=>x.level==='要修正'));
const skew=good.map(row=>({...row,category:'ファッション'}));assert(audit(skew).some(x=>/ジャンルの偏り/.test(x.text)));
const missing=good.map((row,i)=>i?row:{...row,researchSources:[]});assert(audit(missing).some(x=>/出典名とURLが不足/.test(x.text)));
const repeat=good.map((row,i)=>i===1?{...row,title:good[0].title,text:good[0].text}:row);assert(audit(repeat).some(x=>x.level==='要修正'&&/同じ/.test(x.text)));
const paraphrase=good.map((row,i)=>i===2?{...row,title:'駅の椅子が待つ時間を変える'}:row);assert(audit(paraphrase).some(x=>/話題が近い/.test(x.text)));
const products=good.map((row,i)=>i<5?{...row,title:`商品紹介 ${i}`} :row);assert(audit(products).some(x=>/商品紹介・販売・革知識/.test(x.text)));
assert(audit(good.map((row,i)=>i?row:{...row,verificationStatus:'verified'})).some(x=>/アプリはURLの内容を照合していない/.test(x.text)));
const dayAdd=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const storyOnlyContext={window:{},demo:{skus:[],posts:[],storyDays:[],reactions:[]},dayAdd};
vm.createContext(storyOnlyContext);vm.runInContext(storyImport,storyOnlyContext);
const storyOnly={schema:'cian-story1-verified-review-v1',scope:'story1-only',period:{from:dates[0],to:dates[9]},stories:good.map(row=>({...row,slot:1}))};
assert.equal(storyOnlyContext.window.V7Story1Review.validate(storyOnly,storyOnlyContext.demo).length,10,'具体的なStory1専用10日JSONを検証');
const between=(start,end)=>{const a=editorial.indexOf(start),b=editorial.indexOf(end,a);assert(a>=0&&b>a);return editorial.slice(a,b)};
const planContext={SCHEMA:'cian-editorial-v1',validAxes:['CUSTOMER_VALUE','INSTAGRAM_GROWTH','BUSINESS'],V7_OFFICIAL_TOPICS:[],sku:()=>null,short:date=>date,dayAdd,dayDiff:(date,from)=>(Date.parse(date+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000,importPeriod:()=>({from:dates[0],to:dates[9],dayFrom:1}),warnings:()=>[],qualityAudit:plans=>({issues:audit(plans.map(plan=>({date:plan.date,...plan.story1})))}),window:{}};
vm.createContext(planContext);
vm.runInContext(between('function answerable(','function storyQuality('),planContext);
vm.runInContext(between('function validateEditorialShots(','function openImport('),planContext);
const body='いつもの持ち物や街の風景を観察すると、使いやすさを考える手がかりが見えてきます。身近な場面を一つ選び、違いを具体的に確かめます。'.repeat(9);
const otherStory=(slot)=>({text:`Story${slot}では今日の予定を別の角度から伝えます。`,asset:'試験用の写真',action:'内容を見る',materialMode:'新規撮影必要',skuIds:[],...(slot===2?{kind:'通常'}:{})});
const tenDay={schema:'cian-editorial-v1',scope:'ten-day',plans:good.map((story,i)=>({date:story.date,dayNumber:i+1,format:i%2?'Reel':'Feed',primaryPurpose:'CUSTOMER_VALUE',customerValue:'日常の発見',themeId:null,mainTopic:`暮らしの観察 ${i+1}`,angle:'使う人の視点',products:[],mainPostBody:body,shots:[{media:'写真',what:'題材の全体と細部を撮る',count:1,skuIds:[]}],story1:story,story2:otherStory(2),story3:otherStory(3),story4:{...otherStory(4),text:'今日のFeedで使う場面を確かめる'},CTA:''}))};
assert.equal(planContext.validate(tenDay).filter(issue=>issue.level==='要修正').length,0,'具体的な10日プランを取り込み前に検証');
const oneMissing=structuredClone(tenDay);oneMissing.plans[4].story1.researchSources=[];
assert(planContext.validate(oneMissing).some(issue=>/2026-11-13のStory1：出典名とURLが不足/.test(issue.text)));
assert(editorial.includes('V7Story1Policy.audit(story1)'));
assert(storyImport.includes('window.V7Story1Policy?.audit(stories)'));
assert(page.indexOf('v7-story1-policy.js')<page.indexOf('chatgpt-editorial.js'));
assert(page.indexOf('v7-story1-policy.js')<page.indexOf('v7-story1-import.js'));
assert(editorial.includes('毎日ひとつ、誰かに話したくなる発見'));
console.log('PASS concrete 10-day Story1 policy: full plan and Story1-only validation, diversity, source, repeated topic, product bias, verification, load order');
