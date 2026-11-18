/**
 * Poto design tokens (Cody, 18 Nov): light = Paper, dark = Darkroom. Never pure white or pure black.
 * The photos are the colour; one small postmark red for tiny things.
 */

export const Colors = {
  light: {
    room: '#F4F2ED',
    card: '#FBFAF6',
    well: '#EAE7E0',
    text: '#1A1917',
    textSecondary: '#6D6A64',
    textTertiary: '#A7A39C',
    hair: 'rgba(26,25,23,0.09)',
    postmark: '#B8442F',
    // kept for the template's own components
    background: '#F4F2ED',
    backgroundElement: '#EAE7E0',
    backgroundSelected: '#E0DCD3',
  },
  dark: {
    room: '#1C1A18',
    card: '#E9E5DC',          // postcards stay paper-coloured in the dark
    well: '#262320',
    text: '#EDEAE3',
    textSecondary: '#A9A49B',
    textTertiary: '#6F6A62',
    hair: 'rgba(237,234,227,0.10)',
    postmark: '#D0634B',
    background: '#1C1A18',
    backgroundElement: '#262320',
    backgroundSelected: '#302C28',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Font families loaded in the root layout (expo-google-fonts). System sans is used for everything else. */
export const Type = {
  script: 'PinyonScript_400Regular',      // human moments: names, months
  hand: 'LaBelleAurore_400Regular',       // what friends write
  typewriter: 'SpecialElite_400Regular',  // the typed message on the back
  mono: 'IBMPlexMono_500Medium',          // small metadata
} as const;

export const Fonts = { sans: undefined, mono: Type.mono } as const;

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

/** The postcard is A6: 1024 x 1448 in its own units. */
export const CARD_RATIO = 1448 / 1024;
export const BottomTabInset = 90;
export const MaxContentWidth = 800;
