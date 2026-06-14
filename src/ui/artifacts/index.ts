/**
 * Artifact harness — mounts every `[data-artifact]` placeholder a page renders,
 * dispatches to the right module by `kind`, and plays its animation once it
 * scrolls into view. One place to add reduced-motion, lazy-play, lifecycle.
 */
import type { Artifact } from "../../data/artifacts";
import { buildMap, playMap } from "./map";
import { buildMilestone, playMilestone } from "./milestone";
import { buildReel, playReel } from "./reel";
import { buildReveal, playReveal } from "./reveal";
import { buildPlan, playPlan } from "./plan";

type Mod = { build: (host: HTMLElement, spec: any) => void; play: (host: HTMLElement, spec: any) => void };

const REGISTRY: Record<Artifact["kind"], Mod> = {
  map: { build: buildMap, play: playMap },
  milestone: { build: buildMilestone, play: playMilestone },
  reel: { build: buildReel, play: playReel },
  reveal: { build: buildReveal, play: playReveal },
  plan: { build: buildPlan, play: playPlan },
};

/** placeholder HTML a page drops where an artifact should appear */
export const artifactSlot = (index: number) => `<div class="rv" data-artifact="${index}"></div>`;

/** build + lazily play every artifact under `scope`, given the ordered specs */
export function mountArtifacts(scope: HTMLElement, specs: Artifact[]) {
  scope.querySelectorAll<HTMLElement>("[data-artifact]").forEach((host) => {
    const spec = specs[Number(host.dataset.artifact)];
    if (!spec) return;
    const mod = REGISTRY[spec.kind];
    if (!mod) return;
    mod.build(host, spec);
    let played = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !played) {
            played = true;
            mod.play(host, spec);
            io.disconnect();
          }
        }
      },
      { root: scope, threshold: 0.3 }
    );
    io.observe(host);
  });
}
