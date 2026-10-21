import { File } from 'expo-file-system';
import {
    MAX_REVIEW_IMAGE_BYTES, parseReview, parseTranscription, validateReviewInput,
    type ReviewResult, type Transcription,
} from '../../supabase/functions/_shared/review';
import { ModoImagen, prepararImagen } from './PrepararImagen';
import { supabase } from './supabase';

async function invoke(body:Record<string, unknown>): Promise<unknown> {
    const { data, error} = await supabase.functions.invoke('ai-review', { body });
    if (!error) return data;
    let message = error.message;
    try {
        const response = (error as { context?: Response }).context;
        const details = await response?.json();
        if (typeof details?.error === 'string') message = details.error;
    } catch { /* Conservamos el mensaje si no hay JSON. */ }
    throw new Error(message);
}

export async function leerProcedimientoDeFoto(uri: string, modo: ModoImagen = 'detalle'):
Promise<Transcription> {
    const prepared = await prepararImagen(uri, modo);
    try {
        const file = new File(prepared.uri);
        if (!file.exists || file.size <= 0 || file.size > MAX_REVIEW_IMAGE_BYTES) {
            throw new Error('La foto preparada debe pesar como máximo 3 MB. Prueba calidad normal o una foto de menos contenido.');
        }
        const imageBase64 = await file.base64();
        if (imageBase64.length > 4 * Math.ceil(MAX_REVIEW_IMAGE_BYTES / 3)) {
            throw new Error('La fotografía es demasiado grande para leerla.');
        }

        const result = await invoke({ action: 'transcribe', imageBase64 });
        return parseTranscription(result);
    } finally {
        //Borra únicamente la copia temporal creada por prepararImagen.
        prepared.limpiar();
    }
}

export async function revisarProcedimiento(exercise: string, procedure: string):
Promise<ReviewResult> {
    const input = validateReviewInput(exercise, procedure);
    const result = await invoke({ action: 'review', ...input });
    return parseReview(result, input.procedure);
}