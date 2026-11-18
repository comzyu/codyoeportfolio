/**
 * Poto v0.1 local store. Everything lives on the phone for now (accounts and friends come in v0.2).
 *
 * Developing rule (Cody, 17 Nov): the first 3 shots of each day develop right away;
 * the rest develop overnight and are ready at 7:00 the next morning. Poto+ will skip the wait.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState, useSyncExternalStore } from 'react';

export type Shot = {
  id: string;
  uri: string;          // file in the app's documents folder
  takenAt: number;      // ms
  developAt: number;    // ms; when it becomes visible
  note?: [string, string];
};

const KEY = 'poto.shots.v1';
const INSTANT_PER_DAY = 3;
let shots: Shot[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loaded) return;
  try { const raw = await AsyncStorage.getItem(KEY); shots = raw ? JSON.parse(raw) : []; } catch { shots = []; }
  loaded = true; emit();
}
async function save() { try { await AsyncStorage.setItem(KEY, JSON.stringify(shots)); } catch {} }

const dayKey = (t: number) => { const d = new Date(t); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
function nextMorning(t: number) { const d = new Date(t); d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); return d.getTime(); }

/** Keep a photo the camera just took: copy it out of the cache into the app's own folder, decide when it develops. */
export async function addShot(cacheUri: string): Promise<Shot> {
  await load();
  const dir = new Directory(Paths.document, 'shots');
  if (!dir.exists) dir.create();
  const id = String(Date.now());
  const dest = new File(dir, id + '.jpg');
  new File(cacheUri).copy(dest);
  const now = Date.now();
  const today = shots.filter((s) => dayKey(s.takenAt) === dayKey(now)).length;
  const shot: Shot = { id, uri: dest.uri, takenAt: now, developAt: today < INSTANT_PER_DAY ? now : nextMorning(now) };
  shots = [shot, ...shots];
  await save(); emit();
  return shot;
}

export function useShots() {
  const [, force] = useState(0);
  useEffect(() => { load(); }, []);
  const snap = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => shots, () => shots);
  // re-check developing every minute so overnight shots appear without reopening
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 60_000); return () => clearInterval(t); }, []);
  const now = Date.now();
  return {
    all: snap,
    developed: snap.filter((s) => s.developAt <= now),
    developing: snap.filter((s) => s.developAt > now),
    instantLeftToday: Math.max(0, INSTANT_PER_DAY - snap.filter((s) => dayKey(s.takenAt) === dayKey(now)).length),
  };
}

export const formatReady = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
