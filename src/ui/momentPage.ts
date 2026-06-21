/** Moment detail pages — DOM, Lenis smooth scroll, IO reveals. */
import { gsap } from "gsap";
import Lenis from "lenis";
import type { Moment, Block } from "../data/moments";
import { nextMoment } from "../data/moments";
import type { Artifact } from "../data/artifacts";
import { PHOTOS, img } from "../data/photos";
import { mountArtifacts, artifactSlot } from "./artifacts";
import { mountPageMotion } from "./pageMotion";
import { COVER_OVERSCAN } from "../gallery/GalleryScene";
import lqipRaw from "../data/lqip.json";

const lqip = lqipRaw as Record<string, string>;
const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = () => document.getElementById("page-root")!;

let pageEl: HTMLElement | null = null;
let lenis: Lenis | null = null;
let rafCb: ((t: number) => void) | null = null;
let io: IntersectionObserver | null = null;
let openId: string | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;
let motionTeardown: (() => void) | null = null;

export const pageIsOpen = () => pageEl !== null;
export const currentPageId = () => openId;

function ph(id: string, size: "page" | "hero" = "page", overlay = ""): string {
  const photo = PHOTOS[id];
  const fx = photo ? photo.focal[0] * 100 : 50;
  const fy = photo ? photo.focal[1] * 100 : 50;
  return `<div class="ph" style="background-image:url('${lqip[id] ?? ""}')">
    <img loading="lazy" decoding="async" src="${img(id, size)}" alt="${photo?.alt ?? ""}"
      style="object-position:${fx}% ${fy}%" onload="this.classList.add('ld')" />${overlay}
  </div>`;
}

function noteHtml(b: Extract<Block, { type: "note" }>): string {
  const v = b.variant ?? "aside";
  const k = b.kicker ? `<span class="note-k">${b.kicker}</span>` : "";
  if (v === "stat") {
    const items = (b.stats ?? [])
      .map((s) => `<div class="stat"><span class="stat-v" data-count>${s.value}</span><span class="stat-l">${s.label}</span></div>`)
      .join("");
    return `<div class="blk-note note-stat rv">${k}<div class="stat-row">${items}</div>${b.text ? `<p class="stat-note">${b.text}</p>` : ""}</div>`;
  }
  if (v === "quote") {
    return `<blockquote class="blk-note note-quote rv"><p>${b.text}</p>${b.kicker ? `<cite class="note-k">${b.kicker}</cite>` : ""}</blockquote>`;
  }
  if (v === "voice") {
    // a second hand — Priya's own words, set apart as a quoted letter
    return `<blockquote class="blk-note note-voice rv"><p>${b.text}</p>${b.kicker ? `<cite class="note-k">${b.kicker}</cite>` : ""}</blockquote>`;
  }
  if (v === "footnote") {
    return `<div class="blk-note note-footnote rv"><span class="fn-mark">†</span><p>${b.text}</p></div>`;
  }
  return `<aside class="blk-note note-aside rv">${k}<p>${b.text}</p></aside>`;
}

function blockHtml(b: Block, arts: Artifact[]): string {
  switch (b.type) {
    case "text":
      return `<div class="blk-text rv">${b.text}</div>`;
    case "full":
      // native frames show uncropped, so they skip the cover-crop parallax
      return `<figure class="blk-full${b.wide ? " wide" : ""}${b.native ? " native" : ""} rv"${b.native ? "" : " data-parallax"}>${ph(b.img)}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    case "diptych":
      return `<figure class="blk-diptych rv">${ph(b.imgs[0])}${ph(b.imgs[1])}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    case "food": {
      // a badged plate gets a frame wrapper so the sticker can overhang the photo
      // edge (the .ph itself clips its contents)
      const inner = b.badge
        ? `<div class="food-frame">${ph(b.img)}<span class="food-badge"><span class="fb-stars">★★★★★</span><span class="fb-label">${b.badge}</span></span></div>`
        : ph(b.img);
      return `<figure class="blk-food rv">${inner}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    }
    case "video":
      return `<figure class="blk-video${b.wide ? " wide" : ""} rv"><div class="ph">
        <video muted loop playsinline preload="metadata" poster="${b.poster}" src="${b.src}"></video>
      </div>${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    case "note":
      return noteHtml(b);
    case "spread": {
      const note = `<div class="spread-note"><span class="note-k">${b.kicker}</span><p>${b.text}</p></div>`;
      if (b.overlay)
        return `<figure class="blk-spread spread-overlay rv" data-parallax>${ph(b.img)}<figcaption class="spread-note">${`<span class="note-k">${b.kicker}</span><p>${b.text}</p>`}</figcaption></figure>`;
      return `<div class="blk-spread spread-beside${b.flip ? " flip" : ""} rv">
        <figure class="spread-ph" data-parallax>${ph(b.img)}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>
        ${note}</div>`;
    }
    case "artifact":
      arts.push(b.art);
      return artifactSlot(arts.length - 1);
  }
}

export async function openPage(m: Moment, opts: { seamless: boolean }): Promise<void> {
  const next = nextMoment(m.id);
  const el = document.createElement("div");
  el.className = "page";
  el.style.setProperty("--pm-accent", m.accent);

  // the hero honours the photo's focal point so wide-screen crops keep faces
  const heroFocal = PHOTOS[m.cover]
    ? `object-position:${PHOTOS[m.cover].focal[0] * 100}% ${PHOTOS[m.cover].focal[1] * 100}%`
    : "";
  const heroMedia = m.liveVideo
    ? `<video autoplay muted loop playsinline poster="/video/${m.cover}-poster.jpg" src="/video/${m.cover}-page.mp4"></video>`
    : `<img src="${img(m.cover, "hero")}" alt="${PHOTOS[m.cover]?.alt ?? ""}" style="${heroFocal}" />`;

  // collect artifact specs as the body is built, then mount them after insert
  const arts: Artifact[] = [];
  const bodyHtml = (m.blocks ?? []).map((b) => blockHtml(b, arts)).join("");

  el.innerHTML = `
    <div class="page-inner">
      <button class="page-close">Close</button>
      <div class="page-hero">
        ${heroMedia}
        <div class="scrim"></div>
        <div class="page-head">
          <h1>${m.title}</h1>
          <div class="page-meta">
            <span class="chapter">${m.chapter === "both" ? "Maldives × Sri Lanka" : m.chapter}</span>
            ${m.tags.map((t) => `<span class="chip">${t}</span>`).join("")}
            <span class="date">${m.dateLabel}</span>
          </div>
        </div>
      </div>
      <div class="page-body">
        ${m.intro ? `<div class="blk-intro rv">${m.intro}</div>` : ""}
        ${bodyHtml}
      </div>
      <footer class="page-next">
        <a href="#/m/${next.id}">
          <img src="${img(next.cover, "tile")}" alt="" />
          <div><div class="nm">NEXT MOMENT</div><div class="nt">${next.title}</div></div>
        </a>
      </footer>
    </div>
  `;

  // wait for the hero before showing so the WebGL→DOM swap is invisible
  if (opts.seamless && !m.liveVideo) {
    const heroImg = el.querySelector<HTMLImageElement>(".page-hero img")!;
    await Promise.race([
      heroImg.decode().catch(() => {}),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  }

  root().appendChild(el);
  pageEl = el;
  openId = m.id;

  if (opts.seamless) {
    // fast fade hands off from the WebGL card to the DOM hero
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power1.out" });
    // FLIP: the hero enters at the flown card's overscanned size (so they match
    // through the crossfade), then settles to its natural cover once the page is
    // opaque — turning the old ~6% scale "snap" into a smooth glide.
    const heroEl = el.querySelector<HTMLElement>(".page-hero img, .page-hero video");
    if (heroEl && !REDUCED) {
      gsap.fromTo(heroEl,
        { scale: 1 / COVER_OVERSCAN },
        { scale: 1, duration: 0.55, ease: "power3.out", delay: 0.16 });
    }
  } else {
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" });
  }

  // head intro
  gsap.fromTo(
    el.querySelectorAll(".page-head h1, .page-head .page-meta, .page-close"),
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, delay: 0.15, ease: "power3.out" }
  );

  // mark eagerly-loaded images
  el.querySelectorAll<HTMLImageElement>("img").forEach((i) => {
    if (i.complete && i.naturalWidth > 0) i.classList.add("ld");
  });

  el.querySelector<HTMLButtonElement>(".page-close")!.addEventListener("click", () => {
    location.hash = "";
  });
  escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") location.hash = "";
  };
  window.addEventListener("keydown", escHandler);

  // Defer the heavy body wiring until the hero has painted, so the build can't
  // stutter the open — smooth scroll, the reveal observer, artifact builds and
  // the scroll-linked motion all start a frame after the page is on screen.
  const initBody = () => {
    if (pageEl !== el) return; // closed (or replaced) before this ran

    // smooth scroll (wheel only; touch stays native)
    const inner = el.querySelector<HTMLElement>(".page-inner")!;
    lenis = new Lenis({ wrapper: el, content: inner, duration: 1.15 });
    rafCb = (t: number) => lenis?.raf(t * 1000);
    gsap.ticker.add(rafCb);

    // reveals + lazy video play
    io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            const v = en.target.querySelector("video");
            if (v) { v.play().catch(() => {}); (v as HTMLVideoElement).classList.add("ld"); }
          } else {
            const v = en.target.querySelector("video");
            if (v) (v as HTMLVideoElement).pause();
          }
        }
      },
      { root: el, threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    el.querySelectorAll(".rv").forEach((n) => io!.observe(n));

    // build + lazily animate any artifacts (maps, milestones…) on scroll-in
    mountArtifacts(el, arts);

    // image parallax + stat count-ups (scroll-linked; cleaned up on close)
    motionTeardown = mountPageMotion(el, lenis);
  };
  requestAnimationFrame(() => requestAnimationFrame(initBody));
}

export async function closePage(opts: { instant: boolean }): Promise<void> {
  if (!pageEl) return;
  const el = pageEl;
  pageEl = null;
  openId = null;
  if (escHandler) window.removeEventListener("keydown", escHandler);
  io?.disconnect();
  io = null;
  motionTeardown?.();
  motionTeardown = null;
  if (rafCb) gsap.ticker.remove(rafCb);
  rafCb = null;
  lenis?.destroy();
  lenis = null;
  if (opts.instant) {
    el.remove();
  } else {
    await gsap.to(el, { opacity: 0, duration: 0.35, ease: "power2.in" }).then();
    el.remove();
  }
}
