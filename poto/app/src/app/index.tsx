/**
 * Home: only the postcard (Cody, 18 Nov). Who sent it, small, top left. Tap to turn over, swipe up for the next,
 * swipe down for the previous, hold for reply / keep / sticker. Today's postcards run on into earlier days.
 */
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, type GestureResponderEvent, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostcardView } from '@/components/postcard';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FRIENDS, type Postcard } from '@/lib/sample';
import { useShots } from '@/lib/store';

export default function Home() {
  const c = useTheme(), insets = useSafeAreaInsets(), { height } = useWindowDimensions();
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const { developed } = useShots();
  // your own developed shots join the stack as postcards from you
  const cards: Postcard[] = useMemo(() => {
    const mine = developed.slice(0, 6).map((s): Postcard => ({
      id: s.id, from: 'you', avatar: { uri: s.uri }, stamp: { uri: s.uri }, photo: { uri: s.uri }, mine: true,
      typed: ['a moment from today.'], note: s.note ?? ['', ''], place: 'Here', when: 'now', day: 'Today',
    }));
    return [...mine, ...FRIENDS];
  }, [developed]);

  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dayChip, setDayChip] = useState<string | null>(null);
  const [turn] = useState(() => new Animated.Value(0));      // 0 = resting, 1 = flipped up and away
  const busy = useRef(false);

  // the card fills the space between the sender line and the tab bar, never wider than 86% of the screen
  const cardW = Math.max(0, Math.min(stage.w * 0.86, (stage.h - 24) / 1.414));
  const card = cards[i];
  const done = i >= cards.length;

  function go(d: number) {
    if (busy.current) return;
    const to = i + d; if (to < 0 || to > cards.length) return;
    busy.current = true; Haptics.selectionAsync();
    Animated.timing(turn, { toValue: d > 0 ? 1 : -1, duration: 200, useNativeDriver: true }).start(() => {
      setI(to); setFlipped(false); turn.setValue(d > 0 ? -0.4 : 0.4);
      const next = cards[to], prev = cards[to - 1];
      if (next && prev && next.day !== prev.day) { setDayChip(next.day); setTimeout(() => setDayChip(null), 1400); }
      Animated.spring(turn, { toValue: 0, useNativeDriver: true, friction: 9, tension: 90 }).start(() => (busy.current = false));
    });
  }
  // vertical swipe anywhere on the screen: captured from the card so a drag never counts as a tap
  const startY = useRef(0);
  const swipe = {
    onTouchStart: (e: GestureResponderEvent) => { startY.current = e.nativeEvent.pageY; },
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) => Math.abs(e.nativeEvent.pageY - startY.current) > 12,
    onResponderRelease: (e: GestureResponderEvent) => { const dy = e.nativeEvent.pageY - startY.current; if (dy < -40) go(1); else if (dy > 40) go(-1); },
  };

  const rotateX = turn.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-70deg', '0deg', '70deg'] });
  const translateY = turn.interpolate({ inputRange: [-1, 0, 1], outputRange: [height * 0.25, 0, -height * 0.25] });
  const opacity = turn.interpolate({ inputRange: [-1, -0.4, 0, 0.4, 1], outputRange: [0, 0.6, 1, 0.6, 0] });

  return (
    <View style={[styles.room, { backgroundColor: c.room }]} {...swipe}>
      {!done && card && (
        <View style={[styles.who, { top: insets.top + 10 }]}>
          <Image source={card.avatar} style={styles.avatar} contentFit="cover" />
          <View>
            <Text style={[styles.name, { color: c.text }]}>{card.from}</Text>
            <Text style={[styles.ago, { color: c.textTertiary }]}>{card.when}</Text>
          </View>
        </View>
      )}
      {dayChip && <Text style={[styles.day, { top: insets.top + 18, color: c.textTertiary }]}>{dayChip.toUpperCase()}</Text>}

      <View style={[styles.stage, { marginTop: insets.top + 52, marginBottom: insets.bottom + 72 }]} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {cardW === 0 ? null : !done && card ? (
          <Animated.View style={{ transform: [{ perspective: 1200 }, { translateY }, { rotateX }], opacity }}>
            <PostcardView key={card.id} card={card} width={cardW} flipped={flipped}
              onPress={() => { setFlipped((f) => !f); Haptics.selectionAsync(); }}
              onLongPress={() => { setMenu(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} />
          </Animated.View>
        ) : (
          <Pressable onPress={() => go(-1)} style={[styles.empty, { width: cardW * 0.7, borderColor: c.hair }]}>
            <View style={[styles.shutter, { borderColor: c.textTertiary }]} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>That’s everyone.{'\n'}Your shots develop tonight.</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.dim} onPress={() => setMenu(false)}>
          <View style={[styles.menu, { backgroundColor: c.card }]}>
            {['Reply with a postcard', 'Keep on my desk', 'Leave a sticker'].map((t) => (
              <Pressable key={t} onPress={() => setMenu(false)} style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.well }]}>
                <Text style={{ fontSize: 16, color: '#1A1917' }}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  who: { position: 'absolute', left: 20, zIndex: 5, flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  name: { fontSize: 14, fontWeight: '500', letterSpacing: -0.1 },
  ago: { fontSize: 11 },
  day: { position: 'absolute', alignSelf: 'center', zIndex: 5, fontFamily: Type.mono, fontSize: 10, letterSpacing: 1.6 },
  empty: { aspectRatio: 1024 / 1448, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 3, alignItems: 'center', justifyContent: 'center', gap: 18 },
  shutter: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.6 },
  emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 19 },
  dim: { flex: 1, backgroundColor: 'rgba(20,18,16,0.35)', alignItems: 'center', justifyContent: 'center' },
  menu: { width: 240, borderRadius: 20, padding: 6 },
  item: { height: 46, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 14 },
});
