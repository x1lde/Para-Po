import {useCurrentFrame} from 'remotion';
import {settle,theme} from '../styles/theme';
export const LocationPin=({x,y,size=76,delay=0,color=theme.orange}:{x:number;y:number;size?:number;delay?:number;color?:string})=>{
  const f=useCurrentFrame();const p=settle(f,delay);
  return <g transform={`translate(${x} ${y-(1-p)*80}) scale(${p})`}>
    <ellipse cy={size*0.47} rx={size*0.28} ry={size*0.08} fill={theme.ink} opacity={0.1}/>
    <path d={`M0 ${size*0.45} C${-size*0.19} ${size*0.20} ${-size*0.4} ${-size*0.04} ${-size*0.4} ${-size*0.25} A${size*0.4} ${size*0.4} 0 1 1 ${size*0.4} ${-size*0.25} C${size*0.4} ${-size*0.04} ${size*0.19} ${size*0.2} 0 ${size*0.45}Z`} fill={color}/>
    <circle cy={-size*0.25} r={size*0.14} fill={theme.cream}/>
  </g>;
};
