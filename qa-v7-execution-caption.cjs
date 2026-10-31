const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const source=require('./qa-jsdom-source.cjs')(__dirname);
const {qaCaption}=require('./qa-v7-isolated-server.cjs');

(async()=>{
  const errors=[],bridge=new VirtualConsole();
  bridge.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(source,{url:'https://mock.example',runScripts:'dangerously',virtualConsole:bridge,beforeParse(window){
    window.structuredClone=structuredClone;window.confirm=()=>true;window.scrollTo=()=>{};
    window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
    window.HTMLDialogElement.prototype.close=function(){this.open=false};
  }});
  try{
    const {window}=dom,document=window.document,E=code=>window.eval(code);
    const caption=qaCaption;
    assert([...caption].length>=500,'隔離QAページと共通の架空長文を使用');
    let copied='',copyFails=false;
    Object.defineProperty(window.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(copyFails)throw Error('denied');copied=value;}}});
    E(`(()=>{const post=createConcept(TODAY,0,'pattern');post.id='qa-caption-post';post.theme='QA専用テーマ';post.caption=${JSON.stringify(caption)};post.hook='QA専用冒頭';post.cta='QA専用CTA';demo.posts=[post];demo.storyDays=[{id:'qa-story',date:TODAY,slot:1,text:'Story本文',asset:'写真'}];})()`);
    const before=JSON.stringify(E('demo')),saved=window.localStorage.getItem('todo2_v7_shared_local_v1');
    E('go("execution")');
    const text=document.querySelector('[data-execution-caption]'),toggle=document.querySelector('[data-execution-caption-toggle]'),copy=document.querySelector('[data-execution-caption-copy]');
    assert.equal(text.textContent,caption,'本文だけを改行ごと保持');
    assert(text.classList.contains('is-collapsed'),'初期状態は4行のCSSクランプ');
    assert.equal(toggle.textContent,'全文を見る');
    toggle.click();assert(!text.classList.contains('is-collapsed'));assert.equal(toggle.textContent,'閉じる');
    toggle.click();assert(text.classList.contains('is-collapsed'));assert.equal(toggle.textContent,'全文を見る');
    copy.click();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(copied,caption,'折りたたみ中も本文全文だけをコピー');
    assert(!copied.includes('QA専用テーマ')&&!copied.includes('QA専用冒頭')&&!copied.includes('QA専用CTA'),'テーマ・hook・CTAは混入しない');
    assert.equal(document.querySelector('[data-execution-copy-status]').textContent,'コピーしました');
    toggle.click();assert(!text.classList.contains('is-collapsed'));
    copied='';copy.click();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(copied,caption,'全文表示中も改行・空白・句読点を含め本文だけをコピー');
    copyFails=true;copy.click();await new Promise(resolve=>setTimeout(resolve,0));
    assert.notEqual(document.querySelector('[data-execution-copy-status]').textContent,'コピーしました','失敗を成功と表示しない');
    assert(document.querySelector('#executionContent').textContent.includes('Story本文'),'Storyは維持');
    assert(document.querySelector('#executionContent').textContent.includes('今日の撮影'),'撮影は維持');
    document.querySelector('#view-execution [data-nav="home"]').click();assert(document.querySelector('#view-home').classList.contains('active'));
    E('demo.posts[0].caption="短い本文";go("execution")');
    assert(!document.querySelector('[data-execution-caption-toggle]'),'短文は折りたたまない');
    E('demo.posts[0].caption="";renderExecution()');
    assert(!document.querySelector('[data-execution-caption-copy]'),'空本文はコピーボタンなし');
    E('demo.posts=[];renderExecution()');
    assert(!document.querySelector('[data-execution-caption-copy]'),'投稿なし日はコピーボタンなし');
    assert.equal(window.localStorage.getItem('todo2_v7_shared_local_v1'),saved,'表示操作で保存しない');
    assert.equal(JSON.parse(before).posts[0].caption,caption,'元の本文を自動変更しない');
    assert.deepEqual(errors,[]);
    console.log('PASS execution caption collapse, copy-only, failure, short/empty/no-post, Story and navigation');
  }finally{dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
