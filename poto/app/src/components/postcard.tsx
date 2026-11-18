/**
 * The postcard: a paper card with the photo on the front and the message on the back.
 * Tap to turn it over. Sizes are proportions of the card, so it scales to any width.
 * Back layout follows the prototype: header word, signature stamp + postmark, typed message, a rule, the handwritten note, the caption.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_RATIO, Type } from '@/constants/theme';
import type { Postcard } from '@/lib/sample';

type Props = { card: Postcard; width: number; flipped: boolean; onPress?: () => void; onLongPress?: () => void };

export function PostcardView({ card, width, flipped, onPress, onLongPress }: Props) {
  const h = width * CARD_RATIO, u = width / 1024;           // u: one unit of the card's 1024-wide design
  const [spin] = useState(() => new Animated.Value(flipped ? 1 : 0));
  useEffect(() => {
    Animated.spring(spin, { toValue: flipped ? 1 : 0, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, [flipped, spin]);
  const front = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const back = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const face = { width, height: h, borderRadius: 3 * (width / 360) } as const;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={420} accessibilityRole="button" accessibilityLabel={'Postcard from ' + card.from + '. Tap to turn over.'}>
      <View style={{ width, height: h }}>
        {/* front */}
        <Animated.View style={[styles.face, face, { transform: [{ perspective: 1400 }, { rotateY: front }] }]}>
          <View style={{ padding: 43 * u, paddingBottom: 0 }}>
            <Image source={card.photo} style={{ width: width - 86 * u, aspectRatio: 3 / 4 }} contentFit="cover" transition={250} />
          </View>
          <Text style={[styles.mark, { right: 56 * u, bottom: 46 * u, fontSize: Math.max(7, 15 * u) }]}>poto</Text>
          <Stamp source={card.stamp} width={150 * u} style={{ position: 'absolute', right: 50 * u, top: 26 * u, transform: [{ rotate: '7deg' }] }} />
        </Animated.View>
        {/* back */}
        <Animated.View style={[styles.face, styles.back, face, { position: 'absolute', transform: [{ perspective: 1400 }, { rotateY: back }] }]}>
          <Text style={[styles.header, { left: 86 * u, top: 120 * u, fontSize: 17 * u, letterSpacing: 7 * u }]}>POSTCARD</Text>
          <Stamp source={card.stamp} width={170 * u} style={{ position: 'absolute', right: 86 * u, top: 84 * u }} />
          <View style={[styles.postmark, { right: 200 * u, top: 150 * u, width: 184 * u, height: 184 * u, borderRadius: 92 * u, borderWidth: Math.max(1, 3 * u) }]}>
            <Text style={[styles.pmText, { fontSize: 17 * u }]}>{postmarkDate(card.day)}</Text>
          </View>
          <View style={{ position: 'absolute', left: 86 * u, top: 560 * u, right: 86 * u }}>
            {card.typed.map((l, i) => (
              <Text key={i} style={{ fontFamily: Type.typewriter, fontSize: 37 * u, lineHeight: 60 * u, color: 'rgba(38,35,31,0.9)' }}>{l}</Text>
            ))}
          </View>
          <View style={[styles.rule, { left: 80 * u, right: 80 * u, top: 1010 * u }]} />
          <Text style={[styles.small, { left: 96 * u, top: 1100 * u, fontSize: 14 * u, letterSpacing: 2 * u }]}>NOTE</Text>
          {[0, 1].map((i) => <View key={i} style={[styles.rule, { left: 250 * u, right: 96 * u, top: (1122 + i * 84) * u }]} />)}
          <Text style={[styles.hand, { left: 262 * u, top: 1052 * u, fontSize: 56 * u }]}>{card.note[0]}</Text>
          <Text style={[styles.hand, { left: 262 * u, top: 1140 * u, fontSize: 52 * u }]}>{card.note[1]}</Text>
          <Text style={[styles.small, { left: 86 * u, bottom: 64 * u, fontSize: 14 * u, letterSpacing: 2 * u }]}>{(card.place + ' · ' + card.day).toUpperCase()}</Text>
          <Text style={[styles.small, { right: 86 * u, bottom: 64 * u, fontSize: 14 * u, letterSpacing: 2 * u }]}>POTO</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** The sender's signature stamp: their photo on a paper border. (Perforated edge comes with Cody's stamp artwork.) */
/** "Today" becomes today's date; "Mon 16 Nov" becomes "16 NOV". */
function postmarkDate(day: string) {
  if (day !== 'Today') return day.split(' ').slice(1).join(' ').toUpperCase();
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}

export function Stamp({ source, width, style }: { source: Postcard['stamp']; width: number; style?: object }) {
  const pad = width * 0.09;
  return (
    <View style={[{ width, height: width * 1.25, padding: pad, backgroundColor: '#FBFAF6', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, style]}>
      <Image source={source} style={{ width: width - pad * 2, height: width * 1.25 - pad * 2 }} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  face: { backgroundColor: '#FBFAF6', backfaceVisibility: 'hidden', overflow: 'hidden', shadowColor: '#14141E', shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
  back: { backgroundColor: '#FAF8F2', top: 0, left: 0 },
  mark: { position: 'absolute', fontFamily: Type.mono, color: '#B0ACA5', letterSpacing: 2 },
  header: { position: 'absolute', fontFamily: Type.mono, color: 'rgba(78,72,64,0.8)' },
  postmark: { position: 'absolute', zIndex: 2, borderColor: 'rgba(36,49,79,0.45)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  pmText: { fontFamily: Type.mono, color: 'rgba(36,49,79,0.6)', letterSpacing: 1 },
  rule: { position: 'absolute', height: StyleSheet.hairlineWidth * 1.5, backgroundColor: 'rgba(90,84,76,0.45)' },
  small: { position: 'absolute', fontFamily: Type.mono, color: 'rgba(78,72,64,0.75)' },
  hand: { position: 'absolute', fontFamily: Type.hand, color: '#1C2947' },
});

