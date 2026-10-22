import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';

const base = require('../assets/mishi/mishi_base.png');
const earLeft = require('../assets/mishi/mishi_ear_l.png');
const earRight = require('../assets/mishi/mishi_ear_r.png');
const shadow = require('../assets/mishi/mishi_shadow.png');

function useEarFlick(
  delayMs: number,
  peak: number,
  enabled: boolean
) {
  const angle = useAnimatedValue(0);

  useEffect(() => {
    angle.setValue(0);

    // Esperamos a que las tres imágenes estén listas.
    if (!enabled) return;

    let mounted = true;
    let loop: Animated.CompositeAnimation | undefined;

    const adjust = (reduce: boolean) => {
      if (!mounted) return;

      loop?.stop();
      angle.setValue(0);

      if (reduce) return;

      const move = (toValue: number, duration: number) =>
        Animated.timing(angle, {
          toValue,
          duration,
          useNativeDriver: true,
          isInteraction: false,
        });

      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          move(peak, 200),
          move(-peak / 7, 150),
          move(peak * 0.55, 150),
          move(0, 200),
          Animated.delay(
            Math.max(0, 3600 - delayMs - 700)
          ),
        ])
      );

      loop.start();
    };

    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      adjust
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then(adjust)
      .catch(() => adjust(true));

    return () => {
      mounted = false;
      listener.remove();
      loop?.stop();
    };
  }, [angle, delayMs, peak, enabled]);

  return angle.interpolate({
    inputRange: [-10, 10],
    outputRange: ["-10deg", "10deg"],
  });
}

export function MishiSitting({
  width = 162,
}: {
  width?: number;
}) {
  const [loaded, setLoaded] = useState({
    body: false,
    left: false,
    right: false,
  });

  const ready = loaded.body && loaded.left && loaded.right;
  const height = (width * 733) / 410;

  const rotLeft = useEarFlick(2300, -4, ready);
  const rotRight = useEarFlick(1000, 4, ready);

  const full = {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width,
    height,
  };

  return (
    <View
      style={{ width, height }}
      accessible={ready}
      accessibilityLabel="Mishi, un gato calicó"
    >
      <View
        style={{
          width,
          height,
          opacity: ready ? 1 : 0,
        }}
      >
        <Animated.Image
          source={earLeft}
          fadeDuration={0}
          resizeMode="contain"
          onLoad={() =>
            setLoaded((current) => ({
              ...current,
              left: true,
            }))
          }
          style={[
            full,
            {
              transformOrigin: "20% 15.3%",
              transform: [{ rotate: rotLeft }],
            },
          ]}
        />

        <Animated.Image
          source={earRight}
          fadeDuration={0}
          resizeMode="contain"
          onLoad={() =>
            setLoaded((current) => ({
              ...current,
              right: true,
            }))
          }
          style={[
            full,
            {
              transformOrigin: "56.6% 13.4%",
              transform: [{ rotate: rotRight }],
            },
          ]}
        />

        {/* El cuerpo cubre la unión de las orejas. */}
        <Image
          source={base}
          fadeDuration={0}
          resizeMode="contain"
          onLoad={() =>
            setLoaded((current) => ({
              ...current,
              body: true,
            }))
          }
          style={full}
        />
      </View>
    </View>
  );
}

type ShadowProps = {
  width?: number;
  left?: number;
  bottom?: number;
  rotate?: string;
};

export function MishiShadow({
  width,
  left = -60,
  bottom,
  rotate = '45deg',
}: ShadowProps) {
  const screenWidth = useWindowDimensions().width;

  const w = width ?? Math.round((screenWidth / 2 - left) / 1.22);
  const b = bottom ?? -Math.round(w * 0.69);

  return (
    <Image
      source={shadow}
      accessible={false}
      importantForAccessibility="no"
      resizeMode="contain"
      style={{
        position: 'absolute',
        left,
        bottom: b,
        width: w,
        height: (w * 733) / 410,
        transform: [{ rotate }],
      }}
    />
  );
}