// Browser selection for local QA only; no application code imports this helper.
module.exports=async function launchQaBrowser(chromium){
  const attempts=[
    {headless:true},
    {channel:'msedge',headless:true},
    process.env.V7_QA_BROWSER?{executablePath:process.env.V7_QA_BROWSER,headless:true}:null,
    {channel:'chrome',headless:true}
  ].filter(Boolean);
  const failures=[];
  for(const options of attempts){
    try{return await chromium.launch(options);}
    catch(error){failures.push((options.channel||options.executablePath||'Playwright Chromium')+': '+error.message);}
  }
  throw new Error('QA browser could not start. '+failures.join(' | '));
};
