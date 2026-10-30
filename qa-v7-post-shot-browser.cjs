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
    const type=target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html';
    res.writeHead(200,{'content-type':type+'; charset=utf-8'}).end(data);
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
    // Firebase scripts are blocked; reveal only this disposable browser context.
    await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.evaluate(()=>{demo.months['2026-11']={date:'2026-11-08',time:'21:00',lineup:[]};persist();refreshWork();});
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    await page.locator('[data-v7-post-new]').click();
    await page.locator('#workForm [name="theme"]').fill('v7架空撮影QA投稿');
    await page.locator('#workForm [name="shotWhat"]').fill('架空の商品を撮る');
    await page.locator('#workForm button.primary').click();
    const detail=page.locator('#dayDialog');
    await detail.waitFor({state:'visible'});
    await detail.locator('.v7-post-shoot details > summary').click();
    let checkbox=detail.locator('[data-v7-post-shot]');
    assert.equal(await checkbox.count(),1);
    assert.equal(await checkbox.isChecked(),false);
    await checkbox.check();
    assert.equal(await detail.locator('.v7-post-shot-toggle').textContent(),'撮影済み');
    let keys=await page.evaluate(()=>Object.keys(demo.shotDone));
    assert.equal(keys.length,1);
    await page.evaluate(()=>document.querySelector('#dayDialog').close());
    await page.locator('.bottom-nav [data-nav="home"]').click();
    await page.locator('#dailyExtras summary').click();
    await page.locator('[data-v7-shoot-link]').click();
    const batchCount=await page.locator('#shootList [data-work-shot]').count();
    assert.equal(batchCount,1,await page.locator('#shootList').innerText());
    const batch=page.locator('#shootList [data-work-shot]').first();
    assert.equal(await batch.isChecked(),true);
    await batch.uncheck();
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    await page.locator('#planList [data-work-post]').first().click();
    await page.locator('#dayDialog .v7-post-shoot details > summary').click();
    checkbox=page.locator('#dayDialog [data-v7-post-shot]');
    assert.equal(await checkbox.isChecked(),false);
    await checkbox.check();
    await page.reload();
    await page.evaluate(()=>document.body.classList.remove('firebase-locked'));
    await page.locator('.bottom-nav [data-nav="plan"]').click();
    await page.locator('#planList [data-work-post]').first().click();
    await page.locator('#dayDialog .v7-post-shoot details > summary').click();
    assert.equal(await page.locator('#dayDialog [data-v7-post-shot]').isChecked(),true);
    keys=await page.evaluate(()=>Object.keys(demo.shotDone));
    assert.equal(keys.length,1,'repeated UI toggles do not create duplicate records');
    for(const width of [375,390,430]){
      await page.setViewportSize({width,height:812});
      const sizes=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:document.documentElement.clientWidth,dialog:document.querySelector('#dayDialog').getBoundingClientRect().width,toggle:document.querySelector('.v7-post-shot-toggle').getBoundingClientRect().height}));
      assert.ok(sizes.page<=sizes.view+1,`horizontal overflow at ${width}px`);
      assert.ok(sizes.dialog<=width+1,`dialog overflow at ${width}px`);
      assert.ok(sizes.toggle>=44,`checkbox target too short at ${width}px`);
    }
    console.log('PASS isolated Edge UI: detail↔batch toggle, reload, one record, 375/390/430px');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
