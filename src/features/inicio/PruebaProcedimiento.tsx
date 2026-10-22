import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import {
    MAX_EXERCISE, MAX_PROCEDURE, type ProcedureStatus, type ResultStatus,
    type ReviewResult, type StepStatus,
} from '../../../supabase/functions/_shared/review';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { RichText } from '../../components/MathText';
import { type ModoImagen } from '../../services/PrepararImagen';
import { leerProcedimientoDeFoto, revisarProcedimiento } from '../../services/revisarProcedimiento';
import { useSession } from '../../services/session';
import { colors, font, radius, spacing } from '../../theme';

const procedureLabels: Record<ProcedureStatus, string> = {
  correct: 'Procedimiento correcto', incorrect: 'Hay un error en los pasos',
  incomplete: 'Procedimiento incompleto', missing: 'Falta mostrar el procedimiento',
  unverifiable: 'Falta información para verificarlo',
};
const resultLabels: Record<ResultStatus, string> = {
  correct: 'Correcto', incorrect: 'Incorrecto', not_shown: 'No presentado', unverifiable: 'No se pudo verificar',
};
const stepLabels: Record<StepStatus, string> = { correct: 'Correcto', incorrect: 'Revisar', uncertain: 'No verificable' };

export function PruebaProcedimiento() {
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

  const disabled = !!busy || !userId;
  return (
    <Card>
      <Text style={styles.title}>Prueba de revisión del procedimiento</Text>
      <Text style={styles.note}>Escribe el enunciado completo. Después escribe tus pasos o lee una foto de tu trabajo.</Text>
      <TextInput
        style={styles.input} multiline textAlignVertical="top" value={exercise}
        editable={!disabled} maxLength={MAX_EXERCISE}
        accessibilityLabel="Enunciado del ejercicio" placeholder="Enunciado y datos necesarios…"
        placeholderTextColor={colors.textMuted}
        onChangeText={(value) => { if (!locked.current) { setExercise(value); setResult(null); setError(''); } }}
      />
      <Text style={styles.note}>{exercise.length} / {MAX_EXERCISE} caracteres</Text>
      <Button
        label={quality === 'detalle' ? 'Calidad: más detalle. Cambiar a normal' : 'Calidad: normal. Cambiar a más detalle'}
        variant="secondary" disabled={disabled}
        onPress={() => { if (!locked.current) setQuality(quality === 'detalle' ? 'normal' : 'detalle'); }}
      />
      <Button label="Leer foto de la galería" disabled={disabled} onPress={() => readPhoto('gallery')} />
      <Button label="Tomar y leer una foto" disabled={disabled} onPress={() => readPhoto('camera')} />
      <Text style={styles.note}>Leer una foto reemplaza el texto del procedimiento cuando termina correctamente. La foto preparada se envía a la IA para transcribirla.</Text>

      {photo ? (
        <>
          <Image source={{ uri: photo }} style={styles.photo} contentFit="contain" accessibilityLabel="Foto del procedimiento que estás revisando" />
          <Text style={styles.note}>Compara la transcripción con tu foto. Corrige cualquier cifra, signo o palabra que se haya leído mal.</Text>
          {uncertain.map((message, index) => <Text key={index} style={styles.note}>Duda de lectura: {message}</Text>)}
          <Button label="Continuar solo con texto escrito" variant="secondary" disabled={disabled} onPress={() => {
            if (locked.current) return;
            setPhoto(''); setUncertain([]); setConfirmed(false); setResult(null);
          }} />
        </>
      ) : null}
      <TextInput
        style={[styles.input, styles.procedure]} multiline textAlignVertical="top"
        value={procedure} editable={!disabled} maxLength={MAX_PROCEDURE}
        accessibilityLabel="Procedimiento del estudiante" placeholder="Escribe los pasos que realizaste y tu resultado…"
        placeholderTextColor={colors.textMuted}
        onChangeText={(value) => {
          if (locked.current) return;
          setProcedure(value); setResult(null); setConfirmed(false); setError('');
        }}
      />
      <Text style={styles.note}>{procedure.length} / {MAX_PROCEDURE} caracteres</Text>
      {photo ? <Button
        label={confirmed ? 'Transcripción confirmada. Desmarcar' : 'Confirmo que el texto coincide con mi trabajo'}
        variant={confirmed ? 'success' : 'secondary'} disabled={disabled || !procedure.trim() || /\[ilegible\]/i.test(procedure)}
        onPress={() => { if (!locked.current) setConfirmed(!confirmed); }}
      /> : null}
      <Button label="Revisar procedimiento" onPress={review} disabled={disabled || !exercise.trim() || !procedure.trim() || (!!photo && !confirmed)} />
      {busy ? <Text accessibilityLiveRegion="polite" style={styles.note}>{busy}</Text> : null}
      {error ? <Text selectable style={{ color: colors.error }}>{error}</Text> : null}

      {result ? (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.title}>{procedureLabels[result.procedureStatus]}</Text>
          <Text style={styles.note}>Resultado final: {resultLabels[result.resultStatus]}</Text>
          <RichText text={result.summary} />
          {result.steps.map((step, index) => (
            <View key={index} style={styles.step}>
              <Text style={styles.stepTitle}>Paso {index + 1} · {stepLabels[step.status]}</Text>
              <Text selectable style={styles.quote}>{step.quote}</Text>
              <RichText text={step.feedback} />
            </View>
          ))}
          {result.firstErrorStep !== null ? <Text style={styles.stepTitle}>Primer paso señalado como incorrecto: {result.firstErrorStep}.</Text> : null}
          <Text style={styles.stepTitle}>Qué puedes hacer ahora</Text>
          <RichText text={result.nextHint} />
        </View>
      ) : null}
      <Text style={styles.note}>Revisión orientativa de la IA. Esta prueba no guarda una nota ni modifica tu progreso.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.subtitle, fontWeight: '700' },
  stepTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: font.small },
  input: { minHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface, fontSize: font.body },
  procedure: { minHeight: 180 },
  photo: { width: '100%', height: 240 },
  step: { gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  quote: { color: colors.text, fontSize: font.body },
});