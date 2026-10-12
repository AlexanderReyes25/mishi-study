// LOGIN BÁSICO que ya funciona, para que todos puedan entrar desde el primer día.
// Parte 1 (Acceso y materiales) lo mejora: diseño final, validaciones y registro.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../services/supabase';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { colors, font, radius, spacing, touchMin } from '../../theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(mode: 'signin' | 'signup') {
    if (!email.trim() || password.length < 6) {
      setMessage('Escribe un correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (mode === 'signup' && !data.session)
      setMessage("Cuenta creada, pero sin sesión: desactiva 'Confirm email' en Supabase.");
    // Si hay sesión, la raíz de la app cambia sola a las pestañas.
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
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña (mínimo 6 caracteres)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
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
