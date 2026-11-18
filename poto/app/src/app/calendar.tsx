/**
 * Calendar: this month, one tiny print on each day you shot. Month name in the script face.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShots } from '@/lib/store';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const c = useTheme(), insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const { developed } = useShots();
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = first.getFullYear(), mo = first.getMonth();
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // weeks start Monday
  const byDay = (() => {
    const m = new Map<number, string>();
    for (const s of developed) {
      const d = new Date(s.takenAt);
      if (d.getFullYear() === y && d.getMonth() === mo && !m.has(d.getDate())) m.set(d.getDate(), s.uri);
    }
    return m;
  })();
  const cell = (width - 40) / 7;

  return (
    <ScrollView style={{ backgroundColor: c.room }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 140 }}>
      <View style={styles.head}>
        <Pressable onPress={() => setOffset((o) => o - 1)} hitSlop={12}><Text style={[styles.arrow, { color: c.textTertiary }]}>‹</Text></Pressable>
        <Text style={[styles.month, { color: c.text }]}>{MONTHS[first.getMonth()]}</Text>
        <Pressable onPress={() => setOffset((o) => Math.min(0, o + 1))} hitSlop={12}><Text style={[styles.arrow, { color: offset < 0 ? c.textTertiary : 'transparent' }]}>›</Text></Pressable>
      </View>
      <View style={styles.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={'h' + i} style={[styles.dow, { width: cell, color: c.textTertiary }]}>{d}</Text>
        ))}
        {Array.from({ length: lead }).map((_, i) => <View key={'l' + i} style={{ width: cell, height: cell * 1.3 }} />)}
        {Array.from({ length: days }).map((_, i) => {
          const uri = byDay.get(i + 1);
          const today = offset === 0 && i + 1 === now.getDate();
          return (
            <View key={i} style={{ width: cell, height: cell * 1.3, padding: 3 }}>
              {uri ? (
                <Image source={{ uri }} style={[styles.print, { borderColor: c.card }]} contentFit="cover" />
              ) : (
                <Text style={[styles.num, { color: today ? c.postmark : c.textTertiary }]}>{i + 1}</Text>
              )}
            </View>
          );
        })}
      </View>
      {developed.length === 0 && <Text style={[styles.hint, { color: c.textSecondary }]}>Your days fill in as you shoot.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  arrow: { fontSize: 26, paddingHorizontal: 6 },
  month: { fontFamily: Type.script, fontSize: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { textAlign: 'center', fontSize: 11, marginBottom: 8 },
  num: { textAlign: 'center', fontSize: 13, marginTop: 10, fontVariant: ['tabular-nums'] },
  print: { flex: 1, borderWidth: 2, borderRadius: 2 },
  hint: { textAlign: 'center', marginTop: 28, fontSize: 13 },
});
