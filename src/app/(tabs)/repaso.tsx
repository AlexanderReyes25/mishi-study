import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { RepasoView } from '../../features/estudio/RepasoView';
import { getDueCount } from '../../services/study';
import { listarLecciones } from '../../services/estudioIntegracion';
import { useSession } from '../../services/session';
export default function Repaso(){const router=useRouter();const {userId}=useSession();return userId?<RepasoContent key={userId} userId={userId} openCards={()=>router.push('/estudio/flashcards')} openPractice={()=>router.push('/estudio/practica')}/>:null;}
function RepasoContent({userId,openCards,openPractice}:{userId:string;openCards:()=>void;openPractice:()=>void}){
 const router=useRouter();const [due,setDue]=useState<number|null>(null),[message,setMessage]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
 const [lessons,setLessons]=useState<Awaited<ReturnType<typeof listarLecciones>>>([]);
 useFocusEffect(useCallback(()=>{
   let active=true;
   Promise.all([getDueCount(),listarLecciones(userId)]).then(([count,rows])=>{if(active){setDue(count);setLessons(rows);setMessage(null);}}).catch((e:unknown)=>{if(active)setMessage(e instanceof Error?e.message:'No se pudo cargar tu repaso.');});
   return()=>{active=false;};
 // attempt reinicia la consulta cuando el usuario pulsa Volver a cargar.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[userId,attempt]));
 return <RepasoView onExams={()=>router.push('/examen')} due={due} lessons={lessons} error={message} onCards={openCards} onPractice={openPractice} onRefresh={()=>setAttempt(n=>n+1)} onLesson={lesson=>{if(lesson.material_id)router.push({pathname:'/estudio/leccion',params:{materialId:lesson.material_id,topic:lesson.topic}});}}/>;
}
