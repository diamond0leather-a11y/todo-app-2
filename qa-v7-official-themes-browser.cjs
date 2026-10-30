const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(/firebase-(?:config-v7|sync)\.js/.test(pathname)){
    res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'}).end('window.todo2V7FirebaseConfig=null;');
    return;
  }
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
    const context=await browser.newContext();
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname!=='127.0.0.1')return route.abort();
      return route.continue();
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const before=await page.evaluate(()=>{
      document.body.classList.remove('firebase-locked');
      const old=createConcept('2026-11-01');
      old.id='qa-legacy';old.parentId='official-21';old.topicGroup='ANIMAL';old.theme='旧テーマ投稿';old.stories=[];old.shots=[];old.sequence=[];
      demo.posts=[old];
      demo.storyDays=[
        {id:'qa-story-old',date:'2026-09-21',slot:1,text:'旧Story',parentId:'official-21',topicGroup:'ANIMAL'},
        {id:'qa-story-new',date:'2026-10-21',slot:1,text:'新Story',parentId:'v7-official-21',topicGroup:'革と商品を選ぶ'}
      ];
      demo.reactions=[{id:'qa-reaction-old',date:'2026-09-21',kind:'質問',question:'旧テーマの質問',parentId:'official-21',answers:[],dm:[],options:[],uses:[],skuIds:[]}];
      demo.extraThemes=[
        {id:'qa-extra-old',parentId:'official-66',title:'旧派生',group:'INDUSTRY'},
        {id:'qa-extra-new',parentId:'v7-official-66',title:'新派生',group:'生活の中で商品を見る'}
      ];
      for(const number of [21,66,99]){
        demo.posts.push({...structuredClone(old),id:'qa-old-'+number,date:'2026-09-'+String(number===21?21:number===66?22:23),parentId:'official-'+number,topicGroup:officialTopicById('official-'+number).group});
        demo.posts.push({...structuredClone(old),id:'qa-new-'+number,date:'2026-10-'+String(number===21?21:number===66?22:23),parentId:'v7-official-'+number,topicGroup:officialTopicById('v7-official-'+number).group});
      }
      const oldLabel=topicLabel(old);
      const oldOptions=officialTopicOptions(old.parentId);
      const candidate=createConcept('2026-11-02');
      candidate.id='qa-v7';demo.posts.push(candidate);
      const newOptions=officialTopicOptions(candidate.parentId);
      persist();
      const ai=window.editorialPlanner.context('ten-day');
      return {oldLabel,oldOptions,newOptions,candidate:{id:candidate.parentId,group:candidate.topicGroup},old:old.parentId,analysis:analysisPayload().officialThemes.map(t=>t.id),aiIds:ai.officialTopics.map(t=>t.id),aiLegacy:ai.legacyOfficialTopics.map(t=>t.id),aiPrompt:window.editorialPlanner.prompt('ten-day').includes('旧official-* IDは過去の意味を読むためだけ')};
    });
    assert(before.oldLabel.includes('旧テーマ')&&before.oldLabel.includes('牛革の特徴'));
    assert(before.oldOptions.some(row=>row[0]==='official-21'&&row[1].includes('牛革の特徴')));
    assert(before.oldOptions.some(row=>row[0]==='v7-official-21'&&row[1].includes('牛・馬・山羊・羊など')));
    assert(!before.newOptions.some(row=>row[0]==='official-21'));
    assert(before.candidate.id.startsWith('v7-official-'));
    assert.equal(before.analysis.length,100);
    assert(before.analysis.every(id=>id.startsWith('v7-official-')));
    assert.equal(before.aiIds.length,100);
    assert(before.aiIds.every(id=>id.startsWith('v7-official-')));
    assert.equal(before.aiLegacy.length,100);
    assert(before.aiLegacy.every(id=>id.startsWith('official-')));
    assert(before.aiPrompt);
    const selection=await page.evaluate(()=>{
      editConcept('qa-legacy');
      const unchanged=dx('#workForm');
      unchanged.requestSubmit();
      const kept=demo.posts.find(p=>p.id==='qa-legacy').parentId;
      editConcept('qa-legacy');
      const changed=dx('#workForm');
      changed.elements.namedItem('parentId').value='v7-official-21';
      changed.requestSubmit();
      const selected=demo.posts.find(p=>p.id==='qa-legacy');
      return {kept,selected:selected.parentId,group:selected.topicGroup,error:dx('#workError')?.textContent||''};
    });
    assert.equal(selection.kept,'official-21');
    assert.equal(selection.selected,'v7-official-21');
    assert.equal(selection.group,'革と商品を選ぶ');
    assert.equal(selection.error,'');
    await page.reload();
    const after=await page.evaluate(()=>({posts:demo.posts.map(p=>({id:p.id,parentId:p.parentId,group:p.topicGroup})),stories:demo.storyDays.map(s=>({id:s.id,parentId:s.parentId,text:s.text})),reactions:demo.reactions.map(r=>({id:r.id,parentId:r.parentId,question:r.question})),extras:demo.extraThemes.map(t=>({id:t.id,parentId:t.parentId})),titles:Object.fromEntries([21,66,99].flatMap(n=>['official-'+n,'v7-official-'+n].map(id=>[id,officialTopicById(id).title])))}));
    assert.equal(after.posts.find(p=>p.id==='qa-legacy').parentId,'v7-official-21');
    assert.equal(after.posts.find(p=>p.id==='qa-v7').parentId,before.candidate.id);
    assert.deepEqual(after.stories,[{id:'qa-story-old',parentId:'official-21',text:'旧Story'},{id:'qa-story-new',parentId:'v7-official-21',text:'新Story'}]);
    assert.deepEqual(after.reactions,[{id:'qa-reaction-old',parentId:'official-21',question:'旧テーマの質問'}]);
    assert.deepEqual(after.extras,[{id:'qa-extra-old',parentId:'official-66'},{id:'qa-extra-new',parentId:'v7-official-66'}]);
    assert.equal(after.titles['official-21'],'牛革の特徴');
    assert.equal(after.titles['v7-official-21'],'牛・馬・山羊・羊など、革による違い');
    assert.equal(after.titles['official-66'],'日本の革産業は今どうなっている？');
    assert.equal(after.titles['v7-official-66'],'荷物が多い人・少ない人で選び方はどう違う？');
    assert.equal(after.titles['official-99'],'財布を購入した後、どう使ってほしいか');
    assert.equal(after.titles['v7-official-99'],'いただいた声、その後どうなった？');
    for(const number of [21,66,99]){
      assert.equal(after.posts.find(p=>p.id==='qa-old-'+number).parentId,'official-'+number);
      assert.equal(after.posts.find(p=>p.id==='qa-new-'+number).parentId,'v7-official-'+number);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS isolated browser: old/new IDs, UI options, analysis context, new candidate and reload');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
