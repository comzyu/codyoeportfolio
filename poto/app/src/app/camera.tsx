/**
 * Camera: dark, the viewfinder and one shutter. No preview after the shot: it goes to develop, like film.
 * First 3 shots a day develop now, the rest are ready at 7:00 tomorrow.
 */
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Type } from '@/constants/theme';
import { addShot, formatReady, useShots } from '@/lib/store';

export default function Camera() {
  const insets = useSafeAreaInsets(), focused = useIsFocused();
  const [perm, ask] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [msg, setMsg] = useState<string | null>(null);
  const cam = useRef<CameraView>(null);
  const [flash] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
  const { instantLeftToday, developing } = useShots();

  async function shoot() {
    if (busy.current || !cam.current) return;
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (pic?.uri) {
        const s = await addShot(pic.uri);
        setMsg(s.developAt <= Date.now() ? 'Developed. It’s on your postcards.' : 'Developing · ready ' + formatReady(s.developAt) + ' tomorrow');
        setTimeout(() => setMsg(null), 2400);
      }
    } catch {
      setMsg('That one didn’t take. Try again.');
      setTimeout(() => setMsg(null), 2000);
    } finally { busy.current = false; }
  }

  if (!perm) return <View style={styles.room} />;
  if (!perm.granted) {
    return (
      <View style={[styles.room, styles.center]}>
        <Text style={styles.ask}>Poto needs the camera{'\n'}to take your photos.</Text>
        <Pressable onPress={ask} style={styles.allow}><Text style={styles.allowText}>Allow camera</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.room}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.meta}>{instantLeftToday > 0 ? instantLeftToday + ' INSTANT LEFT TODAY' : 'NEXT SHOTS DEVELOP OVERNIGHT'}</Text>
      </View>
      <View style={styles.finder}>
        {focused && <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} animateShutter={false} />}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: flash }]} />
      </View>
      <View style={[styles.controls, { paddingBottom: insets.bottom + 96 }]}>
        <Text style={styles.meta}>{developing.length ? developing.length + ' DEVELOPING' : ' '}</Text>
        <Pressable onPress={shoot} accessibilityLabel="Take photo" style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.93 }] }]}>
          <View style={styles.shutterIn} />
        </Pressable>
        <Pressable onPress={() => { setFacing((f) => (f === 'back' ? 'front' : 'back')); Haptics.selectionAsync(); }} accessibilityLabel="Flip camera" style={styles.flip}>
          <Text style={styles.flipText}>⟲</Text>
        </Pressable>
      </View>
      {msg && <Text style={[styles.toast, { top: insets.top + 40 }]}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, backgroundColor: '#141210' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 22 },
  ask: { color: '#EDEAE3', textAlign: 'center', fontSize: 16, lineHeight: 23 },
  allow: { backgroundColor: '#EDEAE3', borderRadius: 999, paddingHorizontal: 22, height: 44, justifyContent: 'center' },
  allowText: { color: '#1A1917', fontSize: 15, fontWeight: '600' },
  top: { alignItems: 'center', paddingBottom: 10 },
  meta: { fontFamily: Type.mono, fontSize: 10, letterSpacing: 1.6, color: 'rgba(237,234,227,0.55)' },
  finder: { marginHorizontal: 14, aspectRatio: 3 / 4, borderRadius: 6, overflow: 'hidden', backgroundColor: '#000' },
  controls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(237,234,227,0.9)', alignItems: 'center', justifyContent: 'center' },
  shutterIn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#EDEAE3' },
  flip: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(237,234,227,0.12)', alignItems: 'center', justifyContent: 'center' },
  flipText: { color: '#EDEAE3', fontSize: 20 },
  toast: { position: 'absolute', alignSelf: 'center', color: '#1A1917', backgroundColor: 'rgba(237,234,227,0.92)', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13 },
});
