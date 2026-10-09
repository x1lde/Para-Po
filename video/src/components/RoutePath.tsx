import {useCurrentFrame} from 'remotion';
import {ease,theme} from '../styles/theme';
export const RoutePath=({d,start=0,end=60,color=theme.teal,width=12,progress}:{d:string;start?:number;end?:number;color?:string;width?:number;progress?:number})=>{
  const frame=useCurrentFrame();const p=progress??ease(frame,start,end);
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-p}/>;
};
