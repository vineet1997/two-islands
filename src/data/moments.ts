/**
 * The curation — every gallery card and every moment page, straight from PLAN.md §2.
 * 13 clickable moments + 7 mood cards + 2 typographic chapter cards = 22 cards.
 *
 * Cards are laid out chronologically: the grid reads column by column as the
 * cylinder turns (col 0 = arrival → col 7 = the trip's close). Each column holds
 * the cards from one stretch of days; chapter plates sit at the equator (row 1)
 * where each island's section opens. Rows: 0 = upper, 1 = equator, 2 = lower.
 */
import type { Artifact } from "./artifacts";

export type Block =
  | { type: "text"; text: string }
  | { type: "full"; img: string; caption?: string; wide?: boolean }
  | { type: "diptych"; imgs: [string, string]; caption?: string }
  | { type: "food"; img: string; caption?: string }
  | { type: "video"; src: string; poster: string; caption?: string; wide?: boolean }
  // editorial field note — variant picks the form (margin placard / pull-quote / stat row)
  | { type: "note"; variant?: "aside" | "quote" | "stat"; kicker?: string; text?: string; stats?: { value: string; label: string }[] }
  // a photo bound to a note: side-by-side on desktop (flip alternates sides),
  // stacked on mobile; `overlay` floats the note over the image instead
  | { type: "spread"; img: string; kicker: string; text: string; flip?: boolean; overlay?: boolean; caption?: string }
  | { type: "artifact"; art: Artifact }; // from the shared artifact kit

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
    cover: "IMG-058", accent: "#1c6fa6", slot: { row: 2, col: 0 },
    intro: "Bags down, sun already gone. The island introduces itself after dark — string lights, hand-painted menus, a surf shop glowing like a lantern.",
    blocks: [
      { type: "full", img: "IMG-001", caption: "Arrival lane, Phandhi Retreat — the first walk on a road made of sand." },
      { type: "full", img: "IMG-115", wide: true, caption: "The view from the room that first evening — reef, lagoon, the day going blue." },
      { type: "diptych", imgs: ["IMG-057", "IMG-019"], caption: "Randhaa Surf Shop and the island's tiniest café — boba, jugo, and bulbs." },
      { type: "full", img: "IMG-056", wide: true, caption: "Then the moon laid a silver road across the sea, and we went to bed." },
    ],
  },
  {
    id: "the-lagoon", kind: "moment", title: "The Lagoon",
    chapter: "maldives", dateLabel: "JUN 02–03", tags: ["OCEAN"],
    cover: "IMG-059", accent: "#5fc7cf", slot: { row: 1, col: 1 },
    intro: "Every shade of blue we'd ever seen, then several we hadn't. Two days of reading the water — pale shallows, the reef line, the deep.",
    blocks: [
      { type: "note", kicker: "On lagoons", text: "A lagoon is the sea with its voice lowered. A reef breaks the ocean's swell a few hundred metres out, and the water it shelters turns still, shallow, and clear enough to count your toes through ten feet of it." },
      { type: "video", src: "/video/IMG-111-page.mp4", poster: "/video/IMG-111-poster.jpg", wide: true, caption: "Five seconds of water that refused to hold one colour." },
      { type: "spread", img: "IMG-110", kicker: "On the map · Thulusdhoo", text: "This particular blue belongs to Thulusdhoo, in North Malé Atoll. Just past the reef is a surf break called Cokes — named, with zero romance, for the Coca-Cola plant that once bottled here, said to be the only one on Earth that ran on desalinated seawater." },
      { type: "diptych", imgs: ["IMG-039", "IMG-063"], caption: "The lagoon, always framed by something green." },
      { type: "spread", flip: true, img: "IMG-021", kicker: "On the colour", text: "What looks like a hundred blues is really a depth chart. Near-white where it's ankle-deep over sand, jade over seagrass, then a hard line where the floor drops and the colour bruises. None of it is pigment — just light, drowning at different rates." },
      { type: "note", variant: "quote", kicker: "On the sand", text: "The beach, it turns out, is mostly fish — coral ground up by parrotfish and laid back down as sand." },
      { type: "spread", overlay: true, img: "IMG-042", kicker: "On atolls", text: "“Atoll” is one of the few words English borrowed from Dhivehi — atoḷu. A volcano sinks over ages while its rim of coral grows upward to stay in the light, until only the ring, and its lagoon, remain." },
      { type: "note", variant: "stat", kicker: "On the Maldives", stats: [{ value: "1,190", label: "coral islands" }, { value: "~1%", label: "of it dry land" }, { value: "1 m", label: "above the sea" }], text: "The lowest-lying nation on Earth — unbearably lovely, and on a clock." },
    ],
  },
  {
    id: "rain-then-a-rainbow", kind: "moment", title: "Rain, Then a Rainbow",
    chapter: "maldives", dateLabel: "JUN 03", tags: ["OCEAN", "PEOPLE"],
    cover: "IMG-106", accent: "#d8453f", slot: { row: 1, col: 2 },
    intro: "Some of the trip's best hours were spent half-submerged. A wide, easy beach; water warm as a held breath; a sky that kept changing its mind — brilliant sun, then a soft, thorough downpour, then sun again.",
    blocks: [
      { type: "diptych", imgs: ["IMG-023", "IMG-061"], caption: "Into the shallows, and in no hurry to come out." },
      { type: "full", img: "IMG-093", caption: "Sun high, the lagoon like warm glass." },
      { type: "full", img: "IMG-062", caption: "Then the sky opened — soft, thorough, harmless. The kind of rain you can swim straight through, so we did." },
      { type: "text", text: "Bags and towels tucked dry under the sea-almond trees, nothing to do but float and let it fall. No hurry, no fear — just warm rain on a warm sea." },
      { type: "full", img: "IMG-026", wide: true, caption: "And then, paid in full — a rainbow dropped straight into the sea." },
    ],
  },
  {
    // non-clickable plate — the gold sunset stays as a still, no page
    id: "maldivian-gold", kind: "mood", title: "Maldivian Gold",
    chapter: "maldives", dateLabel: "JUN 02", tags: ["SUNSETS"],
    cover: "IMG-020", accent: "#e8c98a", slot: { row: 0, col: 1 },
  },
  {
    id: "dinner-on-the-sand", kind: "moment", title: "Dinner on the Sand",
    chapter: "maldives", dateLabel: "JUN 03", tags: ["NIGHTS", "PEOPLE", "FOOD"],
    cover: "IMG-043", accent: "#e8b860", slot: { row: 2, col: 2 },
    intro: "A table for two on the sand at Season Paradise — the hotel's beachside restaurant, open to the sea and, that night, nearly all ours. Candles against the breeze, and the kind of evening you plan once and remember always.",
    blocks: [
      { type: "full", img: "IMG-107", caption: "Dressed for it, frangipani behind one ear — golden hour on the jetty first." },
      { type: "full", img: "IMG-109", caption: "The restaurant: woven lamps, warm light, and barely another soul in it." },
      { type: "text", text: "I'd spent the afternoon plotting with the staff — the candles, the flowers, the little glowing lamp — and they built every last bit of it exactly to instruction." },
      { type: "diptych", imgs: ["IMG-066", "IMG-067"], caption: "Candlelight, white cloth, sand underfoot." },
      { type: "full", img: "IMG-108", caption: "And there it was, waiting. She approved." },
      { type: "food", img: "IMG-068", caption: "Frozen strawberry daiquiri, both hands required." },
      { type: "full", img: "IMG-069", caption: "Him, very pleased — with himself, and the venue." },
      { type: "text", text: "Great food, a setting we'll never forget, and somehow barely a dent in the bill. The whole night a small, perfect miracle." },
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
    cover: "IMG-070", accent: "#cfc6b2", slot: { row: 2, col: 3 },
    intro: "Our flight south wasn't until the afternoon, but the only speedboat off the island left in the morning — so we had hours to kill. A local tipped us off: the same airport boat also runs to Malé town, all day, for the same fare. So instead of waiting around, we got off in the capital.",
    blocks: [
      { type: "note", kicker: "On foot", text: "We got off at the presidential jetty, and that's basically the whole city right there — the government buildings, the Grand Friday Mosque, the old mosque, all a short, sweaty walk apart. Hot and humid, sure, but completely walkable." },
      { type: "artifact", art: { kind: "plan", label: "Central Malé", caption: "Everything sits a short walk from the jetty — the loop we wandered.", spots: [
        { x: 0.48, y: 0.02, name: "Presidential Jetty", icon: "boat", you: true, side: "bottom" },
        { x: 0.18, y: 0.18, name: "Fish Market", icon: "fish", side: "left" },
        { x: 0.46, y: 0.30, name: "Republic Square", icon: "flag", side: "right" },
        { x: 0.40, y: 0.46, name: "President's Office", icon: "gov", side: "left" },
        { x: 0.72, y: 0.42, name: "Grand Friday Mosque", icon: "mosque", side: "right" },
        { x: 0.72, y: 0.62, name: "Sultan Park", icon: "trees", side: "right" },
      ], route: [0, 1, 2, 3, 4, 5] } },
      { type: "note", variant: "stat", kicker: "How small is Malé?", stats: [{ value: "≈2 km²", label: "of island" }, { value: "≈215k", label: "people on it" }, { value: "~20 min", label: "to walk across" }], text: "Among the most densely packed cities anywhere on Earth." },
      { type: "spread", img: "IMG-028", kicker: "The old Friday mosque", text: "Hukuru Miskiy — the oldest mosque in the country, built in 1658 from carved coral. Blocks cut straight from the reef and fitted together without a drop of mortar, every surface lacquered and inscribed. Four centuries on, it's up for UNESCO listing." },
      { type: "full", img: "IMG-044", caption: "Inside: a corridor of polished time — ebony lattice and lacquered teak." },
      { type: "note", variant: "quote", kicker: "On Maldivian life", text: "A country so short on land that the airport sits on its own island — and the capital, out of room, simply built a new one next door." },
      { type: "food", img: "IMG-071", caption: "Then a genuinely great meal off a Malé side street, before the flight." },
      { type: "note", kicker: "Travel tip · Nala", text: "When it's time to move, get the Nala app — it's the local Uber, and the cabs are good and properly cheap. We took one straight to the airport." },
    ],
  },

  // ───────────────────────── sri lanka ─────────────────
  {
    id: "villa-in-the-jungle", kind: "moment", title: "The Villa in the Jungle",
    chapter: "srilanka", dateLabel: "JUN 04–06", tags: ["STAY", "PEOPLE"],
    cover: "IMG-047", accent: "#7fa898", slot: { row: 0, col: 4 },
    intro: "Rest & Digest — a villa set back in the jungle, edged by rice paddy. Secluded but never hard to reach, and a complete change of key after a week on the sand: green instead of blue, birdsong instead of surf.",
    blocks: [
      { type: "full", img: "IMG-048", caption: "The garden hummed all day — peacocks somewhere close, monkeys that landed on the roof, resident cats, more birds than we could count. The room looked straight into the green." },
      { type: "diptych", imgs: ["IMG-004", "IMG-047"], caption: "The plunge pool, the colour of bottle glass — honestly the highlight of the whole trip. Same water, rain and sun; we couldn't pick a winner." },
      { type: "full", img: "IMG-017", caption: "An open-air shower under the canopy. It ruins you for ordinary bathrooms." },
      { type: "text", text: "Tastefully done, everything we needed, a bed we sank into — and hosts, Amir and Monica, so warm we kept finding reasons to talk to them." },
      { type: "diptych", imgs: ["IMG-076", "IMG-112"], caption: "Us, completely at home in all that green." },
      { type: "full", img: "IMG-113", caption: "Reluctant, by the end, to leave any of it." },
      { type: "text", text: "Jungle over beach for these two nights — a slower, greener kind of paradise, and the perfect counterweight to the Maldives. Stay here: <a href=\"https://www.airbnb.co.in/rooms/1182463045977922478\" target=\"_blank\" rel=\"noopener\">Rest &amp; Digest on Airbnb ↗</a>" },
    ],
  },
  {
    id: "the-birthday", kind: "moment", title: "The Birthday",
    chapter: "srilanka", dateLabel: "JUN 04–05", tags: ["NIGHTS", "PEOPLE", "FOOD"],
    cover: "IMG-045", accent: "#d4a84a", slot: { row: 2, col: 4 },
    intro: "Twenty-nine, celebrated across two Sri Lankan nights — a banner smuggled into the villa, midnight pizza on arrival, a proper night out in Galle, and the only acceptable finish: pistachio-and-dark-chocolate gelato on a boardwalk.",
    blocks: [
      { type: "food", img: "IMG-081", caption: "Midnight pizza the moment we reached the villa — cheese-pull engineered for the camera." },
      { type: "full", img: "IMG-082", caption: "Mirror check at the bar, the mural approving from the background." },
      { type: "full", img: "IMG-077", caption: "Cheek to cheek on the villa deck." },
      { type: "video", src: "/video/IMG-090-page.mp4", poster: "/video/IMG-090-poster.jpg", wide: true, caption: "Night two, out in Galle — the birthday proper." },
      { type: "full", img: "IMG-084", caption: "Dressed for night two, the banner photobombing from the window." },
      { type: "artifact", art: { kind: "milestone", kicker: "JUN 05 · GALLE", big: "29", ord: "th", sub: "trip around the sun", note: "Crowned at Isle of Gelato — visited twice, no regrets — with the only acceptable order:", flavours: ["Pistachio", "Dark chocolate"] } },
      { type: "food", img: "IMG-035", caption: "Cone in hand on a lamp-lit boardwalk. Exactly how a birthday should end." },
    ],
  },
  {
    id: "south-coast-cafes", kind: "moment", title: "South Coast Cafés",
    chapter: "srilanka", dateLabel: "JUN 05", tags: ["FOOD", "PEOPLE"],
    cover: "IMG-030", accent: "#c8a96a", slot: { row: 0, col: 5 },
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
    cover: "IMG-050", accent: "#7fae3a", slot: { row: 1, col: 6 },
    intro: "One of the most memorable meals of the whole trip. The Kip runs a tapas-style menu, so me and Priya just mixed and matched everything we wanted — and oh my god, every single dish felt like dining at a Michelin-star place.",
    blocks: [
      { type: "full", img: "IMG-005", caption: "The Kip's own courtyard — white pavilions, potted palms. The vibe and the ambience, every bit as good as the food." },
      { type: "full", img: "IMG-015", caption: "We ordered with a pencil and a clipboard, taking it as seriously as an exam." },
      { type: "text", text: "The vibe was great, the service was great — but the food was just elevated. From the bread, to the raw gnocchi pastry, to the feta and the olive oil, every single bite was heaven." },
      { type: "full", img: "IMG-016", caption: "Priya, the moment a board landed." },
      { type: "food", img: "IMG-051", caption: "Avocado-lime cheesecake on a date crust — the closer." },
      { type: "text", text: "Honestly, this is a must-try even if you're not staying in Ahangama. I'd travel 50, even 80 km for this brunch — it deserves a proper trip. If you're ever in Sri Lanka, The Kip is the one I'd recommend." },
      { type: "note", kicker: "Postscript", text: "Even their website is gorgeous — just one more way the owners show their taste. <a href=\"https://www.thekipsrilanka.com/\" target=\"_blank\" rel=\"noopener\">thekipsrilanka.com ↗</a>" },
    ],
  },
  {
    id: "golden-hour-in-galle", kind: "moment", title: "Golden Hour in Galle",
    chapter: "srilanka", dateLabel: "JUN 06", tags: ["SUNSETS", "CULTURE", "PEOPLE"],
    cover: "IMG-054", accent: "#f2a65a", slot: { row: 2, col: 6 },
    intro: "The last full day: a scooter south, the fort at sunset, pasta in a stone-walled room, and a festoon-lit lane to walk home along.",
    blocks: [
      { type: "note", kicker: "On Galle Fort", text: "The Portuguese scratched the first fort here in 1588; the Dutch took it in 1640 and spent the decades after raising the ramparts you walk on today. UNESCO-listed since 1988 — the best-preserved sea fortress Europeans ever built in Asia — and it was those same walls that kept the old town standing when the 2004 tsunami came ashore." },
      { type: "full", img: "IMG-006", caption: "Galle's most photogenic resident, parked under the ramparts." },
      { type: "note", variant: "quote", text: "Every evening the whole town climbs the fort walls to watch the sun go down. We just joined the queue." },
      { type: "diptych", imgs: ["IMG-053", "IMG-092"], caption: "Both of us, turned west." },
      { type: "food", img: "IMG-055", caption: "The Pasta Factory — proper, authentic Italian in a stone-walled room." },
      { type: "food", img: "IMG-091", caption: "The tiramisu, though. Some of the best I've had outside Italy — better than anything in Delhi." },
      { type: "note", kicker: "Where to go in Galle", text: "Two tips: <a href=\"https://share.google/Qpgk7nPOUVdgpzvAy\" target=\"_blank\" rel=\"noopener\">The Pasta Factory</a> for proper, authentic Italian (that tiramisu!), and the official <a href=\"https://maps.app.goo.gl/i3sAwsfATnWGP1tg9\" target=\"_blank\" rel=\"noopener\">Dilmah tea store</a> for genuinely great tea at honest, non-touristy prices." },
    ],
  },
  {
    id: "us", kind: "moment", title: "Us",
    chapter: "both", dateLabel: "JUN 01–07", tags: ["PEOPLE"],
    cover: "IMG-052", accent: "#e4ddc8", slot: { row: 1, col: 7 },
    intro: "Two islands, one scooter, eighty-odd photographs of each other. The trip in faces.",
    blocks: [
      { type: "diptych", imgs: ["IMG-023", "IMG-033"], caption: "Her in lagoon red; him in café white." },
      { type: "full", img: "IMG-114", caption: "…and, more often, both at once." },
      { type: "full", img: "IMG-087", wide: true, caption: "Even the airport lounge got the treatment." },
      { type: "full", img: "IMG-116", wide: true, caption: "Our names, hearts included — courtesy of a café that asked." },
      { type: "full", img: "IMG-096", caption: "And the whole trip, in one frame." },
      { type: "text", text: "Two islands, seven days, and a few hundred photographs we'll be retelling for years. — June 2026" },
    ],
  },

  // ───────────────────────── mood cards (non-clickable) ─────────────────
  {
    id: "mood-transit", kind: "moment", title: "In Transit", chapter: "maldives",
    dateLabel: "JUN 01 — 07", tags: ["PEOPLE"],
    cover: "IMG-085", accent: "#6c97b8", slot: { row: 0, col: 0 },
    intro: "Every trip is really two trips: the one you photograph, and the one that gets you there. This is the second one — a 04:00 alarm, a doorstep in Gurgaon, a pink-tailed jet chasing the sun south, and a speedboat that finally traded tarmac for turquoise.",
    blocks: [
      { type: "artifact", art: { kind: "reel", label: "THE JOURNEY", caption: "Doorstep to the island in one breath — a car, two planes, a boat." } },
      { type: "artifact", art: { kind: "reveal", label: "Travel hack", title: "Two countries, one fare", brief: "We meant to visit the Maldives. We came home having also seen Sri Lanka — for the same money. Tap for the trick →", body: "<p>We were only planning the Maldives. Delhi → Maldives and back came to about <strong>₹38,000</strong>.</p><p>But Delhi → Maldives, three days in Sri Lanka, then home to Delhi cost… <strong>exactly ₹38,000</strong>. We basically paid nothing extra for the flights to a whole second country.</p><p>It's a known hack: when an airline routes you through a layover country — Cathay, Qatar, SriLankan, whoever — a multi-stop itinerary often costs the same as the plain return. So you stop over, actually <em>see</em> your layover country, and turn one trip into two.</p>" } },
      { type: "full", img: "IMG-038", caption: "First rule of travel: never walk past a well-lit airport mirror without filing the evidence." },
      { type: "full", img: "IMG-086", caption: "Indira Gandhi International, small hours — the send-off grin." },
      { type: "full", img: "IMG-088", caption: "Wheels up over the Deccan. The good kind of tired." },
      { type: "note", kicker: "On SriLankan", text: "The Malé–Colombo legs were genuinely good. Delhi–Colombo felt more like a budget carrier — not full international-airline polish, but honestly not bad. Service was great throughout, just basic. Got us everywhere, on time." },
      { type: "video", src: "/video/IMG-089-page.mp4", poster: "/video/IMG-089-poster.jpg", caption: "Malé to Thulusdhoo — forty-five minutes of open water, the last leg of getting there." },
      { type: "artifact", art: { kind: "reveal", label: "Good to know", title: "The Maldives' hidden cost", brief: "Landing at Malé is the easy part. Getting to your resort is the part nobody warns you about. Tap →", body: "<p>Here's what nobody tells you: once you land at Malé, your resort can be <strong>far</strong> — sometimes 500 km out. The airport-to-resort transfer alone can cost a small fortune.</p><p>Some resorts are a speedboat away, some need a seaplane. Depending on distance, that one-way transfer runs anywhere from <strong>₹6,000 to ₹60,000 per person</strong>. Budget for it before you book.</p>" } },
      { type: "text", text: "By afternoon the tarmac was behind us and the throttle was open, Thulusdhoo a low green line on the water ahead. Getting there is its own small story — and then, finally, you're there." },
    ],
  },
  {
    id: "mood-pavilion", kind: "mood", title: "Moonlit Pavilion", chapter: "maldives",
    dateLabel: "JUN 02", tags: ["NIGHTS"], cover: "IMG-079", accent: "#14283a",
    slot: { row: 0, col: 2 },
  },
  {
    id: "the-food", kind: "moment", title: "Salt & Spice", chapter: "both",
    dateLabel: "JUN 01–07", tags: ["FOOD"],
    cover: "IMG-104", accent: "#c98a3a", slot: { row: 2, col: 1 },
    intro: "Seven days, two islands, and one running argument: where do we eat next? The Maldives kept us full and happy. Sri Lanka served two of the best meals of our lives. The receipt, roughly in order.",
    blocks: [
      { type: "food", img: "IMG-101", caption: "ONDA · THULUSDHOO — First dinner ashore. A couscous bowl from a tiny café run by the sweetest couple, and desserts fresh enough to forgive the health food." },
      { type: "diptych", imgs: ["IMG-098", "IMG-103"], caption: "THE NEXUS HUB · THULUSDHOO — The dependable one. A menu that does everything well — we tested it twice." },
      { type: "diptych", imgs: ["IMG-105", "IMG-100"], caption: "SEASON PARADISE · THULUSDHOO — The date-night dinner. Tofu teriyaki, Thai green curry, and a kitchen that set up candlelight exactly to instruction." },
      { type: "full", img: "IMG-097", wide: true, caption: "KA BOWL · MALÉ — A pre-flight gamble that paid off: custom bowls, the falafel we'd both been craving, iced tea on the house, and a host who flagged down our airport cab. Go." },
      { type: "text", text: "Footnote, filed under <em>weirdly excellent</em>: a hotel breakfast somewhere along the way served the best baked beans of my life." },
      { type: "text", text: "And then — Sri Lanka. Greener, kinder to vegetarians, and home to the two meals we still talk about." },
      { type: "food", img: "IMG-104", caption: "RICE &amp; SPOON · AHANGAMA — A house, a buffet, a revelation. Coconut dal for the first time, the most flavourful eggplant of my life, a little salad on the side. I was, briefly, in heaven." },
      { type: "food", img: "IMG-099", caption: "CRAVE · AHANGAMA — A green bowl, mostly to atone for what was coming." },
      { type: "food", img: "IMG-102", caption: "DONNA'S · AHANGAMA — Midnight, takeaway, surprisingly high-grade. (There's a Mirissa branch too, we hear.)" },
      { type: "text", text: "Two we loved enough to keep elsewhere: the gelato that crowned a birthday, and a brunch worth an 80-km detour — both have their own page." },
    ],
  },
  {
    id: "mood-glow-tree", kind: "mood", title: "Under the Casuarina", chapter: "maldives",
    dateLabel: "JUN 03", tags: ["NIGHTS"], cover: "IMG-027", accent: "#58764a",
    slot: { row: 1, col: 3 },
  },
  {
    id: "mood-garden-bowl", kind: "mood", title: "Garden Detail", chapter: "srilanka",
    dateLabel: "JUN 05", tags: ["STAY"], cover: "IMG-029", accent: "#2f9fd0",
    slot: { row: 2, col: 5 },
  },
  {
    id: "mood-thatch-profile", kind: "mood", title: "Thatch & Ixora", chapter: "srilanka",
    dateLabel: "JUN 05", tags: [], cover: "IMG-032", accent: "#bda06a",
    slot: { row: 1, col: 5 },
  },
  {
    id: "mood-courtyard", kind: "mood", title: "Courtyard, Seated", chapter: "srilanka",
    dateLabel: "JUN 05", tags: ["NIGHTS"], cover: "IMG-013", accent: "#8a7766",
    slot: { row: 0, col: 6 },
  },
];

export const CLICKABLE = MOMENTS.filter((m) => m.kind === "moment");
export const byId = (id: string) => MOMENTS.find((m) => m.id === id);

/** next clickable moment in array order, wrapping */
export const nextMoment = (id: string): Moment => {
  const i = CLICKABLE.findIndex((m) => m.id === id);
  return CLICKABLE[(i + 1) % CLICKABLE.length];
};
