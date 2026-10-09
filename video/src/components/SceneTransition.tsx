import type {ReactNode} from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {ease,theme} from '../styles/theme';
// Shared cream underlay keeps the short frame envelopes from flashing to black.
export const SceneTransition=({children,duration,background=theme.cream,final=false}:{children:ReactNode;duration:number;background?:string;final?:boolean})=>{
  const f=useCurrentFrame();const entrance=ease(f,0,10);const exit=final?1:1-ease(f,duration-10,duration);
  return <AbsoluteFill style={{background,opacity:entrance*exit,overflow:'hidden'}}>{children}</AbsoluteFill>;
};
