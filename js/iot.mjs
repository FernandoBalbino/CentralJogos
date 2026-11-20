import { TYPE_INFO, LESSONS, PHASES } from "./iot-data.mjs";
import { LessonGame } from "./lesson-game.mjs";

// Cenas da aula: SVG estático + classes s1, s2… adicionadas pela linha do tempo (estilos em iot.css).
const SCENES = {
  "iot-home": `<svg viewBox="0 0 480 300" role="img" aria-label="Lâmpada, câmera, tomada e relógio da casa se conectam à internet, um de cada vez.">
    <path class="h-roof" d="M74 156 L240 100 L406 156"/><rect class="h-wall" x="96" y="150" width="288" height="120" rx="8"/>
    <path class="h-link l1" d="M140 192 L222 78"/><path class="h-link l2" d="M205 192 L236 80"/><path class="h-link l3" d="M275 192 L250 80"/><path class="h-link l4" d="M340 192 L262 78"/>
    <g class="o o1"><text x="140" y="224" class="sv-t h-emoji">💡</text><text x="140" y="254" class="sv-t sv-t-mini">Lâmpada</text></g>
    <g class="o o2"><text x="205" y="224" class="sv-t h-emoji">📷</text><text x="205" y="254" class="sv-t sv-t-mini">Câmera</text></g>
    <g class="o o3"><text x="275" y="224" class="sv-t h-emoji">🔌</text><text x="275" y="254" class="sv-t sv-t-mini">Tomada</text></g>
    <g class="o o4"><text x="340" y="224" class="sv-t h-emoji">⌚</text><text x="340" y="254" class="sv-t sv-t-mini">Relógio</text></g>
    <g class="h-cloud"><circle cx="214" cy="50" r="20"/><circle cx="242" cy="38" r="26"/><circle cx="270" cy="52" r="18"/><rect x="196" y="48" width="92" height="24" rx="12"/></g>
    <text x="242" y="65" class="sv-t sv-t-dark">Internet</text>
    <text x="240" y="292" class="sv-t sv-count h-count">Conectados: 0</text>
  </svg>`,
  "iot-flow": `<svg viewBox="0 0 480 300" role="img" aria-label="O sensor mede 28 graus, a rede leva o dado, a nuvem decide e o ar-condicionado liga sozinho.">
    <text x="240" y="40" class="sv-t sv-label">Sensor → Rede → Nuvem → Ação</text>
    <path class="f-track" d="M66 80 H414"/>
    <g class="n n1"><rect x="22" y="94" width="88" height="88" rx="18" class="f-box"/><text x="66" y="150" class="sv-t f-emoji">🌡️</text><text x="66" y="206" class="sv-t sv-label">Sensor</text><text x="66" y="228" class="sv-t f-sub">mediu 28 °C</text></g>
    <g class="n n2"><rect x="138" y="94" width="88" height="88" rx="18" class="f-box"/><text x="182" y="150" class="sv-t f-emoji">📶</text><text x="182" y="206" class="sv-t sv-label">Rede</text><text x="182" y="228" class="sv-t f-sub">Wi-Fi ou 5G</text></g>
    <g class="n n3"><rect x="254" y="94" width="88" height="88" rx="18" class="f-box"/><text x="298" y="150" class="sv-t f-emoji">☁️</text><text x="298" y="206" class="sv-t sv-label">Nuvem</text><text x="298" y="228" class="sv-t f-sub">“Está quente!”</text></g>
    <g class="n n4"><rect x="370" y="94" width="88" height="88" rx="18" class="f-box"/><text x="414" y="150" class="sv-t f-emoji">❄️</text><text x="414" y="206" class="sv-t sv-label">Ação</text><text x="414" y="228" class="sv-t f-sub">ar ligado</text></g>
    <circle cx="66" cy="80" r="8" class="f-packet"/>
    <text x="240" y="272" class="sv-t sv-good f-done">O ar-condicionado ligou sozinho!</text>
  </svg>`,
  "iot-plant": `<svg viewBox="0 0 480 300" role="img" aria-label="O sensor percebe o solo seco, a válvula abre a água e a planta é salva.">
    <path class="p-pipe" d="M20 66 H150 V90"/><rect x="134" y="86" width="32" height="18" rx="5" class="p-valve"/>
    <g class="p-drops"><circle cx="142" cy="122" r="4"/><circle cx="154" cy="138" r="4"/><circle cx="162" cy="116" r="4"/><circle cx="146" cy="156" r="4"/><circle cx="158" cy="168" r="4"/></g>
    <rect x="40" y="206" width="250" height="56" rx="10" class="p-soil"/><rect x="40" y="206" width="250" height="56" rx="10" class="p-wet"/>
    <text x="150" y="206" class="sv-t p-plant p-dry-plant">🥀</text><text x="150" y="206" class="sv-t p-plant p-ok-plant">🌻</text>
    <rect x="226" y="176" width="8" height="58" rx="3" class="sv-shell"/><rect x="216" y="160" width="28" height="22" rx="6" class="p-sensor"/>
    <rect x="256" y="110" width="16" height="96" rx="8" class="sv-track"/><rect x="256" y="110" width="16" height="96" rx="8" class="p-meter"/>
    <g class="p-tag p-tag-act"><rect x="300" y="52" width="170" height="30" rx="15" fill="#e4532f"/><text x="385" y="72" class="sv-t sv-t-pill">✋ Atuador: abre a água</text></g>
    <g class="p-tag p-tag-sensor"><rect x="300" y="146" width="170" height="30" rx="15" fill="#6c5ce7"/><text x="385" y="166" class="sv-t sv-t-pill">👁️ Sensor: mede a água</text></g>
    <text x="385" y="204" class="sv-t sv-label p-dry">Solo seco: 20%</text><text x="385" y="204" class="sv-t sv-label p-ok">Solo úmido: 60%</text>
    <text x="240" y="290" class="sv-t sv-good p-done">Planta salva, sem ninguém regar!</text>
  </svg>`,
  "iot-areas": `<svg viewBox="0 0 480 300" role="img" aria-label="IoT na casa, na cidade, na saúde e no campo.">
    <g class="a a1"><rect x="40" y="26" width="192" height="112" rx="18" class="a-tile" style="stroke:#0d9f9a"/><text x="78" y="98" class="sv-t a-emoji">🏠</text><text x="122" y="78" class="sv-t sv-start a-title">Casa</text><text x="122" y="100" class="sv-t sv-start a-sub">lâmpada pelo app</text></g>
    <g class="a a2"><rect x="248" y="26" width="192" height="112" rx="18" class="a-tile" style="stroke:#6c5ce7"/><text x="286" y="98" class="sv-t a-emoji">🏙️</text><text x="330" y="78" class="sv-t sv-start a-title">Cidade</text><text x="330" y="100" class="sv-t sv-start a-sub">ônibus no GPS</text></g>
    <g class="a a3"><rect x="40" y="160" width="192" height="112" rx="18" class="a-tile" style="stroke:#e4532f"/><text x="78" y="232" class="sv-t a-emoji">❤️</text><text x="122" y="212" class="sv-t sv-start a-title">Saúde</text><text x="122" y="234" class="sv-t sv-start a-sub">mede batimentos</text></g>
    <g class="a a4"><rect x="248" y="160" width="192" height="112" rx="18" class="a-tile" style="stroke:#2f9e44"/><text x="286" y="232" class="sv-t a-emoji">🌱</text><text x="330" y="212" class="sv-t sv-start a-title">Campo</text><text x="330" y="234" class="sv-t sv-start a-sub">sensor no plantio</text></g>
  </svg>`,
  "iot-security": `<svg viewBox="0 0 480 300" role="img" aria-label="Um invasor entra na câmera com a senha padrão admin. Depois da troca por uma senha forte, o acesso é negado.">
    <g class="k-bad"><rect x="146" y="28" width="188" height="40" rx="20" fill="#e4532f"/><text x="240" y="54" class="sv-t sv-t-strong">⚠️ Câmera invadida!</text></g>
    <g class="k-good"><rect x="146" y="28" width="188" height="40" rx="20" fill="#1f9d55"/><text x="240" y="54" class="sv-t sv-t-strong">🔒 Acesso negado!</text></g>
    <path class="k-beam" d="M352 140 H172"/>
    <rect x="60" y="110" width="96" height="62" rx="12" class="sv-shell"/><circle cx="108" cy="141" r="20" class="sv-screen"/><circle cx="108" cy="141" r="8" fill="#3b4c74"/>
    <rect x="100" y="172" width="16" height="24" class="sv-desk"/><rect x="80" y="194" width="56" height="8" rx="4" class="sv-desk"/>
    <text x="160" y="116" class="sv-t k-lock">🔒</text>
    <text x="108" y="228" class="sv-t sv-label">Câmera Wi-Fi</text>
    <g class="k-weak"><rect x="48" y="240" width="120" height="28" rx="14" fill="#e4532f"/><text x="108" y="259" class="sv-t sv-t-pill">senha: admin</text></g>
    <g class="k-strong"><rect x="36" y="240" width="144" height="28" rx="14" fill="#1f9d55"/><text x="108" y="259" class="sv-t sv-t-pill">senha: ●●●●●●●●</text></g>
    <g class="k-hacker"><text x="392" y="158" class="sv-t k-emoji">🕵️</text><text x="392" y="200" class="sv-t sv-label">Invasor</text></g>
  </svg>`
};

// Pausa (ms) antes de cada passo s1, s2…
const TIMELINES = {
  "iot-home": [500, 700, 700, 700, 800],
  "iot-flow": [500, 900, 900, 900, 800],
  "iot-plant": [600, 1200, 1100, 1000],
  "iot-areas": [400, 600, 600, 600],
  "iot-security": [500, 1000, 1600, 1100]
};

const HOOKS = {
  "iot-home": (scene, step) => {
    const label = scene.querySelector(".h-count");
    if (label) label.textContent = step >= 5 ? "4 coisas conectadas à internet!" : `Conectados: ${step}`;
  }
};

export const iotGame = new LessonGame({
  id: "iot",
  title: "Internet das Coisas",
  storageKey: "central-iot-v1",
  types: TYPE_INFO,
  lessons: LESSONS,
  phases: PHASES,
  scenes: SCENES,
  timelines: TIMELINES,
  hooks: HOOKS,
  lessonsRequired: false,
  intro: {
    tiles: ["casa", "cidade", "saude", "campo"].map((id) => TYPE_INFO[id]),
    title: "Internet das Coisas",
    text: "Coisas do dia a dia conectadas à internet. Primeiro a aula na TV, depois o jogo!"
  },
  resultTitles: ["Você é fera em IoT!", "Muito bem! Revise os que errou.", "Vale rever a aula e tentar de novo."]
});
