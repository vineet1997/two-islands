/** Shared shell for every artifact — the instrument frame, so the kit reads
 *  as one set. `bare` drops the border for typographic artifacts. */

export interface FrameOpts {
  eyebrow?: string; // small mono label, top-left
  index?: string; // top-right slot (coords, count…)
  body: string; // inner HTML
  caption?: string;
  stageClass?: string;
  bare?: boolean;
  accent?: string; // overrides --art-accent for this artifact
}

export function frame(o: FrameOpts): string {
  const style = o.accent ? ` style="--art-accent:${o.accent}"` : "";
  const head =
    o.eyebrow || o.index
      ? `<div class="art-head">
          <span class="art-eyebrow">${o.eyebrow ?? ""}</span>
          <span class="art-index">${o.index ?? ""}</span>
        </div>`
      : "";
  const cap = o.caption ? `<figcaption class="art-cap">${o.caption}</figcaption>` : "";
  return `<figure class="art${o.bare ? " art-bare" : ""}"${style}>
    ${head}
    <div class="art-stage ${o.stageClass ?? ""}">${o.body}</div>
    ${cap}
  </figure>`;
}
