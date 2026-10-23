import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env"
    );
}

// Expo también importa las rutas en Node al preparar la vista web.
// AsyncStorage necesita window en web; la sesión solo persiste en el cliente.
const serverRender = Platform.OS === 'web' && typeof window === 'undefined';
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: serverRender ? undefined : AsyncStorage,
        autoRefreshToken: !serverRender,
        persistSession: !serverRender,
        detectSessionInUrl: false,
    },
});
