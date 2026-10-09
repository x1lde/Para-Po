import {useCurrentFrame} from 'remotion';
import {Brand} from '../components/Brand';
import {RoutePath} from '../components/RoutePath';
import {ease,theme} from '../styles/theme';

const buildings=[{x:90,w:90,h:180},{x:220,w:105,h:280},{x:375,w:150,h:380},{x:565,w:80,h:250},{x:690,w:120,h:440},{x:855,w:95,h:315},{x:1010,w:175,h:410},{x:1240,w:100,h:240},{x:1380,w:160,h:355},{x:1600,w:110,h:295},{x:1760,w:70,h:160}];
export const ClosingScene=()=>{
  const f=Math.min(useCurrentFrame(),180);const show=ease(f,28,68);
  return <>
    <svg width={1920} height={1080} style={{position:'absolute'}}>
      <g opacity={0.1}>{buildings.map((b,i)=><g key={b.x} transform={`translate(0 ${(1-ease(f,i*3,45+i*3))*b.h})`}><rect x={b.x} y={1080-b.h} width={b.w} height={b.h} rx={5} fill={theme.teal}/>{Array.from({length:4},(_,j)=><path key={j} d={`M${b.x+12} ${1105-b.h+j*45} H${b.x+b.w-12}`} stroke={theme.cream} strokeWidth={8}/>)}</g>)}</g>
      <RoutePath d="M100 885 H380 Q460 885 500 810 L575 710 Q615 655 680 655 H800" start={0} end={60} width={8}/>
      <RoutePath d="M1120 655 H1260 Q1325 655 1360 710 L1480 870 C1510 825 1590 770 1590 710 A110 110 0 1 0 1370 710 C1370 770 1450 825 1480 870" start={25} end={90} width={8}/>
      <circle cx={1480} cy={706} r={30} stroke={theme.teal} strokeWidth={8} fill="none" opacity={ease(f,65,90)}/>
    </svg>
    <div style={{position:'absolute',top:128,width:'100%',textAlign:'center',fontSize:86,fontWeight:800,lineHeight:1.12,letterSpacing:-3,opacity:show}}>Less guessing.<br/><span style={{color:theme.teal}}>More going.</span></div>
    <div style={{position:'absolute',left:560,top:430,opacity:show,transform:`translateY(${(1-show)*35}px)`}}><Brand width={800}/></div>
    <div style={{position:'absolute',top:700,width:'100%',textAlign:'center',fontSize:40,color:theme.ink,opacity:ease(f,70,100)}}>Your commute, made simpler.</div>
    <div style={{position:'absolute',top:805,width:'100%',textAlign:'center',fontSize:28,color:theme.muted,opacity:ease(f,95,120)}}>For Makati commuters.</div>
  </>;
};
