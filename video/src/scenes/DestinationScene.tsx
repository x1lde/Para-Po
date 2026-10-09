import {useCurrentFrame} from 'remotion';
import {AnimatedHeadline,Support} from '../components/AnimatedHeadline';
import {PhoneMockup,Touch} from '../components/PhoneMockup';
import {RoutePath} from '../components/RoutePath';
import {LocationPin} from '../components/LocationPin';
import {demoJourney} from '../data/storyboard';
import {ease,theme} from '../styles/theme';
export const DestinationScene=()=>{
  const f=useCurrentFrame();const selected=ease(f,90,120);
  return <>
    <div style={{position:'absolute',left:110,top:150,width:1070}}>
      <AnimatedHeadline size={98}>Know where<br/>you’re <span style={{color:theme.teal}}>going.</span></AnimatedHeadline>
      <Support style={{marginTop:40}}>Choose a supported Makati destination.</Support>
      <div style={{marginTop:82,fontSize:30,color:theme.muted}}>{demoJourney.origin}</div>
      <svg width={910} height={120}><RoutePath d="M10 65 H760" start={65} end={125} width={8}/><LocationPin x={775} y={58} size={56} delay={95}/></svg>
      <div style={{fontSize:76,fontWeight:800,letterSpacing:-3,opacity:selected,color:theme.teal}}>One Ayala</div>
      <div style={{fontSize:25,color:theme.muted,marginTop:38,opacity:selected}}>Selected in the actual application.</div>
    </div>
    <PhoneMockup shot="destination-picker" nextShot="journey" swapAt={102}/>
    <Touch x={1535} y={941} at={92}/>
  </>;
};
