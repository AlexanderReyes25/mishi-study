import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import type { ReviewResult } from '../../../supabase/functions/_shared/review';
import type { ModoImagen } from '../../services/PrepararImagen';
import { leerProcedimientoDeFoto, revisarProcedimiento } from '../../services/revisarProcedimiento';
import { useSession } from '../../services/session';
import { PracticaView } from './PracticaView';
export function PracticaScreen() {
  const { userId } = useSession();
  const mounted = useRef(false);
  const locked = useRef(false);
  const [exercise, setExercise] = useState('');
  const [procedure, setProcedure] = useState('');
  const [photo, setPhoto] = useState('');
  const [quality, setQuality] = useState<ModoImagen>('detalle');
  const [confirmed, setConfirmed] = useState(false);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function start(message: string) {
    locked.current = true;
    setBusy(message);
    setError('');
    Keyboard.dismiss();
  }
  function finish() {
    locked.current = false;
    if (mounted.current) setBusy('');
  }
  function showError(reason: unknown) {
    if (mounted.current) setError(reason instanceof Error ? reason.message : 'No se pudo completar la operación.');
  }

  async function readPhoto(source: 'camera' | 'gallery') {
    if (!mounted.current || locked.current || !userId) return;
    start('Preparando la fotografía…');
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!mounted.current) return;
        if (!permission.granted) throw new Error(permission.canAskAgain
          ? 'Permite el acceso a la cámara para tomar una foto.'
          : 'Activa el permiso de cámara en los ajustes de la aplicación.');
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], allowsEditing: false, allowsMultipleSelection: false, quality: 1,
      };
      const picked = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!mounted.current || picked.canceled) return;
      const uri = picked.assets[0]?.uri;
      if (!uri) throw new Error('No se recibió la fotografía.');
      setBusy('Leyendo el procedimiento de la fotografía…');
      const reading = await leerProcedimientoDeFoto(uri, quality);
      if (!mounted.current) return;
      setPhoto(uri);
      setProcedure(reading.text);
      setUncertain(reading.uncertain);
      setConfirmed(false);
      setResult(null);
    } catch (reason) { showError(reason); }
    finally { finish(); }
  }

  async function review() {
    if (!mounted.current || locked.current || !userId || !exercise.trim() || !procedure.trim()) return;
    if (photo && !confirmed) { setError('Confirma primero que la transcripción coincide con tu foto.'); return; }
    if (/\[ilegible\]/i.test(procedure)) { setError('Completa las partes marcadas como [ilegible] o toma otra fotografía.'); return; }
    start('Revisando tus pasos y tu resultado…');
    setResult(null);
    try {
      const reviewed = await revisarProcedimiento(exercise, procedure);
      if (mounted.current) setResult(reviewed);
    } catch (reason) { showError(reason); }
    finally { finish(); }
  }

  return <PracticaView exercise={exercise} procedure={procedure} photo={photo} quality={quality} confirmed={confirmed} uncertain={uncertain} busy={busy} error={error} result={result} disabled={!!busy || !userId}
    onExercise={value => { if (!locked.current) { setExercise(value); setResult(null); setError(''); } }}
    onProcedure={value => { if (!locked.current) { setProcedure(value); setResult(null); setConfirmed(false); setError(''); } }}
    onPhoto={readPhoto} onReview={review}
    onQuality={() => { if (!locked.current) setQuality(quality === 'detalle' ? 'normal' : 'detalle'); }}
    onConfirm={() => { if (!locked.current) setConfirmed(!confirmed); }}
    onTextOnly={() => { if (!locked.current) { setPhoto('');setUncertain([]);setConfirmed(false);setResult(null); } }}
  />;
}
