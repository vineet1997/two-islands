/** Semantic list view — accessibility fallback and alternate browse mode. */
import { gsap } from "gsap";
import { CLICKABLE } from "../data/moments";
import { img } from "../data/photos";

export interface ListView {
  show(): void;
  hide(): void;
  visible(): boolean;
}

export function buildListView(el: HTMLElement): ListView {
  el.innerHTML = `<ul>
    ${CLICKABLE.map(
      (m, i) => `<li><a href="#/m/${m.id}">
        <span class="idx">${String(i + 1).padStart(2, "0")}</span>
        <img loading="lazy" src="${img(m.cover, "tile")}" alt="" />
        <span class="lt">${m.title}</span>
        <span class="lm">${m.dateLabel}<br/>${m.tags.join(" · ")}</span>
      </a></li>`
    ).join("")}
  </ul>`;

  let vis = false;
  return {
    show() {
      if (vis) return;
      vis = true;
      el.hidden = false;
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    },
    hide() {
      if (!vis) return;
      vis = false;
      gsap.to(el, {
        opacity: 0, duration: 0.3, ease: "power2.in",
        onComplete: () => { el.hidden = true; },
      });
    },
    visible: () => vis,
  };
}
