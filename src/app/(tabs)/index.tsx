import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { InicioView } from '../../features/inicio/InicioView';
import { supabase } from '../../services/supabase';
export default function Inicio() {
 const [signingOut,setSigningOut]=useState(false);
 async function signOut(){if(signingOut)return;setSigningOut(true);try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch{Alert.alert('No se pudo cerrar sesión','Revisa tu conexión e inténtalo de nuevo.');}finally{setSigningOut(false);}}
 return <InicioView onMaterials={()=>router.navigate('/(tabs)/materiales')} onReview={()=>router.navigate('/(tabs)/repaso')} onProgress={()=>router.navigate('/(tabs)/progreso')} onSignOut={signOut} signingOut={signingOut}/>;
}
