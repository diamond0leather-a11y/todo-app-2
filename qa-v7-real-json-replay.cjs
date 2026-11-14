const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const folder=process.argv[2];
if(!folder||!fs.statSync(folder).isDirectory())throw Error('検証用コピーのフォルダーを指定してください');
const baseline=execFileSync('git',['show','HEAD:dist/chatgpt-editorial.js'],{encoding:'utf8'});
const current=fs.readFileSync('dist/chatgpt-editorial.js','utf8');
const themeCtx={};
vm.createContext(themeCtx);
vm.runInContext(fs.readFileSync('dist/v7-official-themes.js','utf8'),themeCtx);
const themeDefinition=fs.readFileSync('dist/index.html','utf8').match(/^const V7_OFFICIAL_TOPICS=.*$/m);
if(!themeDefinition)throw Error('正式100テーマが見つかりません');
vm.runInContext(themeDefinition[0],themeCtx);
const officialTopics=vm.runInContext('V7_OFFICIAL_TOPICS',themeCtx);
const between=(code,start,end)=>{const a=code.indexOf(start),b=code.indexOf(end,a);if(a<0||b<a)throw Error('検証処理が見つかりません: '+start);return code.slice(a,b);};
const dayAdd=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
function replay(code,raw){
 const ctx={SCHEMA:'cian-editorial-v1',SINGLE_SCOPE:'single-day-reproposal',validAxes:['CUSTOMER_VALUE','INSTAGRAM_GROWTH','BUSINESS'],V7_OFFICIAL_TOPICS:officialTopics,
  demo:{posts:[],storyDays:[]},window:{V7Story1Review:{accepts:()=>false}},V7StoryState:{entriesOnDate:()=>[]},structuredClone,
  sku:id=>typeof id==='string'&&id.trim()?{id}:null,
  short:date=>date,dayAdd,dayDiff:(date,from)=>(Date.parse(date+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000,
  importPeriod:()=>({from:'2026-11-19',to:'2026-11-28',dayFrom:11}),warnings:()=>[],qualityAudit:()=>({issues:[]}),
  editorialPostForDate:()=>null,editorialActiveStoryEntries:()=>[],editorialPostedPost:()=>false,editorialAutoPost:()=>false,editorialAutoStory:()=>false,
  showPreview(){ctx.shown=true;}};
 vm.createContext(ctx);
 vm.runInContext('let preview=null;'+between(code,'function answerable(','function storyQuality(')+between(code,'function validateEditorialShots(','function openImport(')+between(code,'function parseEditorialFile(raw){','function openImport(')+between(code,'function routeEditorialImport(data,targetPostId){','function showPreview(){'),ctx);
 try{ctx.routeEditorialImport(ctx.parseEditorialFile(raw));return ctx.shown?'PASS':'NO_PREVIEW';}catch(error){return 'FAIL '+String(error.message||error);}
}
for(const name of fs.readdirSync(folder).filter(name=>/^cian_editorial_2026-11-19_28.*\.json$/.test(name)).sort()){
 const raw=fs.readFileSync(path.join(folder,name),'utf8');
 console.log(name+' | before: '+replay(baseline,raw)+' | after: '+replay(current,raw));
}
