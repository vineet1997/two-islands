/**
 * Simplified coastlines for the map artifact — [lon, lat] rings, accurate enough
 * to be recognisable at country scale, light enough to draw as crisp SVG. Drawn
 * as a designed chart (hairline coasts on a graticule), not a tile map.
 */

export type Ring = [number, number][];

/** India — a coarse but readable national outline (Kutch bulge, the southern
 *  taper to Kanyakumari, the Bay-of-Bengal sweep). */
export const INDIA: Ring = [
  [68.7, 23.7], [70.0, 20.8], [72.8, 19.0], [73.5, 15.7], [74.9, 12.9],
  [76.3, 9.9], [77.55, 8.08], [79.3, 9.3], [80.27, 13.08], [82.3, 16.9],
  [84.8, 19.3], [87.0, 21.5], [89.0, 22.0], [88.5, 26.5], [81.0, 30.3],
  [77.0, 32.5], [74.5, 32.5], [71.0, 27.8], [70.0, 24.5], [68.7, 23.7],
];

/** Sri Lanka — the teardrop, clockwise from Point Pedro. */
export const SRI_LANKA: Ring = [
  [80.21, 9.83], [81.23, 8.57], [81.70, 7.72], [81.83, 6.75], [81.12, 6.12],
  [80.55, 5.95], [80.22, 6.03], [79.84, 6.93], [79.72, 8.23], [79.90, 8.98],
  [80.02, 9.66], [80.21, 9.83],
];

/** Maldives — atolls are mostly reef and lagoon; at this scale they read as a
 *  vertical chain of specks down the 73°E meridian. */
export const MALDIVES_ATOLLS: [number, number][] = [
  [73.0, 7.0], [73.4, 6.1], [73.5, 5.2], [73.47, 4.2], [73.4, 3.2],
  [73.1, 2.3], [73.15, 1.0], [73.2, 0.2], [73.2, -0.6],
];

export interface GeoBox { minLon: number; minLat: number; maxLon: number; maxLat: number; }

export type Region = "srilanka" | "maldives" | "india" | "subcontinent";

/** named view windows the map can frame, each with a comfortable bounding box */
export const REGIONS: Record<string, GeoBox> = {
  srilanka: { minLon: 79.4, minLat: 5.7, maxLon: 82.1, maxLat: 10.1 },
  maldives: { minLon: 72.3, minLat: 3.4, maxLon: 74.2, maxLat: 5.1 },
  india: { minLon: 67.5, minLat: 6.5, maxLon: 90.5, maxLat: 34.0 },
  subcontinent: { minLon: 70.5, minLat: 2.5, maxLon: 82.5, maxLat: 30.0 },
};
