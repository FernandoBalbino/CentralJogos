export const STATE_VERSION = 2;
export const STORAGE_KEY = "central-oficina-pc-v1";
export const SOUND_KEY = "central-oficina-pc-sound";
export const PHASES = ["INTRO", "TUTORIAL", "CASE", "MOTHERBOARD", "CPU", "COOLER", "RAM", "HDD", "PSU", "GPU", "ASSEMBLED", "CONNECT_POWER", "POWER_ON", "CLIENT_ORDER", "FIND_HDD", "REMOVE_HDD", "SELECT_SSD", "INSTALL_SSD", "FINAL_TEST", "FINAL_QUESTION", "RAM_ORDER", "FIND_RAM", "REMOVE_RAM", "SELECT_RAM", "INSTALL_RAM", "RAM_TEST", "RAM_QUESTION", "MOUSE_ORDER", "FIND_MOUSE", "CONNECT_MOUSE", "MOUSE_TEST", "MOUSE_QUESTION", "COMPLETED"];
export const INSTALL_ORDER = ["motherboard", "cpu", "cooler", "ram", "hdd", "psu", "gpu"];
export const CASE_BOUNDS = { min: [-1.45, -2, -.85], max: [1.45, 2, .85] };
export const CASE_POSES = {
  flat: { position: [-3.15, 2.12, 0], rotation: [-Math.PI / 2, 0, 0] },
  upright: { position: [-3.15, 3.27, 0], rotation: [0, 0, 0] }
};
export const WORKBENCH = { width: 16, depth: 8, surfaceY: 1.28, centerZ: -.2 };
export const TRAY_POSITIONS = [[.5, 1.28, 1.7], [2.85, 1.28, 1.7], [5.2, 1.28, 1.7]];
export const REMOVED_HDD_POSITION = [5.2, 1.28, -.4];
export const RETIRED_RAM_POSITION = [3.9, 1.28, -.5];
export const OUTLET_POSITION = [7.15, 1.9, 2.7];
export const MOUSE_POSITION = [3.4, 1.42, -2.6];
export const CONNECTION_STARTS = { "power-plug": [-.3, 1.4, 2.9], "mouse-usb": [4.3, 1.4, -1.5] };
export const CAMERA_VIEWS = { overview: [8.2, 12.5, 18.8], narrow: [10.2, 17, 29], target: [0, 1.9, 0] };
const component = (id, name, purpose, location, characteristic, snapPosition, size, distractors) => ({
  id, name, purpose, location, characteristic, snapPosition, size, distractors,
  startPosition: TRAY_POSITIONS[0], startRotation: [-Math.PI / 2, 0, 0], startScale: .72,
  snapRotation: [0, 0, 0], snapRadius: .72,
  cameraTarget: snapPosition, cameraOffset: [2.9, 3.5, 4.3]
});
export const COMPONENTS = {
  motherboard: component("motherboard", "Placa-mãe", "Conecta e permite a comunicação entre os principais componentes.", "Na parte interna do gabinete.", "É a placa principal do computador.", [0, .4, -.65], [2.3, 2.65, .14], ["gpu", "hdd"]),
  cpu: component("cpu", "Processador", "Executa instruções e realiza cálculos.", "No socket da placa-mãe.", "Trabalha com os dados dos programas.", [-.45, 1.03, -.43], [.55, .55, .13], ["ram", "ssd"]),
  cooler: component("cooler", "Cooler", "Ajuda a retirar o calor produzido pelo processador.", "Sobre o processador.", "O dissipador e a ventoinha ajudam no resfriamento.", [-.45, 1.03, -.07], [.85, .85, .63], ["psu", "hdd"]),
  ram: component("ram", "Memória RAM", "Guarda temporariamente os dados usados pelos programas.", "Nos slots de memória da placa-mãe.", "Seu conteúdo é perdido quando o computador é desligado.", [.8, .75, -.31], [.16, 1.45, .49], ["ssd", "cpu"]),
  hdd: component("hdd", "HD", "Armazena arquivos mesmo quando o computador está desligado.", "No compartimento de armazenamento.", "Utiliza um sistema mecânico com discos internos.", [.77, -1.43, .04], [.95, .25, 1.32], ["ram", "gpu"]),
  psu: component("psu", "Fonte", "Fornece energia para os componentes do computador.", "Na parte inferior do gabinete.", "Distribui a energia necessária para o funcionamento.", [-.65, -1.4, -.03], [1.25, .82, 1.25], ["cooler", "ssd"]),
  gpu: component("gpu", "Placa de vídeo", "É responsável pelo processamento gráfico.", "No slot de expansão da placa-mãe.", "Ajuda a produzir as imagens exibidas no monitor.", [-.08, -.46, .03], [2.25, .57, .66], ["ram", "psu"]),
  ssd: component("ssd", "SSD SATA", "Armazena arquivos permanentemente usando memória eletrônica.", "No compartimento de armazenamento.", "Normalmente oferece acesso aos dados mais rápido que um HD.", [.77, -1.43, .04], [.72, .14, .98], ["ram", "cpu"])
};
COMPONENTS.cpu.startScale = 1.25;
COMPONENTS.ram.startScale = 1;
COMPONENTS.ram.startRotation = [0, 0, Math.PI / 2];
COMPONENTS["power-plug"] = { ...component("power-plug", "Plugue da fonte", "Leva a energia da tomada à fonte do computador.", "Na tomada ao lado da bancada.", "Conecte o cabo antes de usar o botão Power.", OUTLET_POSITION.map((v, i) => v + (i === 2 ? .11 : 0)), [.42, .4, .5], ["ssd", "ram"]), anchorSpace: "world", startRotation: [0, 0, 0], startScale: 1 };
COMPONENTS.mouse = { ...component("mouse", "Mouse", "Controla o ponteiro e permite selecionar itens na tela.", "Ao lado do teclado, conectado à porta USB.", "É um dispositivo de entrada.", MOUSE_POSITION, [.5, .27, .8], ["cpu", "hdd"]), anchorSpace: "world" };
COMPONENTS["mouse-usb"] = { ...component("mouse-usb", "Cabo USB do mouse", "Conecta o mouse ao computador.", "Na porta USB do gabinete.", "A conexão permite usar o ponteiro.", [1.48, -1.45, .92], [.35, .2, .55], ["ssd", "ram"]), startRotation: [0, 0, 0], startScale: 1 };
for (const id of ["hdd", "ssd", "psu"]) COMPONENTS[id].startRotation = [0, 0, 0];
export const STEPS = [
  { phase: "CASE", title: "Conheça o gabinete", objective: "Gire o gabinete e observe seu interior.", explanation: "O gabinete protege e organiza os componentes internos do computador." },
  ...INSTALL_ORDER.map((id) => ({ phase: id.toUpperCase(), componentId: id, title: COMPONENTS[id].name, objective: ({ motherboard: "Precisamos instalar a placa principal do computador.", cpu: "Encontre a peça que executa instruções e cálculos.", cooler: "Qual peça ajuda a resfriar o processador?", ram: "Encontre a memória que guarda dados temporariamente.", hdd: "Instale o dispositivo que guarda seus arquivos.", psu: "Encontre a peça que fornece energia ao computador.", gpu: "Instale a peça responsável pelo processamento gráfico." })[id] }))
];
export const isUprightPhase = (phase) => ["ASSEMBLED", "CONNECT_POWER", "POWER_ON", "CLIENT_ORDER", "FINAL_TEST", "FINAL_QUESTION", "RAM_ORDER", "RAM_TEST", "RAM_QUESTION", "MOUSE_ORDER", "FIND_MOUSE", "CONNECT_MOUSE", "MOUSE_TEST", "MOUSE_QUESTION", "COMPLETED"].includes(phase);
export const targetComponent = (phase) => STEPS.find((step) => step.phase === phase)?.componentId || ({ INSTALL_SSD: "ssd", INSTALL_RAM: "ram", CONNECT_POWER: "power-plug", CONNECT_MOUSE: "mouse-usb" })[phase] || null;
export const choicesFor = (phase, installed = []) => {
  // O inventário é único: uma peça instalada nunca volta como distrator.
  if (phase === "SELECT_SSD" || phase === "INSTALL_SSD") return ["ssd", "hdd"];
  if (phase === "SELECT_RAM" || phase === "INSTALL_RAM") return ["ram", "hdd"];
  if (phase === "CONNECT_POWER") return ["power-plug"];
  if (phase === "CONNECT_MOUSE") return ["mouse-usb"];
  const id = targetComponent(phase);
  if (!id) return [];
  const candidates = [...new Set([id, ...COMPONENTS[id].distractors, ...INSTALL_ORDER, "ssd"])].filter((candidate) => !installed.includes(candidate));
  return candidates.slice(0, 3).sort((a, b) => a.localeCompare(b));
};
export const EXPLODED_OFFSETS = { motherboard: [0, 0, -.8], cpu: [-.15, .5, 1.3], cooler: [-.2, 1.5, 1.9], ram: [1.4, 1.5, .9], gpu: [2.1, 0, 1.2], hdd: [1.2, -.25, 1.8], ssd: [1.2, -.25, 1.8], psu: [-1.7, -.3, .7] };
export const FINAL_EXPLANATION = "O SSD melhora principalmente a velocidade de armazenamento e acesso aos dados. Ele não aumenta a capacidade de processamento da CPU.";
