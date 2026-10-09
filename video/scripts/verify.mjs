import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'out/composition.json')));
assert.equal(metadata.durationInFrames,1800);assert.equal(metadata.fps,30);assert.equal(metadata.width,1920);assert.equal(metadata.height,1080);
const story=fs.readFileSync(path.join(root,'src/data/storyboard.ts'),'utf8');
const slots=[...story.matchAll(/from:(\d+),duration:(\d+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
assert.equal(slots.length,7);let end=0;for(const [start,length] of slots){assert.equal(start,end);end+=length;}assert.equal(end,1800);
const evidence=JSON.parse(fs.readFileSync(path.join(root,'public/assets/screenshots/capture-evidence.json')));
assert.equal(evidence.offlineLookupPassed,true);assert.deepEqual(evidence.errors,[]);
assert.deepEqual(evidence.offlineDestinationChanges,['glorietta','one_ayala'],'Offline evidence must include genuinely changed selection state');
const data=JSON.parse(fs.readFileSync(path.join(root,'../src/features/transport/planner/makati-journeys.json')));
const leg=data.journeys['ayala_malls_circuit|one_ayala'].options[0].legs.find(l=>l.type==='ride');
assert.equal(leg.board.name,'The CityFlats Circuit loading point');assert.equal(data.routes[leg.route].name,'Circuit Makati–One Ayala P2P');assert.equal(leg.path.length,0);
const file=path.join(root,'out/ParaPo-Launch-60s.mp4');
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
const video=probe.streams.find(s=>s.codec_type==='video');const audio=probe.streams.find(s=>s.codec_type==='audio');
assert.equal(video.codec_name,'h264');assert.equal(video.width,1920);assert.equal(video.height,1080);assert.equal(video.avg_frame_rate,'30/1');assert.equal(Number(video.nb_read_frames),1800);assert.equal(Number(video.duration),60);assert.equal(Number(probe.format.duration),60);assert.equal(audio.codec_name,'aac');
assert.equal(Number(audio.duration),60);assert.equal(video.pix_fmt,'yuv420p');assert.equal(video.color_range,'tv');assert.equal(video.color_space,'bt709');
// Lossy H.264 reconstruction can differ by a few pixel levels during an otherwise
// static hold. Require identical pristine bookend frames and less than 0.25/255
// mean decoded variation; do not incorrectly require compressed-byte equality.
assert.deepEqual(fs.readFileSync(path.join(root,'out/frame-1710.png')),fs.readFileSync(path.join(root,'out/frame-1799.png')),'Pristine logo hold must be static');
const hold=execFileSync('ffmpeg',['-v','error','-ss','57','-i',file,'-an','-vf','scale=480:270','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:64*1024*1024});
const frameBytes=480*270*3;assert.equal(hold.length,90*frameBytes);
let maxMeanDelta=0;
for(let f=1;f<90;f++){let delta=0;for(let p=0;p<frameBytes;p++)delta+=Math.abs(hold[f*frameBytes+p]-hold[p]);maxMeanDelta=Math.max(maxMeanDelta,delta/frameBytes);}
assert(maxMeanDelta<0.25,`Logo hold moves: mean variation ${maxMeanDelta}`);
fs.writeFileSync(path.join(root,'out/verification.json'),JSON.stringify({passed:true,frames:1800,duration:60,fps:30,resolution:'1920x1080',codec:'h264',audio:'aac',sceneCount:7,offlineCapture:true,sourceDataMatches:true,finalLogoHoldFrames:90,holdMaxMeanPixelDelta:maxMeanDelta,ffprobe:probe},null,2));
console.log('PASS: 7 scenes, source data and offline evidence, H.264/AAC 1920×1080 30 FPS, 1,800 frames, exactly 60 seconds, final 90-frame visual hold.');
