import {Easing, interpolate, spring} from 'remotion';

export const theme = {
  cream: '#FFF9E9', yellow: '#F9C846', teal: '#117C83', orange: '#FF6B35',
  ink: '#24343B', muted: '#516970', white: '#FFFFFF', line: '#E6DCC5',
  font: 'Inter, sans-serif', safe: 100,
} as const;
export const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export const ease = (f:number,start:number,end:number) => interpolate(f,[start,end],[0,1],{...clamp,easing:Easing.bezier(0.22,1,0.36,1)});
export const settle = (frame:number,delay=0) => spring({frame:frame-delay,fps:30,config:{damping:22,stiffness:110,mass:0.8}});
