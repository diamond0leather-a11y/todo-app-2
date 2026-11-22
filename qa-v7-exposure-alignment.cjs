const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'dist/chatgpt-editorial.js'),'utf8');
const data={plans:[
 {
  "date": "2026-11-29",
  "dayNumber": 21,
  "format": "Feed",
  "primaryPurpose": "CUSTOMER_VALUE",
  "themeId": "v7-official-68",
  "mainTopic": "POP UPに持っていくバッグを、形から見る",
  "angle": "12月の東京POP UPに向けたバッグの輪郭と使い方を、MAJORELLEの実物から紹介する。",
  "customerValue": "バッグを購入する前に、写真で確認すべき形や持ち手の見方が分かる。",
  "products": [
   "e292d805-e7f2-4825-9c30-18b19d0591e8"
  ],
  "bodyLength": 550,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "sku-ariary-mustard"
   ]
  },
  "story4": {
   "skuIds": [
    "e292d805-e7f2-4825-9c30-18b19d0591e8"
   ]
  }
 },
 {
  "date": "2026-11-30",
  "dayNumber": 22,
  "format": "Reel",
  "primaryPurpose": "INSTAGRAM_GROWTH",
  "themeId": "v7-official-57",
  "mainTopic": "製作途中にしか見えない、革の端",
  "angle": "製作中の革の裁断面と仕上がり前の様子を見せ、完成品とは違う観察の楽しさを伝える。",
  "customerValue": "完成品の輪郭がどのように生まれるか、革の端を見る楽しみが分かる。",
  "products": [],
  "bodyLength": 548,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
   ]
  },
  "story4": {
   "skuIds": []
  }
 },
 {
  "date": "2026-12-01",
  "dayNumber": 23,
  "format": "Feed",
  "primaryPurpose": "CUSTOMER_VALUE",
  "themeId": "v7-official-57",
  "mainTopic": "バッファローの表情を近くで見る",
  "angle": "DÉPLIÉ buffaloの深いシボや毛穴の見え方を、一つの素材の個性として観察します。",
  "customerValue": "革小物を選ぶとき、表面を一歩近くで見てから全体の印象に戻る。",
  "products": [
   "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
  ],
  "bodyLength": 628,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
   ]
  },
  "story4": {
   "skuIds": [
    "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
   ]
  }
 },
 {
  "date": "2026-12-02",
  "dayNumber": 24,
  "format": "Reel",
  "primaryPurpose": "CUSTOMER_VALUE",
  "themeId": "v7-official-70",
  "mainTopic": "贈り物を選ぶ前に、確かめたいこと",
  "angle": "贈る相手の使い方を考える視点と、ギフトラッピングが別売りであることを案内する。",
  "customerValue": "革製品を贈る際、好みと使い方、ラッピングの確認点が分かる。",
  "products": [],
  "bodyLength": 574,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "sku-0-0-8"
   ]
  },
  "story4": {
   "skuIds": []
  }
 },
 {
  "date": "2026-12-03",
  "dayNumber": 25,
  "format": "Feed",
  "primaryPurpose": "BUSINESS",
  "themeId": "v7-official-80",
  "mainTopic": "写真で革の色を選ぶときの見方",
  "angle": "12月の色をmini wallet hydrangeaの実物から考え、写真で色を判断するときの見方を伝える。",
  "customerValue": "暗い色の服が多い日に、財布だけ色を添える選び方を考える。",
  "products": [
   "sku-0-0-8"
  ],
  "bodyLength": 642,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "sku-0-0-8"
   ]
  },
  "story4": {
   "skuIds": [
    "sku-0-0-13"
   ]
  }
 },
 {
  "date": "2026-12-04",
  "dayNumber": 26,
  "format": "Reel",
  "primaryPurpose": "BUSINESS",
  "themeId": "v7-official-61",
  "mainTopic": "東京POP UP、実物を見る楽しさ",
  "angle": "東京POP UP初日に、MAJORELLEの立体感と実物を見る意味を伝える。",
  "customerValue": "写真だけでは分かりにくいバッグの輪郭や革の表情を確認する視点が分かる。",
  "products": [
   "e292d805-e7f2-4825-9c30-18b19d0591e8"
  ],
  "bodyLength": 561,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "sku-ariary-mustard"
   ]
  },
  "story4": {
   "skuIds": [
    "e292d805-e7f2-4825-9c30-18b19d0591e8"
   ]
  }
 },
 {
  "date": "2026-12-05",
  "dayNumber": 27,
  "format": "Feed",
  "primaryPurpose": "INSTAGRAM_GROWTH",
  "themeId": "v7-official-67",
  "mainTopic": "作り手なら、何を見て選ぶか",
  "angle": "DÉPLIÉ 黒桟革 杜若を前に、作り手が素材の表情、構造、使う場面をどんな順序で見ているかを説明します。",
  "customerValue": "自分が使うなら、まず手に取る頻度と必要な中身を考えてから素材を選ぶ。",
  "products": [
   "80af0ebe-0c17-423e-ae39-6efb3f864296"
  ],
  "bodyLength": 658,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "80af0ebe-0c17-423e-ae39-6efb3f864296"
   ]
  },
  "story4": {
   "skuIds": [
    "80af0ebe-0c17-423e-ae39-6efb3f864296"
   ]
  }
 },
 {
  "date": "2026-12-06",
  "dayNumber": 28,
  "format": "Feed",
  "primaryPurpose": "BUSINESS",
  "themeId": "v7-official-70",
  "mainTopic": "本日21時、12月の販売について",
  "angle": "本日21時のオンライン販売に向け、財布の形と素材の違いから、候補を整理して紹介します。",
  "customerValue": "購入直前に慌てないよう、使う場面、必要な収納、色の好みを順に確認する。",
  "products": [
   "5d33c84a-6a03-444a-b5ab-f621c426b1d3",
   "sku-0-0-8",
   "sku-1-0-2",
   "sku-2-1-1"
  ],
  "bodyLength": 637,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
   ]
  },
  "story4": {
   "skuIds": [
    "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
   ]
  }
 },
 {
  "date": "2026-12-07",
  "dayNumber": 29,
  "format": "Reel",
  "primaryPurpose": "CUSTOMER_VALUE",
  "themeId": "v7-official-55",
  "mainTopic": "購入した後の、最初のひと手間",
  "angle": "新しい財布を使い始める前に、普段持ち歩くカードや紙幣を一度整理するという行動を提案します。",
  "customerValue": "使っていないカードをいったん分けて、必要な物だけを手元に残す。",
  "products": [],
  "bodyLength": 649,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": []
  },
  "story4": {
   "skuIds": []
  }
 },
 {
  "date": "2026-12-08",
  "dayNumber": 30,
  "format": "Feed",
  "primaryPurpose": "CUSTOMER_VALUE",
  "themeId": "v7-official-75",
  "mainTopic": "長く使うために、相談できること",
  "angle": "使い続ける革製品の状態確認と、修理の相談という選択肢を案内する。",
  "customerValue": "革製品を使い続ける中で困ったときの相談方法を知る。",
  "products": [],
  "bodyLength": 642,
  "story1": {
   "skuIds": []
  },
  "story2": {
   "skuIds": []
  },
  "story3": {
   "skuIds": [
    "5d33c84a-6a03-444a-b5ab-f621c426b1d3"
   ]
  },
  "story4": {
   "skuIds": []
  }
 }
]};
assert.equal(data.plans.length,10);
for(let i=0;i<data.plans.length;i++){const p=data.plans[i],day=new Date(Date.UTC(2026,10,29+i)).toISOString().slice(0,10);assert.equal(p.date,day);assert.equal(p.dayNumber,21+i);assert(['Feed','Reel'].includes(p.format));assert(p.bodyLength>=500);for(let slot=1;slot<=4;slot++)assert(Array.isArray(p['story'+slot]?.skuIds));}
const ids=[...new Set(data.plans.flatMap(plan=>[...(plan.products||[]),...[1,2,3,4].flatMap(slot=>plan['story'+slot]?.skuIds||[])]))];
const products=ids.map(id=>({id,item:id==='5d33c84a-6a03-444a-b5ab-f621c426b1d3'||id==='80af0ebe-0c17-423e-ae39-6efb3f864296'?'DÉPLIÉ':id,category:'財布',name:id,color:'',status:'selling'}));
const sale=[{month:'2026-12',saleDate:'2026-12-06',lineup:ids.map(skuId=>({skuId,saleKind:'販売対象'}))}];
const ctx={productContext:()=>products,postHistories:()=>({actualHistory:[]}),exposureSummary:()=>({last10:{bySku:{}},last20:{bySku:{}}}),monthlySaleStrategy:()=>sale,skuLabel:id=>id,short:date=>date,dayDiff:(a,b)=>(Date.parse(a)-Date.parse(b))/86400000};
const start=source.indexOf('function normalizedContent('),end=source.indexOf('function editorialSections(');
assert(start>=0&&end>start);
vm.createContext(ctx);
vm.runInContext(source.slice(start,source.indexOf('function storyQuality(',start))+source.slice(source.indexOf('function exposureAudit('),end),ctx);
const audit=plans=>ctx.exposureAudit(plans).issues;
assert.equal(audit(data.plans).length,0,'実JSONの異なる企画理由と販売予定を回数だけで警告しない');
ctx.exposureSummary=()=>({last10:{bySku:Object.fromEntries(ids.map(id=>[id,5]))},last20:{bySku:{}}});
assert.equal(audit(data.plans).length,0,'直近の露出が多くても異なる企画理由は回数だけで拒否しない');
ctx.exposureSummary=()=>({last10:{bySku:{}},last20:{bySku:{}}});
const repeated=structuredClone(data.plans);
repeated[5].mainTopic=repeated[0].mainTopic;
repeated[5].angle=repeated[0].angle;
repeated[5].customerValue=repeated[0].customerValue;
assert.equal(audit(repeated).length,1,'同じ商品セットと同じ企画理由は警告を一度だけ出す');
assert.match(audit(repeated)[0].text,/2026-11-29・2026-12-04/);
const makePlan=(index,id,reason='財布の収納とサイズを見て持ち物に合う容量を選ぶ')=>({date:new Date(Date.UTC(2030,0,1+index)).toISOString().slice(0,10),primaryPurpose:'CUSTOMER_VALUE',products:[id],mainTopic:reason,angle:reason,customerValue:'持ち物に合う収納とサイズを選べる',story1:{skuIds:[]},story2:{skuIds:[]},story3:{skuIds:[]},story4:{skuIds:[]}});
for(let i=0;i<10;i++)products.push({id:'fixture-'+i,item:'商品'+i,category:i<8?'財布':'バッグ',color:i<8?'黒':'赤',name:'商品'+i,status:'selling'});
const categoryPlans=Array.from({length:10},(_,i)=>makePlan(i,'fixture-'+i,i<8?i%2?'サイズと入る量から、財布に収める持ち物を考える':'財布の収納と大きさを比べ、持ち物に合う容量を選ぶ':'バッグの形を比べて選ぶ'));
assert(audit(categoryPlans).some(note=>note.text.includes('商品カテゴリ「財布」')),'異なるSKUでも同じカテゴリへの不必要な集中を検出');
products.forEach(row=>{if(row.id.startsWith('fixture-'))row.category=row.id==='fixture-8'||row.id==='fixture-9'?'バッグ':row.item;});
assert(audit(categoryPlans).some(note=>note.text.includes('色「黒」')),'異なるSKUによる同じ色への偏りを検出');
products.forEach(row=>{if(row.id.startsWith('fixture-')){row.item=Number(row.id.slice(8))<8?'同一アイテム':row.id;row.category=row.id;row.color=row.id;}});
assert(audit(categoryPlans).some(note=>note.text.includes('アイテム「同一アイテム」')),'異なるSKUによる同じアイテムへの偏りを検出');
const paraphrase=[makePlan(0,'fixture-0','財布の収納とサイズを見て持ち物に合う容量を選ぶ'),makePlan(1,'fixture-0','サイズ感と入る量から財布の収まりを確かめる')];
assert.equal(audit(paraphrase).length,1,'言い換えた同じ企画を一度だけ検出');
const distinct=[makePlan(0,'fixture-0','色と服装の合わせ方'),makePlan(1,'fixture-0','修理を相談するときの確認点')];
distinct[1].customerValue='長く使うための相談方法が分かる';
assert.equal(audit(distinct).length,0,'同じSKUでも顧客価値と角度が違えば警告しない');
ctx.monthlySaleStrategy=()=>[{month:'2030-01',saleDate:'2030-01-06',lineup:categoryPlans.map(plan=>({skuId:plan.products[0]}))}];
for(const plan of categoryPlans)plan.primaryPurpose='BUSINESS';
assert.equal(audit(categoryPlans).length,0,'販売前の必要な商品露出を回数だけで警告しない');
assert.match(source,/異なる理由なら回数だけで不合格にしません/);
assert.match(source,/近い理由の反復は直してください/);
console.log('PASS exposure alignment: embedded real ten-day exposure, category/color concentration, paraphrase, sale context, distinct customer value, one warning per cause, generation guidance');
