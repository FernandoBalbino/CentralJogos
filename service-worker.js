const CACHE_NAME = "central-jogos-offline-v31";

const GAME_OFFLINE_PATHS = {
  "windows-mission": ["./windows-mission-game.css", "./js/windows-mission-game.mjs", "./js/windows-mission-core.mjs", "./js/windows-mission-data.mjs", "./vendor/three/three.module.min.js", "./vendor/three/three.core.min.js"],
  "oficina-pc": ["./oficina-pc.css", "./js/oficina-pc.mjs", "./js/oficina-pc-core.mjs", "./js/oficina-pc-data.mjs", "./js/oficina-pc-scene.mjs", "./js/oficina-pc-models.mjs", "./js/oficina-pc-camera.mjs", "./js/oficina-pc-interactions.mjs", "./vendor/three/three.module.min.js", "./vendor/three/three.core.min.js", "./vendor/three/controls/OrbitControls.js"]
};

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

const WINDOWS_FILE_ORGANIZER_ASSETS = [
  "./assets/windows-file-organizer/icons/pdf.svg",
  "./assets/windows-file-organizer/icons/word.svg",
  "./assets/windows-file-organizer/icons/text.svg",
  "./assets/windows-file-organizer/icons/excel.svg",
  "./assets/windows-file-organizer/icons/powerpoint.svg",
  "./assets/windows-file-organizer/icons/photo-jpg.svg",
  "./assets/windows-file-organizer/icons/photo-png.svg",
  "./assets/windows-file-organizer/icons/video.svg",
  "./assets/windows-file-organizer/icons/music.svg",
  "./assets/windows-file-organizer/icons/archive.svg",
  "./assets/windows-file-organizer/icons/program.svg",
  "./assets/windows-file-organizer/icons/folder.svg",
  "./assets/windows-file-organizer/icons/chrome.svg",
  "./assets/windows-file-organizer/icons/discord.svg",
  "./assets/windows-file-organizer/icons/minecraft-launcher.png",
  "./assets/windows-file-organizer/media/drag-file.webm",
  "./assets/windows-file-organizer/media/drag-file.webp",
  "./assets/windows-file-organizer/media/open-properties.webm",
  "./assets/windows-file-organizer/media/open-properties.webp"
];

const MAZE_GAME_ASSETS = [
  "./assets/maze-game/player-sprites.png",
  "./assets/maze-game/lab-props.png",
  "./assets/maze-game/virus-power-atlas.png",
  "./assets/maze-game/maze-luck-event-atlas.png",
  "./assets/maze-game/maze-meteor-sprites.png",
  "./assets/items/ssd.jpg",
  "./assets/items/memoria-ram.jpg",
  "./assets/items/processador.jpg",
  "./assets/items/placa-mae.jpg",
  "./assets/items/teclado.jpg",
  "./assets/items/windows.svg",
  "./assets/items/mouse.jpg",
  "./assets/items/google-chrome.svg",
  "./assets/items/monitor.jpg",
  "./assets/items/libreoffice-writer.svg",
  "./assets/items/gimp.svg",
  "./assets/items/mozilla-firefox.svg",
  "./assets/items/webcam.jpg",
  "./assets/items/vlc.svg",
  "./assets/items/impressora.jpg",
  "./assets/items/ubuntu.svg",
  "./assets/items/seven-zip.svg",
  "./assets/items/headset.jpg",
  "./assets/items/microfone.jpg",
  "./assets/items/touchscreen.jpg",
  "./assets/items/caixa-som.jpg",
  "./assets/items/scanner.jpg"
];

const WINDOWS_INSTALLER_ASSETS = [
  ...["hard_drive", "wifi_1", "lock_closed", "arrow_right", "arrow_left", "window", "checkmark_circle", "building", "panel_right"].map((name) => `./assets/windows-installer/fluent/${name}.svg`),
  ...["start", "explorer", "recycle-bin", "search", "computer", "settings"].map((name) => `./assets/windows-installer/desktop/${name}.png`),
  "./assets/windows-installer/wallpapers/windows-10-hero.png",
  "./assets/windows-installer/wallpapers/windows-11-bloom-official.jpg",
  "./assets/windows-installer/fluent/LICENSE.txt",
  "./assets/windows-installer/desktop/LICENSE.txt"
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
  "./windows-discovery-game.css",
  "./google-slides-course.css",
  "./google-sheets-course.css",
  "./windows-file-organizer-game.css",
  "./maze-game.css",
  "./carrinho-saber.css",
  "./assets/items/disco-rigido.jpg",
  "./assets/items/pen-drive.jpg",
  "./assets/items/placa-video.jpg",
  "./assets/items/roteador.jpg",
  "./windows-installer.css",
  "./js/app.js",
  "./js/game-offline.mjs",
  "./assets/oficina-pc/oficina-pc-preview.jpg",
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
  "./js/windows-discovery-game.mjs",
  "./js/windows-discovery-core.mjs",
  "./js/windows-discovery-data.mjs",
  "./js/google-slides-course-game.mjs",
  "./js/google-slides-course-core.mjs",
  "./js/google-slides-course-data.mjs",
  "./js/google-sheets-course-game.mjs",
  "./js/google-sheets-course-core.mjs",
  "./js/google-sheets-course-data.mjs",
  "./js/windows-file-organizer-game.mjs",
  "./js/windows-file-organizer-core.mjs",
  "./js/windows-file-organizer-data.mjs",
  "./js/maze-game.mjs",
  "./js/carrinho-saber.mjs",
  "./js/carrinho-saber-core.mjs",
  "./js/carrinho-saber-data.mjs",
  "./js/carrinho-saber-renderer.mjs",
  "./js/maze-game-core.mjs",
  "./js/maze-game-renderer.mjs",
  "./js/maze-game-challenges.mjs",
  "./js/maze-game-data.mjs",
  "./js/windows-installer.mjs",
  "./js/windows-installer-core.mjs",
  "./assets/windows-mission/tecnico-em-acao-card.png",
  "./assets/windows-discovery/scene-desktop.png",
  "./assets/windows-discovery/cursor.png",
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
  ...MAZE_GAME_ASSETS,
  ...WINDOWS_INSTALLER_ASSETS,
  ...WINDOWS_DISCOVERY_MEDIA,
  ...WINDOWS_FILE_ORGANIZER_ASSETS
];

const scopedUrls = (paths = PRECACHE_PATHS) => paths.map((path) => new URL(path, self.registration.scope).href);

const prepareOfflineCache = async (progressPort, paths = PRECACHE_PATHS) => {
  const cache = await caches.open(CACHE_NAME);
  const urls = scopedUrls(paths);
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
  for (const url of urls) if (!await cache.match(url, { ignoreSearch: true })) throw new Error("O pacote offline está incompleto.");
};

self.addEventListener("install", (event) => {
  event.waitUntil(prepareOfflineCache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("central-jogos-offline-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (!["PREPARE_OFFLINE", "PREPARE_GAME_OFFLINE", "GAME_OFFLINE_STATUS"].includes(type)) return;
  event.waitUntil((async () => {
    try {
      const paths = type === "PREPARE_OFFLINE" ? PRECACHE_PATHS : GAME_OFFLINE_PATHS[event.data.gameId];
      if (!paths) throw new Error("Jogo offline desconhecido.");
      if (type === "GAME_OFFLINE_STATUS") {
        const cache = await caches.open(CACHE_NAME);
        const matches = await Promise.all(scopedUrls(paths).map((url) => cache.match(url, { ignoreSearch: true })));
        event.ports[0]?.postMessage({ type: "done", ok: true, ready: matches.every(Boolean) });
        return;
      }
      await prepareOfflineCache(event.ports[0], paths);
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
      const cache = await caches.open(CACHE_NAME);
      const cachedPage = await cache.match(new URL("./index.html", self.registration.scope).href, { ignoreSearch: true });
      if (cachedPage) return cachedPage;
      return fetch(event.request);
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(event.request, response.clone());
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
