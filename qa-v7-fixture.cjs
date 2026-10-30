// Explicit, fictional data for legacy jsdom QA. Never contacts Firebase.
module.exports=function seedV7(window){
 window.eval(`(()=>{
  demo.categories.push({id:'qa-category',name:'財布',deleted:false});
  demo.items.push({id:'qa-item',categoryId:'qa-category',name:'NAKI',deleted:false});
  for(const [id,name] of [['qa-black','black'],['qa-natural','natural'],['qa-brown','brown']])
   demo.skus.push({id,itemId:'qa-item',name,status:'selling',price:1000,restockDate:'2026-10-04',deleted:false});
  for(const date of ['2026-08-27','2026-09-06','2026-10-22','2026-11-08'])
   demo.months[date.slice(0,7)]={date,time:'21:00',lineup:[{skuId:'qa-black',saleKind:'再販',priority:true}]};
  demo.salesHistory.push({id:'qa-old-sale',date:'2026-05-10',skuIds:['qa-black'],lineup:[{skuId:'qa-black',saleKind:'再販'}]});
  const post=createConcept(TODAY,0,'pattern');
  demo.posts.push(post);
  const next=nextPlanInfo();if(next)demo.posts.push(createConcept(next.nextFrom,2,'care'));
  const evaluated=createConcept(dayAdd(TODAY,-7),1,'light');
  evaluated.actualAt=dayAdd(TODAY,-7)+'T18:00:00+09:00';demo.posts.push(evaluated);
  refreshWork();
 })()`);
};
