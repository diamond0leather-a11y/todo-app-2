const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const root=fs.readFileSync(__dirname+'/three-axis.js','utf8');
const sales=fs.readFileSync(__dirname+'/story-sales.js','utf8');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8');
const line=(source,prefix)=>{const found=source.split(/\r?\n/).find(value=>value.startsWith(prefix));assert(found,prefix);return found;};
const prefixes=['function saleFocusedSkuEligible(','function selectSubjects(','function conceptSubjects('];
const salesPrefix='const priorSelectSubjects=selectSubjects;';
const rootCode=[...prefixes.map(prefix=>line(root,prefix)),line(sales,salesPrefix)];
const distCode=[...prefixes.map(prefix=>line(html,prefix)),line(html,salesPrefix)];
assert.deepEqual(distCode,rootCode,'published selection matches source');

const skus=[
 {id:'sku-1-0-4',name:'chrome silver',itemId:'wallet',restockDate:'2026-11-08'},
 {id:'oct-restock',name:'October restock',itemId:'wallet',restockDate:'2026-10-04'},
 {id:'no-date',name:'No individual date',itemId:'wallet',restockDate:''}
];
const lineup=skus.map((s,i)=>({skuId:s.id,priority:i===0}));
const context={demo:{skus,months:{'2026-10':{date:'2026-10-04',lineup}}},TODAY:'2026-10-02',sku:id=>skus.find(s=>s.id===id),saleLine:(id,date)=>date.startsWith('2026-10')?lineup.find(l=>l.skuId===id):null,productScore:s=>s.id==='sku-1-0-4'?100:1,item:()=>({name:'wallet'})};
vm.createContext(context);
vm.runInContext(rootCode.join('\n'),context);
const near={date:'2026-10-02',until:2,next:{date:'2026-10-04',lineup},recent:[]};
const selected=Array.from(context.selectSubjects({id:'choose',object:'lineup',saleFocused:true},near));
assert(!selected.includes('sku-1-0-4'),'11/8 restock must not be advertised for 10/4 sale');
assert(selected.includes('oct-restock'),'10/4 restock remains eligible');
assert(selected.includes('no-date'),'lineup remains fallback without individual date');
assert(!Array.from(context.conceptSubjects({id:'choose',object:'lineup',saleFocused:true},near,1)).includes('sku-1-0-4'),'retry pool applies the same filter');
assert(!Array.from(context.selectSubjects({id:'sale',object:'lineup'},near)).includes('sku-1-0-4'),'explicit sale brief is filtered');
const ordinary={...near,date:'2026-09-20',until:14};
assert(context.saleFocusedSkuEligible(skus[0],ordinary,{id:'choose',object:'lineup'})===true,'non-sale comparison may use the SKU');
assert(context.saleFocusedSkuEligible(skus[0],ordinary,{id:'choose',object:'lineup',saleFocused:true})===false,'BUSINESS remains sale-focused outside the final 3 days');
console.log('PASS 10/4 sale excludes 11/8 SKU, includes matching/undated SKU, retry path, non-sale use, published/source parity');
