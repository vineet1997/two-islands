/**
 * The journey reel — a side-scroll cinematic. A little dawn world scrolls past
 * as the camera follows one travelling vehicle along a hand-drawn path: a car
 * off the doorstep, a plane that lifts off and climbs through cloud, a boat
 * skimming the sea to the island. Parallax sky behind; captions carry the data.
 *
 * One progress value drives everything: it positions the vehicle along the path
 * (getPointAtLength), the camera follows it, the far sky parallaxes at a slower
 * rate, the glyph swaps by world-x, and trails (dust / contrail / wake) spawn.
 */
import { gsap } from "gsap";
import { frame } from "./frame";
import type { Artifact } from "../../data/artifacts";

type ReelSpec = Extract<Artifact, { kind: "reel" }>;

const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const NS = "http://www.w3.org/2000/svg";
const VW = 800, VH = 380, WORLD = 2200, GY = 300; // view, world width, ground line

// side-view vehicles, facing +x (right); rotated to the path tangent
const VEH: Record<string, string> = {
  car: `<path d="M-11,2 L-8,2 L-6,-2 L4,-2 L7,2 L11,2 L11,5 L-11,5 Z"/><circle cx="-6" cy="5.4" r="2.4"/><circle cx="6" cy="5.4" r="2.4"/>`,
  plane: `<path d="M16,0 C16,-1 12,-3 6,-3 L-10,-3 L-16,-9 L-12,-3 L-16,-3 C-18,-3 -18,3 -16,3 L-2,3 L2,8 L6,8 L4,3 L7,3 C12,3 16,1 16,0 Z"/>`,
  boat: `<path d="M-12,0 L12,0 L8,6 L-9,6 Z M-3,0 L-3,-5 L5,-5 L7,0 Z"/>`,
};
const baseScale: Record<string, number> = { car: 1.5, plane: 1.7, boat: 1.6 };

// the vehicle's hand-drawn route through the scene (world coords)
const PATH = "M 170 296 L 600 300 C 700 300 720 300 820 286 C 900 270 940 175 1010 150 C 1180 120 1300 120 1410 142 C 1485 162 1520 272 1560 300 L 1880 300 C 1955 300 2005 298 2045 298";

const viaAt = (x: number) => (x < 600 ? "car" : x < 1560 ? "plane" : "boat");

const LEGENDS: { x: number; t: string }[] = [
  { x: 600, t: "M7/1, GURGAON → DELHI · BY ROAD" },
  { x: 1230, t: "UL 192 · DELHI → COLOMBO · ≈ 2,570 KM" },
  { x: 1560, t: "COLOMBO → MALÉ · SRILANKAN · ≈ 760 KM" },
  { x: 9999, t: "MALÉ → THULUSDHOO · SPEEDBOAT · ≈ 27 KM" },
];
const legendAt = (x: number) => (LEGENDS.find((l) => x < l.x) ?? LEGENDS[LEGENDS.length - 1]).t;

function repeat(n: number, fn: (i: number) => string): string {
  let s = "";
  for (let i = 0; i < n; i++) s += fn(i);
  return s;
}

function build(host: HTMLElement, spec: ReelSpec) {
  // far layer — sun, stars, drifting cloud (parallax)
  const stars = repeat(46, () => {
    const x = (Math.random() * WORLD).toFixed(0);
    const y = (Math.random() * 180).toFixed(0);
    const r = (0.5 + Math.random() * 0.9).toFixed(1);
    return `<circle class="reel-star" cx="${x}" cy="${y}" r="${r}" />`;
  });
  const clouds = repeat(9, (i) => {
    const x = 120 + i * 230 + (i % 2) * 70;
    const y = 70 + (i % 3) * 46;
    const s = (0.8 + (i % 4) * 0.25).toFixed(2);
    return `<g class="reel-cloud" transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="34" ry="11"/><ellipse cx="-18" cy="4" rx="20" ry="9"/><ellipse cx="20" cy="3" rx="22" ry="9"/></g>`;
  });
  const birds = `<g class="reel-line" stroke-width="1.1">
    <path d="M250,96 q5,-5 10,0 q5,-5 10,0"/><path d="M276,108 q4,-4 8,0 q4,-4 8,0"/>
    <path d="M1700,90 q5,-5 10,0 q5,-5 10,0"/></g>`;

  const far = `<g class="reel-far" data-far>
    <circle class="reel-sunglow" cx="1120" cy="296" r="120"/>
    <circle class="reel-sun" cx="1120" cy="296" r="34"/>
    ${stars}${clouds}${birds}
  </g>`;

  // world layer — ground, house, airport, sea, island, path + fleet
  const house = `<g class="reel-line" transform="translate(120,0)">
    <path d="M-26,300 L-26,256 L0,234 L26,256 L26,300"/>
    <path class="reel-roof" d="M-32,258 L0,232 L32,258"/>
    <rect class="reel-glow" x="-8" y="266" width="13" height="13"/>
    <path d="M11,300 L11,280 L21,280 L21,300"/>
  </g>`;

  const airport = `<g transform="translate(0,0)">
    <g class="reel-line">
      <path d="M600,300 L600,270 L712,270 L712,300"/>
      <path d="M724,300 L724,236 L736,236 L736,300"/>
      <path d="M722,236 L730,228 L738,236"/>
    </g>
    <circle class="reel-beacon" cx="730" cy="231" r="2.2"/>
    <g class="reel-runway">${repeat(9, (i) => `<line x1="${612 + i * 30}" y1="309" x2="${628 + i * 30}" y2="309"/>`)}</g>
  </g>`;

  // sea — wavy top from x≈1540 to world end
  let sea = "M1540,300 ";
  for (let x = 1540; x <= WORLD; x += 40) sea += `Q ${x + 20},296 ${x + 40},300 `;
  sea += `L ${WORLD},${VH} L1540,${VH} Z`;
  const seaSVG = `<path class="reel-sea" d="${sea}" />
    <g class="reel-line" stroke-width="1">${repeat(10, (i) => `<path d="M${1620 + i * 50},312 q6,-4 12,0"/>`)}</g>`;

  const island = `<g transform="translate(2040,0)">
    <path class="reel-sand" d="M-46,300 Q0,278 46,300 Z"/>
    <g class="reel-line">
      <path d="M-6,298 Q-10,276 -4,258"/>
      <path d="M-4,258 q-14,-8 -22,-4 M-4,258 q-2,-15 -12,-19 M-4,258 q14,-8 22,-3 M-4,258 q4,-14 14,-16"/>
      <path d="M14,300 Q12,284 18,272"/>
      <path d="M18,272 q-11,-6 -18,-2 M18,272 q-1,-12 -9,-15 M18,272 q11,-6 18,-2"/>
    </g>
  </g>`;

  const world = `<g class="reel-world" data-world>
    <rect class="reel-ground" x="0" y="${GY}" width="${WORLD}" height="${VH - GY}"/>
    ${house}${airport}${seaSVG}${island}
    <path id="reel-path" d="${PATH}" fill="none" stroke="none"/>
    <g class="reel-trails" data-trails></g>
    <g class="reel-veh" data-veh></g>
  </g>`;

  const svg = `<svg class="reel-svg" viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="reel-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0a1726"/><stop offset="0.55" stop-color="#1a3340"/>
        <stop offset="0.82" stop-color="#3a4a44"/><stop offset="1" stop-color="#6b4f3a"/>
      </linearGradient>
      <radialGradient id="reel-sungrad"><stop offset="0" stop-color="#f4cf86" stop-opacity="0.55"/><stop offset="1" stop-color="#f4cf86" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="${VW}" height="${VH}" fill="url(#reel-sky)"/>
    ${far}
    ${world}
  </svg>`;

  host.innerHTML = frame({
    eyebrow: spec.label ?? "THE JOURNEY",
    index: "DEL · CMB · MLE",
    body: `<div class="reelbox" style="aspect-ratio:${VW} / ${VH}">${svg}<div class="reel-legend" data-legend></div></div>`,
    caption: spec.caption,
  });
  host.classList.add("art-ready");
}

function play(host: HTMLElement, _spec: ReelSpec) {
  const path = host.querySelector<SVGPathElement>("#reel-path")!;
  const world = host.querySelector<SVGGElement>("[data-world]")!;
  const far = host.querySelector<SVGGElement>("[data-far]")!;
  const veh = host.querySelector<SVGGElement>("[data-veh]")!;
  const trails = host.querySelector<SVGGElement>("[data-trails]")!;
  const legend = host.querySelector<HTMLElement>("[data-legend]")!;
  const len = path.getTotalLength();
  const end = path.getPointAtLength(len);

  const cam = (x: number) => Math.max(-(WORLD - VW), Math.min(0, -(x - VW * 0.42)));
  const setVeh = (via: string, x: number, y: number, ang: number) => {
    veh.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${baseScale[via]})`);
  };

  if (REDUCED) {
    veh.innerHTML = VEH.boat;
    setVeh("boat", end.x, end.y, 0);
    world.setAttribute("transform", `translate(${cam(end.x)},0)`);
    far.setAttribute("transform", `translate(${(cam(end.x) * 0.45).toFixed(1)},0)`);
    legend.textContent = legendAt(9999);
    legend.classList.add("in");
    return;
  }

  let curVia = "";
  let curLegend = "";
  let frameN = 0;

  const spawn = (x: number, y: number, kind: string) => {
    const e = document.createElementNS(NS, "circle");
    e.setAttribute("class", `reel-puff reel-${kind}`);
    e.setAttribute("cx", x.toFixed(1)); e.setAttribute("cy", y.toFixed(1));
    e.setAttribute("r", kind === "air" ? "1.4" : "2");
    trails.appendChild(e);
    gsap.to(e, { attr: { r: kind === "air" ? 4 : 6 }, opacity: 0, duration: kind === "air" ? 1.6 : 0.9, ease: "power2.out", onComplete: () => e.remove() });
  };

  const o = { p: 0 };
  const tl = gsap.timeline();
  tl.fromTo(legend, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.3);
  tl.to(o, {
    p: 1, duration: 8.5, ease: "power1.inOut",
    onUpdate() {
      const a = path.getPointAtLength(o.p * len);
      const b = path.getPointAtLength(Math.min(len, o.p * len + 1));
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const via = viaAt(a.x);
      if (via !== curVia) {
        curVia = via;
        veh.innerHTML = VEH[via];
        veh.classList.toggle("fly", via === "plane");
      }
      setVeh(via, a.x, a.y, ang);
      // camera follows; far sky parallaxes slower
      world.setAttribute("transform", `translate(${cam(a.x).toFixed(1)},0)`);
      far.setAttribute("transform", `translate(${(cam(a.x) * 0.45).toFixed(1)},0)`);
      // trails
      if (frameN++ % 2 === 0) {
        if (via === "car") spawn(a.x - 9, a.y + 4, "dust");
        else if (via === "boat") spawn(a.x - 9, a.y + 4, "wake");
        else if (a.y < 260) spawn(a.x - 15, a.y + 2, "air"); // contrail only at altitude
      }
      // legend swap
      const lg = legendAt(a.x);
      if (lg !== curLegend) {
        curLegend = lg;
        gsap.fromTo(legend, { opacity: 0.15 }, { opacity: 1, duration: 0.4, onStart: () => (legend.textContent = lg) });
      }
    },
  }, 0.3);
}

export { build as buildReel, play as playReel };
