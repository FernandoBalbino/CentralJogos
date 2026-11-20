import { TYPE_INFO, LOGOS, LESSONS, PHASES, BONUS } from "./tipos-so-data.mjs";
import { LessonGame } from "./lesson-game.mjs";

// Cenas da aula: SVG estático + classes s1, s2… adicionadas pela linha do tempo (só transform/opacity no CSS).
const SCENES = {
  mono: `<svg viewBox="0 0 480 300" role="img" aria-label="Ana usa o computador. Bruno chega e precisa esperar Ana sair para usar.">
    <rect class="sv-floor" x="24" y="262" width="432" height="4" rx="2"/>
    <rect class="sv-desk" x="150" y="206" width="180" height="10" rx="4"/><rect class="sv-desk" x="162" y="216" width="8" height="46"/><rect class="sv-desk" x="310" y="216" width="8" height="46"/>
    <rect class="sv-shell" x="178" y="100" width="124" height="88" rx="10"/><rect class="sv-screen" x="186" y="108" width="108" height="72" rx="5"/><rect class="sv-shell" x="232" y="188" width="16" height="18"/>
    <g class="m-ana-screen"><circle cx="240" cy="132" r="11" fill="#ffb86b"/><text x="240" y="166" class="sv-t sv-t-light">Ana conectada</text></g>
    <g class="m-busy"><rect x="192" y="114" width="96" height="60" rx="6" fill="#e4532f"/><text x="240" y="140" class="sv-t sv-t-strong">Ocupado</text><text x="240" y="160" class="sv-t sv-t-light">1 usuário por vez</text></g>
    <g class="m-bruno-screen"><circle cx="240" cy="132" r="11" fill="#7cc6ff"/><text x="240" y="166" class="sv-t sv-t-light">Bruno conectado</text></g>
    <g class="m-ana"><circle cx="110" cy="168" r="18" fill="#ffb86b"/><path d="M80 262v-44a30 30 0 0 1 60 0v44z" fill="#ffb86b" opacity=".85"/><text x="110" y="288" class="sv-t sv-label">Ana</text></g>
    <g class="m-bruno"><circle cx="390" cy="168" r="18" fill="#7cc6ff"/><path d="M360 262v-44a30 30 0 0 1 60 0v44z" fill="#7cc6ff" opacity=".85"/><text x="390" y="288" class="sv-t sv-label">Bruno</text></g>
    <g class="m-bubble"><rect x="326" y="92" width="128" height="40" rx="14" class="sv-bubble"/><path d="M380 131l10 13 8-13z" class="sv-bubble"/><text x="390" y="118" class="sv-t sv-t-dark">Posso usar?</text></g>
  </svg>`,
  multi: `<svg viewBox="0 0 480 300" role="img" aria-label="Quatro pessoas se conectam ao mesmo servidor Linux ao mesmo tempo, cada uma com sua pasta.">
    <path class="u-link l1" d="M206 128 L100 78"/><path class="u-link l2" d="M274 128 L380 78"/><path class="u-link l3" d="M206 180 L100 214"/><path class="u-link l4" d="M274 180 L380 214"/>
    <g class="m-server"><rect x="204" y="94" width="72" height="116" rx="10" class="sv-shell"/>
      <rect x="214" y="108" width="52" height="14" rx="3" class="sv-slot"/><rect x="214" y="130" width="52" height="14" rx="3" class="sv-slot"/><rect x="214" y="152" width="52" height="14" rx="3" class="sv-slot"/>
      <circle cx="258" cy="115" r="3" class="sv-led"/><circle cx="258" cy="137" r="3" class="sv-led"/><circle cx="258" cy="159" r="3" class="sv-led"/>
      <text x="240" y="194" class="sv-t sv-t-dark">Linux</text></g>
    <text x="240" y="234" class="sv-t sv-label">Servidor</text>
    <text x="240" y="30" class="sv-t sv-count m-count">Conectados: 0</text>
    <g class="u u1"><circle cx="72" cy="50" r="14" fill="#ffb86b"/><rect x="50" y="70" width="44" height="26" rx="4" class="sv-laptop"/><text x="72" y="114" class="sv-t sv-label">Ana</text><g class="u-folder"><rect x="34" y="122" width="76" height="22" rx="7" class="sv-tag"/><text x="72" y="137" class="sv-t sv-t-tag">/home/ana</text></g></g>
    <g class="u u2"><circle cx="408" cy="50" r="14" fill="#7cc6ff"/><rect x="386" y="70" width="44" height="26" rx="4" class="sv-laptop"/><text x="408" y="114" class="sv-t sv-label">Bruno</text><g class="u-folder"><rect x="366" y="122" width="84" height="22" rx="7" class="sv-tag"/><text x="408" y="137" class="sv-t sv-t-tag">/home/bruno</text></g></g>
    <g class="u u3"><circle cx="72" cy="196" r="14" fill="#ff8fb1"/><rect x="50" y="216" width="44" height="26" rx="4" class="sv-laptop"/><text x="72" y="260" class="sv-t sv-label">Carla</text><g class="u-folder"><rect x="34" y="268" width="76" height="22" rx="7" class="sv-tag"/><text x="72" y="283" class="sv-t sv-t-tag">/home/carla</text></g></g>
    <g class="u u4"><circle cx="408" cy="196" r="14" fill="#9be38a"/><rect x="386" y="216" width="44" height="26" rx="4" class="sv-laptop"/><text x="408" y="260" class="sv-t sv-label">Davi</text><g class="u-folder"><rect x="370" y="268" width="76" height="22" rx="7" class="sv-tag"/><text x="408" y="283" class="sv-t sv-t-tag">/home/davi</text></g></g>
  </svg>`,
  real: `<svg viewBox="0 0 480 300" role="img" aria-label="Um computador comum pode atrasar sem problema. O airbag precisa inflar antes do prazo de 30 milissegundos.">
    <text x="28" y="38" class="sv-t sv-lane">💻 Computador comum: abrir um vídeo</text>
    <rect x="28" y="50" width="424" height="18" rx="9" class="sv-track"/><rect x="28" y="50" width="424" height="18" rx="9" class="r-fill-a"/>
    <text x="452" y="92" class="sv-t sv-end r-ok-a">1,2 s depois… tudo bem 🙂</text>
    <text x="28" y="134" class="sv-t sv-lane">🚗 Airbag: prazo de 30 ms</text>
    <rect x="28" y="146" width="424" height="18" rx="9" class="sv-track"/><rect x="28" y="146" width="424" height="18" rx="9" class="r-fill-b"/>
    <line x1="330" y1="138" x2="330" y2="172" class="r-deadline"/><text x="330" y="188" class="sv-t sv-t-mini">prazo</text>
    <rect x="364" y="200" width="10" height="72" rx="3" class="sv-wall"/>
    <g class="r-car"><path d="M198 228l22-24h70l24 24z" class="sv-car"/><rect x="170" y="226" width="176" height="34" rx="12" class="sv-car"/><circle cx="206" cy="262" r="12" class="sv-wheel"/><circle cx="310" cy="262" r="12" class="sv-wheel"/></g>
    <circle cx="262" cy="216" r="17" class="r-bag"/>
    <text x="372" y="214" class="sv-t r-boom">💥</text>
    <text x="420" y="246" class="sv-t sv-good r-check">✓ No prazo!</text>
  </svg>`,
  emb: `<svg viewBox="0 0 480 300" role="img" aria-label="Um raio-X passa por roteador, smart TV, smartwatch e máquina de lavar e mostra o pequeno sistema dentro de cada aparelho.">
    <g class="d d1"><line x1="54" y1="150" x2="46" y2="110" class="sv-antenna"/><line x1="100" y1="150" x2="108" y2="110" class="sv-antenna"/><rect x="34" y="150" width="86" height="36" rx="9" class="sv-device"/><circle cx="52" cy="176" r="3" class="sv-led"/><circle cx="64" cy="176" r="3" class="sv-led"/>
      <text x="77" y="222" class="sv-t sv-label">Roteador</text><text x="77" y="242" class="sv-t sv-t-mini e-task">distribui a internet</text><g transform="translate(64 155)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <g class="d d2"><rect x="142" y="96" width="106" height="72" rx="6" class="sv-device"/><rect x="150" y="104" width="90" height="56" rx="3" class="sv-screen"/><rect x="186" y="168" width="18" height="16" class="sv-device"/><rect x="170" y="184" width="50" height="6" rx="3" class="sv-device"/>
      <text x="195" y="222" class="sv-t sv-label">Smart TV</text><text x="195" y="242" class="sv-t sv-t-mini e-task">só canais e vídeos</text><g transform="translate(182 119)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <g class="d d3"><rect x="294" y="98" width="22" height="94" rx="8" class="sv-band"/><rect x="282" y="118" width="46" height="54" rx="13" class="sv-device"/>
      <text x="305" y="222" class="sv-t sv-label">Smartwatch</text><text x="305" y="242" class="sv-t sv-t-mini e-task">passos e avisos</text><g transform="translate(292 132)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <g class="d d4"><rect x="364" y="94" width="84" height="98" rx="9" class="sv-device"/><line x1="370" y1="114" x2="442" y2="114" class="sv-antenna"/><circle cx="406" cy="152" r="26" class="sv-screen"/>
      <text x="406" y="222" class="sv-t sv-label">Lavadora</text><text x="406" y="242" class="sv-t sv-t-mini e-task">ciclo de lavagem</text><g transform="translate(393 139)"><g class="e-chip"><rect width="26" height="26" rx="4" class="sv-chip"/><text x="13" y="17" class="sv-t sv-t-chip">SO</text></g></g></g>
    <rect x="0" y="80" width="6" height="124" rx="3" class="e-scan"/>
    <text x="240" y="284" class="sv-t sv-good e-done">Cada aparelho tem um sistema escondido!</text>
  </svg>`,
  combo: `<svg viewBox="0 0 480 300" role="img" aria-label="Airbag: embarcado e tempo real. Servidor da escola: multiusuário. MS-DOS: monousuário.">
    <g class="c c1"><rect x="40" y="28" width="400" height="66" rx="16" class="sv-card"/><text x="64" y="68" class="sv-t sv-start sv-card-title">🚗 Airbag</text>
      <g class="c-tag ct1"><rect x="232" y="47" width="98" height="28" rx="14" fill="#d98a0b"/><text x="281" y="66" class="sv-t sv-t-pill">Embarcado</text></g>
      <g class="c-tag ct2"><rect x="336" y="47" width="92" height="28" rx="14" fill="#e4532f"/><text x="382" y="66" class="sv-t sv-t-pill">Tempo real</text></g></g>
    <g class="c c2"><rect x="40" y="117" width="400" height="66" rx="16" class="sv-card"/><text x="64" y="157" class="sv-t sv-start sv-card-title">🗄️ Servidor da escola</text>
      <g class="c-tag ct3"><rect x="322" y="136" width="106" height="28" rx="14" fill="#0d9f9a"/><text x="375" y="155" class="sv-t sv-t-pill">Multiusuário</text></g></g>
    <g class="c c3"><rect x="40" y="206" width="400" height="66" rx="16" class="sv-card"/><text x="64" y="246" class="sv-t sv-start sv-card-title">💾 MS-DOS</text>
      <g class="c-tag ct4"><rect x="320" y="225" width="108" height="28" rx="14" fill="#6c5ce7"/><text x="374" y="244" class="sv-t sv-t-pill">Monousuário</text></g></g>
  </svg>`
};

// Pausa (ms) antes de cada passo s1, s2…
const TIMELINES = {
  mono: [600, 1200, 2000, 1100],
  multi: [500, 700, 700, 700, 800],
  real: [400, 700, 250, 400, 1600],
  emb: [400, 490, 755, 700, 645, 700],
  combo: [300, 500, 400, 600, 400, 600, 400]
};

const STEP_HOOKS = {
  multi: (scene, step) => {
    const label = scene.querySelector(".m-count");
    if (label) label.textContent = step >= 5 ? "4 pessoas ao mesmo tempo!" : `Conectados: ${step}`;
  }
};

export const tiposSoGame = new LessonGame({
  id: "tipos-so",
  title: "Tipos de Sistemas Operacionais",
  storageKey: "central-tipos-so-v1",
  types: TYPE_INFO,
  logos: LOGOS,
  lessons: LESSONS,
  phases: PHASES,
  bonus: { ...BONUS, note: () => (/\bCrOS\b/.test(globalThis.navigator?.userAgent || "") ? "👀 Você está usando um Chromebook agora mesmo!" : "") },
  scenes: SCENES,
  timelines: TIMELINES,
  hooks: STEP_HOOKS,
  intro: {
    tiles: ["mono", "multi", "real", "emb"].map((id) => TYPE_INFO[id]),
    title: "Que tipo de sistema é esse?",
    text: "Assista à aula animada e depois arraste cada sistema para o tipo certo."
  },
  resultTitles: ["Você domina os tipos de SO!", "Muito bem! Revise os que errou.", "Vale rever a aula e tentar de novo."]
});
