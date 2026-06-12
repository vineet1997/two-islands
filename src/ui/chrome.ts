/** DOM chrome over the canvas: logo, sound, masthead + clocks, nav, view toggle, filter. */
import { FILTER_TAGS } from "../data/moments";

export interface ChromeHandlers {
  onNav(target: "moments" | "story"): void;
  onView(mode: "sphere" | "list"): void;
  onFilter(tag: string | null): void;
  onSound(): boolean; // toggles, returns new on-state
}

export interface Chrome {
  setView(mode: "sphere" | "list"): void;
  setNav(target: "moments" | "story"): void;
}

export function buildChrome(root: HTMLElement, h: ChromeHandlers): Chrome {
  root.innerHTML = `
    <a class="chrome-corner logo" href="#">TWO<br/>ISLANDS<small>®</small></a>
    <button class="chrome-corner sound-toggle" aria-pressed="false">SOUND [OFF]</button>
    <div class="chrome-corner masthead">
      <div class="tagline">A travelogue of salt, spice and monsoon light — Maldives × Sri Lanka, June 2026.</div>
      <div class="clocks">
        <div class="row"><span class="place">● MALÉ, MV</span><span class="t1"></span><span>GMT+5</span></div>
        <div class="row dim"><span class="place">○ GALLE, LK</span><span class="t2"></span><span>GMT+5:30</span></div>
      </div>
      <a class="say-hello" href="mailto:vineetagarwal98@gmail.com">Say Hello</a>
    </div>
    <div class="navpill">
      <button data-nav="moments" class="active">Moments</button>
      <button data-nav="story">Story</button>
    </div>
    <div class="view-toggle">
      <button data-view="sphere" class="active" title="Sphere view" aria-label="Sphere view">◉</button>
      <button data-view="list" title="List view" aria-label="List view">☰</button>
    </div>
    <div class="filter-wrap">
      <div class="filter-chips">
        <button data-tag="" class="active">ALL</button>
        ${FILTER_TAGS.map((t) => `<button data-tag="${t}">${t}</button>`).join("")}
      </div>
      <button class="filter-btn">Filter</button>
    </div>
  `;

  // clocks
  const t1 = root.querySelector<HTMLElement>(".t1")!;
  const t2 = root.querySelector<HTMLElement>(".t2")!;
  const fmt = (offsetMin: number) => {
    const d = new Date(Date.now() + (offsetMin + new Date().getTimezoneOffset()) * 60000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const tickClocks = () => {
    t1.textContent = fmt(300);
    t2.textContent = fmt(330);
  };
  tickClocks();
  setInterval(tickClocks, 30000);

  // sound
  const soundBtn = root.querySelector<HTMLButtonElement>(".sound-toggle")!;
  soundBtn.addEventListener("click", () => {
    const on = h.onSound();
    soundBtn.textContent = on ? "SOUND [ON]" : "SOUND [OFF]";
    soundBtn.setAttribute("aria-pressed", String(on));
  });

  // nav
  const navBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-nav]")];
  navBtns.forEach((b) =>
    b.addEventListener("click", () => h.onNav(b.dataset.nav as "moments" | "story"))
  );

  // view toggle
  const viewBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-view]")];
  viewBtns.forEach((b) =>
    b.addEventListener("click", () => h.onView(b.dataset.view as "sphere" | "list"))
  );

  // filter
  const wrap = root.querySelector<HTMLElement>(".filter-wrap")!;
  const filterBtn = root.querySelector<HTMLButtonElement>(".filter-btn")!;
  filterBtn.addEventListener("click", () => wrap.classList.toggle("open"));
  const chipBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-tag]")];
  chipBtns.forEach((b) =>
    b.addEventListener("click", () => {
      chipBtns.forEach((x) => x.classList.toggle("active", x === b));
      h.onFilter(b.dataset.tag || null);
    })
  );

  return {
    setView(mode) {
      viewBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === mode));
    },
    setNav(target) {
      navBtns.forEach((b) => b.classList.toggle("active", b.dataset.nav === target));
    },
  };
}
