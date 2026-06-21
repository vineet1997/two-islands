/**
 * The load screen — "two lights, one landfall". A field of teal (Maldives) and
 * amber (Sri Lanka) motes swirls in from each side and coalesces into the TWO
 * ISLANDS wordmark. The coalescence runs on its own scripted timeline (with a
 * few breathing "beats") so it's always worth watching — the page loads in the
 * background, and we only exit once BOTH the beat has played AND assets are in.
 * On ready, the mark holds, then lifts and scatters as the gallery rises behind.
 */
import { gsap } from "gsap";

export interface Preloader {
  progress(loaded: number, total: number): void;
  done(): Promise<void>;
}

const TEAL = [95, 199, 207];
const AMBER = [232, 184, 96];
const RAMP = 2800;     // ms for the swirl to coalesce into the wordmark
const HOLD_MIN = 700;  // ms the formed mark holds (and beats) before it may exit
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (x: number) => x * x * (3 - 2 * x);
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Mote {
  tx: number; ty: number;   // target (a pixel of the wordmark)
  sideX: number;            // swirl centre, biased to the mote's island side
  a: number; r0: number; ph: number; spin: number;
  col: string;
}

export function createPreloader(): Preloader {
  const el = document.getElementById("preloader")!;
  const canvas = el.querySelector<HTMLCanvasElement>("#pre-canvas")!;
  const foot = el.querySelector<HTMLElement>(".pre-foot")!;
  const statusEl = el.querySelector<HTMLElement>(".pre-status")!;
  const ctx = canvas.getContext("2d")!;

  let W = 0, H = 0, cx = 0, cy = 0;
  let motes: Mote[] = [];
  let ready = false;
  let t0 = 0;                // when the animation became visible
  let assetsReady = false;   // set by done() — everything has loaded
  let exiting = 0;           // 0..1 scatter-out
  let exitStarted = false;
  let resolveDone: (() => void) | null = null;
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = el.clientWidth; H = el.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H * 0.45;
  }

  function sample() {
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const o = off.getContext("2d")!;
    o.clearRect(0, 0, W, H);
    o.fillStyle = "#fff"; o.textAlign = "center"; o.textBaseline = "middle";
    const size = Math.min(W * 0.16, 104), gap = size * 0.56;
    o.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`;
    o.fillText("TWO", cx, cy - gap);
    o.fillText("ISLANDS", cx, cy + gap);
    const data = o.getImageData(0, 0, W, H).data;
    const pts: [number, number][] = [];
    const step = W < 560 ? 3 : 4;
    for (let y = 0; y < H; y += step)
      for (let x = 0; x < W; x += step)
        if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pts[i]; pts[i] = pts[j]; pts[j] = t;
    }
    let minX = 1e9, maxX = -1e9;
    for (const q of pts) { if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0]; }
    const cap = Math.min(pts.length, 2600);
    motes = [];
    for (let i = 0; i < cap; i++) {
      const tx = pts[i][0], ty = pts[i][1];
      const tc = (tx - minX) / Math.max(1, maxX - minX); // 0 = teal/Maldives, 1 = amber/Sri Lanka
      const r = Math.round(TEAL[0] + (AMBER[0] - TEAL[0]) * tc);
      const g = Math.round(TEAL[1] + (AMBER[1] - TEAL[1]) * tc);
      const b = Math.round(TEAL[2] + (AMBER[2] - TEAL[2]) * tc);
      motes.push({
        tx, ty,
        sideX: cx + (tc - 0.5) * W * 0.46,
        a: Math.random() * 6.283, r0: 110 + Math.random() * 250,
        ph: Math.random() * 6.283, spin: 0.4 + Math.random() * 0.9,
        col: `rgb(${r},${g},${b})`,
      });
    }
  }

  function startExit() {
    exitStarted = true;
    const ex = { v: 0 };
    gsap.timeline({
      onComplete: () => { cancelAnimationFrame(raf); el.style.display = "none"; resolveDone?.(); },
    })
      .to(ex, { v: 1, duration: 0.85, ease: "power2.in", onUpdate: () => { exiting = ex.v; } })
      .to(el, { opacity: 0, duration: 0.55, ease: "power2.out" }, "<0.25");
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (!ready) return;
    const elapsed = now - t0;

    // scripted coalescence (independent of load speed)
    const p = smooth(clamp(elapsed / RAMP, 0, 1));               // monotonic form
    const loosen = Math.max(0, Math.sin((elapsed / RAMP) * Math.PI * 4)) * 0.14 * (1 - p);
    const eDraw = clamp(p - loosen, 0, 1);                        // beats: gather → loosen → gather
    const breath = 1 + 0.015 * Math.sin(elapsed * 0.0055);       // heartbeat while it forms/holds

    // exit once the beat has played AND the page is loaded (reduced motion skips the wait)
    const minTime = REDUCED ? 0 : RAMP + HOLD_MIN;
    if (!exitStarted && assetsReady && elapsed >= minTime) startExit();

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(7,10,10,0.24)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const t = now * 0.001;
    for (const m of motes) {
      let x: number, y: number;
      if (REDUCED) {
        x = m.tx; y = m.ty;
      } else {
        const ang = m.a + t * 0.5 * m.spin, rr = m.r0 * (1 - 0.12 * eDraw);
        const sx = m.sideX + Math.cos(ang) * rr * 0.7;
        const sy = cy + Math.sin(ang) * rr * 0.66;
        const jx = Math.sin(t * 1.6 + m.ph) * 6, jy = Math.cos(t * 1.4 + m.ph) * 6;
        x = sx + (m.tx - sx) * eDraw + jx * (1 - eDraw);
        y = sy + (m.ty - sy) * eDraw + jy * (1 - eDraw);
        x = cx + (x - cx) * breath; y = cy + (y - cy) * breath;
        if (exiting > 0) {
          x += (m.tx - cx) * exiting * 1.5;
          y += (m.ty - cy) * exiting * 1.5 - exiting * 46;
        }
      }
      ctx.globalAlpha = (0.32 + 0.55 * p + 0.1 * Math.sin(t * 2 + m.ph)) * (1 - exiting);
      ctx.fillStyle = m.col;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (1 - p) * 1.3, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    foot.style.opacity = String(Math.max(0, (p - 0.55) / 0.45) * (1 - exiting));
    const word = p < 0.34 ? "drifting" : p < 0.72 ? "gathering" : p < 0.99 ? "making landfall" : "two islands";
    if (statusEl.textContent !== word) statusEl.textContent = word;
  }

  (async () => {
    resize();
    try {
      await Promise.race([
        document.fonts.load('700 80px "Space Grotesk"'),
        new Promise((r) => setTimeout(r, 500)),
      ]);
    } catch { /* fall back to system font */ }
    resize();
    sample();
    ready = true;
    t0 = performance.now();
    raf = requestAnimationFrame(loop);
  })();

  window.addEventListener("resize", () => { if (ready) { resize(); sample(); } });

  return {
    // load fraction is no longer what drives the visual — the scripted beat is.
    progress() { /* intentionally unused; the swirl runs on its own timeline */ },
    // resolves only after the beat has played out and the scatter-exit finishes
    done() {
      return new Promise((resolve) => { assetsReady = true; resolveDone = resolve; });
    },
  };
}
