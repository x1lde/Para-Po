import {Img,staticFile} from 'remotion';
export const Brand=({width=640,mark=false}:{width?:number;mark?:boolean})=><div style={{display:'flex',alignItems:'center',gap:24}}>
  {mark?<Img src={staticFile('assets/branding/parapo-mark.png')} style={{width:width*0.23,height:width*0.23,objectFit:'contain'}}/>:null}
  <Img src={staticFile('assets/branding/parapo-wordmark.png')} style={{width,objectFit:'contain'}}/>
</div>;
