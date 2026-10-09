import {useEffect,useState} from 'react';
import {cancelRender,continueRender,delayRender,staticFile} from 'remotion';
export const Fonts=()=>{
  const [handle]=useState(()=>delayRender('Load bundled Inter fonts'));
  useEffect(()=>{Promise.all([[400,'Regular'],[600,'SemiBold'],[700,'Bold'],[800,'ExtraBold']].map(async([weight,name])=>{
    const face=new FontFace('Inter',`url("${staticFile(`assets/fonts/Inter-${name}.ttf`)}")`,{weight:String(weight)});
    document.fonts.add(await face.load());
  })).then(()=>continueRender(handle)).catch(cancelRender);},[handle]);
  return null;
};
