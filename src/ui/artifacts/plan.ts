/**
 * The plan — an illustrated walking map. A stylised town (sea, jetty, a faint
 * street grid) with a little icon for each landmark, joined by the dashed route
 * you actually walked, and a "you are here" at the jetty. Positions are hand-set
 * (normalised 0–1), so it reads like a drawn tourist plan, not a tile map.
 */
import { gsap } from "gsap";
import { frame } from "./frame";
import type { Artifact, PlanIcon } from "../../data/artifacts";

type PlanSpec = Extract<Artifact, { kind: "plan" }>;

const W = 360, H = 332, SEA = 56, PADX = 36, LAND_TOP = 72, LAND_H = 224;
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICON: Record<PlanIcon, string> = {
  boat: `<path d="M-7,1 L7,1 L4,5 L-4,5 Z"/><path d="M0,1 L0,-5 L5,-2 Z"/>`,
  flag: `<line x1="0" y1="6" x2="0" y2="-7"/><path d="M0,-7 L7,-4.5 L0,-2 Z"/>`,
  gov: `<path d="M-8,-1 L0,-6 L8,-1 Z"/><line x1="-8" y1="6" x2="8" y2="6"/><line x1="-6" y1="-1" x2="-6" y2="5"/><line x1="-2" y1="-1" x2="-2" y2="5"/><line x1="2" y1="-1" x2="2" y2="5"/><line x1="6" y1="-1" x2="6" y2="5"/>`,
  fish: `<path d="M-5,0 Q-1,-4 5,-3 Q8,-2 8,0 Q8,2 5,3 Q-1,4 -5,0 Z"/><path d="M-5,0 L-9,-3 L-9,3 Z"/><circle cx="5" cy="-0.6" r="0.8"/>`,
  mosque: `<path d="M-6,6 L-6,1 Q0,-6 6,1 L6,6 Z"/><circle cx="0" cy="-7.4" r="1.5"/>`,
  trees: `<circle cx="-4" cy="-1" r="3.4"/><line x1="-4" y1="2.4" x2="-4" y2="6"/><circle cx="3.5" cy="0.5" r="3"/><line x1="3.5" y1="3.5" x2="3.5" y2="6.5"/>`,
  pin: `<path d="M0,6 C-5,0 -5,-6 0,-6 C5,-6 5,0 0,6 Z"/><circle cx="0" cy="-1" r="1.6"/>`,
};

const px = (x: number) => PADX + x * (W - 2 * PADX);
const py = (y: number) => LAND_TOP + y * LAND_H;

function build(host: HTMLElement, spec: PlanSpec) {
  const pts = spec.spots.map((s) => ({ x: px(s.x), y: py(s.y) }));
  const route = spec.route ?? spec.spots.map((_, i) => i);

  // sea band with a wavy southern coast
  let coast = `M0,0 L${W},0 L${W},${SEA} `;
  for (let x = W; x > 0; x -= 30) coast += `Q ${x - 15},${SEA + 4} ${x - 30},${SEA} `;
  coast += "Z";
  const sea = `<path class="plan-sea" d="${coast}" />`;

  // faint street grid on the land
  let streets = `<g class="plan-streets">`;
  for (let i = 1; i < 7; i++) streets += `<line x1="${PADX + i * 42}" y1="${SEA}" x2="${PADX + i * 42}" y2="${H}" />`;
  for (let i = 1; i < 5; i++) streets += `<line x1="0" y1="${SEA + i * 56}" x2="${W}" y2="${SEA + i * 56}" />`;
  streets += `</g>`;

  // jetty pier reaching up into the sea
  const jet = spec.spots.findIndex((s) => s.you);
  const jx = jet >= 0 ? pts[jet].x : W / 2;
  const pier = `<path class="plan-pier" d="M${jx},${SEA - 1} L${jx},34" /><circle class="plan-pier-tip" cx="${jx}" cy="34" r="2.2" />`;

  // the walked route (dashed)
  const dRoute = route.map((i, n) => `${n ? "L" : "M"} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`).join(" ");

  const markers = spec.spots.map((s, i) =>
    `<g class="plan-spot ${s.you ? "you" : ""}" data-spot="${i}" transform="translate(${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)})">
      <circle class="plan-base" cx="0" cy="0" r="1.6" />
      <g class="plan-icon" transform="translate(0,-9)">${ICON[s.icon]}</g>
    </g>`).join("");

  const svg = `<svg class="plan-svg" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${sea}${streets}${pier}
    <path class="plan-route" d="${dRoute}" />
    ${markers}
    <g class="plan-compass" transform="translate(${W - 24},22)"><line x1="0" y1="7" x2="0" y2="-7"/><path d="M-3,-3 L0,-8 L3,-3"/><text x="0" y="16">N</text></g>
  </svg>`;

  // HTML labels over the plan
  const labels = spec.spots.map((s, i) => {
    const side = s.side ?? (pts[i].x > W / 2 ? "left" : "right");
    return `<div class="plan-label plan-${side}" data-label="${i}" style="left:${((pts[i].x / W) * 100).toFixed(2)}%;top:${((pts[i].y / H) * 100).toFixed(2)}%">
      ${s.you ? `<span class="plan-you">You are here</span>` : ""}<span class="plan-name">${s.name}</span>
    </div>`;
  }).join("");

  host.innerHTML = frame({
    eyebrow: spec.label ?? "ON FOOT",
    index: "↥ N",
    body: `<div class="artplan" style="aspect-ratio:${W} / ${H}">${svg}${labels}</div>`,
    caption: spec.caption,
  });
  host.classList.add("art-ready");
}

function play(host: HTMLElement, spec: PlanSpec) {
  const route = spec.route ?? spec.spots.map((_, i) => i);
  const spot = (i: number) => host.querySelector<SVGGElement>(`[data-spot="${i}"]`);
  const label = (i: number) => host.querySelector<HTMLElement>(`[data-label="${i}"]`);

  if (REDUCED) {
    host.querySelector<SVGPathElement>(".plan-route")!.style.opacity = "0.85";
    host.querySelectorAll<HTMLElement>(".plan-spot, .plan-label").forEach((e) => e.classList.add("in"));
    return;
  }

  const tl = gsap.timeline();
  tl.from(".plan-sea, .plan-streets, .plan-pier, .plan-pier-tip", { opacity: 0, duration: 0.7 }, 0);
  tl.fromTo(host.querySelector(".plan-route"), { opacity: 0 }, { opacity: 0.85, duration: 0.9 }, 0.3);
  // landmarks pop in the order you walked them
  route.forEach((idx, n) => {
    const at = 0.5 + n * 0.32;
    const g = spot(idx), l = label(idx);
    if (g) tl.fromTo(g.querySelector(".plan-icon"), { scale: 0, opacity: 0, transformOrigin: "center bottom" }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }, at);
    if (g) tl.fromTo(g.querySelector(".plan-base"), { scale: 0, transformOrigin: "center" }, { scale: 1, duration: 0.3 }, at);
    if (l) tl.to(l, { opacity: 1, duration: 0.4 }, at + 0.1);
  });
}

export { build as buildPlan, play as playPlan };
