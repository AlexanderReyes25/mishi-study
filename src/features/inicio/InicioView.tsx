import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MishiShadow } from '../../components/Mishi';
import { colors, font, radius, spacing, touchMin } from '../../theme';
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
      accessibilityLabel={titulo + '. ' + descripcion}
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

export function InicioView({onMaterials,onReview,onProgress,onSignOut,signingOut=false,children}: {onMaterials:()=>void;onReview:()=>void;onProgress:()=>void;onSignOut:()=>void;signingOut?:boolean;children?:ReactNode}) {
  const [frameWidth, setFrameWidth] = useState(380);
  return (
    <SafeAreaView
      style={styles.screen}
      onLayout={event => setFrameWidth(Math.min(760, event.nativeEvent.layout.width))}
      edges={["top", "left", "right"]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.shadow}
      >
        <MishiShadow width={Math.round((frameWidth / 2 + 60) / 1.22)} rotate="45deg" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>Mishi Study</Text>

          <Pressable
            onPress={onSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            accessibilityState={{
              disabled: signingOut,
              busy: signingOut,
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
          onPress={() => onMaterials()}
        />

        <View style={styles.row}>
          <Acceso
            icono="layers-outline"
            titulo="Repasar"
            descripcion="Recuerda lo esencial."
            onPress={() => onReview()}
          />

          <Acceso
            icono="stats-chart-outline"
            titulo="Mi progreso"
            descripcion="Mira cuánto avanzas."
            onPress={() => onProgress()}
          />
        </View>

        <View style={styles.motto}>
          <Text style={styles.mottoTitle}>Un tema a la vez.</Text>
          <Text style={styles.description}>
            Cada pequeño paso cuenta.
          </Text>
        </View>

        {children}
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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
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
    flexGrow: 1,
    flexBasis: 0,
    flexShrink: 0,
    minWidth: 0,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  featured: {
    flexGrow: 0,
    flexBasis: 'auto',
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
