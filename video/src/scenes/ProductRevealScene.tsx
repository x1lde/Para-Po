import {useCurrentFrame} from 'remotion';
import {AnimatedHeadline,Support} from '../components/AnimatedHeadline';
import {PhoneMockup} from '../components/PhoneMockup';
import {Brand} from '../components/Brand';
import {RoutePath} from '../components/RoutePath';
import {ease,theme} from '../styles/theme';
export const ProductRevealScene=()=>{
  const f=useCurrentFrame();const reveal=ease(f,25,65);
  return <>
    <svg width={1920} height={1080} style={{position:'absolute',opacity:1-ease(f,70,100)}}><RoutePath d="M110 820 L1130 820 Q1240 820 1240 710 L1240 145 Q1240 75 1310 75 L1680 75 Q1750 75 1750 145 L1750 935 Q1750 1005 1680 1005 L1310 1005 Q1240 1005 1240 935 L1240 710" start={0} end={60} width={8}/></svg>
    <div style={{position:'absolute',left:110,top:190,width:1000}}>
      <AnimatedHeadline delay={12} size={72}>Meet ParaPo!</AnimatedHeadline>
      <div style={{marginTop:45,opacity:reveal,transform:`scale(${0.94+reveal*0.06})`,transformOrigin:'left center'}}><Brand width={720} mark/></div>
      <Support delay={45} style={{marginTop:48,fontSize:44,color:theme.ink}}>Your commute, made simpler.</Support>
      <Support delay={65} style={{marginTop:95,color:theme.teal,fontSize:30}}>Made for Makati. Built around landmarks.</Support>
    </div>
    <PhoneMockup shot="home" x={1280} y={70} style={{opacity:reveal,transform:`translateY(${(1-reveal)*60}px) rotate(${(1-reveal)*4}deg)`}}/>
  </>;
};
