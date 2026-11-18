/**
 * Root: fonts, Paper / Darkroom theme, and the native glass tab bar (iOS liquid glass, Android Material).
 * Tabs: Postcards, Calendar, Camera, Rolls, Desk.
 */
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { LaBelleAurore_400Regular } from '@expo-google-fonts/la-belle-aurore';
import { PinyonScript_400Regular } from '@expo-google-fonts/pinyon-script';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [loaded, error] = useFonts({ PinyonScript_400Regular, LaBelleAurore_400Regular, SpecialElite_400Regular, IBMPlexMono_500Medium });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const nav = { ...base, colors: { ...base.colors, background: c.room, card: c.room, text: c.text, border: c.hair, primary: c.text } };

  return (
    <ThemeProvider value={nav}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NativeTabs tintColor={c.text} labelVisibilityMode="selected">
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Postcards</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'rectangle.portrait', selected: 'rectangle.portrait.fill' }} md="photo" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="calendar">
          <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="camera">
          <NativeTabs.Trigger.Label>Camera</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'camera', selected: 'camera.fill' }} md="photo_camera" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="rolls">
          <NativeTabs.Trigger.Label>Rolls</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="film" md="movie" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="desk">
          <NativeTabs.Trigger.Label>Desk</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
