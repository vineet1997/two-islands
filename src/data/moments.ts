/**
 * The curation — every gallery card and every moment page, straight from PLAN.md §2.
 * 13 clickable moments + 7 mood cards + 2 typographic chapter cards = 22 cards.
 *
 * Sphere slots: row 0 = upper band (7 cols), row 1 = equator (8 cols),
 * row 2 = lower band (7 cols).
 */

export type Block =
  | { type: "text"; text: string }
  | { type: "full"; img: string; caption?: string; wide?: boolean }
  | { type: "diptych"; imgs: [string, string]; caption?: string }
  | { type: "food"; img: string; caption?: string }
  | { type: "video"; src: string; poster: string; caption?: string };

export interface Moment {
  id: string;
  kind: "moment" | "mood" | "chapter";
  title: string;
  chapter: "maldives" | "srilanka" | "both";
  dateLabel: string;
  tags: string[];
  cover: string; // photo id (or video id for the live card)
  liveVideo?: string; // /video/... used as card texture
  accent: string;
  slot: { row: 0 | 1 | 2; col: number };
  intro?: string;
  blocks?: Block[];
  sub?: string; // chapter cards: coordinates line
}

export const FILTER_TAGS = [
  "OCEAN", "FOOD", "PEOPLE", "NIGHTS", "SUNSETS", "CULTURE", "STAY", "WILDLIFE",
] as const;

export const MOMENTS: Moment[] = [
  // ───────────────────────── chapter cards (equator anchors) ─────────────────
  {
    id: "ch-maldives", kind: "chapter", title: "MALDIVES", chapter: "maldives",
    dateLabel: "JUN 01–04", tags: [], cover: "", accent: "#5fc7cf",
    slot: { row: 1, col: 0 }, sub: "4.17°N 73.51°E",
  },
  {
    id: "ch-srilanka", kind: "chapter", title: "SRI LANKA", chapter: "srilanka",
    dateLabel: "JUN 04–07", tags: [], cover: "", accent: "#e8b860",
    slot: { row: 1, col: 4 }, sub: "6.03°N 80.22°E",
  },

  // ───────────────────────── maldives ─────────────────
  {
    id: "first-night-ashore", kind: "moment", title: "First Night Ashore",
    chapter: "maldives", dateLabel: "JUN 01", tags: ["NIGHTS", "CULTURE"],
    cover: "IMG-058", accent: "#1c6fa6", slot: { row: 0, col: 0 },
    intro: "Bags down, sun already gone. The island introduces itself after dark — string lights, hand-painted menus, a surf shop glowing like a lantern.",
    blocks: [
      { type: "full", img: "IMG-001", caption: "Arrival lane, Phandhi Retreat — the first walk on a road made of sand." },
      { type: "diptych", imgs: ["IMG-057", "IMG-019"], caption: "Randhaa Surf Shop and the island's tiniest café — boba, jugo, and bulbs." },
      { type: "full", img: "IMG-058", caption: "Owneyes Studio — locally made arts & crafts, one painter still at work." },
      { type: "full", img: "IMG-056", wide: true, caption: "Then the moon laid a silver road across the sea, and we went to bed." },
    ],
  },
  {
    id: "the-lagoon", kind: "moment", title: "The Lagoon",
    chapter: "maldives", dateLabel: "JUN 02–03", tags: ["OCEAN"],
    cover: "IMG-059", accent: "#5fc7cf", slot: { row: 1, col: 1 },
    intro: "Every shade of blue we'd ever seen, then several we hadn't. Two days of reading the water — pale shallows, the reef line, the deep.",
    blocks: [
      { type: "full", img: "IMG-007", wide: true, caption: "The view that made us drop our bags mid-step." },
      { type: "diptych", imgs: ["IMG-039", "IMG-063"], caption: "The lagoon, always framed by something green." },
      { type: "full", img: "IMG-021", caption: "The quiet end of the beach, foam writing its line in the sand." },
      { type: "full", img: "IMG-042", caption: "Weather rolling in — turquoise refusing to dim under a storm sky. The sky, it turned out, was planning something." },
    ],
  },
  {
    id: "rain-then-a-rainbow", kind: "moment", title: "Rain, Then a Rainbow",
    chapter: "maldives", dateLabel: "JUN 03", tags: ["OCEAN", "PEOPLE"],
    cover: "IMG-041", accent: "#d8453f", slot: { row: 2, col: 1 },
    intro: "We swam in sunshine, stayed through a downpour, and were paid for our patience in full — a rainbow dropping straight into the sea.",
    blocks: [
      { type: "diptych", imgs: ["IMG-023", "IMG-061"], caption: "In we go." },
      { type: "full", img: "IMG-062", caption: "Then the rain came — and nobody left the water." },
      { type: "full", img: "IMG-026", wide: true, caption: "And then, this. Right on cue." },
      { type: "food", img: "IMG-024", caption: "Garlic spaghetti afterwards, sauce squiggle by the chef's own hand." },
    ],
  },
  {
    id: "maldivian-gold", kind: "moment", title: "Maldivian Gold",
    chapter: "maldives", dateLabel: "JUN 02", tags: ["SUNSETS"],
    cover: "IMG-020", accent: "#e8c98a", slot: { row: 0, col: 2 },
    intro: "The island empties toward the west bank every evening. June 2 put on the full programme: gold, grey, peach, fire.",
    blocks: [
      { type: "full", img: "IMG-008", caption: "Walking the back road toward the show." },
      { type: "full", img: "IMG-040", caption: "The opening act, all gold and good manners." },
      { type: "full", img: "IMG-060", wide: true, caption: "Then the storm cells caught the light and went theatrical." },
      { type: "full", img: "IMG-009", caption: "The brooding finale, one tiny boat for scale." },
      { type: "food", img: "IMG-022", caption: "Post-sunset noodles, egg on top. Tradition by day two." },
    ],
  },
  {
    id: "dinner-on-the-sand", kind: "moment", title: "Dinner on the Sand",
    chapter: "maldives", dateLabel: "JUN 03", tags: ["NIGHTS", "PEOPLE", "FOOD"],
    cover: "IMG-043", accent: "#e8b860", slot: { row: 2, col: 2 },
    intro: "A table for two under a casuarina strung with fairy lights, candles fighting the sea breeze and winning. The kind of evening you plan once and remember always.",
    blocks: [
      { type: "full", img: "IMG-064", caption: "Golden hour on the jetty first — frangipani tucked behind one ear." },
      { type: "diptych", imgs: ["IMG-066", "IMG-067"], caption: "Candlelight, white cloth, sand underfoot." },
      { type: "food", img: "IMG-068", caption: "Frozen strawberry daiquiri, both hands required." },
      { type: "diptych", imgs: ["IMG-069", "IMG-080"], caption: "Him, very pleased with the venue. Her, lit by the table lamp." },
      { type: "full", img: "IMG-011", caption: "Under the glowing canopy before walking back along the beach." },
    ],
  },
  {
    id: "night-visitor", kind: "moment", title: "Night Visitor",
    chapter: "maldives", dateLabel: "JUN 03", tags: ["WILDLIFE", "NIGHTS"],
    cover: "IMG-010", liveVideo: "/video/IMG-010-loop.mp4",
    accent: "#6fa8a0", slot: { row: 0, col: 3 },
    intro: "Walking the jetty after dinner, a shape detached itself from the dark — a reef shark patrolling the lit shallows, slow and unbothered.",
    blocks: [
      { type: "video", src: "/video/IMG-010-page.mp4", poster: "/video/IMG-010-poster.jpg", caption: "Sixteen seconds of the Maldives we didn't plan for." },
      { type: "text", text: "We stood there long after it had gone, watching the ripples settle back into jetty light." },
    ],
  },
  {
    id: "old-male", kind: "moment", title: "Old Malé",
    chapter: "maldives", dateLabel: "JUN 04", tags: ["CULTURE", "FOOD"],
    cover: "IMG-070", accent: "#cfc6b2", slot: { row: 1, col: 3 },
    intro: "Transit day in the capital, spent inside the Malé Friday Mosque — Hukuru Miskiy — where coral stone is carved like lace and the lacquered ceilings have outlasted four centuries.",
    blocks: [
      { type: "full", img: "IMG-028", caption: "Coral stone carved like lace — the prayer hall columns." },
      { type: "full", img: "IMG-044", caption: "A corridor of polished time — ebony lattice and lacquered teak." },
      { type: "food", img: "IMG-071", caption: "Then grain bowls and iced coffee before the flight south." },
    ],
  },

  // ───────────────────────── sri lanka ─────────────────
  {
    id: "villa-in-the-jungle", kind: "moment", title: "The Villa in the Jungle",
    chapter: "srilanka", dateLabel: "JUN 04–06", tags: ["STAY", "PEOPLE"],
    cover: "IMG-047", accent: "#7fa898", slot: { row: 1, col: 5 },
    intro: "Terracotta breeze-blocks, a plunge pool the colour of bottle glass, and a garden that hummed. We watched the same view in rain and in sun and couldn't pick a winner.",
    blocks: [
      { type: "diptych", imgs: ["IMG-004", "IMG-047"], caption: "Same pool, two moods — monsoon morning and the sun's return." },
      { type: "full", img: "IMG-005", caption: "The courtyard, all white render and red tile." },
      { type: "diptych", imgs: ["IMG-017", "IMG-046"], caption: "Showering under the canopy — open-air bathrooms ruin you for ordinary ones." },
      { type: "full", img: "IMG-048", caption: "The garden, complete with house bicycle." },
      { type: "diptych", imgs: ["IMG-076", "IMG-077"], caption: "Us, on the deck, extremely at home." },
    ],
  },
  {
    id: "the-birthday", kind: "moment", title: "The Birthday",
    chapter: "srilanka", dateLabel: "JUN 04–05", tags: ["NIGHTS", "PEOPLE", "FOOD"],
    cover: "IMG-084", accent: "#d4a84a", slot: { row: 2, col: 5 },
    intro: "Vineet's birthday, celebrated across two nights — a banner smuggled into the villa, midnight pizza on arrival, and a proper night out ending in ice cream on a boardwalk.",
    blocks: [
      { type: "full", img: "IMG-045", caption: "The banner went up before the bags were even open." },
      { type: "food", img: "IMG-081", caption: "Birthday-eve pizza, cheese-pull engineered for the camera." },
      { type: "diptych", imgs: ["IMG-034", "IMG-014"], caption: "Dinner in a courtyard lit purple and teal." },
      { type: "full", img: "IMG-082", caption: "Mirror check at the bar, mural approving in the background." },
      { type: "full", img: "IMG-083", caption: "The dress, mid-tour, against somebody's painted jungle." },
      { type: "diptych", imgs: ["IMG-036", "IMG-035"], caption: "It ended on the beach, with a cone, as all good birthdays should." },
    ],
  },
  {
    id: "south-coast-cafes", kind: "moment", title: "South Coast Cafés",
    chapter: "srilanka", dateLabel: "JUN 05", tags: ["FOOD", "PEOPLE"],
    cover: "IMG-030", accent: "#c8a96a", slot: { row: 0, col: 4 },
    intro: "A day spent grazing down the coast — capiz-shell chandeliers at WAVES, a thatched balcony over a green street, and the rice & curry that ended the discussion of where to eat.",
    blocks: [
      { type: "diptych", imgs: ["IMG-002", "IMG-030"], caption: "WAVES — him with a mojito, her with the sea over one shoulder." },
      { type: "full", img: "IMG-072", caption: "Watching the surf roll in from under the shells." },
      { type: "full", img: "IMG-012", caption: "Rice & Spoon, Goviyapana — the sign half-hidden in areca palms." },
      { type: "full", img: "IMG-031", caption: "The terrace to ourselves, rope lamps swaying." },
      { type: "full", img: "IMG-033", caption: "Balcony portrait between courses — his best smile of the trip." },
      { type: "food", img: "IMG-074", caption: "Rice & curry on terracotta — dhal, sambol, papadum on top. The trip's best plate." },
    ],
  },
  {
    id: "brunch-at-the-kip", kind: "moment", title: "Brunch at the kip",
    chapter: "srilanka", dateLabel: "JUN 06", tags: ["FOOD", "PEOPLE"],
    cover: "IMG-050", accent: "#7fae3a", slot: { row: 0, col: 6 },
    intro: "All-day brunch in a garden full of bamboo and birdsong. We ordered with a pencil and a clipboard and treated it like an exam we intended to ace.",
    blocks: [
      { type: "full", img: "IMG-037", caption: "Heading out — black embroidery, rope bag, high hopes." },
      { type: "diptych", imgs: ["IMG-049", "IMG-015"], caption: "Menu deliberations, taken very seriously." },
      { type: "diptych", imgs: ["IMG-016", "IMG-050"], caption: "The boards landed and the table went quiet." },
      { type: "food", img: "IMG-051", caption: "Avocado-lime cheesecake on a date crust — the closer." },
    ],
  },
  {
    id: "golden-hour-in-galle", kind: "moment", title: "Golden Hour in Galle",
    chapter: "srilanka", dateLabel: "JUN 06", tags: ["SUNSETS", "CULTURE", "PEOPLE"],
    cover: "IMG-053", accent: "#f2a65a", slot: { row: 1, col: 7 },
    intro: "The last full day: a scooter south, a fort at sunset, ravioli in a stone-walled room, and a festoon-lit lane to walk home along.",
    blocks: [
      { type: "full", img: "IMG-052", caption: "The ride there, documented via wing mirror." },
      { type: "full", img: "IMG-006", caption: "Galle's most photogenic resident, parked under the ramparts." },
      { type: "full", img: "IMG-054", wide: true, caption: "The whole town turns west at six. We joined." },
      { type: "food", img: "IMG-055", caption: "Ravioli, presented with appropriate ceremony." },
      { type: "full", img: "IMG-018", caption: "One last lane of warm bulbs before the trip let us go." },
    ],
  },
  {
    id: "us", kind: "moment", title: "Us",
    chapter: "both", dateLabel: "JUN 01–07", tags: ["PEOPLE"],
    cover: "IMG-052", accent: "#e4ddc8", slot: { row: 2, col: 7 },
    intro: "Two islands, one scooter, eighty-odd photographs of each other. The trip in faces.",
    blocks: [
      { type: "diptych", imgs: ["IMG-064", "IMG-069"], caption: "Maldives, June 3 — dressed for the beach dinner." },
      { type: "diptych", imgs: ["IMG-023", "IMG-033"], caption: "Her in lagoon red; him in café white." },
      { type: "full", img: "IMG-077", caption: "Cheek to cheek on the villa deck." },
      { type: "full", img: "IMG-080", caption: "Candlelight suits everyone." },
      { type: "full", img: "IMG-018", caption: "Last night, lit by festoon bulbs." },
      { type: "text", text: "Two islands, seven days, and a few hundred photographs we'll be retelling for years. — June 2026" },
    ],
  },

  // ───────────────────────── mood cards (non-clickable) ─────────────────
  {
    id: "mood-transit", kind: "mood", title: "In Transit", chapter: "maldives",
    dateLabel: "JUN 01", tags: [], cover: "IMG-038", accent: "#5a7a3f",
    slot: { row: 2, col: 0 },
  },
  {
    id: "mood-pavilion", kind: "mood", title: "Moonlit Pavilion", chapter: "maldives",
    dateLabel: "JUN 02", tags: ["NIGHTS"], cover: "IMG-079", accent: "#14283a",
    slot: { row: 1, col: 2 },
  },
  {
    id: "mood-sunbreak", kind: "mood", title: "Sun Break", chapter: "maldives",
    dateLabel: "JUN 02", tags: ["SUNSETS"], cover: "IMG-078", accent: "#e59a4e",
    slot: { row: 0, col: 1 },
  },
  {
    id: "mood-glow-tree", kind: "mood", title: "Under the Casuarina", chapter: "maldives",
    dateLabel: "JUN 03", tags: ["NIGHTS"], cover: "IMG-027", accent: "#58764a",
    slot: { row: 2, col: 3 },
  },
  {
    id: "mood-garden-bowl", kind: "mood", title: "Garden Detail", chapter: "srilanka",
    dateLabel: "JUN 05", tags: ["STAY"], cover: "IMG-029", accent: "#2f9fd0",
    slot: { row: 1, col: 6 },
  },
  {
    id: "mood-thatch-profile", kind: "mood", title: "Thatch & Ixora", chapter: "srilanka",
    dateLabel: "JUN 05", tags: [], cover: "IMG-032", accent: "#bda06a",
    slot: { row: 0, col: 5 },
  },
  {
    id: "mood-courtyard", kind: "mood", title: "Courtyard, Seated", chapter: "srilanka",
    dateLabel: "JUN 05", tags: ["NIGHTS"], cover: "IMG-013", accent: "#8a7766",
    slot: { row: 2, col: 4 },
  },
];

export const CLICKABLE = MOMENTS.filter((m) => m.kind === "moment");
export const byId = (id: string) => MOMENTS.find((m) => m.id === id);

/** next clickable moment in array order, wrapping */
export const nextMoment = (id: string): Moment => {
  const i = CLICKABLE.findIndex((m) => m.id === id);
  return CLICKABLE[(i + 1) % CLICKABLE.length];
};
