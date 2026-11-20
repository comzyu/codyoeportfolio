/**
 * The camera: the tested camera page (film tab, shutter, tray, develop all) drawn over the phone's real camera.
 * The page says where its viewfinder is; the live picture is placed exactly there, under it.
 */
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WebPage, type PageMessage, type WebPageHandle } from '@/components/web-page';
import { saveShot } from '@/web/shots';

const DARK = '#0A0A0B';   // the camera room (ui.css --dark)

type Props = { base: string; query?: string; onNavigate: (page: string, query: string) => void };

export function CameraLayer({ base, query, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'android' ? insets.top : 0;   // Android pages sit below the status bar
  const [perm, ask] = useCameraPermissions();
  const [vf, setVf] = useState<{ x: number; y: number; w: number; h: number; r: number } | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [zoom, setZoom] = useState(0);
  const cam = useRef<CameraView>(null);
  const page = useRef<WebPageHandle>(null);

  async function call(id: number, name: string, args: Record<string, unknown>) {
    try {
      if (name === 'shoot') {
        if (!cam.current) throw new Error('camera not ready');
        const pic = await cam.current.takePictureAsync({ quality: 0.92, skipProcessing: false });
        if (!pic) throw new Error('no picture');
        page.current?.resolve(id, true, await saveShot(pic.uri, pic.width, pic.height));
      } else if (name === 'zoom') { setZoom(Number(args.z) || 0); page.current?.resolve(id, true, null); }
      else if (name === 'flip') { setFacing((f) => (f === 'back' ? 'front' : 'back')); page.current?.resolve(id, true, null); }
      else page.current?.resolve(id, false, 'unknown call ' + name);
    } catch (e) {
      page.current?.resolve(id, false, String(e));
    }
  }

  const onMessage = (m: PageMessage) => {
    if (m.type === 'viewfinder') setVf({ x: m.x, y: m.y + top, w: m.w, h: m.h, r: m.r });
    else if (m.type === 'call') call(m.id, m.name, m.args);
  };

  const hole = vf ? { left: vf.x, top: vf.y, width: vf.w, height: vf.h, borderRadius: vf.r } : null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: DARK }]}>
      {hole && perm?.granted && (
        <View style={[styles.hole, hole]}>
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} zoom={zoom} animateShutter={false} />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, { paddingTop: top, paddingBottom: Platform.OS === 'android' ? insets.bottom : 0 }]}>
        <WebPage ref={page} base={base} page="camera" query={query} transparent onMessage={onMessage} onNavigate={onNavigate} />
      </View>
      {hole && perm && !perm.granted && (
        <View style={[styles.hole, styles.ask, hole]}>
          <Text style={styles.askText}>Poto needs the camera{'\n'}to take your photos.</Text>
          <Pressable onPress={ask} style={styles.allow} accessibilityRole="button"><Text style={styles.allowText}>Allow camera</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hole: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000' },
  ask: { alignItems: 'center', justifyContent: 'center', gap: 18 },
  askText: { color: '#F2F2EF', textAlign: 'center', fontSize: 15, lineHeight: 21 },
  allow: { backgroundColor: '#F2F2EF', borderRadius: 999, paddingHorizontal: 20, height: 42, justifyContent: 'center' },
  allowText: { color: '#0A0A0B', fontSize: 15, fontWeight: '600' },
});
