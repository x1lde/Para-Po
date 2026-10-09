import {bundle} from '@remotion/bundler';
import {openBrowser,renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'out');fs.mkdirSync(out,{recursive:true});
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium',...['chromium-1247','chromium-1243'].map(n=>path.join(os.homedir(),'.cache/ms-playwright',n,'chrome-linux64/chrome'))].filter(Boolean);
const browserExecutable=candidates.find(p=>fs.existsSync(p));
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),publicDir:path.join(root,'public')});
const browser=await openBrowser('chrome',{browserExecutable,chromiumOptions:{gl:'swangle'}});
try{
  const composition=await selectComposition({serveUrl,id:'ParaPoLaunch',puppeteerInstance:browser});
  if(composition.durationInFrames!==1800||composition.fps!==30||composition.width!==1920||composition.height!==1080) throw new Error('Invalid composition specification');
  fs.writeFileSync(path.join(out,'composition.json'),JSON.stringify(composition,null,2));
  if(process.argv[2]==='stills'){
    const frames=[0,45,110,185,239,240,285,345,419,420,485,585,660,719,720,795,855,930,959,960,1035,1125,1220,1289,1290,1365,1455,1529,1530,1580,1660,1710,1799];
    for(const frame of frames){await renderStill({serveUrl,composition,frame,output:path.join(out,`frame-${String(frame).padStart(4,'0')}.png`),puppeteerInstance:browser,imageFormat:'png'});console.log(`Reviewed-frame render ${frame}/1799`);}
  }else{
    let last=-1;
    const raw=path.join(out,'ParaPo-Launch-remotion.mp4');
    await renderMedia({serveUrl,composition,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',crf:10,x264Preset:'medium',outputLocation:raw,puppeteerInstance:browser,concurrency:2,onProgress:({progress})=>{const p=Math.floor(progress*100);if(p>=last+5){last=p;console.log(`Film render ${p}%`);}}});
    // Normalize full-range browser pixels to standard limited-range Rec.709, which
    // reliably preserves brand colors in browser players and projection systems.
    // Trim AAC encoder padding and set an exact 60-second MP4 edit list.
    execFileSync('ffmpeg',['-y','-v','error','-i',raw,'-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-color_range','tv','-map_metadata','-1','-af','atrim=duration=60,asetpts=PTS-STARTPTS','-c:a','aac','-b:a','192k','-t','60','-movflags','+faststart',path.join(out,'ParaPo-Launch-60s.mp4')]);
    console.log('Rendered out/ParaPo-Launch-60s.mp4');
  }
}finally{await browser.close({silent:true});}
