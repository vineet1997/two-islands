/**
 * Photo registry. Focal points ([x, y] as fractions of width/height) come from
 * the curation index and drive object-position so crops never lose the subject.
 * ratio = width/height (portrait 3:4 = 0.75 unless flagged).
 */
export interface Photo {
  id: string;
  focal: [number, number];
  ratio: number;
  alt: string;
}

const P = (
  id: string,
  fx: number,
  fy: number,
  alt: string,
  ratio = 0.75
): Photo => ({ id, focal: [fx, fy], ratio, alt });

export const PHOTOS: Record<string, Photo> = Object.fromEntries(
  [
    P("IMG-001", 0.55, 0.55, "Sandy island lane at night, guesthouse palms wrapped in warm string lights"),
    P("IMG-002", 0.30, 0.28, "Man in white linen with a mojito in a shell-decorated beach café"),
    P("IMG-003", 0.38, 0.38, "Man leaning on a timber balcony rail under a palm-thatch roof"),
    P("IMG-004", 0.30, 0.70, "Turquoise plunge pool and daybed under tropical rain"),
    P("IMG-005", 0.55, 0.50, "Terracotta courtyard with white pavilions and potted palms"),
    P("IMG-006", 0.48, 0.58, "Striped vintage Mini parked below the Galle Fort ramparts at dusk"),
    P("IMG-007", 0.50, 0.38, "High view over thatched roofs to a turquoise lagoon and reef line"),
    P("IMG-008", 0.46, 0.62, "Empty sandy road at golden hour with a lone walking figure"),
    P("IMG-009", 0.40, 0.40, "Storm clouds underlit with gold over a choppy teal lagoon"),
    P("IMG-011", 0.50, 0.38, "Woman in cream ruffles under a glowing casuarina canopy at night"),
    P("IMG-012", 0.70, 0.62, "Carved wooden Rice & Spoon sign veiled by sunlit palm fronds"),
    P("IMG-013", 0.42, 0.30, "Woman in a brown halter dress seated in a night courtyard"),
    P("IMG-014", 0.48, 0.32, "Tilted night portrait in a brown halter dress, frangipani behind"),
    P("IMG-015", 0.45, 0.38, "Woman holding the kip's clipboard brunch menu in a leafy garden"),
    P("IMG-016", 0.50, 0.55, "Delighted woman over a wooden brunch board of sliders and hash browns"),
    P("IMG-017", 0.20, 0.55, "Looking up from an open-air shower to towering green canopy and blue sky"),
    P("IMG-018", 0.50, 0.30, "Woman on a festoon-lit brick lane at night in Galle"),
    P("IMG-019", 0.45, 0.38, "Tiny island coffee kiosk at night, hand-made menus and mint benches"),
    P("IMG-020", 0.55, 0.28, "Towering cumulus catching gold sunset light over a turquoise sea"),
    P("IMG-021", 0.40, 0.45, "Curving white-sand shoreline under a soft cloudy sky"),
    P("IMG-022", 0.52, 0.45, "Stir-fried noodles topped with a sunny-side-up egg at a dim table"),
    P("IMG-023", 0.50, 0.38, "Woman in a sheer red cover-up on white sand before a vivid lagoon"),
    P("IMG-024", 0.45, 0.48, "Top-down herb spaghetti with a playful yellow-sauce squiggle"),
    P("IMG-025", 0.40, 0.55, "Balcony view over a two-tone sea, reef shallows to deep ocean"),
    P("IMG-026", 0.58, 0.52, "A soft rainbow dropping into the sea beyond a green islet"),
    P("IMG-027", 0.50, 0.45, "Full-length portrait under a fairy-lit casuarina on night sand"),
    P("IMG-028", 0.38, 0.28, "Carved pale-stone column and lacquered ceiling, Malé Friday Mosque"),
    P("IMG-029", 0.35, 0.78, "Blue stone water bowl with floating hyacinth in a sunlit garden"),
    P("IMG-030", 0.55, 0.32, "Woman in a white sundress under the shell-strung roof of a beach café"),
    P("IMG-031", 0.40, 0.58, "Empty rustic terrace under a woven-palm roof, jungle beyond"),
    P("IMG-032", 0.55, 0.38, "Profile of a man in white linen under a dried-palm thatch eave"),
    P("IMG-033", 0.52, 0.40, "Man smiling warmly to camera under a thatch eave, red ixora behind"),
    P("IMG-034", 0.42, 0.25, "Woman in a brown halter maxi in a plant-filled courtyard at night"),
    P("IMG-035", 0.28, 0.52, "Hand holding a chocolate-dipped cone before a lamp-lit boardwalk"),
    P("IMG-036", 0.50, 0.28, "Woman in a brown halter dress, dark beach and surf line behind"),
    P("IMG-037", 0.48, 0.30, "Woman in a black embroidered maxi with a woven rope bag in a garden"),
    P("IMG-038", 0.45, 0.48, "Tall mirror selfie in a stylish washroom with trailing ivy", 1569 / 3394),
    P("IMG-039", 0.45, 0.42, "Turquoise lagoon seen from the shade of an overhanging coconut palm"),
    P("IMG-040", 0.48, 0.68, "Golden-edged clouds and a low sun, a small fishing boat silhouetted"),
    P("IMG-041", 0.52, 0.42, "Woman in coral red standing waist-deep in glassy turquoise shallows"),
    P("IMG-042", 0.42, 0.48, "White sailboat on glassy turquoise water under a dark rain sky"),
    P("IMG-043", 0.48, 0.55, "Candle-lit dinner for two set on the sand under a fairy-lit tree"),
    P("IMG-044", 0.52, 0.52, "Narrow corridor of coral-stone and ebony lattice, Malé Friday Mosque"),
    P("IMG-045", 0.50, 0.52, "Gold-on-black Happy Birthday banner strung across a villa window"),
    P("IMG-046", 0.25, 0.50, "Sunlit outdoor shower with terracotta breeze-blocks and jungle above"),
    P("IMG-047", 0.30, 0.70, "Green-tiled plunge pool and timber deck looking out to a paddy field"),
    P("IMG-048", 0.45, 0.55, "Walled villa garden with stepping stones and a bicycle at the back"),
    P("IMG-049", 0.42, 0.38, "Woman playfully puffing her cheeks holding the kip's menu"),
    P("IMG-050", 0.50, 0.50, "Man grinning down at a two-tier brunch spread on a garden table"),
    P("IMG-051", 0.42, 0.35, "Avocado-lime cheesecake with coconut and lime wheels, soft focus"),
    P("IMG-052", 0.35, 0.45, "Scooter wing-mirror selfie of the two travelers in helmets, laughing"),
    P("IMG-053", 0.62, 0.38, "Woman from behind, windblown hair, gold sun low over the sea at Galle Fort"),
    P("IMG-054", 0.58, 0.52, "Pastel sunset over the Indian Ocean from the Galle Fort ramparts"),
    P("IMG-055", 0.50, 0.35, "Delighted ta-da reveal of a plate of cheese-topped ravioli"),
    P("IMG-056", 0.47, 0.33, "Full moon throwing a silver column of light down a calm dark sea"),
    P("IMG-057", 0.45, 0.45, "Randhaa Surf Shop glowing warm at night, boards racked inside"),
    P("IMG-058", 0.52, 0.45, "Vine-framed art studio glowing blue and amber at night"),
    P("IMG-059", 0.52, 0.58, "White day-boat moored on a glassy turquoise lagoon, villas on the horizon"),
    P("IMG-060", 0.46, 0.45, "Peach-lit storm clouds opening over a wind-textured sea at sunset"),
    P("IMG-061", 0.38, 0.52, "Woman in red crouching with a wide smile in ankle-deep crystal water"),
    P("IMG-062", 0.55, 0.42, "Woman in red waist-deep in pale water, the frame streaked by rain"),
    P("IMG-063", 0.40, 0.52, "Lagoon and breakwater viewed through heart-shaped sea-almond leaves"),
    P("IMG-064", 0.52, 0.32, "Golden-hour portrait on a jetty, frangipani behind her ear"),
    P("IMG-066", 0.50, 0.62, "The candlelit two-top from a low angle, glassware on white cloth"),
    P("IMG-067", 0.52, 0.42, "Woman seated and smiling at the candlelit beach table"),
    P("IMG-068", 0.50, 0.40, "Sipping a frozen strawberry daiquiri cupped in both hands"),
    P("IMG-069", 0.46, 0.38, "Man in a black polo, arms crossed, smiling beside the fairy-lit pine"),
    P("IMG-070", 0.50, 0.46, "View through a carved archway into the lacquered prayer hall, Malé Friday Mosque"),
    P("IMG-071", 0.42, 0.40, "Smiling woman behind two loaded grain bowls in a Malé café"),
    P("IMG-072", 0.62, 0.38, "Man under a shell-decorated pergola gazing out to breaking surf"),
    P("IMG-073", 0.46, 0.36, "Man smiling under a woven palm-thatch roof on a café balcony"),
    P("IMG-074", 0.52, 0.55, "Sri Lankan rice and curry on terracotta, papadum perched on top"),
    P("IMG-076", 0.50, 0.34, "Couple smiling to camera, terracotta breeze-block screen at right"),
    P("IMG-077", 0.55, 0.40, "Couple cheek-to-cheek with big smiles, plunge pool behind"),
    P("IMG-078", 0.40, 0.50, "Small boat silhouetted as the sun breaks orange through grey cloud"),
    P("IMG-079", 0.50, 0.45, "Timber walkway to a peaked beach pavilion under a moonlit sky"),
    P("IMG-080", 0.52, 0.40, "Woman in white off-shoulder smiling at the candlelit beach table"),
    P("IMG-081", 0.55, 0.55, "Margherita pizza in a kraft box with a long cheese-pull"),
    P("IMG-082", 0.46, 0.46, "Couple mirror selfie in a lounge with a painted face mural"),
    P("IMG-083", 0.44, 0.30, "Woman in a brown halter maxi against a pastel tropical mural"),
    P("IMG-084", 0.46, 0.30, "Posing on the villa sofa, a Happy Birthday banner across the window"),
    P("IMG-010", 0.45, 0.42, "A reef shark gliding through dark green shallows below a lit jetty", 0.5625),
    // ── transit ──
    P("IMG-085", 0.45, 0.42, "SriLankan Airlines' pink winglet over golden, sunlit cloud at altitude", 3072 / 4080),
    P("IMG-086", 0.50, 0.45, "Night selfie of the two travellers at Delhi airport, palm and lit storefronts behind", 1280 / 960),
    P("IMG-087", 0.50, 0.42, "The two travellers waiting in an airport lounge of plush armchairs and brass lamps", 1280 / 960),
    P("IMG-088", 0.56, 0.40, "Selfie inside the aircraft cabin, her in a yellow jacket by the window", 720 / 1280),
    // ── golden hour in galle ──
    P("IMG-091", 0.50, 0.55, "Cocoa-dusted tiramisu in a glass, two spoons descending to share it", 960 / 1280),
    P("IMG-092", 0.42, 0.42, "Man in green watching a pastel sunset over the sea from the Galle Fort ramparts", 1600 / 1200),
    // ── rain, then a rainbow ──
    P("IMG-093", 0.48, 0.40, "Woman in a black bikini standing in clear turquoise shallows, breakwater behind", 960 / 1280),
    P("IMG-094", 0.48, 0.42, "Woman in a sheer red cover-up smiling in the turquoise lagoon shallows", 960 / 1280),
    P("IMG-095", 0.46, 0.42, "Woman in a sheer red cover-up, arm outstretched, laughing in the lagoon", 960 / 1280),
    P("IMG-096", 0.50, 0.45, "A cheek kiss in the villa garden, both in white against the green", 1200 / 1600),
    // ── the food ──
    P("IMG-097", 0.50, 0.50, "Two falafel-topped custom grain bowls at Ka Bowl, Malé", 4080 / 3072),
    P("IMG-098", 0.50, 0.55, "A bowl of aglio e olio at The Nexus Hub, Thulusdhoo"),
    P("IMG-099", 0.50, 0.52, "A bright green health bowl at Crave, Ahangama"),
    P("IMG-100", 0.50, 0.55, "Thai green curry with rice at Season Paradise, Thulusdhoo"),
    P("IMG-101", 0.50, 0.52, "A couscous health bowl at Onda, Thulusdhoo"),
    P("IMG-102", 0.50, 0.52, "A margherita pizza, takeaway from Donna's, Ahangama"),
    P("IMG-103", 0.50, 0.55, "A bowl of red curry at The Nexus Hub, Thulusdhoo"),
    P("IMG-104", 0.50, 0.55, "A Sri Lankan rice-and-curry spread at Rice & Spoon, Ahangama"),
    P("IMG-105", 0.50, 0.55, "Tofu teriyaki at Season Paradise, Thulusdhoo"),
    P("IMG-106", 0.50, 0.42, "Soaked and laughing on the beach, the turquoise lagoon behind", 1920 / 2560),
    // ── dinner on the sand ──
    P("IMG-107", 0.42, 0.55, "Dressed in cream ruffles with frangipani in her hair, on the jetty at golden hour", 963 / 1280),
    P("IMG-108", 0.45, 0.50, "Smiling at the candlelit beach table, flowers and a glowing lamp in front", 963 / 1280),
    P("IMG-109", 0.48, 0.42, "In cream ruffles among woven-rattan wall art and pendant lamps at the restaurant", 963 / 1280),
    P("IMG-110", 0.50, 0.45, "A carved wooden archway on the beach framing a thatched jetty and the turquoise lagoon", 3072 / 4080),
    // ── villa in the jungle ──
    P("IMG-112", 0.50, 0.42, "The two of us in white among the villa's jungle green", 960 / 1280),
    P("IMG-113", 0.40, 0.40, "A close embrace, eyes shut and smiling, dense jungle behind", 720 / 1280),
    P("IMG-114", 0.50, 0.45, "A grinning couple selfie, her in red and him in white, the sea in the window behind", 1200 / 1600),
    P("IMG-115", 0.50, 0.45, "Dusk over the reef and lagoon, seen from the room the first evening", 1280 / 960),
    P("IMG-116", 0.50, 0.50, "Takeaway cups hand-lettered Vineet and Priya with little hearts, beside a slice of cake", 1600 / 1200),
    P("IMG-117", 0.50, 0.40, "Man in a black shirt smiling under the casuarina at night, by the beach restaurant", 1153 / 1280),
  ].map((p) => [p.id, p])
);

export const img = (id: string, size: "tile" | "page" | "hero") =>
  `/img/${id}-${size}.webp`;
