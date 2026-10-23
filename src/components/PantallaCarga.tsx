import { useEffect, useState } from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Animated,
    Easing,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
} from "react-native";
import {
    SafeAreaProvider,
    SafeAreaView,
} from "react-native-safe-area-context";
import { colors, font, spacing } from "../theme";
import { Button } from "./Button";
import { MishiSitting } from "./Mishi";

type Props = {
  onClose: () => void;
  title?: string;
  closeLabel?: string;
  note?: string;
};

export function PantallaCarga({ onClose, title = 'Preparando tu lección', closeLabel = 'Volver al menú', note = 'La preparación continúa al volver al menú.' }: Props) {
  const [respiracion] = useState(() => new Animated.Value(0));
  const { width } = useWindowDimensions();

  useEffect(() => {
    let montado = true;
    let animacion: Animated.CompositeAnimation | undefined;

    const ajustar = (reducir: boolean) => {
      if (!montado) return;

      animacion?.stop();
      respiracion.setValue(0);

      if (reducir) return;

      const mover = (toValue: number) =>
        Animated.timing(respiracion, {
          toValue,
          duration: 2900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        });

      animacion = Animated.loop(
        Animated.sequence([
          mover(1),
          mover(0),
        ])
      );

      animacion.start();
    };

    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      ajustar
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then(ajustar)
      .catch(() => ajustar(true));

    return () => {
      montado = false;
      listener.remove();
      animacion?.stop();
    };
  }, [respiracion]);

  const scaleY = respiracion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  });

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.brand}>MISHI STUDY</Text>

            <Text
              style={styles.title}
              accessibilityRole="header"
            >
              {title}
            </Text>

            <Text style={styles.description}>
              Mishi está trabajando con tu material.
            </Text>

            <Animated.View
              style={{
                transformOrigin: "50% 100%",
                transform: [{ scaleY }],
              }}
            >
              <MishiSitting
                width={Math.min(spacing.xxl * 5, width * 0.42)}
              />
            </Animated.View>

            <ActivityIndicator
              size="large"
              color={colors.primary}
              accessibilityLabel="Generación en curso"
            />

            <Text
              style={styles.description}
              accessibilityLiveRegion="polite"
            >
              Estamos generando y guardando el contenido. Puede tardar un momento.
            </Text>

            <Button
              label={closeLabel}
              variant="secondary"
              onPress={onClose}
            />

            <Text style={styles.note}>
              {note}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  brand: {
    color: colors.textMuted,
    fontSize: font.small,
  },
  title: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    color: colors.textMuted,
    fontSize: font.body,
    lineHeight: spacing.xl,
    textAlign: "center",
  },
  note: {
    color: colors.textMuted,
    fontSize: font.small,
    textAlign: "center",
  },
});
