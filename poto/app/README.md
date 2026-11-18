# Poto app

The app runs the prototypes we tested (`../prototypes-v2`) inside a native shell, so every feature works exactly as it did in the prototype:

| In the app | Prototype page | What's in it |
|---|---|---|
| Postcards (Home) | `home-min.html` | One postcard at a time. It follows your finger: drag up and it flips over the top while the next steps forward; drag down for the previous one. Tap to turn it over, hold for Reply / Keep / Sticker. |
| Calendar | `home.html` | This week's stack, the photo disc, the ring-bound wall calendar (flip months, tap a day), month share, rolls as folders. |
| Camera | `camera.html` over the phone's real camera | Exposure, zoom, flip, film tab, the shutter, the tray, Develop all, Keep / toss. |
| Rolls | `rolls.html` | The canister shelf, loading a roll, finish → contact strip, viewer, filing. |
| Desk | `profile.html` | Drag, turn and resize, Tidy up, surfaces, the drawer. Cut a stamp opens `stamp.html`. |
| Postcard | `postcard.html` | The 3D card: typewriter writing, the handwritten note, stickers, Matte / Gloss, Story and Post share images. Opens from a print in the Calendar. |

What the shell adds (`web-app/`, `src/`): one glass bar on every tab (the one from Home), real haptics for every tap the pages make, the real camera under the camera page, your shots saved on the phone (three sizes, like the prototype photos), and links between pages turned into tab switches and full-screen pages. Pages, photos, fonts and three.js are all inside the app; nothing loads from the internet.

## Run it on your phone
1. Install **Expo Go** (App Store / Play Store).
2. On your computer:
   ```
   git clone https://github.com/comzyu/codyoeportfolio.git
   cd codyoeportfolio
   git checkout claude/eager-einstein-62kdg5
   cd poto/app
   npm install
   npx expo start
   ```
3. Scan the QR code (iPhone: Camera app; Android: inside Expo Go). If it won't connect, use `npx expo start --tunnel`.

## After changing a prototype
Run `node scripts/pack-web.js` in `poto/app`, then reload the app. It copies the pages into the app and the phone installs the new version on next launch.

## Checks
`npx tsc --noEmit` and `npx expo lint` before every commit.
