import {useCurrentFrame} from 'remotion';
import {AnimatedHeadline} from '../components/AnimatedHeadline';
import {RoutePath} from '../components/RoutePath';
import {LocationPin} from '../components/LocationPin';
import {ease,theme} from '../styles/theme';

const streets=['M880 80 L1830 730','M790 310 L1770 980','M1060 0 L1920 620','M900 890 L1540 40','M1260 1040 L1850 260','M760 580 L1200 0'];
const questions=[{text:'Saan ako?',x:960,y:255,delay:30},{text:'Saan sasakay?',x:1160,y:495,delay:58},{text:'Aling ruta?',x:980,y:720,delay:85}];
export const ProblemScene=()=>{
  const f=useCurrentFrame();const resolve=ease(f,135,160);
  return <>
    <svg width={1920} height={1080} style={{position:'absolute',transform:`scale(${1+ease(f,0,150)*0.035})`}}>
      <g opacity={(1-resolve)*0.65}>{streets.map((d,i)=><RoutePath key={d} d={d} color={theme.line} width={26} start={i*4} end={40+i*4}/>)}
        {['M1170 565 L1280 435 L1530 610 L1720 350','M1170 565 L1060 710 L1310 905','M1170 565 L940 410 L1070 240'].map((d,i)=><RoutePath key={d} d={d} color={[theme.teal,theme.orange,theme.yellow][i]} start={25+i*9} end={95+i*9} width={9}/>)}
        <LocationPin x={1170} y={565} delay={15}/>
      </g>
    </svg>
    <div style={{position:'absolute',left:110,top:100,fontSize:30,fontWeight:600,color:theme.teal}}>Makati City, Philippines</div>
    <AnimatedHeadline size={126} style={{position:'absolute',left:105,top:250,width:760}}>Lost in<br/>Makati<span style={{color:theme.orange}}>?</span></AnimatedHeadline>
    {questions.map(q=><div key={q.text} style={{position:'absolute',left:q.x,top:q.y,background:theme.white,border:`1px solid ${theme.line}`,padding:'22px 32px',borderRadius:18,fontSize:48,fontWeight:700,opacity:ease(f,q.delay,q.delay+18)*(1-resolve),transform:`translateY(${(1-ease(f,q.delay,q.delay+25))*30}px)`}}>{q.text}</div>)}
    <div style={{position:'absolute',left:110,top:655,width:1560,opacity:resolve,transform:`translateY(${(1-resolve)*30}px)`}}>
      <div style={{fontSize:72,fontWeight:800,letterSpacing:-3,lineHeight:1.1}}>Commuting shouldn’t be<br/>a <span style={{color:theme.teal}}>guessing game.</span></div>
      <svg width={1000} height={90}><RoutePath d="M5 50 L800 50 Q850 50 880 20" start={155} end={210}/></svg>
    </div>
  </>;
};
