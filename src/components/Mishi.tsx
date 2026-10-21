import { useEffect } from 'react';
import { AccessibilityInfo, Animated, Image, View, useAnimatedValue, useWindowDimensions } from 'react-native';

const base = require('../assets/mishi/mishi_base.png');
const earLeft = require('../assets/mishi/mishi_ear_l.png');
const earRight = require('../assets/mishi/mishi_ear_r.png');
const shadow = require('../assets/mishi/mishi_shadow.png');

// Giro corto de una oreja que se repite cada 3,6 s. peak es el ángulo máximo en grados.
function useEarFlick(delayMs: number, peak: number) {
  const angle = useAnimatedValue(0);
  useEffect(() => {
    let mounted = true;
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || !mounted) return; // respeta "reducir animaciones"
      const move = (to: number, ms: number) =>
        Animated.timing(angle, { toValue: to, duration: ms, useNativeDriver: true });
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          move(peak, 200),
          move(-peak / 7, 150),
          move(peak * 0.55, 150),
          move(0, 200),
          Animated.delay(Math.max(0, 3600 - delayMs - 700)),
        ])
      );
      loop.start();
    });
    return () => {
      mounted = false;
      loop?.stop();
    };
  }, [angle, delayMs, peak]);
  return angle.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
}

// Mishi sentado con las orejas animadas, para la pantalla de carga. Proporción: 410 x 733.
export function MishiSitting({ width = 162 }: { width?: number }) {
  const height = (width * 733) / 410;
  const rotLeft = useEarFlick(2300, -7);
  const rotRight = useEarFlick(1000, 7);
  const full = { position: 'absolute' as const, left: 0, top: 0, width, height };
  return (
    <View style={{ width, height }} accessible accessibilityLabel="Mishi, un gato calicó">
      <Image source={base} style={full} />
      <Animated.Image
        source={earLeft}
        style={[full, { transformOrigin: '20% 15.3%', transform: [{ rotate: rotLeft }] }]}
      />
      <Animated.Image
        source={earRight}
        style={[full, { transformOrigin: '56.6% 13.4%', transform: [{ rotate: rotRight }] }]}
      />
    </View>
  );
}

type ShadowProps = { width?: number; left?: number; bottom?: number; rotate?: string };

export function MishiShadow({ width, left = 0, bottom = 0, rotate = '0deg' }: ShadowProps) {
  const screenWidth = useWindowDimensions().width;
  const w = width ?? Math.round(screenWidth * 0.65);

  return (
    <Image
      source={shadow}
      accessible={false}
      importantForAccessibility="no"
      style={{
        position: 'absolute',
        left,
        bottom,
        width: w,
        height: (w * 733) / 410,
        transform: [{ rotate }],
      }}
      resizeMode="contain"
    />
  );
}