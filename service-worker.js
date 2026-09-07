const CACHE_NAME = "central-jogos-offline-v17";

const WINDOWS_DISCOVERY_VIDEO_NAMES = [
  "01-desktop", "02-desktop", "03-desktop", "04-desktop", "05-start",
  "06-start", "07-start", "08-explorer", "09-explorer", "10-explorer",
  "11-explorer", "12-settings", "13-desktop", "14-settings", "15-settings",
  "16-settings", "17-explorer", "18-explorer", "19-explorer", "20-explorer",
  "21-explorer", "22-explorer", "23-browser", "24-browser", "25-explorer",
  "26-explorer", "27-explorer", "28-explorer", "29-explorer", "30-desktop"
];

const WINDOWS_DISCOVERY_MEDIA = [
  ...["desktop", "start", "explorer", "browser", "settings"].map((name) => `./assets/windows-discovery/posters/${name}.webp`),
  ...WINDOWS_DISCOVERY_VIDEO_NAMES.map((name) => `./assets/windows-discovery/videos/${name}.webm`)
];

const PRECACHE_PATHS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./side-game.css",
  "./support-game.css",
  "./memory-game.css",
  "./crossword-game.css",
  "./desafio-ti-game.css",
  "./windows-mission-game.css",
  "./windows-discovery-game.css",
  "./google-slides-course.css",
  "./google-sheets-course.css",
  "./js/app.js",
  "./js/credits-data.js",
  "./js/data.js",
  "./js/side-game.mjs",
  "./js/side-game-core.mjs",
  "./js/side-game-data.mjs",
  "./js/support-game.mjs",
  "./js/support-game-core.mjs",
  "./js/support-game-data.mjs",
  "./js/memory-game.mjs",
  "./js/memory-game-core.mjs",
  "./js/memory-game-data.mjs",
  "./js/crossword-game.mjs",
  "./js/crossword-core.mjs",
  "./js/desafio-ti-game.mjs",
  "./js/desafio-ti-core.mjs",
  "./js/desafio-ti-data.mjs",
  "./js/windows-mission-game.mjs",
  "./js/windows-mission-core.mjs",
  "./js/windows-mission-data.mjs",
  "./js/windows-discovery-game.mjs",
  "./js/windows-discovery-core.mjs",
  "./js/windows-discovery-data.mjs",
  "./js/google-slides-course-game.mjs",
  "./js/google-slides-course-core.mjs",
  "./js/google-slides-course-data.mjs",
  "./js/google-sheets-course-game.mjs",
  "./js/google-sheets-course-core.mjs",
  "./js/google-sheets-course-data.mjs",
  "./vendor/three/three.module.min.js",
  "./vendor/three/three.core.min.js",
  "./assets/windows-mission/tecnico-em-acao-card.png",
  "./assets/windows-discovery/scene-desktop.png",
  "./assets/google-slides/google-slides.ico",
  "./assets/google-slides/material-symbols-outlined.ttf",
  "./assets/google-sheets/google-sheets.ico",
  "./assets/google-sheets/material-symbols-outlined.ttf",
  "./assets/google-sheets/roboto-400.ttf",
  "./assets/google-sheets/roboto-500.ttf",
  "./assets/google-sheets/roboto-700.ttf",
  "./assets/google-sheets/chromebook-keyboard.webp",
  "./assets/google-sheets/chromebook-touchpad.webp",
  "./assets/fonts/atkinson-hyperlegible-400-latin.woff2",
  "./assets/fonts/atkinson-hyperlegible-700-latin.woff2",
  "./assets/fonts/fredoka-500-700-latin.woff2",
  "./assets/items/memoria-ram.jpg",
  "./assets/side-game/icons/apps.svg",
  "./assets/side-game/icons/arrow_downward.svg",
  "./assets/side-game/icons/arrow_forward.svg",
  "./assets/side-game/icons/check_circle.svg",
  "./assets/side-game/icons/close.svg",
  "./assets/side-game/icons/description.svg",
  "./assets/side-game/icons/folder.svg",
  "./assets/side-game/icons/fullscreen.svg",
  "./assets/side-game/icons/language.svg",
  "./assets/side-game/icons/picture_as_pdf.svg",
  "./assets/side-game/icons/play_arrow.svg",
  "./assets/side-game/icons/restart_alt.svg",
  "./assets/side-game/icons/timer.svg",
  "./assets/side-game/icons/touch_app.svg",
  "./assets/side-game/icons/visibility.svg",
  "./assets/side-game/icons/wifi.svg",
  ...WINDOWS_DISCOVERY_MEDIA
];

const scopedUrls = () => PRECACHE_PATHS.map((path) => new URL(path, self.registration.scope).href);

const prepareOfflineCache = async (progressPort) => {
  const cache = await caches.open(CACHE_NAME);
  const urls = scopedUrls();
  const failures = [];
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const cached = await cache.match(url, { ignoreSearch: true });
    if (!cached) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        await cache.put(url, response);
      } catch (error) {
        failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    progressPort?.postMessage({ type: "progress", loaded: index + 1, total: urls.length });
  }
  if (failures.length) throw new Error(`Falha em ${failures.length} arquivo(s): ${failures[0]}`);
};

self.addEventListener("install", (event) => {
  event.waitUntil(prepareOfflineCache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  event.waitUntil((async () => {
    try {
      await prepareOfflineCache(event.ports[0]);
      event.ports[0]?.postMessage({ type: "done", ok: true, cache: CACHE_NAME });
    } catch (error) {
      event.ports[0]?.postMessage({ type: "done", ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      const cachedPage = await caches.match(new URL("./index.html", self.registration.scope).href, { ignoreSearch: true });
      if (cachedPage) return cachedPage;
      return fetch(event.request);
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return new Response("Conteúdo indisponível sem conexão.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
