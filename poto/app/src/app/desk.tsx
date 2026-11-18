/**
 * Desk (profile): v0.1 lays your latest prints on the desk at gentle angles. Arranging, words and knick-knacks come next.
 */
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShots } from '@/lib/store';

const TILT = [-4, 3, -2, 5, -3, 2];

export default function Desk() {
  const c = useTheme(), insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const { developed } = useShots();
  const w = (width - 60) / 2;
  return (
    <ScrollView style={{ backgroundColor: c.room }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 140 }}>
      <Text style={[styles.name, { color: c.text }]}>your desk</Text>
      <Text style={[styles.meta, { color: c.textTertiary }]}>{developed.length} PRINTS</Text>
      <View style={styles.spread}>
        {developed.slice(0, 6).map((s, i) => (
          <View key={s.id} style={[styles.print, { width: w, backgroundColor: c.card, transform: [{ rotate: TILT[i] + 'deg' }] }]}>
            <Image source={{ uri: s.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" />
          </View>
        ))}
      </View>
      {developed.length === 0 && <Text style={[styles.empty, { color: c.textSecondary }]}>Your prints land here.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: Type.script, fontSize: 44 },
  meta: { fontFamily: Type.mono, fontSize: 10, letterSpacing: 1.6, marginBottom: 24 },
  spread: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22 },
  print: { padding: 8, paddingBottom: 22, shadowColor: '#14141E', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
