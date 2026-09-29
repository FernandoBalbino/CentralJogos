const labels = { "oficina-pc": "Oficina", "windows-mission": "Treinamento 3D" };
const announce = (gameId, state, label) => {
  document.dispatchEvent(new CustomEvent("central-game-offline-status", { detail: { gameId, state, label } }));
  document.querySelectorAll(`[data-game-offline="${gameId}"]`).forEach((node) => { node.textContent = label; node.dataset.state = state; });
};
export async function prepareGameOffline(gameId) {
  if (!labels[gameId]) return;
  if (!("serviceWorker" in navigator)) { announce(gameId, "error", "Uso offline indisponível neste navegador."); return; }
  announce(gameId, "preparing", `Preparando ${labels[gameId]} para uso offline…`);
  try {
    const registration = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("O preparo básico não foi concluído.")), 30000);
      navigator.serviceWorker.ready.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
    });
    const pending = registration.installing || registration.waiting;
    if (pending && pending.state !== "activated" && pending.state !== "redundant") {
      await new Promise((resolve) => {
        const timer = setTimeout(() => { pending.removeEventListener("statechange", handler); resolve(); }, 30000);
        const handler = () => { if (["activated", "redundant"].includes(pending.state)) { clearTimeout(timer); pending.removeEventListener("statechange", handler); resolve(); } };
        pending.addEventListener("statechange", handler); handler();
      });
    }
    const worker = registration.active;
    if (!worker) throw new Error("Modo offline ainda indisponível.");
    const channel = new MessageChannel();
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error("Tempo de preparo esgotado.")); }, 30000);
      channel.port1.onmessage = ({ data }) => {
        if (data.type === "progress") announce(gameId, "preparing", `Preparando ${labels[gameId]}: ${data.loaded}/${data.total}…`);
        if (data.type === "done") { clearTimeout(timeout); channel.port1.close(); resolve(data); }
      };
      worker.postMessage({ type: "PREPARE_GAME_OFFLINE", gameId }, [channel.port2]);
    });
    if (!result.ok) throw new Error(result.message);
    announce(gameId, "ready", `${labels[gameId]} disponível offline ✓`);
    return true;
  } catch {
    announce(gameId, "error", "Abra novamente com internet para preparar o uso offline.");
    return false;
  }
}
export async function updateGameOfflineCards() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  for (const gameId of Object.keys(labels)) {
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }) => { clearTimeout(timeout); channel.port1.close(); if (data.ready) announce(gameId, "ready", "Disponível offline ✓"); };
    const timeout = setTimeout(() => channel.port1.close(), 5000);
    registration.active?.postMessage({ type: "GAME_OFFLINE_STATUS", gameId }, [channel.port2]);
  }
}
