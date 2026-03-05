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
}

const ARC_LENGTH = 160;

export default function M3ntorIcon({ size = 48 }: Props) {
  const arcProgress = useSharedValue(0);
  const leafOpacity1 = useSharedValue(0);
  const leafOpacity2 = useSharedValue(0);
  const leafOpacity3 = useSharedValue(0);
  const leafOpacity4 = useSharedValue(0);
  const leafOpacity5 = useSharedValue(0);
  const dotRadius = useSharedValue(0);

  useEffect(() => {
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

  const dotProps = useAnimatedProps(() => ({
    opacity: dotRadius.value > 0 ? 1 : 0,
    r: dotRadius.value,
  }));

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

        <AnimatedPath
          d="M 38 68 C 36 52 32 40 28 32 C 34 38 42 48 44 64 Z"
          fill="#FF8C00"
          animatedProps={l1Props}
        />
        <AnimatedPath
          d="M 42 62 C 38 46 36 32 38 20 C 42 32 46 46 46 58 Z"
          fill="#32CD32"
          animatedProps={l2Props}
        />
        <AnimatedPath
          d="M 47 56 C 48 40 50 26 50 16 C 52 26 52 40 53 56 Z"
          fill="#00A890"
          animatedProps={l3Props}
        />
        <AnimatedPath
          d="M 54 58 C 54 46 58 32 62 20 C 64 32 62 46 58 62 Z"
          fill="#8B5CF6"
          animatedProps={l4Props}
        />
        <AnimatedPath
          d="M 56 64 C 58 48 66 38 72 32 C 68 40 64 52 62 68 Z"
          fill="#4169E1"
          animatedProps={l5Props}
        />

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
