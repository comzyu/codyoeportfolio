/**
 * A photo from the phone's camera, saved the way the pages expect it:
 * cropped to the print's 3:4, in three sizes (full 1500x2000, -s 600x800, -t 180x240), as shots/<id>.jpg.
 */
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { shotsDir } from './install';

const SIZES: [string, number, number][] = [['', 1500, 0.9], ['-s', 600, 0.85], ['-t', 180, 0.8]];

export async function saveShot(uri: string, width: number, height: number): Promise<{ id: string; src: string }> {
  const id = String(Date.now());
  // the centre of the frame at 3:4, portrait
  let w = width, h = Math.round(width * 4 / 3);
  if (h > height) { h = height; w = Math.round(height * 3 / 4); }
  const crop = { originX: Math.round((width - w) / 2), originY: Math.round((height - h) / 2), width: w, height: h };
  for (const [suffix, pw, q] of SIZES) {
    const ref = await ImageManipulator.manipulate(uri).crop(crop).resize({ width: Math.min(pw, w) }).renderAsync();
    const out = await ref.saveAsync({ compress: q, format: SaveFormat.JPEG });
    const dest = new File(shotsDir, id + suffix + '.jpg');
    if (dest.exists) dest.delete();
    new File(out.uri).copySync(dest);
  }
  return { id, src: 'shots/' + id + '.jpg' };
}
