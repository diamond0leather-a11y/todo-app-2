const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const editorial=fs.readFileSync(path.join(__dirname,'dist/chatgpt-editorial.js'),'utf8');
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);};
const issue=vm.runInNewContext(between(editorial,'function answerable(text){','function storyQuality(')+'\nstory2Issue');
const question='革を見るなら、次にもっと近くで見たいのはどちらですか？';
const poll={kind:'アンケート',text:question,action:'アンケートで回答する',options:['表面','裏面'],skuIds:[]};
assert.equal(issue(poll),'','question and two different choices are valid');
const dialogues=vm.runInNewContext(between(html,'const STORY_DIALOGUES=[','function storyProductScore(')+'\nSTORY_DIALOGUES');
for(const story of dialogues.filter(story=>/アンケート|二択/.test(story.kind)))assert.equal(story.options.length,2,'automatic poll candidate has two choices');
for(const options of [undefined,[],['表面'],['表面','表面'],['表面','裏面','側面']])assert(issue({...poll,options}),'missing, duplicate or excess choices are rejected');
assert(issue({...poll,kind:'質問箱',options:[]}).includes('二択'),'two-choice wording cannot be mislabeled as a question box');
assert.equal(issue({kind:'質問箱',text:'革で気になることはありますか？',action:'質問スタンプで回答',options:[]}),'' ,'non-poll story does not need choices');
assert(editorial.includes('const issue=story2Issue(p.story2);if(issue)throw Error(issue)'),'single-day reproposal validates poll options');
assert(editorial.includes('質問だけで選択肢を省略しないでください'),'ChatGPT prompts require choices');

const post={id:'post-1',skuIds:[],revision:1,stories:[
 {text:'知識',skuIds:[],participatory:false},
 {...poll,purpose:'参加・対話する',asset:'革の写真',materialMode:'過去素材使用可',participatory:true},
 {text:'発見',skuIds:[],participatory:false},
 {text:'投稿へ',skuIds:[],participatory:false}
]};
let formBody='',save;
const context={html:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;'),STORY_ROLES:['知る','参加・対話する','発見','投稿へ'],OFFICIAL_TOPICS:[],demo:{posts:[post]},structuredClone,
 sku:()=>null,skuLabel:id=>id,formInput:()=>'',formSelect:()=>'',skuPickerWork:()=>'',dx:()=>({close(){}}),openForm:(_title,body,callback)=>{formBody=body;save=callback;}};
vm.createContext(context);
vm.runInContext(between(html,'function storyPollRequired(s,i){','const finalStoryShow=showPost;')+between(html,'function validateStorySet(p,list){','function saveStoryDraft(id){'),context);
const card=context.storyCardHTML(post.stories[1],1,post,false);
assert(card.includes(question)&&card.includes('選択肢①：表面')&&card.includes('選択肢②：裏面'),'saved Story 2 card displays question and both choices');
assert(!context.storyCardHTML(post.stories[0],0,post,false).includes('選択肢①'),'non-poll Story has no choices');
assert(context.storyCardHTML({...poll,options:[]},1,post,false).includes('選択肢が未設定'),'legacy missing choices are flagged, not invented');
context.editFinalStory(post.id,1,'saved');
assert(formBody.includes('表面\n裏面'),'editing restores saved choices');
const values={theme:'',text:question,asset:'革の写真',materialMode:'過去素材使用可',action:'アンケートで回答する',combinationReason:'',overlapReason:'',parentId:'',kind:'アンケート',options:'表面\n裏面',correctAnswer:''};
const data={get:key=>values[key]??'',getAll:()=>[],has:key=>key==='participatory'};
save(data);
assert.deepEqual(Array.from(post.stories[1].options),['表面','裏面'],'editing keeps both choices');
values.options='表面\n断面';save(data);
assert.deepEqual(JSON.parse(JSON.stringify(post)).stories[1].options,['表面','断面'],'edited choices survive save and reload');
values.options='';assert.throws(()=>save(data),/選択肢を2つ/,'manual edit cannot save an incomplete poll');
console.log('PASS Story 2 poll generation rule, card, edit, save/reload, and non-poll display');
