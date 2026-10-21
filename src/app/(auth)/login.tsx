// LOGIN MEJORADO (Parte 1: Acceso y materiales)
// Validaciones de formato, longitud y mensajes claros.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { supabase } from '../../services/supabase';
import { colors, font, radius, spacing, touchMin } from '../../theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const isValidEmail = (text: string) => /\S+@\S+\.\S+/.test(text.trim());

  async function submit(mode: 'signin' | 'signup') {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password.trim()) {
      setMessage('Por favor completa tanto el correo como la contraseña.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setMessage('Ingresa un correo electrónico con formato válido.');
      return;
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const { data, error } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email: cleanEmail, password })
          : await supabase.auth.signUp({ email: cleanEmail, password });

      if (error) {
        setMessage(error.message);
      } else if (mode === 'signup' && !data.session) {
        setMessage("Cuenta creada, pero sin sesión: desactiva 'Confirm email' en Supabase.");
      }
    } catch (err: any) {
      setMessage(err.message || 'Error al conectar con el servicio.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Mishi Study" subtitle="Tu tutor de estudio con IA">
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Correo"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (message) setMessage('');
          }}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña (mínimo 6 caracteres)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (message) setMessage('');
          }}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button label="Iniciar sesión" onPress={() => submit('signin')} loading={busy} />
        <Button label="Crear cuenta" onPress={() => submit('signup')} variant="secondary" disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  input: {
    minHeight: touchMin,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: font.body,
    color: colors.text,
  },
  message: { color: colors.error, fontSize: font.small },
});