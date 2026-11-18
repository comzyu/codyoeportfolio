/**
 * Sample friends' postcards for v0.1 (until accounts and friends exist in v0.2).
 * Photos are stand-ins from Unsplash photographers; see assets/sample/CREDITS.md.
 */
type Img = number | { uri: string };

export type Postcard = {
  id: string;
  from: string;              // sender's name
  avatar: Img;
  stamp: Img; // their signature stamp
  photo: Img;
  typed: string[];            // the typewritten message
  note: [string, string];     // the handwritten note
  place: string;
  when: string;               // "2h", "Mon"
  day: string;                // "Today", "Mon 16 Nov"
  mine?: boolean;
};

const P = {
  p01: require('../../assets/sample/p01.jpg'), p02: require('../../assets/sample/p02.jpg'), p03: require('../../assets/sample/p03.jpg'),
  p05: require('../../assets/sample/p05.jpg'), p06: require('../../assets/sample/p06.jpg'), p07: require('../../assets/sample/p07.jpg'),
  p09: require('../../assets/sample/p09.jpg'), p10: require('../../assets/sample/p10.jpg'), p12: require('../../assets/sample/p12.jpg'),
};

export const FRIENDS: Postcard[] = [
  { id: 'f1', from: 'dana', avatar: P.p07, stamp: P.p07, photo: P.p03, typed: ['the market at 9pm.', 'everything lit up at once.'], note: ['wish you were here,', 'dana'], place: 'Tokyo', when: '2h', day: 'Today' },
  { id: 'f2', from: 'mei', avatar: P.p01, stamp: P.p01, photo: P.p06, typed: ['lunch, finally.', 'we queued an hour.', 'worth it.'], note: ['save me a seat,', 'mei'], place: 'Paris', when: '5h', day: 'Today' },
  { id: 'f3', from: 'arjun', avatar: P.p05, stamp: P.p05, photo: P.p09, typed: ['look at this sky.', 'i stopped walking for it.'], note: ['for you,', 'arjun'], place: 'Seoul', when: '3h', day: 'Today' },
  { id: 'f4', from: 'sofia', avatar: P.p02, stamp: P.p02, photo: P.p12, typed: ['made it to the top.', 'legs gone, view not.'], note: ['next time, you,', 'sofia'], place: 'Mexico City', when: 'Mon', day: 'Mon 16 Nov' },
  { id: 'f5', from: 'leo', avatar: P.p10, stamp: P.p10, photo: P.p10, typed: ['sunday reset.', 'coffee, laundry,', 'nowhere to be.'], note: ['call me,', 'leo'], place: 'Singapore', when: 'Mon', day: 'Mon 16 Nov' },
];
