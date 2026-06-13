import "./styles.css";
import * as THREE from "three";
import { inject } from "@vercel/analytics";
import { Gallery } from "./gallery/GalleryScene";
import { MOMENTS, byId } from "./data/moments";
import { buildChrome } from "./ui/chrome";
import { createPreloader } from "./ui/preloader";
import { createAmbient } from "./ui/audio";
import { buildListView } from "./ui/listView";
import { openPage, closePage, pageIsOpen, currentPageId } from "./ui/momentPage";

// Initialize Vercel Web Analytics
inject();

const canvas = document.getElementById("gl") as HTMLCanvasElement;
const labelLayer = document.getElementById("labels")!;
const chromeRoot = document.getElementById("chrome")!;
const listRoot = document.getElementById("list-view")!;

const preloader = createPreloader();
const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => preloader.progress(loaded, total);
const texturesLoaded = new Promise<void>((resolve) => {
  manager.onLoad = () => resolve();
});

const gallery = new Gallery(canvas, labelLayer, manager, MOMENTS);
const ambient = createAmbient(true); // on by default
// autoplay is gated behind a user gesture — start the surf on first interaction
window.addEventListener("pointerdown", () => ambient.unlock(), { once: true });
window.addEventListener("keydown", () => ambient.unlock(), { once: true });
const list = buildListView(listRoot);

let pendingFlyId: string | null = null;
let routing = false;

const chrome = buildChrome(chromeRoot, {
  onView(mode) {
    chrome.setView(mode);
    if (mode === "list") list.show();
    else list.hide();
  },
  onFilter(tag) {
    gallery.setFilter(tag);
  },
  onSound() {
    return ambient.toggle();
  },
});

gallery.onCardClick = (m) => {
  pendingFlyId = m.id;
  location.hash = `#/m/${m.id}`;
};

gallery.onChapterChange = (m) => {
  chrome.setChapter({
    idx: m.id === "ch-maldives" ? "CH. 01" : "CH. 02",
    name: m.title,
    sub: `${m.dateLabel} · ${m.sub ?? ""}`,
    accent: m.accent,
  });
};

const parseHash = (): string | null => {
  const match = location.hash.match(/^#\/m\/([\w-]+)/);
  return match ? match[1] : null;
};

async function route() {
  if (routing) return;
  routing = true;
  try {
    const id = parseHash();
    const m = id ? byId(id) : undefined;

    if (m && m.kind === "moment") {
      if (pageIsOpen()) {
        if (currentPageId() === m.id) return;
        // page → page (next-moment nav): quick swap
        await closePage({ instant: true });
        await openPage(m, { seamless: false });
        return;
      }
      if (pendingFlyId === m.id && gallery.webglOk) {
        pendingFlyId = null;
        await gallery.flyTo(m.id);
        await openPage(m, { seamless: true });
        gallery.setPaused(true);
      } else {
        // deeplink or list-view open
        pendingFlyId = null;
        await openPage(m, { seamless: false });
        if (gallery.webglOk) gallery.setPaused(true);
      }
    } else {
      if (pageIsOpen()) {
        const closedId = currentPageId()!;
        if (gallery.webglOk) {
          gallery.setPaused(false);
          gallery.resetFly(closedId);
          await closePage({ instant: true });
          await gallery.flyBack(closedId);
        } else {
          await closePage({ instant: false });
        }
      }
    }
  } finally {
    routing = false;
  }
}

window.addEventListener("hashchange", route);

async function boot() {
  if (!gallery.webglOk) {
    // no WebGL: list view becomes the site
    document.getElementById("preloader")!.style.display = "none";
    list.show();
    chrome.setView("list");
    route();
    return;
  }
  gallery.start();
  await texturesLoaded;
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  await preloader.done();
  const deepId = parseHash();
  if (deepId && byId(deepId)?.kind === "moment") {
    await route();
  } else {
    gallery.introReveal();
  }
}

boot();
