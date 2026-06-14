/**
 * The artifact kit — a small, shared vocabulary of story objects that any
 * moment page can drop in. Every artifact renders inside the same instrument
 * frame and animates itself on scroll-in, so the set always feels of a piece.
 *
 * Add a new artifact by: extending this union, writing a build/play module in
 * ui/artifacts/, and registering it in ui/artifacts/index.ts.
 */
import type { Region } from "./geo";
export type { Region } from "./geo";

export type Via = "car" | "flight" | "boat";

export interface MapLeg {
  via: Via;
  flight?: string;
  carrier?: string;
  dur: string;
  dist: string;
}

export interface MapStop {
  id: string;
  name: string;
  code?: string; // short cap (DEL, CMB…) — falls back to name
  sub?: string; // second line under the name
  lat: number;
  lon: number;
  side?: "left" | "right"; // which side the label sits (route mode)
  leg?: MapLeg; // the leg that arrived here (route mode)
}

export type Artifact =
  | { kind: "map"; mode: "place"; region: Region; label?: string; caption?: string; stop: MapStop }
  | { kind: "map"; mode: "route"; region: Region; label?: string; caption?: string; stops: MapStop[] }
  | {
      kind: "milestone";
      label?: string;
      kicker?: string;
      big: string;
      ord?: string;
      sub?: string;
      note?: string;
      flavours?: [string, string];
    }
  | { kind: "reel"; label?: string; caption?: string } // side-scroll journey cinematic
  // a clickable card: a brief that expands to reveal the full story (HTML body)
  | { kind: "reveal"; label?: string; title: string; brief: string; body: string }
  // an illustrated walking plan: landmarks on a stylised town map, joined by a route
  | {
      kind: "plan";
      label?: string;
      caption?: string;
      spots: { x: number; y: number; name: string; icon: PlanIcon; side?: "left" | "right" | "top" | "bottom"; you?: boolean }[];
      route?: number[]; // indices into spots, the dashed path order
    };

export type PlanIcon = "boat" | "flag" | "gov" | "fish" | "mosque" | "trees" | "pin";
