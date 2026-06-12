import { gsap } from "gsap";

export interface Preloader {
  progress(loaded: number, total: number): void;
  done(): Promise<void>;
}

export function createPreloader(): Preloader {
  const el = document.getElementById("preloader")!;
  const count = el.querySelector<HTMLElement>(".pre-count")!;
  const bar = el.querySelector<HTMLElement>(".pre-bar span")!;
  let pct = 0;

  return {
    progress(loaded, total) {
      pct = Math.max(pct, Math.round((loaded / Math.max(total, 1)) * 100));
      count.textContent = `${pct}%`;
      bar.style.width = `${pct}%`;
    },
    done() {
      return new Promise((resolve) => {
        count.textContent = "100%";
        bar.style.width = "100%";
        gsap.timeline({ onComplete: resolve })
          .to(el, { opacity: 0, duration: 0.7, ease: "power2.inOut", delay: 0.25 })
          .set(el, { display: "none" });
      });
    },
  };
}
