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
    await page.locator('#workForm [name="theme"]').fill('架空Story連携QA投稿');
    await page.locator('#workForm button.primary').click();
    const detail=page.locator('#dayDialog');
    await detail.waitFor({state:'visible'});
    const date=await page.evaluate(()=>demo.posts[0].standaloneStoryDate);
    assert.equal(await detail.locator('[data-v7-story-create]').count(),4,'empty post shows all four add buttons');
    for(let slot=1;slot<=4;slot++){
      await detail.locator(`[data-v7-story-create="${date}|${slot}"]`).click();
      await page.locator('#workForm [name="text"]').fill(`架空Story ${slot}`);
      await page.locator('#workForm [name="asset"]').fill(`架空写真 ${slot}`);
      await page.locator('#workForm button.primary').click();
      await detail.waitFor({state:'visible'});
      const result=await page.evaluate(()=>({stories:demo.storyDays.length,postStories:demo.posts[0].stories.length}));
      assert.deepEqual(result,{stories:slot,postStories:0},`slot ${slot} stored once in storyDays`);
      assert.equal(await detail.locator('[data-v7-story-create]').count(),4-slot);
    }
    const before=await page.evaluate(()=>demo.storyDays.map(story=>({id:story.id,date:story.date,slot:story.slot})));
    await detail.locator('[data-v7-story-edit]').first().click();
    await page.locator('#workForm [name="text"]').fill('架空Story 1 編集後');
    await page.locator('#workForm button.primary').click();
    await detail.waitFor({state:'visible'});
    assert.match(await detail.innerText(),/架空Story 1 編集後/);
    assert.deepEqual(await page.evaluate(()=>demo.storyDays.map(story=>({id:story.id,date:story.date,slot:story.slot}))),before,'editing preserves IDs and dates');
    if(await page.evaluate(()=>demo.storyDays[0].date===TODAY)){
      await page.evaluate(()=>document.querySelector('#dayDialog').close());
      await page.locator('.bottom-nav [data-nav="home"]').click();
      assert.match(await page.locator('#homeStoryPreview').innerText(),/架空Story 1 編集後/,'HOME shares the same Story');
    }
    await page.reload();
    await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    await page.locator('#planList [data-work-post]').first().click();
    await detail.waitFor({state:'visible'});
    assert.match(await detail.innerText(),/架空Story 1 編集後/);
    assert.equal(await detail.locator('[data-v7-story-create]').count(),0);
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:812});
      const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:document.documentElement.clientWidth,dialog:document.querySelector('#dayDialog').getBoundingClientRect().width}));
      assert.ok(size.page<=size.view+1,`horizontal overflow at ${width}px`);
      assert.ok(size.dialog<=width+1,`dialog overflow at ${width}px`);
    }
    const state=await page.evaluate(()=>({posts:demo.posts.length,stories:demo.storyDays.length,reactions:demo.reactions.length,shotDone:Object.keys(demo.shotDone).length,history:V7StoryState.historyEntries(demo).filter(entry=>entry.date===demo.storyDays[0].date).length}));
    assert.deepEqual(state,{posts:1,stories:4,reactions:0,shotDone:0,history:4});
    await detail.locator('[data-work-meta]').click();
    await page.locator('#workForm [name="date"]').fill('2026-10-29');
    await page.locator('#workForm button.primary').click();
    await detail.waitFor({state:'visible'});
    assert.deepEqual(await page.evaluate(()=>({date:demo.posts[0].date,storyDate:demo.posts[0].standaloneStoryDate,storyDates:demo.storyDays.map(story=>story.date)})),
      {date:'2026-10-29',storyDate:date,storyDates:[date,date,date,date]},'post move leaves Story on original date');
    await detail.locator('[data-work-meta]').click();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#workDelete').click();
    const deleted=await page.evaluate(()=>({postDeleted:demo.posts[0].deleted,stories:demo.storyDays.length,history:V7StoryState.historyEntries(demo).filter(entry=>entry.date===demo.storyDays[0].date).length}));
    assert.deepEqual(deleted,{postDeleted:true,stories:4,history:4},'post deletion leaves standalone Story and history');
    console.log('PASS isolated Edge UI: four add/edit buttons, one storyDays record per slot, reload, move/delete, history, 375/390/430px');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
