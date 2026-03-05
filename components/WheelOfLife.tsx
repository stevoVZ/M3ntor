import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
  ForeignObject,
} from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { T } from '@/constants/theme';

export interface WheelArea {
  id: string;
  n: string;
  c: string;
  score: number;
  icon: string;
  desc?: string;
  start?: number;
}

export function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function scoreLabel(s: number): string {
  return s <= 3 ? 'Needs focus' : s <= 5 ? 'Building' : s <= 7 ? 'Growing' : s <= 8 ? 'Strong' : 'Thriving';
}

export function scoreTier(s: number): { bg: string; color: string } {
  if (s <= 3) return { bg: '#FF2D5518', color: '#FF2D55' };
  if (s <= 5) return { bg: '#FF950018', color: '#FF9500' };
  if (s <= 7) return { bg: '#007AFF18', color: '#007AFF' };
  return { bg: '#34C75918', color: '#34C759' };
}

const AREA_FEATHER: Record<string, string> = {
  heart: 'heart',
  briefcase: 'briefcase',
  dollar: 'dollar-sign',
  people: 'users',
  star: 'star',
  chat: 'message-circle',
  heart2: 'heart',
  zap: 'zap',
  home: 'home',
  sun: 'sun',
};

interface WheelOfLifeProps {
  areas: WheelArea[];
  size?: number;
  onTapArea?: (index: number) => void;
  tappedIdx: number | null;
  appScores?: Record<string, number>;
}

export default function WheelOfLife({ areas, size = 300, onTapArea, tappedIdx, appScores }: WheelOfLifeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 40;
  const n = areas.length;
  const wedgeAngle = 360 / n;
  const gapDeg = 2;

  const avg = (areas.reduce((s, a) => s + a.score, 0) / areas.length).toFixed(1);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {areas.map((a, i) => (
            <RadialGradient key={`rg-${i}`} id={`wfg-${i}`} cx="50%" cy="50%" r="55%">
              <Stop offset="0%" stopColor={a.c} stopOpacity={0.75} />
              <Stop offset="100%" stopColor={a.c} stopOpacity={0.45} />
            </RadialGradient>
          ))}
          <RadialGradient id="wfg-empty" cx="50%" cy="50%" r="55%">
            <Stop offset="0%" stopColor="#E5E5EA" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#E5E5EA" stopOpacity={0.12} />
          </RadialGradient>
        </Defs>

        <Circle cx={cx} cy={cy} r={outerR + 1} fill="#FAFAFA" />

        {[2, 4, 6, 8, 10].map((ring) => (
          <Circle
            key={ring}
            cx={cx}
            cy={cy}
            r={(ring / 10) * outerR}
            fill="none"
            stroke="rgba(60,60,67,0.05)"
            strokeWidth={0.5}
          />
        ))}

        {areas.map((a, i) => {
          const sa = i * wedgeAngle + gapDeg / 2;
          const ea = (i + 1) * wedgeAngle - gapDeg / 2;
          const pS = polarToCart(cx, cy, outerR, sa);
          const pE = polarToCart(cx, cy, outerR, ea);
          return (
            <Path
              key={`bg-${i}`}
              d={`M${cx},${cy} L${pS.x},${pS.y} A${outerR},${outerR} 0 0 1 ${pE.x},${pE.y} Z`}
              fill="url(#wfg-empty)"
            />
          );
        })}

        {areas.map((a, i) => {
          const sa = i * wedgeAngle + gapDeg / 2;
          const ea = (i + 1) * wedgeAngle - gapDeg / 2;
          const r = (a.score / 10) * outerR;
          if (r < 3) return null;
          const pS = polarToCart(cx, cy, r, sa);
          const pE = polarToCart(cx, cy, r, ea);
          const isTapped = tappedIdx === i;
          return (
            <Path
              key={`fill-${i}`}
              d={`M${cx},${cy} L${pS.x},${pS.y} A${r},${r} 0 0 1 ${pE.x},${pE.y} Z`}
              fill={`url(#wfg-${i})`}
              opacity={tappedIdx !== null && !isTapped ? 0.35 : 1}
              onPress={() => onTapArea?.(i)}
            />
          );
        })}

        {appScores && areas.map((a, i) => {
          const appS = appScores[a.id] || 1;
          const sa = i * wedgeAngle + gapDeg / 2;
          const ea = (i + 1) * wedgeAngle - gapDeg / 2;
          const r = (appS / 10) * outerR;
          if (r < 3) return null;
          const midAngle = (sa + ea) / 2;
          const arcStart = polarToCart(cx, cy, r, sa);
          const arcEnd = polarToCart(cx, cy, r, ea);
          return (
            <Path
              key={`app-${i}`}
              d={`M${cx},${cy} L${arcStart.x},${arcStart.y} A${r},${r} 0 0 1 ${arcEnd.x},${arcEnd.y} Z`}
              fill="none"
              stroke={a.c}
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={tappedIdx !== null && tappedIdx !== i ? 0.2 : 0.5}
            />
          );
        })}

        {areas.map((_, i) => {
          const end = polarToCart(cx, cy, outerR + 1, i * wedgeAngle);
          return (
            <Line
              key={`sep-${i}`}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}

        <Circle cx={cx} cy={cy} r={outerR + 1} fill="none" stroke="rgba(60,60,67,0.06)" strokeWidth={1} />

        <Circle cx={cx} cy={cy} r={20} fill="white" stroke="rgba(60,60,67,0.08)" strokeWidth={1} />
        <SvgText
          x={cx}
          y={cy - 3}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize={13}
          fontWeight="800"
          fill={T.text}
        >
          {avg}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          alignmentBaseline="central"
          fontSize={7}
          fontWeight="600"
          fill={T.t3}
        >
          AVG
        </SvgText>

        {areas.map((a, i) => {
          const midAngle = (i + 0.5) * wedgeAngle;
          const iconR = outerR + 26;
          const ip = polarToCart(cx, cy, iconR, midAngle);
          const isTapped = tappedIdx === i;
          const circleR = isTapped ? 17 : 14;
          const iconSize = isTapped ? 14 : 11;
          const featherName = AREA_FEATHER[a.icon] || 'star';
          return (
            <G key={`ic-${i}`} onPress={() => onTapArea?.(i)}>
              <Circle
                cx={ip.x}
                cy={ip.y}
                r={circleR}
                fill={isTapped ? a.c : 'white'}
                stroke={isTapped ? a.c : 'rgba(60,60,67,0.1)'}
                strokeWidth={isTapped ? 0 : 1}
              />
              <ForeignObject
                x={ip.x - iconSize / 2}
                y={ip.y - iconSize / 2}
                width={iconSize}
                height={iconSize}
              >
                <Feather
                  name={featherName as any}
                  size={iconSize}
                  color={isTapped ? 'white' : a.c}
                />
              </ForeignObject>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
