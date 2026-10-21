import { PruebaProcedimiento } from "../../features/inicio/PruebaProcedimiento";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { MishiShadow } from "../../components/Mishi";
import { PruebaFoto } from "../../features/inicio/PruebaFoto";
import { PruebaLeccion } from "../../features/inicio/PruebaLeccion";
import { useSession } from "../../services/session";
import { supabase } from "../../services/supabase";
import { colors, font, radius, spacing, touchMin } from "../../theme";

type AccesoProps = {
  icono: ComponentProps<typeof Ionicons>["name"];
  titulo: string;
  descripcion: string;
  onPress: () => void;
  destacado?: boolean;
};

function Acceso({
  icono,
  titulo,
  descripcion,
  onPress,
  destacado,
}: AccesoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        destacado && styles.featured,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icono}
        size={font.title}
        color={colors.primaryDark}
      />
      <Text style={styles.cardTitle}>{titulo}</Text>
      <Text style={styles.cardDescription}>{descripcion}</Text>
    </Pressable>
  );
}

export default function Inicio() {
  const { session } = useSession();
  const [mostrarPrueba, setMostrarPrueba] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    if (saliendo) return;

    setSaliendo(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      Alert.alert(
        "No se pudo cerrar sesión",
        "Revisa tu conexión e inténtalo de nuevo."
      );
    } finally {
      setSaliendo(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right"]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.shadow}
      >
        <MishiShadow rotate="45deg" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>Mishi Study</Text>

          <Pressable
            onPress={salir}
            disabled={saliendo}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            accessibilityState={{
              disabled: saliendo,
              busy: saliendo,
            }}
            style={styles.exit}
          >
            <Ionicons
              name="log-out-outline"
              size={font.title}
              color={colors.white}
            />
          </Pressable>
        </View>

        <Text style={styles.welcome}>TU ESPACIO DE ESTUDIO</Text>

        <Text style={styles.title}>
          Aprende a tu ritmo.{"\n"}Mishi te acompaña.
        </Text>

        <Text style={styles.description}>
          Tus apuntes, un poco de práctica y un siguiente paso más claro.
        </Text>

        <Acceso
          destacado
          icono="folder-open-outline"
          titulo="Mis materiales"
          descripcion="Todo empieza con lo que quieres aprender."
          onPress={() => router.navigate("/(tabs)/materiales")}
        />

        <View style={styles.row}>
          <Acceso
            icono="layers-outline"
            titulo="Repasar"
            descripcion="Recuerda lo esencial."
            onPress={() => router.navigate("/(tabs)/repaso")}
          />

          <Acceso
            icono="stats-chart-outline"
            titulo="Mi progreso"
            descripcion="Mira cuánto avanzas."
            onPress={() => router.navigate("/(tabs)/progreso")}
          />
        </View>

        <View style={styles.motto}>
          <Text style={styles.mottoTitle}>Un tema a la vez.</Text>
          <Text style={styles.description}>
            Cada pequeño paso cuenta.
          </Text>
        </View>

        {__DEV__ && session ? (
          <>
            <Button
              label={
                mostrarPrueba
                  ? "Ocultar prueba de IA"
                  : "Abrir prueba de IA"
              }
              variant="secondary"
              onPress={() => setMostrarPrueba(!mostrarPrueba)}
            />

            <View 
            style={[
              { gap: spacing.lg },
              !mostrarPrueba && styles.hidden,
            ]}
          >
            <PruebaLeccion key={session.user.id} />
            <PruebaFoto key={`foto-${session.user.id}`} />
            <PruebaProcedimiento key={`procedimiento-${session.user.id}`} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  shadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
    overflow: "hidden",
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: colors.white,
    fontSize: font.subtitle,
    fontWeight: "700",
  },
  exit: {
    minWidth: touchMin,
    minHeight: touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: {
    color: colors.success,
    fontSize: font.small,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: font.big,
    fontWeight: "700",
  },
  description: {
    color: colors.neutralSoft,
    fontSize: font.body,
    lineHeight: spacing.xl,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  featured: {
    flex: 0,
    backgroundColor: colors.accent,
  },
  cardTitle: {
    color: colors.primaryDark,
    fontSize: font.subtitle,
    fontWeight: "700",
  },
  cardDescription: {
    color: colors.primaryDark,
    fontSize: font.small,
  },
  pressed: {
    opacity: 0.8,
  },
  motto: {
    paddingVertical: spacing.xxl,
    paddingLeft: "45%",
    gap: spacing.sm,
  },
  mottoTitle: {
    color: colors.success,
    fontSize: font.subtitle,
    fontWeight: "700",
  },
  hidden: {
    display: "none",
  },
});