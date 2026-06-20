/**
 * The plan — a hand-inked chart of central Malé. The island is drawn as a
 * wobbling coastline in a wave-hatched sea, each landmark a little illustration
 * (a gold-domed mosque, a dhoni at the jetty, trees in the park), joined by the
 * ink trail we actually walked. A roughen filter gives every stroke a drawn,
 * slightly-shaky hand. Positions are hand-set (normalised 0–1), so it reads like
 * a kept map, not a tile service.
 */
import { gsap } from "gsap";
import { frame } from "./frame";
import type { Artifact, PlanIcon } from "../../data/artifacts";

type PlanSpec = Extract<Artifact, { kind: "plan" }>;

const W = 400, H = 372;
const ISL = { x: 46, y: 84, w: 308, h: 232 }; // land box the spots map into
const GOLD = "#e3b15a";
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const px = (x: number) => ISL.x + x * ISL.w;
const py = (y: number) => ISL.y + y * ISL.h;

// little hand-drawn illustrations, centred on (0,0), sitting on the ground line ~y=8
const ICON: Record<PlanIcon, string> = {
  boat: `<path class="carte-shape" d="M-11,3 Q0,8.5 11,3 L8,7 Q0,9.5 -8,7 Z"/>
    <line class="carte-ink" x1="0" y1="3" x2="0" y2="-12"/>
    <path class="carte-shape" d="M0.8,-12 Q9,-7.5 7.5,-1.8 L0.8,-1.8 Z"/>`,
  fish: `<path class="carte-shape" d="M-6,0 Q-1,-5 6,-3.4 Q9,-2.4 9,0 Q9,2.4 6,3.4 Q-1,5 -6,0 Z"/>
    <path class="carte-ink" d="M-6,0 L-11,-4 M-6,0 L-11,4 M-11,-4 L-11,4"/>
    <path class="carte-ink" d="M2,-2.2 Q3.2,0 2,2.2"/>
    <circle class="carte-dot" cx="5.6" cy="-0.8" r="0.9"/>`,
  flag: `<line class="carte-ink" x1="0" y1="9" x2="0" y2="-10"/>
    <path class="carte-shape" d="M0,-10 Q5,-9 9.5,-10 Q6.5,-7 9.5,-4.2 Q5,-5.4 0,-4.2 Z"/>
    <line class="carte-ink" x1="-3.5" y1="9" x2="3.5" y2="9"/>`,
  gov: `<path class="carte-shape" d="M-10.5,-3 L0,-9.5 L10.5,-3 Z"/>
    <path class="carte-ink" d="M-9,-3 L-9,7 M-4.5,-3 L-4.5,7 M0,-3 L0,7 M4.5,-3 L4.5,7 M9,-3 L9,7"/>
    <line class="carte-ink" x1="-12" y1="7.5" x2="12" y2="7.5"/>
    <line class="carte-ink" x1="0" y1="-9.5" x2="0" y2="-13.5"/>
    <path class="carte-shape" d="M0,-13.5 L3.4,-12.4 L0,-11.3 Z"/>`,
  mosque: `<path class="carte-gold-soft" d="M-12,8 L-12,-5 L-9,-8.5 L-6,-5 L-6,8 Z"/>
    <line class="carte-ink" x1="-9" y1="-8.5" x2="-9" y2="-11.5"/>
    <circle class="carte-gold" cx="-9" cy="-12.6" r="1.3"/>
    <path class="carte-shape" d="M-3,8 L-3,-1 L12,-1 L12,8 Z"/>
    <path class="carte-gold" d="M-3.5,-1 Q-3.5,-10 4.5,-10 Q12.5,-10 12.5,-1 Z"/>
    <line class="carte-ink" x1="4.5" y1="-10" x2="4.5" y2="-13.6"/>
    <path class="carte-gold" d="M4.5,-14 a2,2 0 1,1 -1.5,1.1"/>`,
  trees: `<line class="carte-ink" x1="-5" y1="8" x2="-5" y2="0"/>
    <circle class="carte-shape" cx="-5" cy="-3.5" r="4.6"/>
    <line class="carte-ink" x1="4.5" y1="8" x2="4.5" y2="2.5"/>
    <circle class="carte-shape" cx="4.5" cy="-1" r="3.7"/>
    <line class="carte-ink" x1="0.6" y1="8" x2="0.6" y2="3.5"/>
    <circle class="carte-shape" cx="0.6" cy="0.6" r="2.8"/>`,
  pin: `<path class="carte-shape" d="M0,7 C-5,0 -5,-7 0,-7 C5,-7 5,0 0,7 Z"/>
    <circle class="carte-dot" cx="0" cy="-1.6" r="1.6"/>`,
};

// a smooth ink trail through the walked points (quadratic through each node)
function trail(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

function build(host: HTMLElement, spec: PlanSpec) {
  const pts = spec.spots.map((s) => ({ x: px(s.x), y: py(s.y) }));
  const route = spec.route ?? spec.spots.map((_, i) => i);

  // an irregular, hand-drawn island sitting in the sea
  const land =
    "M44,168 C42,118 70,84 132,80 C214,75 300,80 352,94 C374,100 366,158 362,206 " +
    "C358,268 352,312 298,322 C214,335 108,332 70,314 C36,298 46,212 44,168 Z";

  // wave hatches scattered through the sea margins
  const waveAt = [
    [92, 52], [150, 44], [300, 50], [350, 70], [372, 150], [368, 250],
    [300, 344], [120, 350], [54, 300], [40, 110], [210, 40], [338, 320],
  ];
  const waves = waveAt
    .map(([x, y]) => `<path class="carte-wave" d="M${x},${y} q3,-3.2 6,0 q3,3.2 6,0" />`)
    .join("");

  // a few wobbling streets across the dense little island
  const streets = `<g class="carte-streets">
    <path d="M70,150 Q200,138 348,156" /><path d="M64,212 Q200,224 346,210" />
    <path d="M150,96 Q142,210 158,316" /><path d="M250,92 Q262,200 250,318" />
  </g>`;

  // jetty pier reaching up into the sea from the 'you' spot
  const jet = spec.spots.findIndex((s) => s.you);
  const jx = jet >= 0 ? pts[jet].x : W / 2;
  const jy = jet >= 0 ? pts[jet].y : ISL.y;
  const pier = `<path class="carte-pier" d="M${jx.toFixed(1)},${jy.toFixed(1)} L${jx.toFixed(1)},54" />
    <line class="carte-pier" x1="${(jx - 4).toFixed(1)}" y1="60" x2="${(jx + 4).toFixed(1)}" y2="60" />`;

  // a stray dhoni out at sea, for flavour
  const dhoni = `<g class="carte-sea-deco" transform="translate(312,40) scale(0.78)">${ICON.boat}</g>`;

  const dTrail = trail(route.map((i) => pts[i]));

  const markers = spec.spots.map((s, i) => {
    const scale = s.icon === "mosque" ? 1.16 : 1;
    return `<g class="carte-spot ${s.you ? "you" : ""}" data-spot="${i}" transform="translate(${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)})">
      <circle class="carte-spot-base" cx="0" cy="0" r="1.8" />
      <g class="carte-mark" transform="translate(0,-9) scale(${scale})">${ICON[s.icon]}</g>
    </g>`;
  }).join("");

  const svg = `<svg class="carte-svg" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter id="carteRough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
    <g filter="url(#carteRough)">
      ${waves}${dhoni}
      <path class="carte-land" d="${land}" />
      <path class="carte-coast" d="${land}" />
      ${streets}
      ${pier}
      <path class="carte-route" d="${dTrail}" />
      ${markers}
      <g class="carte-compass" transform="translate(366,40)">
        <path d="M0,-13 L3,-2 L0,0 L-3,-2 Z" /><path d="M0,13 L2.4,2 L0,0 L-2.4,2 Z" />
        <path d="M-13,0 L-2,2.4 L0,0 L-2,-2.4 Z" /><path d="M13,0 L2,2.4 L0,0 L2,-2.4 Z" />
      </g>
      <g class="carte-scale" transform="translate(40,352)">
        <path d="M0,0 L62,0 M0,-3 L0,3 M31,-2 L31,2 M62,-3 L62,3" />
      </g>
    </g>
    <text class="carte-compass-n" x="366" y="20" text-anchor="middle">N</text>
    <text class="carte-scale-t" x="0" y="364" transform="translate(40,0)">0</text>
    <text class="carte-scale-t" x="62" y="364" text-anchor="end" transform="translate(40,0)">300 m</text>
  </svg>`;

  // handwritten labels over the chart
  const labels = spec.spots.map((s, i) => {
    const side = s.side ?? (pts[i].x > W / 2 ? "left" : "right");
    return `<div class="carte-label carte-${side}" data-label="${i}" style="left:${((pts[i].x / W) * 100).toFixed(2)}%;top:${((pts[i].y / H) * 100).toFixed(2)}%">
      ${s.you ? `<span class="carte-you">you are here</span>` : ""}<span class="carte-name">${s.name}</span>
    </div>`;
  }).join("");

  host.innerHTML = frame({
    eyebrow: spec.label ?? "ON FOOT",
    index: "N ↑",
    accent: GOLD,
    body: `<div class="artcarte" style="aspect-ratio:${W} / ${H}">${svg}${labels}</div>`,
    caption: spec.caption,
  });
  host.classList.add("art-ready");
}

function play(host: HTMLElement, spec: PlanSpec) {
  const route = spec.route ?? spec.spots.map((_, i) => i);
  const coast = host.querySelector<SVGPathElement>(".carte-coast");
  const trailEl = host.querySelector<SVGPathElement>(".carte-route");

  if (REDUCED) {
    if (coast) coast.style.opacity = "1";
    if (trailEl) trailEl.style.opacity = "0.9";
    host.querySelectorAll<HTMLElement>(".carte-spot, .carte-label").forEach((e) => e.classList.add("in"));
    return;
  }

  // set up draw-on for the coastline and the route
  for (const p of [coast, trailEl]) {
    if (!p) continue;
    const L = p.getTotalLength();
    p.style.strokeDasharray = `${L}`;
    p.style.strokeDashoffset = `${L}`;
    p.style.opacity = "1";
  }

  const tl = gsap.timeline();
  tl.from(".carte-land", { opacity: 0, duration: 0.7 }, 0);
  tl.from(".carte-wave, .carte-sea-deco, .carte-streets", { opacity: 0, duration: 0.6, stagger: 0.012 }, 0.1);
  if (coast) tl.to(coast, { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" }, 0.15);
  tl.from(".carte-pier", { opacity: 0, duration: 0.5 }, 0.6);
  if (trailEl) tl.to(trailEl, { strokeDashoffset: 0, duration: 1.3, ease: "power1.inOut" }, 0.7);

  // landmarks pop in the order we walked them
  route.forEach((idx, n) => {
    const at = 1.0 + n * 0.26;
    const g = host.querySelector<SVGGElement>(`[data-spot="${idx}"]`);
    const l = host.querySelector<HTMLElement>(`[data-label="${idx}"]`);
    if (g) {
      tl.fromTo(g.querySelector(".carte-mark"), { scale: 0, opacity: 0, transformOrigin: "center bottom" },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.9)" }, at);
      tl.fromTo(g.querySelector(".carte-spot-base"), { scale: 0, transformOrigin: "center" },
        { scale: 1, duration: 0.3 }, at);
    }
    if (l) tl.to(l, { opacity: 1, duration: 0.45 }, at + 0.12);
  });

  tl.from(".carte-compass, .carte-compass-n, .carte-scale, .carte-scale-t", { opacity: 0, duration: 0.6 }, ">-0.2");
}

export { build as buildPlan, play as playPlan };
