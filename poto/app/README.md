# Poto app (v0.1)

Expo SDK 58 · expo-router · native tab bar (liquid glass on iOS 26, Material on Android).

What works in v0.1 (everything stays on the phone, no accounts yet):
- **Postcards** (Home): one card at a time. Tap to turn it over, swipe up or down for the next or previous card, hold for Reply / Keep / Sticker (the menu isn't wired up yet). Friends are sample cards; your own developed shots join the stack.
- **Camera**: the first 3 shots a day develop instantly; the rest are ready at 7:00 the next morning.
- **Calendar**: a month view, with a print on each day you shot.
- **Rolls**: every frame, including ones still developing.
- **Desk**: your latest prints, laid out loosely.

## Run it on your phone
1. Install **Expo Go** from the App Store or Play Store.
2. On your computer:
   ```
   git clone <repo> && cd codyoeportfolio && git checkout claude/eager-einstein-62kdg5
   cd poto/app && npm install && npx expo start
   ```
3. Scan the QR code (iPhone: with the Camera app; Android: from inside Expo Go). Phone and computer need to be on the same Wi‑Fi. If they aren't, use `npx expo start --tunnel`.

## Checks
`npx tsc --noEmit` and `npx expo lint` must both pass before every commit.
