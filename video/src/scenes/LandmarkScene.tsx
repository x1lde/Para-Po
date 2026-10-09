import {useCurrentFrame} from 'remotion';
import {AnimatedHeadline,Support} from '../components/AnimatedHeadline';
import {PhoneMockup,Touch} from '../components/PhoneMockup';
import {FeatureCard} from '../components/FeatureCard';
import {ease,theme} from '../styles/theme';
export const LandmarkScene=()=>{
  const f=useCurrentFrame();const scan=ease(f,25,105);const manual=ease(f,125,150);
  return <>
    <div style={{position:'absolute',left:110,top:140,width:1050}}>
      <AnimatedHeadline size={104}>Start with<br/>what you <span style={{color:theme.teal}}>see.</span></AnimatedHeadline>
      <Support style={{marginTop:35,width:880}}>Recognize supported landmarks on-device.</Support>
      <div style={{marginTop:45,opacity:1-manual}}>
        <div style={{fontSize:25,fontWeight:600,color:theme.muted,marginBottom:16}}>Native recognition workflow · illustration</div>
        <svg width={760} height={230} viewBox="0 0 760 230">
          <rect x={4} y={4} width={740} height={216} rx={25} fill="#E8EEE2"/>
          <path d="M140 195 V92 H530 V195 M180 92 V50 H490 V92 M190 195 V122 H485 V195" fill={theme.cream} stroke={theme.teal} strokeWidth={5}/>
          {[210,265,320,375,430].map(x=><rect key={x} x={x} y={125} width={30} height={53} fill="#117C8340"/>)}
          <path d="M100 75 V35 H145 M605 35 H650 V75 M100 155 V195 H145 M605 195 H650 V155" fill="none" stroke={theme.orange} strokeWidth={6}/>
          <path d={`M115 ${50+scan*135} H635`} stroke={theme.teal} strokeWidth={3} opacity={scan<1?0.7:0}/>
        </svg>
        <div style={{fontSize:25,color:theme.muted,marginTop:10}}>Camera → local model → confirm landmark</div>
      </div>
      <div style={{position:'absolute',top:360,opacity:manual}}>
        <FeatureCard delay={125}><div style={{fontSize:38,fontWeight:700}}>Or choose your landmark.</div><div style={{fontSize:30,color:theme.muted,marginTop:12}}>Ayala Malls Circuit</div></FeatureCard>
        <div style={{fontSize:26,color:theme.muted,marginTop:28}}>Actual app footage shows the manual fallback.</div>
      </div>
    </div>
    <PhoneMockup shot="camera" nextShot="origin-picker" swapAt={135} finalShot="origin-selected" finalAt={225}/>
    <Touch x={1530} y={475} at={125}/>
    <Touch x={1530} y={941} at={215}/>
    <div style={{position:'absolute',left:110,bottom:80,fontSize:25,color:theme.muted}}>Native camera/model flow implemented; physical-device footage pending.</div>
  </>;
};
