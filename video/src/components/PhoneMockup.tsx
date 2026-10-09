import type {CSSProperties} from 'react';
import {Img,staticFile,useCurrentFrame} from 'remotion';
import {ease,theme} from '../styles/theme';

export const PhoneMockup=({shot,nextShot,swapAt=60,finalShot,finalAt=210,x=1310,y=70,width=430,style={}}:{shot:string;nextShot?:string;swapAt?:number;finalShot?:string;finalAt?:number;x?:number;y?:number;width?:number;style?:CSSProperties})=>{
  const frame=useCurrentFrame();const blend=nextShot?ease(frame,swapAt,swapAt+14):0;
  const finalBlend=finalShot?ease(frame,finalAt,finalAt+14):0;
  const height=width*900/430;
  return <div style={{position:'absolute',left:x,top:y,width:width+28,height:height+28,borderRadius:52,background:theme.ink,padding:14,boxShadow:'0 35px 65px #24343B28',...style}}>
    <div style={{position:'relative',width,height,overflow:'hidden',borderRadius:39,background:theme.cream}}>
      <Img src={staticFile(`assets/screenshots/${shot}.png`)} style={{position:'absolute',width:'100%',height:'100%'}}/>
      {nextShot?<Img src={staticFile(`assets/screenshots/${nextShot}.png`)} style={{position:'absolute',width:'100%',height:'100%',opacity:blend}}/>:null}
      {finalShot?<Img src={staticFile(`assets/screenshots/${finalShot}.png`)} style={{position:'absolute',width:'100%',height:'100%',opacity:finalBlend}}/>:null}
    </div>
    <div style={{position:'absolute',top:7,left:'50%',transform:'translateX(-50%)',width:100,height:6,borderRadius:8,background:'#607176'}}/>
  </div>;
};
export const Touch=({x,y,at}:{x:number;y:number;at:number})=>{
  const f=useCurrentFrame();const p=ease(f,at,at+25);
  const opacity=f<at?0:1-p;
  return <div style={{position:'absolute',left:x-25,top:y-25,width:50,height:50,borderRadius:'50%',border:`3px solid ${theme.orange}`,background:'#FF6B3530',opacity,transform:`scale(${0.5+p*1.7})`}}/>;
};
