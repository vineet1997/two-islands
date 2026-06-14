/**
 * The map artifact — a designed chart, not a tile map. Real (simplified)
 * coastlines on a faint graticule, with a reticle pin that ripples in and its
 * coordinates counting up. Two modes: `place` (one location) and `route` (a
 * traced multi-stop journey).
 */
import { gsap } from "gsap";
import { frame } from "./frame";
import { INDIA, SRI_LANKA, MALDIVES_ATOLLS, REGIONS, type Ring, type GeoBox } from "../../data/geo";
import type { Artifact, MapStop, MapLeg } from "../../data/artifacts";

type MapSpec = Extract<Artifact, { kind: "map" }>;

const W = 360;
const PAD = 30;
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const NS = "http://www.w3.org/2000/svg";
// top-down vehicle silhouettes, drawn nose-up (−y) so they rotate to face travel
const GLYPH: Record<string, string> = {
  plane: "M0,-7 L1,-2.5 L7,1.5 L7,3 L1,1.2 L1,5 L3.2,6.6 L3.2,7.4 L0,6.4 L-3.2,7.4 L-3.2,6.6 L-1,5 L-1,1.2 L-7,3 L-7,1.5 L-1,-2.5 Z",
  boat: "M0,-7 L2.6,-1 L2.2,5.5 L1.6,6.9 L-1.6,6.9 L-2.2,5.5 L-2.6,-1 Z",
  car: "M-2.6,-4.6 Q-3,-5.4 -2,-5.5 L2,-5.5 Q3,-5.4 2.6,-4.6 L2.6,4.6 Q3,5.6 2,5.6 L-2,5.6 Q-3,5.6 -2.6,4.6 Z",
};
const viaGlyph = (via: string) => (via === "boat" ? GLYPH.boat : via === "car" ? GLYPH.car : GLYPH.plane);

interface Proj { x: (lon: number) => number; y: (lat: number) => number; H: number; }

function projector(box: GeoBox): Proj {
  const meanLat = (box.minLat + box.maxLat) / 2;
  const k = Math.cos((meanLat * Math.PI) / 180); // shrink longitude toward the pole
  const gw = (box.maxLon - box.minLon) * k;
  const gh = box.maxLat - box.minLat;
  const innerW = W - 2 * PAD;
  const innerH = innerW * (gh / gw);
  const H = innerH + 2 * PAD;
  return {
    x: (lon) => PAD + ((lon - box.minLon) * k) / gw * innerW,
    y: (lat) => PAD + ((box.maxLat - lat) / gh) * innerH,
    H,
  };
}

/** pad a bounding box by a fraction of its span on each side */
function padBox(b: GeoBox, fx: number, fy: number): GeoBox {
  const dx = (b.maxLon - b.minLon) * fx;
  const dy = (b.maxLat - b.minLat) * fy;
  return { minLon: b.minLon - dx, minLat: b.minLat - dy, maxLon: b.maxLon + dx, maxLat: b.maxLat + dy };
}

function stopsBox(stops: MapStop[]): GeoBox {
  const lons = stops.map((s) => s.lon), lats = stops.map((s) => s.lat);
  return { minLon: Math.min(...lons), minLat: Math.min(...lats), maxLon: Math.max(...lons), maxLat: Math.max(...lats) };
}

/** widen the narrower axis so the chart never renders as a thin ribbon */
function clampAspect(b: GeoBox, maxR: number): GeoBox {
  const meanLat = (b.minLat + b.maxLat) / 2;
  const k = Math.cos((meanLat * Math.PI) / 180);
  const gw = (b.maxLon - b.minLon) * k, gh = b.maxLat - b.minLat;
  if (gh / gw > maxR) {
    const extra = (gh / maxR - gw) / k / 2;
    return { ...b, minLon: b.minLon - extra, maxLon: b.maxLon + extra };
  }
  if (gw / gh > maxR) {
    const extra = (gw / maxR - gh) / 2;
    return { ...b, minLat: b.minLat - extra, maxLat: b.maxLat + extra };
  }
  return b;
}

function ringPath(ring: Ring, p: Proj): string {
  return ring.map((c, i) => `${i ? "L" : "M"} ${p.x(c[0]).toFixed(1)} ${p.y(c[1]).toFixed(1)}`).join(" ") + " Z";
}

/** quadratic arc bowed sideways, for flight/boat legs */
function arc(a: { x: number; y: number }, b: { x: number; y: number }, bow: number): string {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const cx = (a.x + b.x) / 2 + (-dy / len) * bow;
  const cy = (a.y + b.y) / 2 + (dx / len) * bow;
  return `Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function graticule(box: GeoBox, p: Proj): string {
  const span = Math.max(box.maxLon - box.minLon, box.maxLat - box.minLat);
  const step = [0.25, 0.5, 1, 2, 5, 10].find((s) => span / s <= 6) ?? 10;
  const lines: string[] = [];
  for (let lon = Math.ceil(box.minLon / step) * step; lon < box.maxLon; lon += step)
    lines.push(`<line x1="${p.x(lon).toFixed(1)}" y1="0" x2="${p.x(lon).toFixed(1)}" y2="${p.H.toFixed(1)}" />`);
  for (let lat = Math.ceil(box.minLat / step) * step; lat < box.maxLat; lat += step)
    lines.push(`<line x1="0" y1="${p.y(lat).toFixed(1)}" x2="${W}" y2="${p.y(lat).toFixed(1)}" />`);
  return `<g class="am-grat">${lines.join("")}</g>`;
}

function land(p: Proj): string {
  const atolls = MALDIVES_ATOLLS
    .map((c) => `<circle class="am-atoll" cx="${p.x(c[0]).toFixed(1)}" cy="${p.y(c[1]).toFixed(1)}" r="2.4" />`)
    .join("");
  return `<g class="am-land">
    <path d="${ringPath(INDIA, p)}" />
    <path d="${ringPath(SRI_LANKA, p)}" />
    ${atolls}
  </g>`;
}

function pin(id: string, x: number, y: number, big: boolean): string {
  return `<g class="am-pin" data-pin="${id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
    <circle class="am-ripple" r="3" />
    <circle class="am-halo" r="${big ? 7 : 5}" />
    <circle class="am-dot" r="${big ? 2.6 : 2}" />
  </g>`;
}

const fmt = (v: number, pos: string, neg: string) =>
  ({ h: v >= 0 ? pos : neg, v: Math.abs(v) });

function coordHTML(lat: number, lon: number): string {
  const la = fmt(lat, "N", "S"), lo = fmt(lon, "E", "W");
  return `<span class="am-coord">
    <i class="am-num" data-to="${la.v}">0.000</i>° ${la.h}
    <span class="am-mid">·</span>
    <i class="am-num" data-to="${lo.v}">0.000</i>° ${lo.h}
  </span>`;
}

function legHTML(leg: MapLeg): string {
  const head = leg.flight
    ? `<b>${leg.flight}</b><span class="am-carrier">${leg.carrier ?? ""}</span>`
    : leg.via === "boat" ? `<b>SPEEDBOAT</b>`
    : leg.carrier ? `<b>${leg.carrier}</b>`
    : `<b>BY ROAD</b>`;
  return `<div class="am-leg">${head}</div>
    <div class="am-stat"><span>${leg.dur}</span><span class="am-mid">·</span><span>${leg.dist}</span></div>`;
}

function pct(x: number, y: number, H: number) {
  return `left:${((x / W) * 100).toFixed(2)}%;top:${((y / H) * 100).toFixed(2)}%`;
}

export function buildMap(host: HTMLElement, spec: MapSpec) {
  const isRoute = spec.mode === "route";
  const stops = isRoute ? spec.stops : [spec.stop];
  const raw = isRoute ? padBox(stopsBox(stops), 0.16, 0.08) : padBox(REGIONS[spec.region], 0.05, 0.05);
  const box = clampAspect(raw, 1.9);
  const p = projector(box);
  const pts = stops.map((s) => ({ x: p.x(s.lon), y: p.y(s.lat) }));

  // route: one path per leg (so each leg's vehicle + draw is explicit), plus a
  // fleet layer (wake marks + the travelling vehicle) that rides on top
  let segsSVG = "", fleetSVG = "";
  if (isRoute) {
    const segs: string[] = [];
    for (let i = 1; i < pts.length; i++) {
      const short = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) < 40;
      const d = `M ${pts[i - 1].x.toFixed(1)} ${pts[i - 1].y.toFixed(1)} ` +
        (short ? `L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}` : arc(pts[i - 1], pts[i], 30));
      const via = stops[i].leg?.via ?? "flight";
      segs.push(`<path class="am-seg" data-via="${via}" d="${d}" pathLength="1" />`);
    }
    segsSVG = segs.join("");
    fleetSVG = `<g class="am-wake" data-wake></g><g class="am-vehicle" data-vehicle></g>`;
  }

  const pinsSVG = stops.map((s, i) => pin(s.id, pts[i].x, pts[i].y, !isRoute)).join("");

  // HTML label cards over the chart
  const cards = stops.map((s, i) => {
    const side = isRoute ? s.side ?? "right" : (pts[i].x > W / 2 ? "left" : "right");
    const head = isRoute
      ? `<div class="am-code">${s.code ?? s.name}</div>${s.sub ? `<div class="am-place">${s.sub}</div>` : ""}${s.leg ? legHTML(s.leg) : ""}`
      : `<div class="am-name">${s.name}</div>${s.sub ? `<div class="am-place">${s.sub}</div>` : ""}${coordHTML(s.lat, s.lon)}`;
    return `<div class="am-card am-${side}" data-card="${s.id}" style="${pct(pts[i].x, pts[i].y, p.H)}">${head}</div>`;
  }).join("");

  const svg = `<svg class="am-svg" viewBox="0 0 ${W} ${p.H.toFixed(1)}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${graticule(box, p)}
    ${land(p)}
    ${segsSVG}
    ${pinsSVG}
    ${fleetSVG}
    <text class="am-compass" x="${W - 22}" y="26">N</text>
  </svg>`;

  host.innerHTML = frame({
    eyebrow: spec.label ?? (isRoute ? "THE ROUTE" : "LOCATION"),
    index: isRoute ? `${stops.length} STOPS` : (spec.stop.code ?? ""),
    body: `<div class="artmap" style="aspect-ratio:${W} / ${p.H.toFixed(1)}">${svg}${cards}</div>`,
    caption: spec.caption,
  });
  host.classList.add("art-ready");
}

function countUp(host: HTMLElement, dur: number) {
  host.querySelectorAll<HTMLElement>(".am-num").forEach((el) => {
    const to = parseFloat(el.dataset.to || "0");
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: dur, ease: "power2.out", onUpdate: () => (el.textContent = o.v.toFixed(3)) });
  });
}

export function playMap(host: HTMLElement, spec: MapSpec) {
  const landEl = host.querySelector<SVGGElement>(".am-land")!;
  const grat = host.querySelector<SVGGElement>(".am-grat")!;
  const pins = [...host.querySelectorAll<SVGGElement>(".am-pin")];
  const cards = [...host.querySelectorAll<HTMLElement>(".am-card")];

  if (REDUCED) {
    host.querySelectorAll<HTMLElement>(".am-num").forEach((el) => (el.textContent = (parseFloat(el.dataset.to || "0")).toFixed(3)));
    host.querySelectorAll<HTMLElement>(".am-card, .am-pin").forEach((e) => e.classList.add("in"));
    host.querySelectorAll<SVGPathElement>(".am-seg").forEach((s) => (s.style.strokeDashoffset = "0"));
    return;
  }

  const ripple = (g: SVGGElement) => {
    const rip = g.querySelector<SVGCircleElement>(".am-ripple")!;
    gsap.fromTo(rip, { attr: { r: 3 }, opacity: 0.7 }, { attr: { r: 16 }, opacity: 0, duration: 1.5, ease: "power2.out", repeat: 1 });
    gsap.fromTo(g.querySelector(".am-dot"), { attr: { r: 0 } }, { attr: { r: spec.mode === "route" ? 2 : 2.6 }, duration: 0.5, ease: "back.out(2)" });
    g.classList.add("in");
  };

  const tl = gsap.timeline();
  tl.from(grat, { opacity: 0, duration: 0.8 }, 0);
  tl.from(landEl, { opacity: 0, duration: 1.1, ease: "power2.out" }, 0.1);

  if (spec.mode === "route") {
    const segEls = [...host.querySelectorAll<SVGPathElement>(".am-seg")];
    const vehicle = host.querySelector<SVGGElement>("[data-vehicle]")!;
    const wake = host.querySelector<SVGGElement>("[data-wake]")!;
    const vias = spec.stops.slice(1).map((s) => s.leg?.via ?? "flight");

    const setVehicle = (via: string) => {
      vehicle.innerHTML = `<path d="${viaGlyph(via)}" />`;
      vehicle.classList.toggle("am-flying", via === "flight");
    };
    const spawnWake = (x: number, y: number, ang: number) => {
      const e = document.createElementNS(NS, "ellipse");
      e.setAttribute("class", "am-waketick");
      e.setAttribute("cx", x.toFixed(1)); e.setAttribute("cy", y.toFixed(1));
      e.setAttribute("rx", "1"); e.setAttribute("ry", "2.6");
      e.setAttribute("transform", `rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
      wake.appendChild(e);
      gsap.to(e, { attr: { rx: 5.5, ry: 0.5 }, opacity: 0, duration: 0.9, ease: "power2.out", onComplete: () => e.remove() });
    };

    // the doorstep appears first, then the fleet sets off
    tl.call(() => ripple(pins[0]), [], 0.7);
    tl.to(cards[0], { opacity: 1, duration: 0.5, ease: "power2.out" }, 0.8);
    tl.set(vehicle, { opacity: 1 }, 0.9);

    let t = 0.95;
    segEls.forEach((seg, i) => {
      const segLen = seg.getTotalLength();
      const via = vias[i];
      const dur = Math.min(1.8, Math.max(0.7, 0.5 + segLen / 300));
      let frame = 0;
      tl.call(() => setVehicle(via), [], t);
      tl.fromTo(seg, { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, duration: dur, ease: via === "car" ? "power1.inOut" : "power2.inOut",
        onUpdate() {
          const pr = 1 - (seg.style.strokeDashoffset ? parseFloat(seg.style.strokeDashoffset) : 0);
          const l = Math.max(0, Math.min(segLen, pr * segLen));
          const a = seg.getPointAtLength(l), b = seg.getPointAtLength(Math.min(segLen, l + 1));
          const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
          const scale = via === "flight" ? 1 + 0.4 * Math.sin(Math.PI * pr) : 1; // lift off, then land
          vehicle.setAttribute("transform", `translate(${a.x.toFixed(2)},${a.y.toFixed(2)}) rotate(${ang.toFixed(1)}) scale(${scale.toFixed(2)})`);
          if (via === "boat" && pr > 0.05 && pr < 0.97 && frame++ % 3 === 0) spawnWake(a.x, a.y, ang);
        },
      }, t);
      tl.call(() => ripple(pins[i + 1]), [], t + dur - 0.12);
      tl.to(cards[i + 1], { opacity: 1, duration: 0.5, ease: "power2.out" }, t + dur - 0.05);
      t += dur * 0.94;
    });
    tl.to(vehicle, { opacity: 0, duration: 0.5, ease: "power2.in" }, t + 0.15);
  } else {
    tl.add(() => ripple(pins[0]), 0.7);
    tl.to(cards[0], { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.9);
    tl.add(() => countUp(host, 1.2), 0.9);
  }
}
