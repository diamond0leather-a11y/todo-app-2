const fs=require('node:fs');
const path=require('node:path');

// An in-memory jsdom document does not fetch its relative script sources.
// Preserve the published script order using only local files inside dist/.
module.exports=function qaJsdomSource(root){
 const dist=path.join(root,'dist');
 return fs.readFileSync(path.join(dist,'index.html'),'utf8').replace(/<script\b([^>]*?)\bsrc="\.\/([^"?]+)(?:\?[^\"]*)?"([^>]*)><\/script>/g,(tag,before,name,after)=>{
  if(/\btype="module"/.test(before+' '+after))return tag;
  const file=path.resolve(dist,name);
  if(!file.startsWith(dist+path.sep)||!file.endsWith('.js'))throw Error('Unexpected QA script path: '+name);
  return '<script>'+fs.readFileSync(file,'utf8')+'</script>';
 });
};
