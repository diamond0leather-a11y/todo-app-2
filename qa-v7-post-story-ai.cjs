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
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.evaluate(()=>{demo.months['2026-11']={date:'2026-11-08',time:'21:00',lineup:[]};persist();refreshWork();});
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    await page.locator('[data-v7-post-new]').click();
    await page.locator('#workForm [name="theme"]').fill('架空AI Story提案QA投稿');
    await page.locator('#workForm [name="shotWhat"]').fill('架空の撮影カット');
    await page.locator('#workForm button.primary').click();
    const detail=page.locator('#dayDialog');
    await detail.waitFor({state:'visible'});
    await page.evaluate(()=>{
      demo.skus.push({id:'qa-sku',itemId:'qa-item',name:'架空SKU',status:'selling',deleted:false});
      Object.assign(demo.posts[0],{caption:'手動で保存した架空本文',cta:'手動で保存した架空CTA',skuIds:['qa-sku']});
      persist();refreshWork();showPost(demo.posts[0].id);
    });
    await detail.locator('.v7-post-shoot details > summary').click();
    await detail.locator('[data-v7-post-shot]').check();
    const initial=await page.evaluate(()=>({stories:demo.storyDays.length,embedded:demo.posts[0].stories.length,post:JSON.stringify({caption:demo.posts[0].caption,cta:demo.posts[0].cta,skuIds:demo.posts[0].skuIds,shots:demo.posts[0].shots}),shotDone:JSON.stringify(demo.shotDone)}));
    assert.equal(initial.stories,0);
    assert.equal(await detail.locator('.v7-story-suggestions').count(),1);
    await detail.locator('.v7-story-suggestions summary').click();
    assert.equal(await detail.locator('[data-v7-ai-story-slot]').count(),4);
    for(let slot=1;slot<=4;slot++){
      const card=detail.locator(`[data-v7-ai-story-slot="${slot}"]`);
      assert.match(await card.innerText(),/使う写真・動画：/);
      assert.match(await card.innerText(),/見た方への案内：/);
    }
    assert.equal(await page.evaluate(()=>demo.storyDays.length),0,'preview alone does not save');
    await detail.locator('[data-v7-story-ai-adopt$="|1"]').click();
    assert.equal(await page.evaluate(()=>demo.storyDays.length),1);
    assert.equal(await page.evaluate(()=>demo.posts[0].stories.length),0);
    await detail.locator('.v7-story-suggestions summary').click();
    await detail.locator('[data-v7-story-ai-adopt$="|2"]').click();
    const afterTwo=await page.evaluate(()=>({slots:demo.storyDays.map(story=>story.slot),ids:demo.storyDays.map(story=>story.id)}));
    assert.deepEqual(afterTwo.slots,[1,2]);
    assert.equal(new Set(afterTwo.ids).size,2);
    await detail.locator('[data-v7-story-edit]').first().click();
    await page.locator('#workForm [name="text"]').fill('AI案を採用後に手動編集した架空Story');
    await page.locator('#workForm button.primary').click();
    await detail.waitFor({state:'visible'});
    assert.match(await detail.innerText(),/AI案を採用後に手動編集した架空Story/);
    assert.deepEqual(await page.evaluate(()=>demo.storyDays.map(story=>story.id)),afterTwo.ids,'edit preserves Story IDs');
    await detail.locator('.v7-story-suggestions summary').click();
    await detail.locator('[data-v7-story-ai-adopt$="|1"]').click();
    assert.equal(await page.evaluate(()=>demo.storyDays[0].id),afterTwo.ids[0],'explicit replacement without reaction preserves Story ID');
    assert.notEqual(await page.evaluate(()=>demo.storyDays[0].text),'AI案を採用後に手動編集した架空Story');
    const beforeLocked=await page.evaluate(()=>({id:demo.storyDays[0].id,text:demo.storyDays[0].text,reactions:demo.reactions.length}));
    await page.evaluate(()=>{demo.reactions.push({id:'qa-reaction',sourceStory:{storyId:demo.storyDays[0].id},date:demo.storyDays[0].date,uses:[]});refreshWork();showPost(demo.posts[0].id);});
    await detail.locator('.v7-story-suggestions summary').click();
    assert.match(await detail.locator('[data-v7-ai-story-slot="1"]').innerText(),/反応が記録されているため置き換えできません/);
    assert.equal(await detail.locator('[data-v7-ai-story-slot="1"] [data-v7-story-ai-adopt]').count(),0);
    await detail.locator('[data-v7-story-ai-adopt$="|3"]').click();
    const final=await page.evaluate(()=>({slots:demo.storyDays.map(story=>story.slot),id:demo.storyDays[0].id,text:demo.storyDays[0].text,reactions:demo.reactions.length,embedded:demo.posts[0].stories.length,post:JSON.stringify({caption:demo.posts[0].caption,cta:demo.posts[0].cta,skuIds:demo.posts[0].skuIds,shots:demo.posts[0].shots}),shotDone:JSON.stringify(demo.shotDone)}));
    assert.deepEqual(final.slots,[1,2,3]);
    assert.equal(final.id,beforeLocked.id);assert.equal(final.text,beforeLocked.text);
    assert.equal(final.reactions,beforeLocked.reactions+1);assert.equal(final.embedded,0);
    assert.equal(final.post,initial.post);assert.equal(final.shotDone,initial.shotDone);
    await detail.locator('.v7-story-suggestions summary').click();
    await detail.locator('[data-v7-story-ai-edit$="|4"]').click();
    await page.locator('#workForm [name="text"]').fill('AI案を編集して採用した架空Story 4');
    await page.locator('#workForm button.primary').click();
    await detail.waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>demo.storyDays.find(story=>story.slot===4)?.text),'AI案を編集して採用した架空Story 4');
    await page.reload();await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    await page.locator('#planList [data-work-post]').first().click();
    assert.deepEqual(await page.evaluate(()=>demo.storyDays.map(story=>story.slot)),[1,2,3,4]);
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:812});
      const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
      assert.ok(size.scroll<=size.view+1,`horizontal overflow at ${width}px`);
    }
    console.log('PASS isolated Edge UI: preview-only, per-slot adopt/edit, reaction lock, no embedded copy, reload, 375/390/430px');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
