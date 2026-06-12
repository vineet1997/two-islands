/** Moment detail pages — DOM, Lenis smooth scroll, IO reveals. */
import { gsap } from "gsap";
import Lenis from "lenis";
import type { Moment, Block } from "../data/moments";
import { nextMoment } from "../data/moments";
import { PHOTOS, img } from "../data/photos";
import lqipRaw from "../data/lqip.json";

const lqip = lqipRaw as Record<string, string>;
const root = () => document.getElementById("page-root")!;

let pageEl: HTMLElement | null = null;
let lenis: Lenis | null = null;
let rafCb: ((t: number) => void) | null = null;
let io: IntersectionObserver | null = null;
let openId: string | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;

export const pageIsOpen = () => pageEl !== null;
export const currentPageId = () => openId;

function ph(id: string, size: "page" | "hero" = "page"): string {
  const photo = PHOTOS[id];
  const fx = photo ? photo.focal[0] * 100 : 50;
  const fy = photo ? photo.focal[1] * 100 : 50;
  return `<div class="ph" style="background-image:url('${lqip[id] ?? ""}')">
    <img loading="lazy" decoding="async" src="${img(id, size)}" alt="${photo?.alt ?? ""}"
      style="object-position:${fx}% ${fy}%" onload="this.classList.add('ld')" />
  </div>`;
}

function blockHtml(b: Block): string {
  switch (b.type) {
    case "text":
      return `<div class="blk-text rv">${b.text}</div>`;
    case "full":
      return `<figure class="blk-full rv">${ph(b.img)}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    case "diptych":
      return `<figure class="blk-diptych rv">${ph(b.imgs[0])}${ph(b.imgs[1])}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    case "food":
      return `<figure class="blk-food rv">${ph(b.img)}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
    case "video":
      return `<figure class="blk-video rv"><div class="ph">
        <video muted loop playsinline preload="metadata" poster="${b.poster}" src="${b.src}"></video>
      </div>${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}</figure>`;
  }
}

export async function openPage(m: Moment, opts: { seamless: boolean }): Promise<void> {
  const next = nextMoment(m.id);
  const el = document.createElement("div");
  el.className = "page";
  el.style.setProperty("--pm-accent", m.accent);

  const heroMedia = m.liveVideo
    ? `<video autoplay muted loop playsinline poster="/video/${m.cover}-poster.jpg" src="/video/${m.cover}-page.mp4"></video>`
    : `<img src="${img(m.cover, "hero")}" alt="${PHOTOS[m.cover]?.alt ?? ""}" />`;

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
        ${(m.blocks ?? []).map(blockHtml).join("")}
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

  if (!opts.seamless) {
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" });
  }

  // head intro
  gsap.fromTo(
    el.querySelectorAll(".page-head h1, .page-head .page-meta, .page-close"),
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, delay: 0.15, ease: "power3.out" }
  );

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
}

export async function closePage(opts: { instant: boolean }): Promise<void> {
  if (!pageEl) return;
  const el = pageEl;
  pageEl = null;
  openId = null;
  if (escHandler) window.removeEventListener("keydown", escHandler);
  io?.disconnect();
  io = null;
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
