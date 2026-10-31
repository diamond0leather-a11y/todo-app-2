// Local-only visual QA server. Firebase config and sync code are never served.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const publicDir=path.resolve(__dirname,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const port=Number(process.env.V7_QA_PORT||18961);
const qaCaption=[
 '架空の小さな道具入れを、朝の机の上に置くところから考えてみました。何かを急いで取り出す場面では、見た目の印象だけでなく、片手で開けられるか、戻す場所がすぐ分かるかが大切です。この投稿では、使う人の一日を想像しながら、形と動きの関係を順番に見ていきます。',
 '最初の写真では、何も入れていない状態を見せます。次に、架空のメモカードと小さな鍵を入れ、口を開いた時に中身がどう並ぶかを確かめます。最後は、机の端に置いて手を伸ばす場面です。同じ道具でも、置き方や光の向きが変わると、使いやすさの伝わり方は変わります。',
 '素材については、特定の実在商品や販売予定を示すものではありません。画面確認のために用意した架空の色と質感を使い、明るい場所と落ち着いた場所での見え方を比べます。色を一つだけで判断せず、手持ちのものと一緒に眺めると、毎日の持ち物として想像しやすくなります。',
 '使う場面を考える時は、収納量を数字だけで決めないことも大切です。入れたいものがすっと収まるか、取り出した後に戻しやすいか、机やバッグの中で迷子にならないか。ひとつずつ確かめることで、自分に合う形が少しずつ見えてきます。',
 'この架空の道具入れには、正解の使い方を決めていません。文具をまとめる日もあれば、外出前に小物を一時的に置く日もあります。見る人が自分の生活に置き換えられるよう、写真では余計な小道具を増やさず、手の動きと置く場所が分かる構図にしました。',
 '今回の内容は画面表示の確認専用です。実際のお客様の声、実在商品の仕様、価格、在庫、販売日を示していません。投稿本文が長くても段落と改行が保たれるか、冒頭から最後まで横にはみ出さず読めるかを、この文章で確認します。'
].join('\n\n');
const qaPrelude=`<script>
// Only on /qa-execution: hide all existing browser storage from this page.
for(const [name,value] of Object.entries({getItem(){return null},setItem(){},removeItem(){},clear(){}})){
  Object.defineProperty(Storage.prototype,name,{configurable:true,writable:true,value});
}
window.qaExecutionStorageIsolated=true;
</script>`;
const qaFixture=`<script>
(()=>{
  if(!window.qaExecutionStorageIsolated||location.pathname!=='/qa-execution')return;
  try{
    const caption=${JSON.stringify(qaCaption)};
    if([...caption].length<500||demo.posts.length||demo.storyDays.length||demo.skus.length)throw Error('隔離初期状態または本文を確認できません');
    const first=createConcept(TODAY,0,'pattern'),second=createConcept(TODAY,1,'light');
    const sample=structuredClone(demo);
    sample.categories.push({id:'qa-category',name:'架空の道具'});
    sample.items.push({id:'qa-item',categoryId:'qa-category',name:'空想の小物入れ'});
    sample.skus.push({id:'qa-sku',itemId:'qa-item',name:'青い試作品',material:'架空素材',status:'準備中'});
    Object.assign(first,{id:'qa-post-feed',date:TODAY,format:'Feed',theme:'架空の道具入れを使う場面',derivedTheme:'毎日の置き場所を考える',takeaway:'使う動作から形を見直す',skuIds:['qa-sku'],plannedTime:'18:00',hook:'小さな道具は、どこに置くと使いやすいでしょうか。',caption,cta:'写真を見比べて、自分ならどこに置くか考えてみてください。',stories:[],paused:false,deleted:false,actualAt:null,shots:[
      {id:'qa-cut-1',signature:'qa-cut-1',media:'写真',what:'机の上に置いた正面',skuIds:['qa-sku'],count:1},
      {id:'qa-cut-2',signature:'qa-cut-2',media:'写真',what:'中に架空の小物を入れた状態',skuIds:['qa-sku'],count:1},
      {id:'qa-cut-3',signature:'qa-cut-3',media:'動画',what:'手を伸ばして開く動き',skuIds:['qa-sku'],count:1}
    ]});
    first.sequence=first.shots.map((shot,index)=>({order:index+1,words:shot.what,shotId:shot.id}));
    Object.assign(second,{id:'qa-post-reel',date:TODAY,format:'Reel',theme:'置き場所で変わる使い心地',derivedTheme:'手の動きと置き場所',takeaway:'同じ道具を二つの場所で見比べる',skuIds:[],plannedTime:'20:00',hook:'置く場所を変えると、動きも変わります。',caption:'架空の机と棚で、手を伸ばす動きを見比べる画面確認用の投稿です。',cta:'どちらの場面が見やすいか、映像で確かめてください。',stories:[],shots:[],sequence:[],paused:false,deleted:false,actualAt:null});
    sample.posts=new URLSearchParams(location.search).get('mode')==='no-post'?[]:[first,second];
    sample.shotDone={'shot-id|qa-cut-1':true};
    sample.storyDays=[
      {id:'qa-story-1',date:TODAY,slot:1,purpose:'毎日見る理由',theme:'朝の机',text:'今日は架空の机の上から始めます。',asset:'架空の机と道具入れの写真',action:'写真を見る',kind:'なし',options:[],skuIds:[]},
      {id:'qa-story-2',date:TODAY,slot:2,purpose:'会話',theme:'置き場所',text:'小物を置くなら、机と棚のどちらが使いやすそうですか？',asset:'机と棚を並べた架空の画像',action:'選択肢を見る',kind:'アンケート',options:['机の上','棚の上'],skuIds:[]},
      {id:'qa-story-3',date:TODAY,slot:3,purpose:'商品を補う',theme:'形を見比べる',text:'架空の小物入れを、開いた状態と閉じた状態で比べます。',asset:'架空の試作品を写した写真2枚',action:'違いを見る',kind:'なし',options:[],skuIds:['qa-sku']},
      {id:'qa-story-4',date:TODAY,slot:4,purpose:'次の行動',theme:'今日の投稿へ',text:'詳しい使い方は今日の投稿で確認できます。',asset:'架空の試作品の短い動画',action:'今日のFeedを見る',kind:'なし',options:[],skuIds:[]}
    ];
    demo=sample;
    renderHome();
    document.title='[架空データ・隔離QA] '+document.title;
    window.qaExecutionReady={posts:sample.posts.length,stories:sample.storyDays.length,shots:first.shots.length,done:1,captionLength:[...caption].length,storageIsolated:true};
  }catch(error){
    const warning=document.createElement('p');warning.textContent='架空データの準備に失敗しました: '+error.message;warning.style.color='red';document.body.prepend(warning);
  }
})();
</script>`;
function qaExecutionHtml(html){
 if(!html.includes('</head>')||!html.includes('</body>'))throw Error('QA用HTMLの挿入位置が見つかりません');
 return html.replace('</head>',qaPrelude+'</head>').replace('</body>',qaFixture+'</body>');
}
http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  if(pathname==='/qa-execution'){
    fs.readFile(path.join(publicDir,'index.html'),'utf8',(error,html)=>{
      if(error){response.writeHead(404);response.end();return;}
      try{
        const page=qaExecutionHtml(html);
        response.writeHead(200,{'content-type':mime['.html'],'cache-control':'no-store','content-security-policy':"default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'"});
        response.end(page);
      }catch(e){response.writeHead(500);response.end('QA page unavailable');}
    });
    return;
  }
  if(pathname==='/firebase-config-v7.js'||pathname==='/firebase-sync.js'){
    response.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});
    response.end(pathname==='/firebase-config-v7.js'?'window.todo2V7FirebaseConfig=null;':'Object.assign(window.todo2SyncBridge,{flush:async()=>{},stage:()=>{},hasPending:()=>false});document.body.classList.remove("firebase-locked");');
    return;
  }
  const relative=pathname==='/'?'index.html':pathname.slice(1);
  const file=path.resolve(publicDir,relative);
  if(file!==publicDir&&!file.startsWith(publicDir+path.sep)){response.writeHead(403);response.end();return;}
  fs.readFile(file,(error,content)=>{if(error){response.writeHead(404);response.end();return;}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(content);});
}).listen(port,'127.0.0.1',()=>console.log(`Isolated v7 QA server: http://127.0.0.1:${port}/ (Firebase scripts blocked)`));
