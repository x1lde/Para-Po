import {AbsoluteFill,Html5Audio,Sequence,staticFile} from 'remotion';
import {Fonts} from '../components/Fonts';
import {SceneTransition} from '../components/SceneTransition';
import {storyboard} from '../data/storyboard';
import {theme} from '../styles/theme';
import {ProblemScene} from '../scenes/ProblemScene';
import {ProductRevealScene} from '../scenes/ProductRevealScene';
import {LandmarkScene} from '../scenes/LandmarkScene';
import {DestinationScene} from '../scenes/DestinationScene';
import {BoardingScene} from '../scenes/BoardingScene';
import {OfflineScene} from '../scenes/OfflineScene';
import {ClosingScene} from '../scenes/ClosingScene';

const scenes=[ProblemScene,ProductRevealScene,LandmarkScene,DestinationScene,BoardingScene,OfflineScene,ClosingScene];
export const ParaPoLaunch=()=> <AbsoluteFill style={{background:theme.cream,color:theme.ink,fontFamily:theme.font}}>
  <Fonts/>
  {storyboard.map((s,i)=>{const Scene=scenes[i];return <Sequence key={s.id} name={s.title} from={s.from} durationInFrames={s.duration}><SceneTransition duration={s.duration} final={i===6}><Scene/></SceneTransition></Sequence>;})}
  <Html5Audio src={staticFile('assets/audio/parapo-original.wav')} volume={0.8}/>
</AbsoluteFill>;
