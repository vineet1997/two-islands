/**
 * Reveal — a clickable card that shows a brief, then expands to the full story
 * on tap. Pure CSS accordion (grid-template-rows 0fr→1fr), so the open/close is
 * smooth without measuring. Entrance fade is handled by the .rv host.
 */
import type { Artifact } from "../../data/artifacts";

type RevealSpec = Extract<Artifact, { kind: "reveal" }>;

export function buildReveal(host: HTMLElement, spec: RevealSpec) {
  host.innerHTML = `
    <div class="art-reveal">
      <button class="reveal-head" type="button" aria-expanded="false">
        ${spec.label ? `<span class="reveal-label">${spec.label}</span>` : ""}
        <span class="reveal-title">${spec.title}</span>
        <span class="reveal-brief">${spec.brief}</span>
        <span class="reveal-toggle" aria-hidden="true"></span>
      </button>
      <div class="reveal-bodywrap"><div class="reveal-body"><div class="reveal-inner">${spec.body}</div></div></div>
    </div>`;
  const root = host.querySelector<HTMLElement>(".art-reveal")!;
  const btn = host.querySelector<HTMLButtonElement>(".reveal-head")!;
  btn.addEventListener("click", () => {
    const open = root.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  host.classList.add("art-ready");
}

// entrance is the host .rv fade; nothing scroll-driven to play
export function playReveal(_host: HTMLElement, _spec: RevealSpec) {}
