/**
 * Reticle cursor — a custom pointer for the gallery wall. It idles as a small
 * ring, contracts while you grab-drag, and blooms into the hovered card's accent
 * with a "View" label over something clickable. Mouse only; touch keeps native.
 */
import { gsap } from "gsap";
import type { Moment } from "../data/moments";

export interface Cursor {
  setHover(m: Moment | null): void;
  destroy(): void;
}

export function mountCursor(canvas: HTMLElement): Cursor {
  const fine = typeof matchMedia !== "undefined" && matchMedia("(pointer: fine)").matches;
  if (!fine) return { setHover() {}, destroy() {} };

  const el = document.createElement("div");
  el.className = "reticle";
  el.dataset.mode = "hidden";
  el.innerHTML = `<span class="reticle-ring"></span><span class="reticle-dot"></span><span class="reticle-label">View</span>`;
  document.body.appendChild(el);
  document.body.classList.add("cursor-on");

  const xTo = gsap.quickTo(el, "x", { duration: 0.15, ease: "power3" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.15, ease: "power3" });

  let over = false, dragging = false, hover: Moment | null = null;
  const update = () => {
    el.dataset.mode = !over ? "hidden" : dragging ? "grabbing" : hover ? "open" : "grab";
    if (hover) el.style.setProperty("--cur", hover.accent);
  };

  const onMove = (e: PointerEvent) => {
    xTo(e.clientX);
    yTo(e.clientY);
    const o = e.target === canvas;
    if (o !== over) { over = o; update(); }
  };
  const onDown = (e: PointerEvent) => { if (e.target === canvas) { dragging = true; update(); } };
  const onUp = () => { if (dragging) { dragging = false; update(); } };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  return {
    setHover(m) { hover = m; update(); },
    destroy() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.remove();
      document.body.classList.remove("cursor-on");
    },
  };
}
