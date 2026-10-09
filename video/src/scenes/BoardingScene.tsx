import {useCurrentFrame} from 'remotion';
import {AnimatedHeadline,Support} from '../components/AnimatedHeadline';
import {PhoneMockup} from '../components/PhoneMockup';
import {RoutePath} from '../components/RoutePath';
import {LocationPin} from '../components/LocationPin';
import {FeatureCard} from '../components/FeatureCard';
import {demoJourney} from '../data/storyboard';
import {ease,theme} from '../styles/theme';
export const BoardingScene=()=>{
  const f=useCurrentFrame();const shift=ease(f,0,30);
  return <>
    <PhoneMockup shot="journey" nextShot="boarding" swapAt={40} x={110} y={76} width={410} style={{transform:`translateX(${(1-shift)*-80}px)`}}/>
    <div style={{position:'absolute',left:670,top:115,width:1140}}>
      <AnimatedHeadline size={91}>Know where<br/>to <span style={{color:theme.teal}}>board.</span></AnimatedHeadline>
      <Support style={{marginTop:28,fontSize:32}}>Source-based guidance, right when you need it.</Support>
      <svg width={1120} height={220} style={{marginTop:24}}>
        <RoutePath d="M70 100 H355 Q415 100 455 100 H1030" start={30} end={125} width={9}/>
        <LocationPin x={70} y={93} delay={25} size={53}/>
        <LocationPin x={420} y={93} delay={70} size={66} color={theme.teal}/>
        <LocationPin x={1030} y={93} delay={110} size={53}/>
        <g fontFamily={theme.font} fontSize={26} fill={theme.ink}><text x={0} y={170}>Circuit</text><text x={355} y={170}>Board here</text><text x={950} y={170}>One Ayala</text></g>
      </svg>
      <FeatureCard delay={95} width={1040}>
        <div style={{fontSize:25,color:theme.teal,fontWeight:700,marginBottom:12}}>Boarding point</div>
        <div style={{fontSize:42,fontWeight:800,lineHeight:1.12,letterSpacing:-1.3}}>The CityFlats Circuit<br/>loading point</div>
        <div style={{fontSize:30,marginTop:19,color:theme.muted}}>{demoJourney.route}</div>
      </FeatureCard>
      <div style={{fontSize:26,color:theme.muted,marginTop:25,lineHeight:1.45}}>Confirm current loading point and service.<br/>Schematic only · exact curb/bay not field-verified.</div>
    </div>
  </>;
};
