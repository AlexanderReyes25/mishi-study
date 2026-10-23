// LOGIN MEJORADO (Parte 1: Acceso y materiales)
// Validaciones de formato, longitud y mensajes claros.
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MishiShadow } from '../../components/Mishi';
import { IconTile, Notice, Tag, ui } from '../../components/MishiUI';
import { Button } from '../../components/Button';
import { supabase } from '../../services/supabase';
import { colors, spacing } from '../../theme';

export default function Login() {
  const [mode,setMode]=useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);

  const isValidEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

  async function submit(mode: 'signin' | 'signup') {
    if (submitting.current) return;
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

    submitting.current = true;
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
        setMessage('Revisa tu correo para confirmar la cuenta y después inicia sesión.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Error al conectar con el servicio.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <SafeAreaView style={styles.safe} edges={['top','left','right','bottom']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.brand}><IconTile icon="paw-outline" tone="dark"/><Text style={styles.brandText}>Mishi Study</Text></View>
    <View style={styles.hero}><Text style={ui.eyebrow}>UN TEMA A LA VEZ</Text><Text style={styles.title}>Tu curiosidad.{'\n'}Tu propio ritmo.</Text><Text style={styles.subtitle}>Convierte tus apuntes en un camino que sí puedes seguir.</Text><View pointerEvents="none" style={styles.cat}><MishiShadow width={150} left={-30} bottom={-115} rotate="45deg"/></View></View>
    <View style={styles.form}><Tag label={mode==='signin'?'QUÉ BUENO VERTE':'TU PRIMER PASO'} tone="coral"/><Text style={ui.sectionTitle}>{mode==='signin'?'Vuelve a tu espacio':'Crea tu espacio de estudio'}</Text>
      <Text style={ui.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" style={ui.field} placeholder="tu@correo.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} editable={!busy} onChangeText={v=>{setEmail(v);setMessage('');}}/>
      <Text style={ui.label}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" style={ui.field} placeholder="Al menos 6 caracteres" placeholderTextColor={colors.textMuted} secureTextEntry value={password} editable={!busy} onChangeText={v=>{setPassword(v);setMessage('');}}/>
      {message?<Notice text={message} error={!message.startsWith('Revisa tu correo')}/>:null}
      <Button label={mode==='signin'?'Entrar a Mishi':'Crear mi cuenta'} icon="arrow-forward" loading={busy} onPress={()=>submit(mode)}/>
      <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('');}} style={{padding:12}}><Text style={{color:colors.primary,textAlign:'center',fontWeight:'600'}}>{mode==='signin'?'¿Primera vez? Crea tu cuenta':'Ya tengo una cuenta'}</Text></Pressable>
    </View>
    <Text style={{color:colors.neutralSoft,textAlign:'center',fontSize:12}}>Aprende. Practica. Vuelve a intentarlo.</Text>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.primary},content:{flexGrow:1,padding:spacing.xl,gap:spacing.xl,width:'100%',maxWidth:540,alignSelf:'center'},brand:{flexDirection:'row',alignItems:'center',gap:12},brandText:{color:colors.white,fontSize:20,fontWeight:'800'},hero:{gap:16,paddingTop:8,paddingBottom:24,overflow:'hidden'},title:{color:colors.white,fontSize:36,fontWeight:'800',lineHeight:43,letterSpacing:-0.8},subtitle:{color:colors.neutralSoft,fontSize:15,lineHeight:24,maxWidth:280},cat:{position:'absolute',right:0,bottom:0,width:120,height:150,opacity:0.4},form:{padding:spacing.xl,backgroundColor:colors.canvas,borderRadius:28,gap:spacing.md}});
