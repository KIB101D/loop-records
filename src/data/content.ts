export type PickKey = 'crates' | 'bus' | 'bossa' | 'dub';
export type TrackKey = 'ost' | PickKey;
export type GadgetKey = 'headphones' | 'speaker' | 'earbuds' | 'suitcase' | 'walkman';

export interface Pick {
  key: PickKey;
  title: string;
  meta: string;
  label: string;
  ink: string;
  cat: string;
}

export interface Gadget {
  key: GadgetKey;
  name: string;
  short: string;
}

export const PICKS: Pick[] = [
  { key: 'crates', title: 'Sunday Crates', meta: 'Jazz-hop · 70 BPM', label: '#E8707A', ink: '#2A1418', cat: 'LR-45-01' },
  { key: 'bus', title: 'Night Bus', meta: 'Synthwave · 96 BPM', label: '#6BB8D6', ink: '#10232E', cat: 'LR-45-02' },
  { key: 'bossa', title: 'Tape Hiss Bossa', meta: 'Bossa nova · 128 BPM', label: '#D9B44A', ink: '#2B2010', cat: 'LR-45-03' },
  { key: 'dub', title: 'Coast Dub', meta: 'Dub · 72 BPM', label: '#2E8F8A', ink: '#F3E8CC', cat: 'LR-45-04' }
];

export const GADGETS: Gadget[] = [
  { key: 'headphones', name: 'On-ear headphones', short: 'Headphones' },
  { key: 'speaker', name: 'Portable speaker', short: 'Speaker' },
  { key: 'earbuds', name: 'Wireless earbuds', short: 'Earbuds' },
  { key: 'suitcase', name: 'Compact turntable', short: 'Turntable' },
  { key: 'walkman', name: 'Cassette walkman', short: 'Walkman' }
];

export const TYPED_LINE = '...and many others';

export const SHOP = {
  street: 'Calle San Fernando 22',
  city: '03001 Alicante, Spain',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Calle%20San%20Fernando%2022%2C%2003001%20Alicante',
  hours: [
    ['Mon–Fri', '10:30–14:00 · 17:00–20:30'],
    ['Saturday', '11:00–14:30'],
    ['Sunday', 'Closed']
  ] as const,
  social: [
    ['Instagram', 'https://www.instagram.com/'],
    ['TikTok', 'https://www.tiktok.com/'],
    ['Discogs shop', 'https://www.discogs.com/'],
    ['Bandcamp', 'https://bandcamp.com/']
  ] as const
};
