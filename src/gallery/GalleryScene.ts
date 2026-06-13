/**
 * The gallery wall — phantom.land's actual model: a CYLINDER viewed from
 * inside. Horizontal drag rotates it, vertical drag/wheel pans it up and
 * down; the camera never pitches. That projection is what gives phantom its
 * signature look: straight vertical grid lines, gently curving horizontal
 * ones, and cards that never roll — the lattice stays disciplined at every
 * screen position. Cards are curved cylinder patches in strict columns.
 */
import * as THREE from "three";
import { gsap } from "gsap";
import type { Moment } from "../data/moments";
import { img } from "../data/photos";
import { PHOTOS } from "../data/photos";

const DEG = Math.PI / 180;
const RADIUS = 10;
/** the 22-card set wraps twice around the cylinder for phantom-style density */
const INSTANCES = 2;
/** strict aligned columns (no brick stagger) — 8 per hemisphere; rows with
 *  fewer cards simply leave empty cells, like phantom's grid */
const COLS = 8;
/** row pitch tuned so the cell margin matches horizontally and vertically:
 *  cards are CARD_H tall, cells are ROW_PITCH tall, ~0.8 world-unit margin
 *  all four sides. Rings sit at the cell boundaries (midway between rows). */
const ROW_PITCH = 4.7;
const ROWS_Y = [ROW_PITCH, 0, -ROW_PITCH]; // slot.row 0/1/2 → top/mid/bottom
const CARD_H = 3.1;
const RING_INNER = ROW_PITCH / 2; // 2.35 — boundary between adjacent rows
const RING_OUTER = ROW_PITCH * 1.5; // 7.05 — outer boundary of the top/bottom row
const Y_LIMIT = ROW_PITCH + 0.3;
const ROW_SNAP = [0, ROW_PITCH, -ROW_PITCH];
const BASE_FOV = 50;
/** grab-to-overview: the camera widens (recedes) while you hold/scroll, so you
 *  navigate from a pulled-back vantage, then eases back in on release */
const GRAB_FOV = 57;
/** the photo sits zoomed inside its frame; the visible window pans as the wall
 *  turns — the card becomes a window into the scene rather than a sticker */
const BASE_ZOOM = 1.12;
const MAX_PARALLAX = 0.04; // kept within the zoom's UV slack
const V_RANGE = ROW_PITCH * 1.25; // vertical reach that maps to full parallax
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const cylPoint = (lon: number, y: number, r = RADIUS) =>
  new THREE.Vector3(r * Math.sin(lon), y, -r * Math.cos(lon));

/** cylinder patch centered on (lonC, yC); vertices local to the center */
function patchGeometry(lonC: number, yC: number, dLon: number, h: number) {
  const SEG = 12;
  const center = cylPoint(lonC, yC);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= SEG; iy++) {
    const y = yC + h / 2 - (iy / SEG) * h;
    for (let ix = 0; ix <= SEG; ix++) {
      const lon = lonC - dLon / 2 + (ix / SEG) * dLon;
      const p = cylPoint(lon, y).sub(center);
      positions.push(p.x, p.y, p.z);
      uvs.push(ix / SEG, 1 - iy / SEG);
    }
  }
  for (let iy = 0; iy < SEG; iy++)
    for (let ix = 0; ix < SEG; ix++) {
      const a = iy * (SEG + 1) + ix;
      const b = a + SEG + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return { geo, center };
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D map;
uniform float uOpacity;
uniform float uDim;
uniform vec2 uSize;
uniform float uRadius;
uniform vec2 uParallax;  // window pan within the frame
uniform float uZoom;     // internal zoom (>1 = zoomed in)
uniform float uExpose;   // hover exposure lift
uniform float uEdge;     // 0 at screen centre → 1 toward the cylinder's edge
void main() {
  // rounded-rect mask in card space
  vec2 p = (vUv - 0.5) * uSize;
  vec2 b = 0.5 * uSize - vec2(uRadius);
  vec2 d = abs(p) - b;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uRadius;
  float aa = fwidth(dist) * 1.4;
  float alpha = 1.0 - smoothstep(-aa, aa, dist);

  // the window: zoom into the texture, then pan it as the wall turns
  vec2 uv = (vUv - 0.5) / uZoom + 0.5 + uParallax;
  vec4 tex = texture2D(map, clamp(uv, 0.0015, 0.9985));

  float g = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(tex.rgb, vec3(g * 0.55), uDim);
  col *= 1.0 - uDim * 0.45;

  // inner edge shade — the photo sits set into the frame with depth
  float inset = -dist; // positive inside the card
  col *= 0.95 + 0.05 * smoothstep(0.015, 0.16, inset);

  // exposure: hover lift, minus a falloff toward the cylinder's edge
  col *= uExpose * (1.0 - 0.085 * uEdge);

  // hairline frame, phantom-style
  float edge = 1.0 - smoothstep(-aa, aa, dist + 0.028);
  col = mix(col, vec3(0.91, 0.90, 0.87), (alpha - edge) * 0.16);

  gl_FragColor = vec4(col, alpha * uOpacity);
  if (gl_FragColor.a < 0.003) discard;
}`;

const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Card {
  m: Moment;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  basePos: THREE.Vector3;
  lon: number;
  yPos: number;
  w: number; // chord width / height — corner radius + cover math
  h: number;
  lblTop?: HTMLElement;
  lblBot?: HTMLElement;
  dimmed: boolean;
  video?: HTMLVideoElement;
}

export class Gallery {
  onCardClick?: (m: Moment) => void;
  onChapterChange?: (m: Moment) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private cards: Card[] = [];
  private byId = new Map<string, Card[]>();
  private videoTextures = new Map<string, THREE.VideoTexture>();
  private flyCard: Card | null = null;
  private raycaster = new THREE.Raycaster();
  private texLoader: THREE.TextureLoader;

  private yaw = 0;
  private yPan = 0;
  private targetYaw = 0;
  private targetY = 0;
  private velYaw = 0;
  private velY = 0;

  private dragging = false;
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;
  private downT = 0;
  private moved = 0;
  private lastInteract = 0;
  private revealed = false;

  private interactive = false;
  private paused = false;
  private hovered: Card | null = null;
  private pointerNdc = new THREE.Vector2(2, 2);
  private needRaycast = false;
  private fovScale = 1;
  private lastWheelAt = 0;
  private frontChapter = "";
  private frame = 0;
  private momentIndex = new Map<string, string>();

  webglOk = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private labelLayer: HTMLElement,
    manager: THREE.LoadingManager,
    private moments: Moment[]
  ) {
    this.texLoader = new THREE.TextureLoader(manager);
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      this.webglOk = false;
      return;
    }
    this.renderer.setClearColor(0x070a0a, 1);
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.05, 60);
    this.camera.rotation.order = "YXZ";

    let n = 0;
    for (const m of moments)
      if (m.kind === "moment")
        this.momentIndex.set(m.id, String(++n).padStart(2, "0"));

    this.buildCards();
    this.buildGrid();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindInput();
    document.fonts?.ready.then(() => this.redrawChapterCards());
  }

  /* ───────────────────────── layout ───────────────────── */

  private buildCards() {
    for (let inst = 0; inst < INSTANCES; inst++)
    for (const m of this.moments) {
      const lon = (m.slot.col / COLS) * Math.PI + inst * Math.PI;
      const yPos = ROWS_Y[m.slot.row];
      const photo = m.cover ? PHOTOS[m.cover] : null;
      const ratio = m.kind === "chapter" ? 0.75 : photo ? photo.ratio : 0.75;
      const h = CARD_H;
      const w = h * ratio;
      const dLon = 2 * Math.asin(w / 2 / RADIUS);

      // chapter plates keep a deliberate inset border, so they don't zoom
      const zoom = m.kind === "chapter" ? 1.0 : BASE_ZOOM;
      const { geo, center } = patchGeometry(lon, yPos, dLon, h);
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          map: { value: this.placeholderTexture() },
          uOpacity: { value: 0 },
          uDim: { value: 0 },
          uSize: { value: new THREE.Vector2(w, h) },
          uRadius: { value: 0.045 },
          uParallax: { value: new THREE.Vector2(0, 0) },
          uZoom: { value: zoom },
          uExpose: { value: 1 },
          uEdge: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center);
      mesh.scale.setScalar(0.92);
      this.scene.add(mesh);

      const card: Card = {
        m, mesh, basePos: center.clone(), lon, yPos, w, h, dimmed: false,
      };
      mesh.userData.card = card;
      this.cards.push(card);
      if (!this.byId.has(m.id)) this.byId.set(m.id, []);
      this.byId.get(m.id)!.push(card);

      if (m.kind === "chapter") {
        mat.uniforms.map.value = this.chapterTexture(m);
      } else if (m.liveVideo) {
        this.texLoader.load(img(m.cover, "tile"), (t) => {
          t.colorSpace = THREE.NoColorSpace;
          if (!card.video) mat.uniforms.map.value = t;
        });
        this.attachVideo(card);
      } else {
        this.texLoader.load(img(m.cover, "tile"), (t) => {
          t.colorSpace = THREE.NoColorSpace;
          t.anisotropy = 8;
          mat.uniforms.map.value = t;
        });
      }
      this.buildLabel(card);
    }
  }

  /** hairline lattice — straight verticals + ring horizontals + drafting
   *  glyphs at alternate intersections, the detail that reads as drawn */
  private gridMat!: THREE.LineBasicMaterial;
  private gridGlyphMat!: THREE.LineBasicMaterial;
  private buildGrid() {
    this.gridMat = new THREE.LineBasicMaterial({
      color: 0xe8e6df, transparent: true, opacity: 0,
    });
    this.gridGlyphMat = new THREE.LineBasicMaterial({
      color: 0xe8e6df, transparent: true, opacity: 0,
    });
    const group = new THREE.Group();
    const R = RADIUS + 0.4;
    const rings = [-RING_OUTER, -RING_INNER, RING_INNER, RING_OUTER];
    // horizontal rings at the cell boundaries (midway between rows)
    for (const y of rings) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 160; i++)
        pts.push(cylPoint((i / 160) * Math.PI * 2, y, R));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.gridMat));
    }
    // straight vertical rules at the column boundaries, ring-to-ring
    const totalCols = COLS * INSTANCES;
    const rules: number[] = [];
    for (let k = 0; k < totalCols; k++) {
      const lon = ((k + 0.5) / totalCols) * Math.PI * 2;
      rules.push(lon);
      const pts = [cylPoint(lon, -RING_OUTER, R), cylPoint(lon, RING_OUTER, R)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.gridMat));
    }
    // tiny crosses at alternate intersections
    const tick = 0.075;
    const dLonTick = tick / R;
    const glyphPts: THREE.Vector3[] = [];
    rules.forEach((lon, ki) => {
      rings.forEach((y, ri) => {
        if ((ki + ri) % 2 !== 0) return;
        glyphPts.push(cylPoint(lon - dLonTick, y, R), cylPoint(lon + dLonTick, y, R));
        glyphPts.push(cylPoint(lon, y - tick, R), cylPoint(lon, y + tick, R));
      });
    });
    group.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(glyphPts), this.gridGlyphMat
    ));
    this.scene.add(group);
  }

  /** set both grid materials' opacity at the right ratio */
  private gridOpacity(v: number, dur = 0): void {
    if (dur > 0) {
      gsap.to(this.gridMat, { opacity: v, duration: dur, ease: "power2.inOut" });
      gsap.to(this.gridGlyphMat, { opacity: v * 0.5, duration: dur, ease: "power2.inOut" });
    } else {
      this.gridMat.opacity = v;
      this.gridGlyphMat.opacity = v * 0.5;
    }
  }

  private placeholderTexture(): THREE.Texture {
    const c = document.createElement("canvas");
    c.width = c.height = 8;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#161b1e";
    ctx.fillRect(0, 0, 8, 8);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  }

  private chapterTexture(m: Moment): THREE.CanvasTexture {
    // 2x resolution so the type renders crisp on large screens
    const W = 1536, H = 2048;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    // cream plate — the two typographic cards punctuate the photo wall
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ece8dc");
    g.addColorStop(1, "#ddd7c6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(20,24,26,0.2)";
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    const ML = 118; // left margin
    ctx.textBaseline = "top";
    ctx.font = "400 46px 'Space Mono', monospace";
    ctx.fillStyle = "rgba(20,24,26,0.55)";
    ctx.fillText(m.id === "ch-maldives" ? "CH. 01" : "CH. 02", ML, 116);
    ctx.fillStyle = "rgba(20,24,26,0.3)";
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 9; x++)
        ctx.fillRect(W - 118 - 8 * 42 + x * 42, 116 + y * 42, 6, 6);
    ctx.fillStyle = m.accent;
    ctx.fillRect(ML, H * 0.40 - 64, 150, 8);
    ctx.fillStyle = "#14181a";
    ctx.font = "700 252px 'Space Grotesk', sans-serif";
    const words = m.title.split(" ");
    words.forEach((wrd, i) => ctx.fillText(wrd, ML - 10, H * 0.40 + i * 252));
    ctx.font = "400 52px 'Space Mono', monospace";
    ctx.fillStyle = "rgba(20,24,26,0.6)";
    ctx.fillText(m.sub ?? "", ML, H * 0.40 + words.length * 252 + 88);
    ctx.fillText(m.dateLabel, ML, H - 200);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(20,24,26,0.4)";
    ctx.fillText(m.id === "ch-maldives" ? "01 — 02" : "02 — 02", W - ML, H - 200);
    ctx.textAlign = "left";

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  }

  private redrawChapterCards() {
    for (const card of this.cards)
      if (card.m.kind === "chapter")
        card.mesh.material.uniforms.map.value = this.chapterTexture(card.m);
  }

  private attachVideo(card: Card) {
    const id = card.m.id;
    const existing = this.videoTextures.get(id);
    if (existing) {
      card.video = existing.image as HTMLVideoElement;
      card.mesh.material.uniforms.map.value = existing;
      return;
    }
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = card.m.liveVideo!;
    v.addEventListener("canplay", () => {
      if (this.videoTextures.has(id)) return;
      const vt = new THREE.VideoTexture(v);
      vt.colorSpace = THREE.NoColorSpace;
      this.videoTextures.set(id, vt);
      for (const c of this.byId.get(id) ?? []) {
        c.video = v;
        c.mesh.material.uniforms.map.value = vt;
      }
      v.play().catch(() => {
        const kick = () => { v.play().catch(() => {}); window.removeEventListener("pointerdown", kick); };
        window.addEventListener("pointerdown", kick);
      });
    }, { once: true });
    v.load();
  }

  /* ───────────────────────── labels ───────────────────── */

  private buildLabel(card: Card) {
    const m = card.m;
    if (m.kind === "chapter") return;
    const top = document.createElement("div");
    top.className = "lbl";
    top.style.setProperty("--acc", m.accent);
    const idx = this.momentIndex.get(m.id);
    top.innerHTML = `<div class="lbl-title">${
      idx ? `<span class="lbl-idx">${idx}</span>` : ""
    }${m.title}</div>`;
    if (m.kind === "mood") top.classList.add("lbl-mood");
    const bot = document.createElement("div");
    bot.className = "lbl";
    const chips = m.kind === "moment"
      ? m.tags.map((t) => `<span class="chip">${t}</span>`).join("")
      : "";
    // chips left, date right — the bottom bar spans the cell, like ledger lines
    bot.innerHTML = `<div class="lbl-meta"><div class="lbl-chips">${chips}</div><span class="date">${m.dateLabel}</span></div>`;
    this.labelLayer.append(top, bot);
    card.lblTop = top;
    card.lblBot = bot;
  }

  /** horizontal facing factor — how directly a column faces the camera */
  private facing(card: Card, fwd: THREE.Vector3): number {
    const len = Math.hypot(card.basePos.x, card.basePos.z) || 1;
    return (card.basePos.x / len) * fwd.x + (card.basePos.z / len) * fwd.z;
  }

  private _fwd = new THREE.Vector3();
  private _v = new THREE.Vector3();
  private updateCards() {
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    this.camera.getWorldDirection(this._fwd);
    const v = this._v;
    for (const card of this.cards) {
      const u = card.mesh.material.uniforms;
      const cos = this.facing(card, this._fwd);

      // window parallax + edge falloff (frozen during a fly so tweens win)
      if (this.interactive) {
        const edge = clamp((0.8 - cos) / 0.5, 0, 1);
        u.uEdge.value = edge;
        if (card.m.kind !== "chapter") {
          const angleX = wrapPi(card.lon - this.yaw);
          const px = clamp(angleX / 0.5, -1, 1) * MAX_PARALLAX;
          const py = clamp((card.yPos - this.yPan) / V_RANGE, -1, 1) * MAX_PARALLAX;
          (u.uParallax.value as THREE.Vector2).set(px, py);
        }
      }

      if (!card.lblTop || !card.lblBot) continue;
      let o = clamp((cos - 0.55) / 0.28, 0, 1);
      o *= u.uOpacity.value as number;
      if (card.m.kind === "mood") o *= 0.6;
      if (card.dimmed) o *= 0.15;

      // labels hug the card: title at the photo's top-left, the bottom bar
      // spanning the photo's width — chips on the left edge, date on the right
      const halfLon = Math.asin(card.w / 2 / RADIUS);
      const topY = card.yPos + card.h / 2;
      const botY = card.yPos - card.h / 2;
      v.copy(cylPoint(card.lon - halfLon, topY)).project(this.camera);
      const tx = ((v.x + 1) / 2) * W;
      const ty = ((1 - v.y) / 2) * H;
      v.copy(cylPoint(card.lon - halfLon, botY)).project(this.camera);
      const blx = ((v.x + 1) / 2) * W;
      const bly = ((1 - v.y) / 2) * H;
      v.copy(cylPoint(card.lon + halfLon, botY)).project(this.camera);
      const brx = ((v.x + 1) / 2) * W;

      // vertical cull: hide labels whose card has scrolled off-screen
      if (o <= 0.01 || ty < -70 || bly > H + 70) {
        card.lblTop.style.opacity = "0";
        card.lblBot.style.opacity = "0";
        continue;
      }
      card.lblTop.style.opacity = o.toFixed(2);
      card.lblBot.style.opacity = o.toFixed(2);
      // integer-snap so the mono type stays crisp
      card.lblTop.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty - 20)}px)`;
      card.lblBot.style.transform = `translate(${Math.round(blx)}px, ${Math.round(bly + 8)}px)`;
      card.lblBot.style.width = `${Math.max(0, Math.round(brx - blx))}px`;
    }
  }

  /* ───────────────────────── input ───────────────────── */

  private bindInput() {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      if (!this.interactive) return;
      this.dragging = true;
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
      this.downX = this.lastX = e.clientX;
      this.downY = this.lastY = e.clientY;
      this.downT = performance.now();
      this.moved = 0;
      this.velYaw = 0;
      this.velY = 0;
      this.lastInteract = performance.now();
    });
    el.addEventListener("pointermove", (e) => {
      this.pointerNdc.set(
        (e.clientX / el.clientWidth) * 2 - 1,
        -(e.clientY / el.clientHeight) * 2 + 1
      );
      this.needRaycast = true;
      if (!this.dragging || !this.interactive) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      const kx = 1.7 / el.clientWidth;
      const ky = 9.5 / el.clientHeight; // world units per full-height drag
      const dyaw = dx * kx;
      const dpan = dy * ky;
      this.targetYaw += dyaw;
      this.targetY = clamp(this.targetY + dpan, -Y_LIMIT, Y_LIMIT);
      this.velYaw = this.velYaw * 0.7 + dyaw * 0.3;
      this.velY = this.velY * 0.7 + dpan * 0.3;
      this.lastInteract = performance.now();
    });
    const up = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      el.classList.remove("dragging");
      const dt = performance.now() - this.downT;
      const dist = Math.abs(e.clientX - this.downX) + Math.abs(e.clientY - this.downY);
      if (dist < 8 && dt < 350) {
        this.velYaw = 0;
        this.velY = 0;
        const hit = this.raycastAt(e.clientX, e.clientY);
        if (hit && hit.m.kind === "moment" && !hit.dimmed) this.onCardClick?.(hit.m);
      }
      this.lastInteract = performance.now();
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", () => {
      this.dragging = false;
      el.classList.remove("dragging");
    });
    // phantom-style: the wheel pans the wall vertically, shift/trackpad-x rotates
    el.addEventListener("wheel", (e) => {
      if (!this.interactive) return;
      e.preventDefault();
      this.targetY = clamp(this.targetY + e.deltaY * 0.004, -Y_LIMIT, Y_LIMIT);
      this.targetYaw += e.deltaX * 0.0004;
      this.lastWheelAt = this.lastInteract = performance.now();
    }, { passive: false });
  }

  private raycastAt(cx: number, cy: number): Card | null {
    const ndc = new THREE.Vector2(
      (cx / this.canvas.clientWidth) * 2 - 1,
      -(cy / this.canvas.clientHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.cards.map((c) => c.mesh), false);
    return hits.length ? (hits[0].object.userData.card as Card) : null;
  }

  /* ───────────────────────── frame loop ───────────────────── */

  start() {
    if (!this.webglOk) return;
    gsap.ticker.add(this.tick);
  }

  private tick = (_t: number, deltaMS: number) => {
    if (this.paused) return;
    const dt = Math.min(deltaMS / 1000, 0.05);

    if (!this.dragging && this.interactive) {
      this.targetYaw += this.velYaw;
      this.targetY = clamp(this.targetY + this.velY, -Y_LIMIT, Y_LIMIT);
      const decay = Math.pow(0.93, dt * 60);
      this.velYaw *= decay;
      this.velY *= decay;
      // row snap: once the vertical axis settles, ease to the nearest row so
      // the lattice always comes to rest composed
      if (Math.abs(this.velY) < 0.0016 && performance.now() - this.lastInteract > 280) {
        const nearest = clamp(Math.round(this.targetY / ROW_PITCH) * ROW_PITCH, -ROW_PITCH, ROW_PITCH);
        this.targetY += (nearest - this.targetY) * (1 - Math.exp(-dt * 3.6));
      }
      // idle drift
      if (!REDUCED && performance.now() - this.lastInteract > 3500)
        this.targetYaw += 0.024 * dt;
    }

    const k = 1 - Math.exp(-dt * 5.2);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.yPan += (this.targetY - this.yPan) * k;
    this.camera.rotation.set(0, -this.yaw, 0);
    this.camera.position.set(0, this.yPan, 0);

    // grab-to-overview: the wall recedes while you hold or scroll, then eases
    // back in on release — you navigate from a pulled-back vantage
    const grabActive = this.interactive && !REDUCED &&
      (this.dragging || performance.now() - this.lastWheelAt < 200);
    const fovTarget = grabActive ? GRAB_FOV / BASE_FOV : 1;
    const rate = fovTarget > this.fovScale ? 8 : 4; // pull back fast, settle gentle
    this.fovScale += (fovTarget - this.fovScale) * (1 - Math.exp(-dt * rate));
    const f = BASE_FOV * this.fovScale;
    if (Math.abs(f - this.camera.fov) > 0.004) {
      this.camera.fov = f;
      this.camera.updateProjectionMatrix();
    }

    // which chapter faces the camera (drives the chrome readout)
    if (++this.frame % 12 === 0) {
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      let best = -2;
      let bestCard: Card | null = null;
      for (const c of this.cards) {
        if (c.m.kind !== "chapter") continue;
        const d = this.facing(c, fwd);
        if (d > best) { best = d; bestCard = c; }
      }
      if (bestCard && bestCard.m.id !== this.frontChapter) {
        this.frontChapter = bestCard.m.id;
        this.onChapterChange?.(bestCard.m);
      }
    }

    // hover raycast (desktop, not while dragging)
    if (this.needRaycast && !this.dragging && this.interactive) {
      this.needRaycast = false;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.cards.map((c) => c.mesh), false);
      const card = hits.length ? (hits[0].object.userData.card as Card) : null;
      const target = card && card.m.kind === "moment" && !card.dimmed ? card : null;
      if (target !== this.hovered) {
        if (this.hovered) {
          gsap.to(this.hovered.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "power3.out" });
          gsap.to(this.hovered.mesh.material.uniforms.uZoom, { value: BASE_ZOOM, duration: 0.5, ease: "power3.out" });
          gsap.to(this.hovered.mesh.material.uniforms.uExpose, { value: 1, duration: 0.5, ease: "power3.out" });
          this.hovered.lblTop?.classList.remove("hot");
        }
        this.hovered = target;
        if (target) {
          // the card lifts AND its window opens — two layers of depth
          gsap.to(target.mesh.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.45, ease: "power3.out" });
          gsap.to(target.mesh.material.uniforms.uZoom, { value: 1.06, duration: 0.5, ease: "power3.out" });
          gsap.to(target.mesh.material.uniforms.uExpose, { value: 1.05, duration: 0.5, ease: "power3.out" });
          target.lblTop?.classList.add("hot");
          this.canvas.classList.add("over");
        } else {
          this.canvas.classList.remove("over");
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.updateCards();
  };

  /* ───────────────────────── public api ───────────────────── */

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.fov = BASE_FOV * this.fovScale;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) this.labelLayer.classList.add("hidden");
    else this.labelLayer.classList.remove("hidden");
    for (const c of this.cards) {
      if (!c.video) continue;
      if (p) c.video.pause();
      else c.video.play().catch(() => {});
    }
  }

  setInteractive(b: boolean) {
    this.interactive = b;
  }

  introReveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.yaw = -0.55;
    this.targetYaw = 0;
    this.lastInteract = performance.now();
    const fwd = new THREE.Vector3(0, 0, -1);
    const sorted = [...this.cards].sort(
      (a, b) => this.facing(b, fwd) - this.facing(a, fwd)
    );
    sorted.forEach((card, i) => {
      gsap.to(card.mesh.material.uniforms.uOpacity, {
        value: 1, duration: 1.1, delay: 0.12 + i * 0.025, ease: "power2.out",
      });
      gsap.to(card.mesh.scale, {
        x: 1, y: 1, z: 1, duration: 1.2, delay: 0.12 + i * 0.025, ease: "power3.out",
      });
    });
    gsap.delayedCall(0.7, () => this.setInteractive(true));
    gsap.to(this.gridMat, { opacity: 0.09, duration: 2.4, delay: 0.5, ease: "power2.inOut" });
    gsap.to(this.gridGlyphMat, { opacity: 0.045, duration: 2.4, delay: 0.5, ease: "power2.inOut" });
  }

  setFilter(tag: string | null) {
    for (const card of this.cards) {
      if (card.m.kind === "chapter") continue;
      const match = !tag || card.m.tags.includes(tag);
      card.dimmed = !match;
      gsap.to(card.mesh.material.uniforms.uDim, {
        value: match ? 0 : 0.85, duration: 0.6, ease: "power2.out",
      });
    }
  }

  /** the duplicated instance of a moment closest to the current view direction */
  private nearestCard(id: string): Card | null {
    const cards = this.byId.get(id);
    if (!cards?.length) return null;
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    let best = cards[0];
    let bd = -2;
    for (const c of cards) {
      const d = this.facing(c, fwd);
      if (d > bd) { bd = d; best = c; }
    }
    return best;
  }

  private coverDistance(card: Card): number {
    const t = Math.tan((BASE_FOV * DEG) / 2);
    const dH = card.h / 2 / t;
    const dW = card.w / 2 / (t * this.camera.aspect);
    // tighter margin: curved patches bow away from the camera at their edges
    return Math.min(dH, dW) * 0.94;
  }

  /** where the card mesh must sit to exactly cover the viewport */
  private coverPosition(card: Card): THREE.Vector3 {
    const d = this.coverDistance(card);
    return new THREE.Vector3(
      Math.sin(card.lon) * d,
      card.yPos,
      -Math.cos(card.lon) * d
    );
  }

  /** center the card, upgrade its texture, fly it into the camera. */
  flyTo(id: string): Promise<void> {
    const card = this.nearestCard(id);
    if (!card) return Promise.resolve();
    this.flyCard = card;
    this.setInteractive(false);
    this.labelLayer.classList.add("hidden");
    this.canvas.classList.remove("over");
    this.velYaw = this.velY = 0;

    // upgrade texture for the close-up (photo cards only)
    if (!card.m.liveVideo && card.m.cover) {
      this.texLoader.load(img(card.m.cover, "page"), (t) => {
        t.colorSpace = THREE.NoColorSpace;
        card.mesh.material.uniforms.map.value = t;
      });
    }

    const desiredYaw = this.yaw + wrapPi(card.lon - this.yaw);
    const u = card.mesh.material.uniforms;
    const dur = REDUCED ? 0.01 : 1;
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(this, {
        yaw: desiredYaw, targetYaw: desiredYaw,
        yPan: card.yPos, targetY: card.yPos,
        duration: dur * 0.55, ease: "power3.inOut",
      });
      const target = this.coverPosition(card);
      tl.to(card.mesh.position, {
        x: target.x, y: target.y, z: target.z,
        duration: dur * 0.7, ease: "expo.inOut",
      }, dur * 0.3);
      tl.to(card.mesh.scale, { x: 1, y: 1, z: 1, duration: dur * 0.3 }, dur * 0.3);
      // open the window to the full photo so it matches the DOM hero
      tl.to(u.uZoom, { value: 1, duration: dur * 0.7, ease: "expo.inOut" }, dur * 0.3);
      tl.to(u.uParallax.value, { x: 0, y: 0, duration: dur * 0.5, ease: "power2.out" }, 0);
      tl.to(u.uExpose, { value: 1, duration: dur * 0.4 }, 0);
      tl.to(u.uEdge, { value: 0, duration: dur * 0.4 }, 0);
      for (const other of this.cards) {
        if (other === card) continue;
        tl.to(other.mesh.material.uniforms.uOpacity, {
          value: 0, duration: dur * 0.45, ease: "power2.in",
        }, dur * 0.25);
      }
      tl.to(this.gridMat, { opacity: 0, duration: dur * 0.4 }, dur * 0.25);
      tl.to(this.gridGlyphMat, { opacity: 0, duration: dur * 0.4 }, dur * 0.25);
    });
  }

  /** instantly set up the covered pose (used before closing a deeplinked page) */
  resetFly(id: string) {
    const card = this.nearestCard(id);
    if (!card) return;
    this.flyCard = card;
    this.setInteractive(false);
    this.labelLayer.classList.add("hidden");
    this.yaw = this.targetYaw = this.yaw + wrapPi(card.lon - this.yaw);
    this.yPan = this.targetY = card.yPos;
    this.fovScale = 1;
    this.camera.fov = BASE_FOV;
    this.camera.updateProjectionMatrix();
    this.camera.rotation.set(0, -this.yaw, 0);
    this.camera.position.set(0, this.yPan, 0);
    card.mesh.position.copy(this.coverPosition(card));
    const u = card.mesh.material.uniforms;
    u.uOpacity.value = 1;
    u.uZoom.value = 1;
    (u.uParallax.value as THREE.Vector2).set(0, 0);
    u.uExpose.value = 1;
    u.uEdge.value = 0;
    for (const other of this.cards) {
      other.mesh.scale.setScalar(1);
      if (other !== card) other.mesh.material.uniforms.uOpacity.value = 0;
    }
    card.mesh.scale.setScalar(1);
    this.gridOpacity(0);
    this.revealed = true;
    this.renderer.render(this.scene, this.camera);
  }

  /** reverse of flyTo — card returns to its slot, siblings fade back. */
  flyBack(id: string): Promise<void> {
    const card = this.flyCard ?? this.nearestCard(id);
    if (!card) return Promise.resolve();
    this.flyCard = null;
    const dur = REDUCED ? 0.01 : 0.9;
    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.labelLayer.classList.remove("hidden");
          this.setInteractive(true);
          resolve();
        },
      });
      tl.to(card.mesh.position, {
        x: card.basePos.x, y: card.basePos.y, z: card.basePos.z,
        duration: dur * 0.75, ease: "expo.inOut",
      });
      // close the window back to its resting zoom (parallax resumes on the loop)
      tl.to(card.mesh.material.uniforms.uZoom, {
        value: card.m.kind === "chapter" ? 1 : BASE_ZOOM,
        duration: dur * 0.6, ease: "expo.inOut",
      }, 0);
      for (const other of this.cards) {
        if (other === card) continue;
        tl.to(other.mesh.material.uniforms.uOpacity, {
          value: 1, duration: dur * 0.5, ease: "power2.out",
        }, dur * 0.35);
      }
      tl.to(this.gridMat, { opacity: 0.09, duration: dur * 0.5 }, dur * 0.35);
      tl.to(this.gridGlyphMat, { opacity: 0.045, duration: dur * 0.5 }, dur * 0.35);
    });
  }
}
