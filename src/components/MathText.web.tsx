import { useEffect, useMemo, useRef, useState } from 'react';
import { Text } from 'react-native';
import { buildHtml } from './mathDocument';
export function MathText({text,color='#2C4251'}:{text:string;color?:string}){
 const frame=useRef<HTMLIFrameElement>(null),[height,setHeight]=useState(100);
 const html=useMemo(()=>buildHtml(text,color),[text,color]);
 useEffect(()=>{const onMessage=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow)return;const h=Number(event.data?.mishiMathHeight);if(Number.isFinite(h)&&h>0&&h<50000)setHeight(h+4);};window.addEventListener('message',onMessage);return()=>window.removeEventListener('message',onMessage);},[]);
 return <iframe ref={frame} srcDoc={html} sandbox="allow-scripts" title="Contenido con fórmulas" style={{border:0,width:'100%',height,background:'transparent',display:'block'}}/>;
}
export function RichText({text,color='#2C4251'}:{text:string;color?:string}){return /\$|\*\*|^#|^\s*[-*]\s/m.test(text)?<MathText text={text} color={color}/>:<Text style={{color,fontSize:16,lineHeight:25}}>{text}</Text>;}
