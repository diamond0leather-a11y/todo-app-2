const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    res.writeHead(200,{'content-type':target.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'}).end(data);
  });
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await require('./qa-browser-launch.cjs')(chromium);
  try{
    const context=await browser.newContext({viewport:{width:375,height:812}});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname!=='127.0.0.1'||/firebase-(config-v7|sync)\.js/.test(url.pathname))return route.abort();
      return route.continue();
    });
    const page=await context.newPage();
    page.on('pageerror',error=>console.error('PAGE ERROR:',error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.evaluate(()=>{
      demo.months['2026-11']={date:'2026-11-08',time:'21:00',lineup:[]};
      const period=salesCycleBlock(),date=period.from,long='架空の本文です。\n'.repeat(90);
      demo.posts=[
        {id:'qa-summary-1',date,format:'Feed',theme:'架空の投稿1',derivedTheme:'架空の投稿1',primaryAxis:'CUSTOMER_VALUE',planningReason:'使い方を知るための架空企画。',caption:'短い本文',cta:'商品を見る',skuIds:[],shots:[{id:'qa-cut-1',media:'写真',what:'正面',skuIds:[],count:1}],stories:[],revision:0},
        {id:'qa-summary-2',date:dayAdd(date,1),format:'Reel',theme:'架空の投稿2',derivedTheme:'架空の投稿2',primaryAxis:'INSTAGRAM_GROWTH',caption:long,cta:'',skuIds:[],shots:[1,2,3].map(n=>({id:'qa-cut-'+(n+1),media:'写真',what:['財布を開いた状態','使用イメージ','手元の接写'][n-1],skuIds:[],count:1})),stories:[],revision:0},
        {id:'qa-summary-3',date:period.nextFrom,format:'Feed',theme:'架空の次期間投稿',derivedTheme:'架空の次期間投稿',primaryAxis:'BUSINESS',planningReason:'販売前に商品を知ってもらう。',caption:'次の期間の本文',cta:'',skuIds:[],shots:[],stories:[],revision:0}
      ];
      demo.shotDone['shot-id|qa-cut-1']=true;
      persist();refreshWork();
    });
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    assert.equal(await page.locator('#v7QaPlanDiagnostics, [id*="QaPlanDiagnostics"]').count(),0,'temporary diagnostics removed');
    const cards=page.locator('#planList article.card:has([data-work-post])');
    assert.equal(await cards.count(),3);
    const before=await page.evaluate(()=>JSON.stringify(demo));
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:812});
      for(let index=0;index<2;index++){
        const card=cards.nth(index),details=card.locator('[data-v7-post-summary]');
        const reason=card.locator('[data-v7-planning-reason]');
        assert.equal(await reason.count(),1,`one planning reason at ${width}px`);
        assert.equal(await reason.evaluate(el=>el.open),false,'planning reason closed by default');
        assert.equal(await reason.locator('summary').innerText(),'企画意図を見る');
        assert.equal(await card.locator('.row:not(.between) .badge').innerText(),index?'INSTAGRAM GROWTH｜新しい人に届ける':'CUSTOMER VALUE｜楽しむ・知る・役立つ');
        await reason.locator('summary').click();
        assert.match(await reason.innerText(),index?/未設定/:/使い方を知るための架空企画。/);
        assert.equal(await details.count(),1,`summary exists at ${width}px`);
        assert.equal(await details.evaluate(el=>el.open),false,'closed by default');
        assert.equal(await details.locator('summary').innerText(),'内容を見る');
        await details.locator('summary').click();
        const content=await details.innerText();
        assert.ok(content.includes(index?'架空の本文です。':'短い本文'));
        assert.ok(content.includes(index?'未設定':'商品を見る'));
        assert.ok(content.includes(index?'Cut 3：手元の接写':'Cut 1：正面'));
        if(index===0)assert.ok(content.includes('撮影済み'));
        assert.equal(await card.locator('[data-work-post]').count(),1,'edit link preserved');
        assert.equal(await card.locator('[data-work-post]').innerText(),'編集する');
        const size=await card.evaluate(el=>({page:document.documentElement.scrollWidth,view:document.documentElement.clientWidth,card:el.getBoundingClientRect().width,summary:el.querySelector('.editorial-post-contents summary').getBoundingClientRect().height}));
        assert.ok(size.page<=size.view+1,`page overflow ${width}px`);
        assert.ok(size.card<=width+1,`card overflow ${width}px`);
        assert.ok(size.summary>=44,`summary touch height ${width}px`);
        await details.locator('summary').click();
        await reason.locator('summary').click();
      }
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(demo)),before,'viewing does not change saved data');
    await page.locator('[data-editorial-period="next"]').click();
    assert.equal(await cards.nth(2).locator('[data-v7-post-summary]').count(),1,'next period post has summary');
    assert.equal(await cards.nth(2).locator('[data-work-post]').innerText(),'編集する');
    assert.equal(await cards.nth(2).locator('.row:not(.between) .badge').innerText(),'BUSINESS｜商品・販売・信頼');
    assert.equal(await cards.nth(2).locator('[data-v7-planning-reason]').count(),1);
    await cards.nth(2).locator('[data-v7-planning-reason] summary').click();
    assert.match(await cards.nth(2).locator('[data-v7-planning-reason]').innerText(),/販売前に商品を知ってもらう。/);
    await cards.nth(2).locator('[data-v7-post-summary] summary').click();
    assert.match(await cards.nth(2).locator('[data-v7-post-summary]').innerText(),/次の期間の本文/);
    await page.locator('[data-editorial-period="current"]').click();
    await cards.nth(0).locator('[data-work-post]').click();
    assert.equal(await page.locator('#dayDialog').evaluate(el=>el.open),true,'edit opens post detail');
    await page.evaluate(()=>document.querySelector('#dayDialog').close());
    assert.equal(await page.locator('#planList [data-v7-story-plan-date] [data-v7-post-summary]').count(),0,'no-post days have no post summary');
    assert.equal(await page.locator('#planList [data-v7-story-plan-date] [data-v7-planning-reason]').count(),0,'no-post days have no planning reason');
    assert.ok(await page.locator('#planList [data-v7-story-day-status]').count()>0,'Story day panels remain');
    for(const action of ['renderPlan','refreshWork','month-change','remote-replace']){
      await page.evaluate(action=>{
        if(action==='renderPlan')renderPlan();
        if(action==='refreshWork')refreshWork();
        if(action==='month-change'){monthCursor='2026-12';renderPlan();}
        if(action==='remote-replace')window.todo2SyncBridge.replace(window.todo2SyncBridge.read());
      },action);
      assert.equal(await cards.count(),3,`post cards after ${action}`);
      assert.equal(await cards.nth(0).locator('[data-v7-post-summary]').count(),1,`one summary after ${action}`);
      assert.equal(await cards.nth(1).locator('[data-v7-post-summary]').count(),1,`one summary after ${action}`);
      assert.equal(await cards.nth(2).locator('[data-v7-post-summary]').count(),1,`one next summary after ${action}`);
      assert.equal(await page.locator('#planList [data-v7-planning-reason]').count(),3,`one planning reason per post after ${action}`);
      assert.equal(await page.evaluate(()=>JSON.stringify(demo)),before,`data unchanged after ${action}`);
    }
    await page.reload();
    await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    assert.equal(await cards.count(),3,'posts remain after reload');
    assert.equal(await cards.nth(1).locator('[data-v7-post-summary]').count(),1);
    assert.equal(await page.locator('#planList [data-v7-planning-reason]').count(),3,'planning reasons remain after reload');
    await cards.nth(1).locator('[data-v7-post-summary] summary').click();
    assert.match(await cards.nth(1).locator('[data-v7-post-summary]').innerText(),/Cut 3：手元の接写/);
    assert.equal(await page.evaluate(()=>JSON.stringify(demo)),before,'reload does not change saved data');
    console.log('PASS isolated Edge UI: current/next post summaries, no-post days, shotDone, CTA set/unset, 1/3 cuts, long text, reload, no data mutation, 375/390/430px');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
