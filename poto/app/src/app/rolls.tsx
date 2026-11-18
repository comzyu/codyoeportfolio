/**
 * Rolls: v0.1 shows today's roll (developed and developing). Shared rolls and events come later.
 */
import { Image } from 'expo-image';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatReady, useShots } from '@/lib/store';

export default function Rolls() {
  const c = useTheme(), insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const { all, developed } = useShots();
  const ready = new Set(developed.map((s) => s.id));
  const w = (width - 40 - 16) / 3;
  return (
    <FlatList
      style={{ backgroundColor: c.room }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 140, gap: 8 }}
      columnWrapperStyle={{ gap: 8 }}
      numColumns={3}
      data={all}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <View style={{ marginBottom: 14 }}>
          <Text style={[styles.title, { color: c.text }]}>Your roll</Text>
          <Text style={[styles.meta, { color: c.textTertiary }]}>{all.length} FRAMES</Text>
        </View>
      }
      ListEmptyComponent={<Text style={[styles.empty, { color: c.textSecondary }]}>Nothing on the roll yet.{'\n'}Open the camera and take one.</Text>}
      renderItem={({ item }) => ready.has(item.id) ? (
        <Image source={{ uri: item.uri }} style={{ width: w, height: w * 4 / 3, borderRadius: 2 }} contentFit="cover" />
      ) : (
        <View style={[styles.wait, { width: w, height: w * 4 / 3, backgroundColor: c.well }]}>
          <Text style={[styles.meta, { color: c.textTertiary, textAlign: 'center' }]}>{'READY\n' + formatReady(item.developAt)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Type.script, fontSize: 44 },
  meta: { fontFamily: Type.mono, fontSize: 10, letterSpacing: 1.6 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 21 },
  wait: { borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
});
