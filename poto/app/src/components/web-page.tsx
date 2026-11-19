/**
 * One prototype page, running inside the app.
 * - opens documents/web/<page>.html with access to that folder (pages, photos, your shots)
 * - links to other pages don't load here: they're handed to the app (switch tab, open the postcard, close)
 * - messages from the page: haptics, tab bar taps, camera calls (answered through PotoNative._done)
 */
import * as Haptics from 'expo-haptics';
import { forwardRef, useImperativeHandle, useRef, type ComponentRef } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

export type PageMessage =
  | { type: 'tab'; name: string }
  | { type: 'camera' }
  | { type: 'nav'; page: string; query: string }
  | { type: 'viewfinder'; x: number; y: number; w: number; h: number; r: number }
  | { type: 'call'; id: number; name: string; args: Record<string, unknown> };

export type WebPageHandle = { reload: () => void; resolve: (id: number, ok: boolean, value: unknown) => void; shown: () => void };

type Props = {
  base: string;               // documents/web/ (ends with /)
  page: string;               // 'home-min', 'postcard', ...
  query?: string;             // 'src=img/photo-04.jpg&zoom=1'
  transparent?: boolean;      // the camera page: the real camera shows through
  style?: ViewStyle;
  onMessage?: (m: PageMessage) => void;
  onNavigate: (page: string, query: string) => void;
};

function haptic(ms: number) {
  if (ms <= 5) Haptics.selectionAsync();
  else if (ms <= 10) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export const WebPage = forwardRef<WebPageHandle, Props>(function WebPage({ base, page, query, transparent, style, onMessage, onNavigate }, ref) {
  const wv = useRef<ComponentRef<typeof WebView>>(null);
  const url = base + page + '.html' + (query ? '?' + query : '');

  useImperativeHandle(ref, () => ({
    reload: () => wv.current?.reload(),
    resolve: (id, ok, value) => wv.current?.injectJavaScript('window.PotoNative && PotoNative._done(' + id + ',' + (ok ? 'true' : 'false') + ',' + JSON.stringify(value ?? null) + ');true;'),
    shown: () => wv.current?.injectJavaScript('window.PotoNative && PotoNative._shown();true;'),
  }));

  const shouldLoad = (req: ShouldStartLoadRequest) => {
    if (!req.url.startsWith('file:')) return req.url.startsWith('about:') || req.url.startsWith('data:') || req.url.startsWith('blob:');
    const [pathPart, q = ''] = req.url.split('?');
    if (pathPart === base + page + '.html') return true;   // this page itself (first load, reload)
    const m = pathPart.match(/([a-z0-9-]+)\.html$/);
    if (m) onNavigate(m[1], q.split('#')[0]);
    return false;
  };

  const message = (e: WebViewMessageEvent) => {
    let m: (PageMessage | { type: 'haptic'; ms: number }) | null = null;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (!m) return;
    if (m.type === 'haptic') { haptic(m.ms); return; }
    if (m.type === 'nav') { onNavigate(m.page, m.query); return; }
    onMessage?.(m);
  };

  return (
    <WebView
      ref={wv}
      source={{ uri: url }}
      style={[styles.web, transparent && styles.clear, style]}
      containerStyle={transparent ? styles.clear : undefined}
      originWhitelist={['*']}
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      allowingReadAccessToURL={base}
      onShouldStartLoadWithRequest={shouldLoad}
      onMessage={message}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      allowsInlineMediaPlayback
      allowsBackForwardNavigationGestures={false}
      setSupportMultipleWindows={false}
      hideKeyboardAccessoryView
      keyboardDisplayRequiresUserAction={false}
      webviewDebuggingEnabled={__DEV__}
      androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1 },
  clear: { backgroundColor: 'transparent' },
});
