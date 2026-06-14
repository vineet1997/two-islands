/**
 * Moment-page motion — subtle, scroll-linked life: images parallax within their
 * frames, and stat figures count up when they arrive. Lenis drives the scroll,
 * so we just listen. Returns a teardown; respects reduced motion.
 */
import { gsap } from "gsap";
import type Lenis from "lenis";

const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const AMOUNT = 22; // px of parallax travel through the viewport

function countUp(el: HTMLElement) {
  const m = (el.textContent || "").trim().match(/^(\D*)([\d,]+)(.*)$/);
  if (!m) return;
  const pre = m[1], suf = m[3];
  const target = parseInt(m[2].replace(/,/g, ""), 10);
  const o = { n: 0 };
  gsap.to(o, {
    n: target, duration: 1.1, ease: "power2.out",
    onUpdate: () => (el.textContent = pre + Math.round(o.n).toLocaleString() + suf),
  });
}

export function mountPageMotion(scope: HTMLElement, lenis: Lenis | null): () => void {
  if (REDUCED) return () => {};

  // stat count-ups — once each, on scroll-in
  const counts = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
        counts.unobserve(e.target);
      }
    },
    { root: scope, threshold: 0.5 }
  );
  scope.querySelectorAll(".note-stat").forEach((el) => counts.observe(el));

  // parallax — nudge each tagged image as it crosses the viewport
  const imgs = [...scope.querySelectorAll<HTMLElement>("[data-parallax] img")];
  const update = () => {
    const h = window.innerHeight || scope.clientHeight || 1;
    for (const im of imgs) {
      const r = im.getBoundingClientRect();
      const p = (r.top + r.height / 2 - h / 2) / h; // −0.5 → 0.5 through the frame
      im.style.transform = `translate3d(0, ${(-p * AMOUNT).toFixed(1)}px, 0) scale(1.14)`;
    }
  };
  update();
  lenis?.on("scroll", update);
  window.addEventListener("resize", update);

  return () => {
    counts.disconnect();
    lenis?.off("scroll", update);
    window.removeEventListener("resize", update);
  };
}
