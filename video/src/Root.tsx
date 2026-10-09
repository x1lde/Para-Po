import {Composition} from 'remotion';
import {ParaPoLaunch} from './compositions/ParaPoLaunch';
import {FPS,TOTAL_FRAMES} from './data/storyboard';
export const Root=()=> <Composition id="ParaPoLaunch" component={ParaPoLaunch} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080}/>;
