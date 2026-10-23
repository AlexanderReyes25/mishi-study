import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { RichText } from '../../components/MathText';
import { Card } from '../../components/Card';
import { Page, SectionHeading, Tag, ui } from '../../components/MishiUI';
import { LessonView } from './LessonView';
import type { LessonBlock } from './lessonTypes';
type Props={title:string;blocks:LessonBlock[]|null;content:string;children?:ReactNode};
export function LessonScreen({title,blocks,content,children}:Props){return <Page inStack eyebrow="MISHI / TU LECCIÓN" title={title} subtitle="Un tema a la vez. Una idea más clara en cada paso."><View style={ui.wrap}><Tag label="A partir de tus apuntes" tone="coral"/><Tag label="A tu ritmo" tone="success"/></View><Card>{blocks?<LessonView blocks={blocks}/>:<RichText text={content}/>}</Card>{children?<><SectionHeading title="Ahora hazlo tuyo"/><Card>{children}</Card></>:null}<Text style={[ui.caption,{textAlign:'center'}]}>Una explicación de la IA puede necesitar correcciones. Contrástala con tus apuntes.</Text></Page>;}
