/** Milestone — a typographic beat (an age, a count). Big number counts up; any
 *  trailing chips (e.g. gelato flavours) stagger in. Frameless. */
import { gsap } from "gsap";
import { frame } from "./frame";
import type { Artifact } from "../../data/artifacts";

type MilestoneSpec = Extract<Artifact, { kind: "milestone" }>;

const REDUCED = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function buildMilestone(host: HTMLElement, spec: MilestoneSpec) {
  host.innerHTML = frame({
    bare: true,
    body: `<div class="ms">
      ${spec.kicker ? `<div class="ms-kicker">${spec.kicker}</div>` : ""}
      <div class="ms-big"><span class="ms-num">${spec.big}</span>${spec.ord ? `<span class="ms-ord">${spec.ord}</span>` : ""}</div>
      ${spec.sub ? `<div class="ms-sub">${spec.sub}</div>` : ""}
      ${spec.note ? `<div class="ms-note">${spec.note}</div>` : ""}
      ${spec.flavours ? `<div class="ms-flavours">${spec.flavours.map((f) => `<span class="ms-flav">${f}</span>`).join("")}</div>` : ""}
    </div>`,
  });
  host.classList.add("art-ready");
}

export function playMilestone(host: HTMLElement, spec: MilestoneSpec) {
  const num = host.querySelector<HTMLElement>(".ms-num");
  const flav = [...host.querySelectorAll<HTMLElement>(".ms-flav")];

  if (REDUCED) {
    flav.forEach((f) => f.classList.add("in"));
    return;
  }

  const tl = gsap.timeline();
  tl.from(host.querySelector(".ms-big"), { opacity: 0, scale: 0.82, duration: 0.7, ease: "back.out(1.6)" }, 0);
  // count up whole-number milestones
  if (num && /^\d+$/.test(spec.big)) {
    const o = { v: 0 };
    tl.to(o, { v: parseInt(spec.big, 10), duration: 1.0, ease: "power2.out", onUpdate: () => (num.textContent = String(Math.round(o.v))) }, 0);
  }
  flav.forEach((f, i) => tl.to(f, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0.85 + i * 0.12));
}
