/**
 * The spherical gallery — cards mounted on the inside of a sphere, camera at
 * the center. Drag rotates the view with Lenis-style exponential easing and
 * release inertia. Click flies the card into the camera (the page transition).
 */
import * as THREE from "three";
import { gsap } from "gsap";
import type { Moment } from "../data/moments";
import { img } from "../data/photos";
import { PHOTOS } from "../data/photos";

const DEG = Math.PI / 180;
const RADIUS = 10;
/** the 22-card set wraps twice around the sphere for phantom-style density */
const INSTANCES = 2;
const ROWS = [
  { lat: 23 * DEG, count: 7, offset: 0.5 },
  { lat: 0 * DEG, count: 8, offset: 0 },
  { lat: -23 * DEG, count: 7, offset: 0.5 },
];
const PITCH_LIMIT = 25 * DEG;
/** Cards are curved patches of the sphere with a fixed ANGULAR height, so they
 *  sit inside the grid cells exactly — at every screen position and viewport.
 *  (Flat planes spill across the curved grid lines near the screen edges.) */
const D_LAT = 17 * DEG;
const BASE_FOV = 50;

const sphPoint = (r: number, lat: number, lon: number) =>
  new THREE.Vector3(
    r * Math.cos(lat) * Math.sin(lon),
    r * Math.sin(lat),
    -r * Math.cos(lat) * Math.cos(lon)
  );

/** spherical patch centered on (latC, lonC); vertices local to the center */
function patchGeometry(latC: number, lonC: number, dLat: number, dLon: number) {
  const SEG = 12;
  const center = sphPoint(RADIUS, latC, lonC);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= SEG; iy++) {
    const lat = latC + dLat / 2 - (iy / SEG) * dLat;
    for (let ix = 0; ix <= SEG; ix++) {
      const lon = lonC - dLon / 2 + (ix / SEG) * dLon;
      const p = sphPoint(RADIUS, lat, lon).sub(center);
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
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

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
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 b = 0.5 * uSize - vec2(uRadius);
  vec2 d = abs(p) - b;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uRadius;
  float aa = fwidth(dist) * 1.4;
  float alpha = 1.0 - smoothstep(-aa, aa, dist);
  vec4 tex = texture2D(map, vUv);
  float g = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(tex.rgb, vec3(g * 0.55), uDim);
  col *= 1.0 - uDim * 0.45;
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
  lat: number;
  w: number; // arc width/height — used for corner radius + cover math
  h: number;
  cornerTL: THREE.Vector3; // local-space corners for label projection
  cornerBL: THREE.Vector3;
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
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private velYaw = 0;
  private velPitch = 0;

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
  private prevYaw = 0;
  private prevPitch = 0;
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
      const row = ROWS[m.slot.row];
      const lon =
        ((m.slot.col + row.offset) / row.count) * Math.PI + inst * Math.PI;
      const lat = row.lat;
      const photo = m.cover ? PHOTOS[m.cover] : null;
      const ratio = m.kind === "chapter" ? 0.75 : photo ? photo.ratio : 0.75;
      // angular box sized to keep the photo's aspect in arc length
      const dLat = D_LAT;
      const dLon = (ratio * dLat) / Math.cos(lat);
      const h = RADIUS * dLat;
      const w = RADIUS * dLon * Math.cos(lat);

      const { geo, center } = patchGeometry(lat, lon, dLat, dLon);
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
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center);
      mesh.scale.setScalar(0.92);
      this.scene.add(mesh);

      const card: Card = {
        m, mesh, basePos: center.clone(), lon, lat, w, h, dimmed: false,
        cornerTL: sphPoint(RADIUS, lat + dLat / 2, lon - dLon / 2).sub(center),
        cornerBL: sphPoint(RADIUS, lat - dLat / 2, lon - dLon / 2).sub(center),
      };
      mesh.userData.card = card;
      this.cards.push(card);
      if (!this.byId.has(m.id)) this.byId.set(m.id, []);
      this.byId.get(m.id)!.push(card);

      if (m.kind === "chapter") {
        mat.uniforms.map.value = this.chapterTexture(m);
      } else if (m.liveVideo) {
        // poster first; upgrade to a live VideoTexture once it can play
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

  /** hairline lattice behind the cards — the engineered armature phantom has */
  private gridMat!: THREE.LineBasicMaterial;
  private buildGrid() {
    this.gridMat = new THREE.LineBasicMaterial({
      color: 0xe8e6df, transparent: true, opacity: 0,
    });
    const group = new THREE.Group();
    const R = RADIUS + 0.45;
    const circle = (latDeg: number) => {
      const lat = latDeg * DEG;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 160; i++) {
        const lon = (i / 160) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          R * Math.cos(lat) * Math.sin(lon),
          R * Math.sin(lat),
          -R * Math.cos(lat) * Math.cos(lon)
        ));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.gridMat));
    };
    // latitude rules at the cell boundaries between rows
    [-34.5, -11.5, 11.5, 34.5].forEach(circle);
    // longitude rules at equator cell boundaries
    for (let k = 0; k < 16; k++) {
      const lon = ((k + 0.5) / 16) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const lat = (-37 + (i / 24) * 74) * DEG;
        pts.push(new THREE.Vector3(
          R * Math.cos(lat) * Math.sin(lon),
          R * Math.sin(lat),
          -R * Math.cos(lat) * Math.cos(lon)
        ));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.gridMat));
    }
    this.scene.add(group);
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

    const INK = "#14181a";
    const ML = 118; // left margin
    // index, top-left, mono
    ctx.textBaseline = "top";
    ctx.font = "400 46px 'Space Mono', monospace";
    ctx.fillStyle = "rgba(20,24,26,0.55)";
    ctx.fillText(m.id === "ch-maldives" ? "CH. 01" : "CH. 02", ML, 116);
    // dot matrix, top-right
    ctx.fillStyle = "rgba(20,24,26,0.3)";
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 9; x++)
        ctx.fillRect(W - 118 - 8 * 42 + x * 42, 116 + y * 42, 6, 6);
    // accent rule
    ctx.fillStyle = m.accent;
    ctx.fillRect(ML, H * 0.40 - 64, 150, 8);
    // huge stacked title
    ctx.fillStyle = INK;
    ctx.font = "700 252px 'Space Grotesk', sans-serif";
    const words = m.title.split(" ");
    words.forEach((wrd, i) => ctx.fillText(wrd, ML - 10, H * 0.40 + i * 252));
    // coordinates under the title
    ctx.font = "400 52px 'Space Mono', monospace";
    ctx.fillStyle = "rgba(20,24,26,0.6)";
    ctx.fillText(m.sub ?? "", ML, H * 0.40 + words.length * 252 + 88);
    // footer: date left, index right
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
    bot.innerHTML = `<div class="lbl-meta">${chips}<span class="date">${m.dateLabel}</span></div>`;
    this.labelLayer.append(top, bot);
    card.lblTop = top;
    card.lblBot = bot;
  }

  private syncLabels() {
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    const v = new THREE.Vector3();
    for (const card of this.cards) {
      if (!card.lblTop || !card.lblBot) continue;
      const dir = card.basePos.clone().normalize();
      const cos = dir.dot(fwd);
      let o = clamp((cos - 0.55) / 0.28, 0, 1);
      o *= (card.mesh.material.uniforms.uOpacity.value as number);
      if (card.m.kind === "mood") o *= 0.6;
      if (card.dimmed) o *= 0.15;
      if (o <= 0.01) {
        card.lblTop.style.opacity = "0";
        card.lblBot.style.opacity = "0";
        continue;
      }
      const s = card.mesh.scale.x;
      // top-left corner, above card
      v.copy(card.cornerTL).multiplyScalar(s).add(card.mesh.position).project(this.camera);
      const tx = ((v.x + 1) / 2) * W;
      const ty = ((1 - v.y) / 2) * H;
      // bottom-left corner
      v.copy(card.cornerBL).multiplyScalar(s).add(card.mesh.position).project(this.camera);
      const bx = ((v.x + 1) / 2) * W;
      const by = ((1 - v.y) / 2) * H;
      card.lblTop.style.opacity = o.toFixed(2);
      card.lblBot.style.opacity = o.toFixed(2);
      // integer-snap so the mono type stays crisp
      card.lblTop.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty - 20)}px)`;
      card.lblBot.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by + 7)}px)`;
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
      this.velPitch = 0;
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
      const ky = 1.3 / el.clientHeight;
      const dyaw = dx * kx;
      const dpitch = dy * ky;
      this.targetYaw += dyaw;
      this.targetPitch = clamp(this.targetPitch + dpitch, -PITCH_LIMIT, PITCH_LIMIT);
      this.velYaw = this.velYaw * 0.7 + dyaw * 0.3;
      this.velPitch = this.velPitch * 0.7 + dpitch * 0.3;
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
        this.velPitch = 0;
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
    el.addEventListener("wheel", (e) => {
      if (!this.interactive) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.targetYaw += d * 0.00032;
      this.lastInteract = performance.now();
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
      this.targetPitch = clamp(this.targetPitch + this.velPitch, -PITCH_LIMIT, PITCH_LIMIT);
      const decay = Math.pow(0.93, dt * 60);
      this.velYaw *= decay;
      this.velPitch *= decay;
      // idle drift
      if (!REDUCED && performance.now() - this.lastInteract > 3500)
        this.targetYaw += 0.024 * dt;
    }

    const k = 1 - Math.exp(-dt * 5.2);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.camera.rotation.set(this.pitch, -this.yaw, 0);

    // velocity-driven dolly breath: the wall eases back while you move it
    const speed =
      (Math.abs(this.yaw - this.prevYaw) + Math.abs(this.pitch - this.prevPitch) * 1.5) /
      Math.max(dt, 0.001);
    this.prevYaw = this.yaw;
    this.prevPitch = this.pitch;
    const fovTarget = this.interactive && !REDUCED
      ? clamp(1 + speed * 0.16, 1, 1.085)
      : 1;
    this.fovScale += (fovTarget - this.fovScale) * (1 - Math.exp(-dt * 4.5));
    const f = BASE_FOV * this.fovScale;
    if (Math.abs(f - this.camera.fov) > 0.005) {
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
        const d = c.basePos.clone().normalize().dot(fwd);
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
          this.hovered.lblTop?.classList.remove("hot");
        }
        this.hovered = target;
        if (target) {
          gsap.to(target.mesh.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.45, ease: "power3.out" });
          target.lblTop?.classList.add("hot");
          this.canvas.classList.add("over");
        } else {
          this.canvas.classList.remove("over");
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.syncLabels();
  };

  /* ───────────────────────── public api ───────────────────── */

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const aspect = w / h;
    this.camera.fov = BASE_FOV * this.fovScale;
    this.camera.aspect = aspect;
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
      (a, b) => b.basePos.clone().normalize().dot(fwd) - a.basePos.clone().normalize().dot(fwd)
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
    gsap.to(this.gridMat, { opacity: 0.07, duration: 2.4, delay: 0.5, ease: "power2.inOut" });
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
      const d = c.basePos.clone().normalize().dot(fwd);
      if (d > bd) { bd = d; best = c; }
    }
    return best;
  }

  private coverDistance(card: Card): number {
    // always computed at the resting FOV — the dolly breath settles to 1 during transitions
    const t = Math.tan((BASE_FOV * DEG) / 2);
    const dH = card.h / 2 / t;
    const dW = card.w / 2 / (t * this.camera.aspect);
    // tighter margin: curved patches bow away from the camera at their edges
    return Math.min(dH, dW) * 0.94;
  }

  /** center the card, upgrade its texture, fly it into the camera. */
  flyTo(id: string): Promise<void> {
    const card = this.nearestCard(id);
    if (!card) return Promise.resolve();
    this.flyCard = card;
    this.setInteractive(false);
    this.labelLayer.classList.add("hidden");
    this.canvas.classList.remove("over");
    this.velYaw = this.velPitch = 0;

    // upgrade texture for the close-up (photo cards only)
    if (!card.m.liveVideo && card.m.cover) {
      this.texLoader.load(img(card.m.cover, "page"), (t) => {
        t.colorSpace = THREE.NoColorSpace;
        card.mesh.material.uniforms.map.value = t;
      });
    }

    const desiredYaw = this.yaw + wrapPi(-card.lon - this.yaw);
    const dur = REDUCED ? 0.01 : 1;
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(this, {
        yaw: desiredYaw, targetYaw: desiredYaw,
        pitch: card.lat, targetPitch: card.lat,
        duration: dur * 0.55, ease: "power3.inOut",
      });
      const d = () => this.coverDistance(card);
      const dir = card.basePos.clone().normalize();
      tl.to(card.mesh.position, {
        x: () => dir.x * d(), y: () => dir.y * d(), z: () => dir.z * d(),
        duration: dur * 0.7, ease: "expo.inOut",
      }, dur * 0.3);
      tl.to(card.mesh.scale, { x: 1, y: 1, z: 1, duration: dur * 0.3 }, dur * 0.3);
      for (const other of this.cards) {
        if (other === card) continue;
        tl.to(other.mesh.material.uniforms.uOpacity, {
          value: 0, duration: dur * 0.45, ease: "power2.in",
        }, dur * 0.25);
      }
      tl.to(this.gridMat, { opacity: 0, duration: dur * 0.4 }, dur * 0.25);
    });
  }

  /** instantly set up the covered pose (used before closing a deeplinked page) */
  resetFly(id: string) {
    const card = this.nearestCard(id);
    if (!card) return;
    this.flyCard = card;
    this.setInteractive(false);
    this.labelLayer.classList.add("hidden");
    this.yaw = this.targetYaw = this.yaw + wrapPi(-card.lon - this.yaw);
    this.pitch = this.targetPitch = card.lat;
    this.fovScale = 1;
    this.camera.fov = BASE_FOV;
    this.camera.updateProjectionMatrix();
    this.camera.rotation.set(this.pitch, -this.yaw, 0);
    const dir = card.basePos.clone().normalize();
    card.mesh.position.copy(dir.multiplyScalar(this.coverDistance(card)));
    card.mesh.material.uniforms.uOpacity.value = 1;
    for (const other of this.cards) {
      other.mesh.scale.setScalar(1);
      if (other !== card) other.mesh.material.uniforms.uOpacity.value = 0;
    }
    card.mesh.scale.setScalar(1);
    this.gridMat.opacity = 0;
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
      for (const other of this.cards) {
        if (other === card) continue;
        tl.to(other.mesh.material.uniforms.uOpacity, {
          value: 1, duration: dur * 0.5, ease: "power2.out",
        }, dur * 0.35);
      }
      tl.to(this.gridMat, { opacity: 0.07, duration: dur * 0.5 }, dur * 0.35);
    });
  }
}
