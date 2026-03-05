import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface Props {
  size?: number;
  variant?: 'color' | 'white';
}

const ARC_LENGTH = 175;

const PETAL_PATHS = [
  {
    d: 'M 44 72 C 36 62 28 44 30 30 C 34 28 38 30 40 34 C 46 46 48 60 48 72 Z',
    gradient: 'petalGrad1',
    colors: ['#8BC34A', '#4CAF50'],
  },
  {
    d: 'M 48 72 C 44 58 42 40 44 24 C 48 22 52 24 54 28 C 56 42 54 58 52 72 Z',
    gradient: 'petalGrad2',
    colors: ['#26A69A', '#00897B'],
  },
  {
    d: 'M 52 72 C 50 56 52 38 58 24 C 62 22 66 26 66 30 C 64 44 58 58 54 72 Z',
    gradient: 'petalGrad3',
    colors: ['#AB47BC', '#7B1FA2'],
  },
  {
    d: 'M 54 72 C 56 58 62 44 70 34 C 74 32 76 36 74 40 C 68 52 60 64 56 72 Z',
    gradient: 'petalGrad4',
    colors: ['#42A5F5', '#1565C0'],
  },
];

export function M3ntorIconStatic({ size = 48, fill = 'white' }: { size?: number; fill?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 90">
        <Path
          d="M 18 78 A 38 38 0 0 1 82 78"
          fill="none"
          stroke={fill}
          strokeWidth={7}
          strokeLinecap="round"
        />
        {PETAL_PATHS.map((l, i) => (
          <Path key={i} d={l.d} fill={fill} />
        ))}
        <Ellipse cx={50} cy={74} rx={4} ry={5} fill={fill} />
      </Svg>
    </View>
  );
}

export default function M3ntorIcon({ size = 48, variant = 'color' }: Props) {
  const isWhite = variant === 'white';

  const arcProgress = useSharedValue(isWhite ? 1 : 0);
  const petalOp1 = useSharedValue(isWhite ? 1 : 0);
  const petalOp2 = useSharedValue(isWhite ? 1 : 0);
  const petalOp3 = useSharedValue(isWhite ? 1 : 0);
  const petalOp4 = useSharedValue(isWhite ? 1 : 0);
  const dotScale = useSharedValue(isWhite ? 1 : 0);

  useEffect(() => {
    if (isWhite) return;
    arcProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    petalOp1.value = withDelay(250, withTiming(1, { duration: 300 }));
    petalOp2.value = withDelay(400, withTiming(1, { duration: 300 }));
    petalOp3.value = withDelay(550, withTiming(1, { duration: 300 }));
    petalOp4.value = withDelay(700, withTiming(1, { duration: 300 }));
    dotScale.value = withDelay(850, withSpring(1, { damping: 10, stiffness: 260 }));
  }, []);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - arcProgress.value),
  }));

  const p1Props = useAnimatedProps(() => ({ opacity: petalOp1.value }));
  const p2Props = useAnimatedProps(() => ({ opacity: petalOp2.value }));
  const p3Props = useAnimatedProps(() => ({ opacity: petalOp3.value }));
  const p4Props = useAnimatedProps(() => ({ opacity: petalOp4.value }));
  const petalAnimProps = [p1Props, p2Props, p3Props, p4Props];

  const dotProps = useAnimatedProps(() => ({
    opacity: dotScale.value,
    rx: 4 * dotScale.value,
    ry: 5 * dotScale.value,
  }));

  if (isWhite) {
    return <M3ntorIconStatic size={size} fill="white" />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 90">
        <Defs>
          <LinearGradient id="arcGrad" x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0" stopColor="#E53935" />
            <Stop offset="0.15" stopColor="#FF6F00" />
            <Stop offset="0.3" stopColor="#FDD835" />
            <Stop offset="0.45" stopColor="#43A047" />
            <Stop offset="0.6" stopColor="#00ACC1" />
            <Stop offset="0.75" stopColor="#1E88E5" />
            <Stop offset="0.9" stopColor="#5E35B1" />
            <Stop offset="1" stopColor="#6A1B9A" />
          </LinearGradient>
          {PETAL_PATHS.map((p, i) => (
            <LinearGradient key={i} id={p.gradient} x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor={p.colors[0]} />
              <Stop offset="1" stopColor={p.colors[1]} />
            </LinearGradient>
          ))}
          <LinearGradient id="dotGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#FF8F00" />
            <Stop offset="1" stopColor="#E65100" />
          </LinearGradient>
        </Defs>

        <AnimatedPath
          d="M 18 78 A 38 38 0 0 1 82 78"
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH}`}
          animatedProps={arcProps}
        />

        {PETAL_PATHS.map((p, i) => (
          <AnimatedPath
            key={i}
            d={p.d}
            fill={`url(#${p.gradient})`}
            animatedProps={petalAnimProps[i]}
          />
        ))}

        <AnimatedEllipse
          cx={50}
          cy={74}
          rx={4}
          ry={5}
          fill="url(#dotGrad)"
          animatedProps={dotProps}
        />
      </Svg>
    </View>
  );
}
