import { useEffect, useRef, useState } from 'react';
import { type Flashcard, getDueFlashcards, reviewFlashcard } from '../../services/study';
import { FlashcardView } from './FlashcardView';
export function FlashcardsScreen({materialId}:{materialId?:string}){
 const [queue,setQueue]=useState<Flashcard[]>([]),[flipped,setFlipped]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[reviewed,setReviewed]=useState(0);
 const mounted=useRef(false),locked=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;getDueFlashcards(materialId).then(cards=>{if(active)setQueue(cards);}).catch((e:unknown)=>{if(active)setError(e instanceof Error?e.message:'No se pudieron cargar las tarjetas.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[materialId]);
 async function reload(){if(locked.current)return;locked.current=true;setLoading(true);setError(null);try{const cards=await getDueFlashcards(materialId);if(mounted.current){setQueue(cards);setFlipped(false);}}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo cargar.');}finally{locked.current=false;if(mounted.current)setLoading(false);}}
 async function answer(knew:boolean){const card=queue[0];if(!card||locked.current||!flipped)return;locked.current=true;setSaving(true);setError(null);try{const updated=await reviewFlashcard(card,knew);if(!mounted.current)return;setReviewed(n=>n+1);setQueue(q=>knew?q.slice(1):[...q.slice(1),updated]);setFlipped(false);}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se confirmó el guardado.');}finally{locked.current=false;if(mounted.current)setSaving(false);}}
 return <FlashcardView card={queue[0]} remaining={queue.length} reviewed={reviewed} flipped={flipped} loading={loading} saving={saving} error={error} onReload={reload} onAnswer={answer} onFlip={()=>{if(!locked.current)setFlipped(f=>!f);}}/>;
}
