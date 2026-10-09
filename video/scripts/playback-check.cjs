const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/shadow/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/home/shadow/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  const p=await b.newPage({viewport:{width:1280,height:720}});
  await p.goto('http://localhost:3003/ParaPo-Launch-60s.mp4');
  await p.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const result=await p.evaluate(async()=>{
   const video=document.querySelector('video');
   video.controls=false;video.style.width='100vw';video.style.height='100vh';video.muted=true;
   const metadata={duration:video.duration,width:video.videoWidth,height:video.videoHeight};
   video.playbackRate=3;
   await video.play();
   await new Promise((resolve,reject)=>{video.addEventListener('ended',resolve,{once:true});video.addEventListener('error',()=>reject(new Error('Video playback error')),{once:true});});
   const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
   const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0);
   const cream=Array.from(ctx.getImageData(20,20,1,1).data).slice(0,3);
   return {...metadata,ended:video.ended,currentTime:video.currentTime,error:video.error?.message||null,quality:video.getVideoPlaybackQuality().totalVideoFrames,cream};
  });
  if(result.duration!==60||result.width!==1920||result.height!==1080||!result.ended||result.error)throw new Error(JSON.stringify(result));
  if(result.cream.some((channel,i)=>Math.abs(channel-[255,249,233][i])>4))throw new Error('Brand color mismatch: '+JSON.stringify(result.cream));
  fs.writeFileSync(path.resolve(__dirname,'../out/browser-playback.json'),JSON.stringify(result,null,2));
  console.log('PASS complete browser playback',result);
  await p.screenshot({path:path.resolve(__dirname,'../out/browser-final.png')});
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
