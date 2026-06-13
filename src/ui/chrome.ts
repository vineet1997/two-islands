/** DOM chrome over the canvas: logo, masthead, sound toggle, view toggle, filter. */
import { FILTER_TAGS } from "../data/moments";

export interface ChromeHandlers {
  onView(mode: "sphere" | "list"): void;
  onFilter(tag: string | null): void;
  onSound(): boolean; // toggles, returns new on-state
}

export interface Chrome {
  setView(mode: "sphere" | "list"): void;
}

export function buildChrome(root: HTMLElement, h: ChromeHandlers): Chrome {
  root.innerHTML = `
    <a class="chrome-corner logo" href="#">TWO<br/>ISLANDS<small>®</small></a>
    <div class="chrome-corner masthead">
      <div class="tagline">A travelogue of salt, spice and monsoon light — Maldives × Sri Lanka, June 2026.</div>
      <button class="sound-toggle" aria-pressed="true">SOUND [ON]</button>
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

  // sound
  const soundBtn = root.querySelector<HTMLButtonElement>(".sound-toggle")!;
  soundBtn.addEventListener("click", () => {
    const on = h.onSound();
    soundBtn.textContent = on ? "SOUND [ON]" : "SOUND [OFF]";
    soundBtn.setAttribute("aria-pressed", String(on));
  });

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
  };
}
