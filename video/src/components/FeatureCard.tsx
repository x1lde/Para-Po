import type {ReactNode} from 'react';
import {useCurrentFrame} from 'remotion';
import {settle,theme} from '../styles/theme';
export const FeatureCard=({children,delay=0,width=750}:{children:ReactNode;delay?:number;width?:number})=>{
  const f=useCurrentFrame();const p=settle(f,delay);
  return <div style={{width,padding:'28px 34px',background:theme.white,border:`1px solid ${theme.line}`,borderRadius:24,boxShadow:'0 12px 30px #24343B08',opacity:p,transform:`translateY(${(1-p)*28}px)`}}>{children}</div>;
};
