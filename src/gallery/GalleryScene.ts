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
  { lat: 26 * DEG, count: 7, offset: 0.5 },
  { lat: 0 * DEG, count: 8, offset: 0 },
  { lat: -26 * DEG, count: 7, offset: 0.5 },
];
const PITCH_LIMIT = 28 * DEG;
const sizeFor = (kind: string) => (kind === "moment" ? 3.7 : 3.4);
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
  gl_FragColor = vec4(col, alpha * uOpacity);
  if (gl_FragColor.a < 0.003) discard;
}`;

const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Card {
  m: Moment;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  basePos: THREE.Vector3;
  lon: number;
  lat: number;
  w: number;
  h: number;
  lblTop?: HTMLElement;
  lblBot?: HTMLElement;
  dimmed: boolean;
  video?: HTMLVideoElement;
}

export class Gallery {
  onCardClick?: (m: Moment) => void;

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
    this.renderer.setClearColor(0x0b0e0d, 1);
    this.camera = new THREE.PerspectiveCamera(65, 1, 0.05, 60);
    this.camera.rotation.order = "YXZ";

    this.buildCards();
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
      const h = sizeFor(m.kind);
      const w = h * ratio;

      const pos = new THREE.Vector3(
        RADIUS * Math.cos(lat) * Math.sin(lon),
        RADIUS * Math.sin(lat),
        -RADIUS * Math.cos(lat) * Math.cos(lon)
      );

      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        uniforms: {
          map: { value: this.placeholderTexture() },
          uOpacity: { value: 0 },
          uDim: { value: 0 },
          uSize: { value: new THREE.Vector2(w, h) },
          uRadius: { value: 0.09 },
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.lookAt(0, 0, 0);
      mesh.scale.setScalar(0.92);
      this.scene.add(mesh);

      const card: Card = { m, mesh, basePos: pos.clone(), lon, lat, w, h, dimmed: false };
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
          t.anisotropy = 4;
          mat.uniforms.map.value = t;
        });
      }
      this.buildLabel(card);
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
    const W = 768, H = 1024;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#11161a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(232,230,223,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    // dotted motif
    ctx.fillStyle = "rgba(232,230,223,0.3)";
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 8; x++)
        ctx.fillRect(W - 220 + x * 22, 70 + y * 22, 3, 3);
    // accent line
    ctx.fillStyle = m.accent;
    ctx.fillRect(70, H * 0.36, 64, 4);
    // title stacked
    ctx.fillStyle = "#e8e6df";
    ctx.font = "700 108px 'Space Grotesk', sans-serif";
    ctx.textBaseline = "top";
    const words = m.title.split(" ");
    words.forEach((wrd, i) => ctx.fillText(wrd, 64, H * 0.40 + i * 112));
    ctx.font = "400 30px 'Space Mono', monospace";
    ctx.fillStyle = "rgba(232,230,223,0.6)";
    ctx.fillText(m.sub ?? "", 70, H * 0.40 + words.length * 112 + 36);
    ctx.fillText(m.dateLabel, 70, H - 110);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    m.id && (t.name = m.id);
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
    top.innerHTML = `<div class="lbl-title">${m.title}</div>`;
    const bot = document.createElement("div");
    bot.className = "lbl";
    const chips = m.kind === "moment"
      ? m.tags.map((t) => `<span class="chip" style="border-color:${m.accent}55;color:${m.accent}">${t}</span>`).join("")
      : `<span class="chip">MOOD</span>`;
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
      let o = clamp((cos - 0.45) / 0.3, 0, 1);
      o *= (card.mesh.material.uniforms.uOpacity.value as number);
      if (card.dimmed) o *= 0.15;
      if (o <= 0.01) {
        card.lblTop.style.opacity = "0";
        card.lblBot.style.opacity = "0";
        continue;
      }
      const s = card.mesh.scale.x;
      // top-left corner, above card
      v.set((-card.w / 2) * s, (card.h / 2) * s, 0).applyMatrix4(card.mesh.matrixWorld).project(this.camera);
      const tx = ((v.x + 1) / 2) * W;
      const ty = ((1 - v.y) / 2) * H;
      // bottom-left corner
      v.set((-card.w / 2) * s, (-card.h / 2) * s, 0).applyMatrix4(card.mesh.matrixWorld).project(this.camera);
      const bx = ((v.x + 1) / 2) * W;
      const by = ((1 - v.y) / 2) * H;
      card.lblTop.style.opacity = String(o);
      card.lblBot.style.opacity = String(o);
      card.lblTop.style.transform = `translate(${tx.toFixed(1)}px, ${(ty - 18).toFixed(1)}px)`;
      card.lblBot.style.transform = `translate(${bx.toFixed(1)}px, ${(by + 5).toFixed(1)}px)`;
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
      const kx = 2.2 / el.clientWidth;
      const ky = 1.7 / el.clientHeight;
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
      this.targetYaw += d * 0.00042;
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
        this.targetYaw += 0.038 * dt;
    }

    const k = 1 - Math.exp(-dt * 5.2);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.camera.rotation.set(this.pitch, -this.yaw, 0);

    // hover raycast (desktop, not while dragging)
    if (this.needRaycast && !this.dragging && this.interactive) {
      this.needRaycast = false;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.cards.map((c) => c.mesh), false);
      const card = hits.length ? (hits[0].object.userData.card as Card) : null;
      const target = card && card.m.kind === "moment" && !card.dimmed ? card : null;
      if (target !== this.hovered) {
        if (this.hovered)
          gsap.to(this.hovered.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "power3.out" });
        this.hovered = target;
        if (target) {
          gsap.to(target.mesh.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.45, ease: "power3.out" });
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
    this.camera.fov = 65;
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
    const vFov = (this.camera.fov * DEG) / 1; // fov in deg → rad below
    const t = Math.tan((this.camera.fov * DEG) / 2);
    const dH = card.h / 2 / t;
    const dW = card.w / 2 / (t * this.camera.aspect);
    return Math.min(dH, dW) * 0.985;
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
    this.camera.rotation.set(this.pitch, -this.yaw, 0);
    const dir = card.basePos.clone().normalize();
    card.mesh.position.copy(dir.multiplyScalar(this.coverDistance(card)));
    card.mesh.material.uniforms.uOpacity.value = 1;
    for (const other of this.cards) {
      other.mesh.scale.setScalar(1);
      if (other !== card) other.mesh.material.uniforms.uOpacity.value = 0;
    }
    card.mesh.scale.setScalar(1);
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
          value: other.dimmed ? 1 : 1, duration: dur * 0.5, ease: "power2.out",
        }, dur * 0.35);
      }
    });
  }
}
