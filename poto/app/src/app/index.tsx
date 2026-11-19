/**
 * Poto: the tested prototype pages, running in the app.
 * Tabs (one shared glass bar, drawn by the pages): Postcards (home-min), Calendar (the diary: week stack, photo disc,
 * wall calendar, month share), Rolls, Desk. The camera opens over everything; the postcard and the stamp cutter open
 * full screen from the pages that link to them.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { CameraLayer } from '@/components/camera-layer';
import { WebPage, type PageMessage, type WebPageHandle } from '@/components/web-page';
import { installWeb } from '@/web/install';

type Tab = 'home' | 'calendar' | 'rolls' | 'desk';
const TABS: Tab[] = ['home', 'calendar', 'rolls', 'desk'];
const PAGE: Record<Tab, string> = { home: 'home-min', calendar: 'home', rolls: 'rolls', desk: 'profile' };
const TAB_OF: Record<string, Tab> = { 'home-min': 'home', home: 'calendar', rolls: 'rolls', profile: 'desk' };
const ROOM: Record<Tab, string> = { home: '#F4F2ED', calendar: '#FAFAF8', rolls: '#FAFAF8', desk: '#FAFAF8' };

export default function Shell() {
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [opened, setOpened] = useState<Tab[]>(['home']);
  const [camera, setCamera] = useState(false);
  const [sheet, setSheet] = useState<{ page: string; query: string } | null>(null);
  const pages = useRef<Partial<Record<Tab, WebPageHandle | null>>>({});
  const stale = useRef(new Set<Tab>());

  useEffect(() => { installWeb().then(setBase, (e) => setFailed(String(e))); }, []);

  // what the camera or the postcard changed (kept prints, stamps, the roll) shows up when you come back
  const touched = () => { stale.current.add('calendar'); stale.current.add('rolls'); stale.current.add('desk'); };
  const show = (t: Tab) => {
    setOpened((o) => (o.includes(t) ? o : [...o, t]));
    setTab(t);
    if (stale.current.delete(t)) pages.current[t]?.reload();
    else pages.current[t]?.shown();   // undo a page's leaving animation (a print opening into the postcard)
  };
  const closeCamera = (then?: Tab) => { setCamera(false); touched(); show(then ?? tab); };
  const closeSheet = (then?: Tab) => { setSheet(null); touched(); show(then ?? tab); };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) { closeSheet(); return true; }
      if (camera) { closeCamera(); return true; }
      if (tab !== 'home') { show('home'); return true; }
      return false;
    });
    return () => sub.remove();
  });

  const navigate = (from: 'tab' | 'camera' | 'sheet', page: string, query: string) => {
    if (page === 'index') { if (from === 'camera') closeCamera(); else if (from === 'sheet') closeSheet(); return; }
    if (page === 'camera') { setSheet(null); setCamera(true); return; }
    if (page === 'postcard' || page === 'stamp') { setSheet({ page, query }); return; }
    const t = TAB_OF[page];
    if (!t) return;
    if (t === 'desk' && query.includes('stamp')) stale.current.add('desk');   // a stamp you just cut lands on the desk
    if (from === 'camera') closeCamera(t);
    else if (from === 'sheet') closeSheet(t);
    else show(t);
  };

  const navTab = (page: string, query: string) => navigate('tab', page, query);
  const navCamera = (page: string, query: string) => navigate('camera', page, query);
  const navSheet = (page: string, query: string) => navigate('sheet', page, query);

  const onTabMessage = (m: PageMessage) => {
    if (m.type === 'tab' && TABS.includes(m.name as Tab)) show(m.name as Tab);
    else if (m.type === 'camera') setCamera(true);
  };

  if (!base) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: ROOM.home }]}>
        {failed ? <Text style={styles.err}>Poto couldn’t set itself up.{'\n'}{failed}</Text> : <ActivityIndicator color="#8a867f" />}
      </View>
    );
  }

  const pad = Platform.OS === 'android' ? { paddingTop: insets.top, paddingBottom: insets.bottom } : null;
  return (
    <View style={[styles.fill, { backgroundColor: ROOM[tab] }]}>
      <StatusBar style={camera ? 'light' : 'dark'} />
      {opened.map((t) => (
        <View key={t} style={[StyleSheet.absoluteFill, pad, { backgroundColor: ROOM[t] }, t === tab ? styles.front : styles.back]} pointerEvents={t === tab ? 'auto' : 'none'}>
          <WebPage ref={(r) => { pages.current[t] = r; }} base={base} page={PAGE[t]} onMessage={onTabMessage} onNavigate={navTab} />
        </View>
      ))}
      {camera && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.top]}>
          <CameraLayer base={base} onNavigate={navCamera} />
        </Animated.View>
      )}
      {sheet && (
        <Animated.View entering={SlideInDown.duration(280)} exiting={SlideOutDown.duration(220)} style={[StyleSheet.absoluteFill, styles.top, pad, { backgroundColor: '#FAFAF8' }]}>
          <WebPage base={base} page={sheet.page} query={sheet.query} onNavigate={navSheet} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  front: { zIndex: 2, opacity: 1 },
  back: { zIndex: 1, opacity: 0 },
  top: { zIndex: 10 },
  err: { color: '#6D6A64', textAlign: 'center', fontSize: 14, lineHeight: 20, paddingHorizontal: 32 },
});
