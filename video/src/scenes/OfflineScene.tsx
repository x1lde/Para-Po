import {useCurrentFrame} from 'remotion';
import {AnimatedHeadline,Support} from '../components/AnimatedHeadline';
import {PhoneMockup} from '../components/PhoneMockup';
import {ease,theme} from '../styles/theme';

export const OfflineScene=()=>{
  const f=useCurrentFrame();const lost=ease(f,40,62);
  return <>
    <div style={{position:'absolute',left:110,top:125,width:1070}}>
      <AnimatedHeadline size={92}>Built for the<br/>moments you<br/><span style={{color:theme.teal}}>lose signal.</span></AnimatedHeadline>
      <div style={{display:'flex',alignItems:'center',gap:32,marginTop:65}}>
        <svg width={100} height={100} viewBox="0 0 100 100"><g fill="none" stroke={theme.teal} strokeWidth={6} strokeLinecap="round" opacity={1-lost*0.75}><path d="M12 31 Q50 0 88 31 M25 48 Q50 28 75 48 M38 65 Q50 55 62 65"/><circle cx={50} cy={79} r={3} fill={theme.teal}/></g><path d="M12 12 L88 88" stroke={theme.orange} strokeWidth={7} strokeDasharray={110} strokeDashoffset={110*(1-lost)}/></svg>
        <div style={{fontSize:31,color:theme.muted}}>Without reliable internet</div>
      </div>
      <div style={{marginTop:22,padding:'25px 30px',borderLeft:`7px solid ${theme.teal}`,background:'#117C830C',width:940,opacity:ease(f,65,90)}}>
        <div style={{fontSize:43,fontWeight:800,color:theme.teal}}>ParaPo! still helps.</div>
        <div style={{fontSize:30,lineHeight:1.45,marginTop:12}}>Bundled landmark choices and route guidance.</div>
      </div>
      <Support delay={100} style={{fontSize:26,marginTop:30}}>This lookup was captured with networking disabled.<br/>Online maps are an optional connected layer.</Support>
    </div>
    <PhoneMockup shot="boarding" nextShot="offline-boarding" swapAt={65}/>
    <div style={{position:'absolute',left:1330,top:995,fontSize:23,color:theme.teal,fontWeight:600,opacity:lost}}>Actual offline lookup · app already loaded</div>
  </>;
};
