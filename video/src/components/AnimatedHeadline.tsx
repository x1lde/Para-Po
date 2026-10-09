import type {CSSProperties, ReactNode} from 'react';
import {useCurrentFrame} from 'remotion';
import {settle,theme} from '../styles/theme';

export const AnimatedHeadline = ({children,delay=0,size=100,style={}}:{children:ReactNode;delay?:number;size?:number;style?:CSSProperties}) => {
  const f=useCurrentFrame(); const p=settle(f,delay);
  return <div style={{fontSize:size,fontWeight:800,lineHeight:1.04,letterSpacing:-size*0.047,color:theme.ink,opacity:p,transform:`translateY(${(1-p)*48}px)`,...style}}>{children}</div>;
};
export const Support = ({children,delay=15,style={}}:{children:ReactNode;delay?:number;style?:CSSProperties}) => {
  const f=useCurrentFrame();const p=settle(f,delay);
  return <div style={{fontSize:34,lineHeight:1.45,color:theme.muted,opacity:p,transform:`translateY(${(1-p)*24}px)`,...style}}>{children}</div>;
};
