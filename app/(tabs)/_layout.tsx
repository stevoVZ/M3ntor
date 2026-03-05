import { useState, useCallback } from 'react';
import { View, Pressable, Text, StyleSheet, Platform, Keyboard, Modal, Image } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { T, shadow, R } from '../../constants/theme';
import { FabActionSheet } from '../../components/add/FabActionSheet';
import { ProjectAddSheet } from '../../components/add/ProjectAddSheet';
import ProgramBuilder from '../../components/discover/ProgramBuilder';

// ── Tab icon SVG paths ────────────────────────────────────
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? T.brand : T.t3;
  const sw = active ? 2.2 : 1.8;

  const icons: Record<string, React.ReactNode> = {
    today: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
        {/* Simple calendar icon */}
        <View style={[styles.iconBox, { borderColor: color, borderWidth: sw }]}>
          <View style={[styles.iconDot, { backgroundColor: active ? T.brand : T.t3 }]} />
        </View>
      </View>
    ),
    mylife: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
        <View style={[styles.iconCircle, { borderColor: color, borderWidth: sw }]}>
          <View style={[styles.iconInner, { borderColor: color, borderWidth: sw * 0.7 }]} />
        </View>
      </View>
    ),
    discover: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
        <View style={[styles.iconCompass, { borderColor: color, borderWidth: sw }]} />
      </View>
    ),
    plan: (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
        <View style={{ gap: 3 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.iconLine, {
              width: i === 1 ? 14 : 18,
              backgroundColor: color,
              height: sw * 0.9,
            }]} />
          ))}
        </View>
      </View>
    ),
  };

  return icons[name] ?? null;
}

// ── Custom tab bar with centre FAB ────────────────────────
function CustomTabBar({ state, navigation, onFabPress }: { state: any; navigation: any; onFabPress: () => void }) {
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(1);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const TAB_ROUTES = ['today', 'mylife', 'discover', 'plan'];

  function handleFabPress() {
    Keyboard.dismiss();
    fabScale.value = withSpring(0.88, {}, () => {
      fabScale.value = withSpring(1);
    });
    onFabPress();
  }

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(Platform.OS === 'web' ? 34 : insets.bottom, 8) }]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.tabGlass} />
      </View>

      {TAB_ROUTES.slice(0, 2).map((route) => {
        const idx    = state.routes.findIndex((r: any) => r.name === route);
        const active = state.index === idx;
        return (
          <Pressable key={route} style={[styles.tabItem, active && styles.tabItemActive]}
            onPress={() => navigation.navigate(route)}>
            <TabIcon name={route} active={active} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {route === 'today' ? 'Today' : 'My Life'}
            </Text>
          </Pressable>
        );
      })}

      <View style={styles.fabSlot}>
        <Animated.View style={[styles.fabWrap, fabStyle]}>
          <Pressable onPress={handleFabPress}>
            <LinearGradient
              colors={T.gradColors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.fab}>
              <View style={styles.fabIcon}>
                <Image
                  source={require('../../assets/images/m3ntor-icon-mark.png')}
                  style={{ width: 34, height: 22, tintColor: 'white' }}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {TAB_ROUTES.slice(2).map((route) => {
        const idx    = state.routes.findIndex((r: any) => r.name === route);
        const active = state.index === idx;
        return (
          <Pressable key={route} style={[styles.tabItem, active && styles.tabItemActive]}
            onPress={() => navigation.navigate(route)}>
            <TabIcon name={route} active={active} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {route === 'discover' ? 'Discover' : 'Plan'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'sheet' | 'project' | 'journey'>('sheet');
  const [prefill, setPrefill] = useState('');

  const handleFabPress = useCallback(() => {
    setAddMode('sheet');
    setShowAdd(true);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} onFabPress={handleFabPress} />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="today"    />
        <Tabs.Screen name="mylife"   />
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="plan"     />
      </Tabs>

      {showAdd && addMode === 'sheet' && (
        <FabActionSheet
          onProject={(text) => { setPrefill(text); setAddMode('project'); }}
          onJourney={() => { setAddMode('journey'); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showAdd && addMode === 'project' && (
        <ProjectAddSheet
          prefillText={prefill}
          onClose={() => { setShowAdd(false); setAddMode('sheet'); }}
        />
      )}
      {showAdd && addMode === 'journey' && (
        <Modal transparent={false} animationType="slide" visible>
          <ProgramBuilder
            onClose={() => { setShowAdd(false); setAddMode('sheet'); }}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    paddingTop:      6,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    position:        'relative',
  },
  tabGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:  T.glassHeavy,
    borderTopWidth:   0.5,
    borderTopColor:   'rgba(255,255,255,0.6)',
  },
  tabItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 7,
    gap:             3,
    borderRadius:    R.md,
  },
  tabItemActive: {
    backgroundColor: T.brand + '10',
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '500',
    color:      T.t3,
    lineHeight: 12,
  },
  tabLabelActive: {
    color:      T.brand,
    fontWeight: '700',
  },
  fabSlot: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'flex-end',
    paddingBottom:   4,
  },
  fabWrap: {
    marginBottom: 6,
    ...shadow.fab,
  },
  fab: {
    width:          56,
    height:         56,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2.5,
    borderColor:    'rgba(255,255,255,0.85)',
  },
  fabIcon: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Small icon helpers
  iconBox: {
    width: 18, height: 18, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  iconDot: {
    width: 4, height: 4, borderRadius: 2,
  },
  iconCircle: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: {
    width: 8, height: 8, borderRadius: 4,
  },
  iconCompass: {
    width: 18, height: 18, borderRadius: 9,
  },
  iconLine: {
    borderRadius: 2,
  },
});
