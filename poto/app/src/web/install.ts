/**
 * Puts the packed pages, photos and fonts into the app's own folder (documents/web), once per version,
 * so every page opens from the phone with no network. Your own shots live beside them in documents/web/shots
 * and are never touched by an update.
 */
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';

import { FILES, TEXT, VERSION } from './pack.generated';

export const webDir = new Directory(Paths.document, 'web');
export const shotsDir = new Directory(webDir, 'shots');

function ensureParent(rel: string) {
  const parts = rel.split('/').slice(0, -1);
  if (parts.length) new Directory(webDir, ...parts).create({ intermediates: true, idempotent: true });
}

let installing: Promise<string> | null = null;

/** Returns the folder's URI (ends with a slash) once everything is in place. */
export function installWeb(): Promise<string> {
  if (!installing) installing = doInstall().catch((e) => { installing = null; throw e; });
  return installing;
}

async function doInstall(): Promise<string> {
  webDir.create({ intermediates: true, idempotent: true });
  shotsDir.create({ intermediates: true, idempotent: true });
  const stamp = new File(webDir, '.version');
  const base = webDir.uri.endsWith('/') ? webDir.uri : webDir.uri + '/';
  if (stamp.exists && stamp.textSync() === VERSION) return base;

  for (const [rel, body] of Object.entries(TEXT)) {
    ensureParent(rel);
    const f = new File(webDir, ...rel.split('/'));
    if (f.exists) f.delete();
    f.create();
    f.writeSync(body);
  }
  await Promise.all(Object.entries(FILES).map(async ([rel, mod]) => {
    const a = Asset.fromModule(mod);
    await a.downloadAsync();
    if (!a.localUri) throw new Error('Could not load ' + rel);
    ensureParent(rel);
    const dest = new File(webDir, ...rel.split('/'));
    if (dest.exists) dest.delete();
    new File(a.localUri).copySync(dest);
  }));

  if (stamp.exists) stamp.delete();
  stamp.create();
  stamp.writeSync(VERSION);
  return base;
}
