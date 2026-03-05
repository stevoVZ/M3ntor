import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { T } from '@/constants/theme';
import { ITEM_AREAS } from '@/constants/config';

interface Props {
  selected: string | null;
  onSelect: (id: string | null) => void;
  label?: string;
  required?: boolean;
  excludeArea?: string;
}

const GAP = 6;
const MIN_ITEM_WIDTH = 68;

export function AreaPicker({ selected, onSelect, label, required, excludeArea }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const columns = containerWidth > 0 ? Math.max(3, Math.floor((containerWidth + GAP) / (MIN_ITEM_WIDTH + GAP))) : 4;
  const itemWidth = containerWidth > 0 ? (containerWidth - GAP * (columns - 1)) / columns : MIN_ITEM_WIDTH;

  function onLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  const areas = Object.entries(ITEM_AREAS).filter(([id]) => id !== excludeArea);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          {required && <Text style={styles.required}>Required</Text>}
        </View>
      )}
      <View style={styles.grid} onLayout={onLayout}>
        {areas.map(([id, a]) => {
          const on = selected === id;
          return (
            <Pressable
              key={id}
              style={[
                styles.btn,
                { width: itemWidth },
                on
                  ? { borderWidth: 2, borderColor: a.c, backgroundColor: a.c + '10' }
                  : { borderWidth: 1, borderColor: T.sep, backgroundColor: 'white' },
              ]}
              onPress={() => onSelect(on ? null : id)}
            >
              <Text style={styles.emoji}>{a.e}</Text>
              <Text
                style={[
                  styles.name,
                  on && { color: a.c, fontWeight: '700' as const },
                ]}
                numberOfLines={1}
              >
                {a.n.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: T.t3,
    letterSpacing: 0.3,
  },
  required: {
    fontSize: 10,
    fontWeight: '700',
    color: T.brand,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: T.brand + '10',
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  btn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 3,
  },
  emoji: { fontSize: 18 },
  name: {
    fontSize: 11,
    color: T.t3,
    textAlign: 'center',
  },
});
