import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size?: number;
  variant?: 'color' | 'white';
}

const ARC_LENGTH = 160;

const LEAF_PATHS = [
  { d: 'M 38 68 C 36 52 32 40 28 32 C 34 38 42 48 44 64 Z', color: '#FF8C00' },
  { d: 'M 42 62 C 38 46 36 32 38 20 C 42 32 46 46 46 58 Z', color: '#32CD32' },
  { d: 'M 47 56 C 48 40 50 26 50 16 C 52 26 52 40 53 56 Z', color: '#00A890' },
  { d: 'M 54 58 C 54 46 58 32 62 20 C 64 32 62 46 58 62 Z', color: '#8B5CF6' },
  { d: 'M 56 64 C 58 48 66 38 72 32 C 68 40 64 52 62 68 Z', color: '#4169E1' },
];

export function M3ntorIconStatic({ size = 48, fill = 'white' }: { size?: number; fill?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M 15 72 A 40 40 0 0 1 85 72"
          fill="none"
          stroke={fill}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {LEAF_PATHS.map((l, i) => (
          <Path key={i} d={l.d} fill={fill} />
        ))}
        <Circle cx={50} cy={70} r={3} fill={fill} />
      </Svg>
    </View>
  );
}

export default function M3ntorIcon({ size = 48, variant = 'color' }: Props) {
  const isWhite = variant === 'white';

  const arcProgress = useSharedValue(isWhite ? 1 : 0);
  const leafOpacity1 = useSharedValue(isWhite ? 1 : 0);
  const leafOpacity2 = useSharedValue(isWhite ? 1 : 0);
  const leafOpacity3 = useSharedValue(isWhite ? 1 : 0);
  const leafOpacity4 = useSharedValue(isWhite ? 1 : 0);
  const leafOpacity5 = useSharedValue(isWhite ? 1 : 0);
  const dotRadius = useSharedValue(isWhite ? 3 : 0);

  useEffect(() => {
    if (isWhite) return;
    arcProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    leafOpacity1.value = withDelay(200, withTiming(1, { duration: 300 }));
    leafOpacity2.value = withDelay(300, withTiming(1, { duration: 300 }));
    leafOpacity3.value = withDelay(400, withTiming(1, { duration: 300 }));
    leafOpacity4.value = withDelay(500, withTiming(1, { duration: 300 }));
    leafOpacity5.value = withDelay(600, withTiming(1, { duration: 300 }));
    dotRadius.value = withDelay(750, withSpring(3, { damping: 10, stiffness: 260 }));
  }, []);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - arcProgress.value),
  }));

  const l1Props = useAnimatedProps(() => ({ opacity: leafOpacity1.value }));
  const l2Props = useAnimatedProps(() => ({ opacity: leafOpacity2.value }));
  const l3Props = useAnimatedProps(() => ({ opacity: leafOpacity3.value }));
  const l4Props = useAnimatedProps(() => ({ opacity: leafOpacity4.value }));
  const l5Props = useAnimatedProps(() => ({ opacity: leafOpacity5.value }));
  const leafAnimProps = [l1Props, l2Props, l3Props, l4Props, l5Props];

  const dotProps = useAnimatedProps(() => ({
    opacity: dotRadius.value > 0 ? 1 : 0,
    r: dotRadius.value,
  }));

  if (isWhite) {
    return <M3ntorIconStatic size={size} fill="white" />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="arcGrad" x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0" stopColor="#FF8C00" />
            <Stop offset="0.2" stopColor="#FFD700" />
            <Stop offset="0.4" stopColor="#32CD32" />
            <Stop offset="0.6" stopColor="#00CED1" />
            <Stop offset="0.8" stopColor="#4169E1" />
            <Stop offset="1" stopColor="#8B5CF6" />
          </LinearGradient>
        </Defs>

        <AnimatedPath
          d="M 15 72 A 40 40 0 0 1 85 72"
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH}`}
          animatedProps={arcProps}
        />

        {LEAF_PATHS.map((l, i) => (
          <AnimatedPath key={i} d={l.d} fill={l.color} animatedProps={leafAnimProps[i]} />
        ))}

        <AnimatedCircle
          cx={50}
          cy={70}
          fill="#FF8C00"
          animatedProps={dotProps}
        />
      </Svg>
    </View>
  );
}
