export const INSTALLER_STORAGE_KEY = "centralJogos.windowsInstaller.v1";

export const VIRTUAL_DISKS = Object.freeze([
  Object.freeze({ id: "disk0", label: "Disco 0 Partição 1", sizeGb: 256, type: "Primário" }),
  Object.freeze({ id: "disk1", label: "Disco 1 Partição 1", sizeGb: 512, type: "Primário" })
]);

export const EDITIONS = Object.freeze(["Home", "Pro", "Education"]);

export const INSTALLER_STEPS = Object.freeze({
  windows10: Object.freeze([
    "boot", "language", "install", "key", "edition", "license", "type", "disk",
    "progress", "restart", "region", "keyboard", "secondKeyboard", "network",
    "account", "credential", "security", "privacy", "prepare", "desktop"
  ]),
  windows11: Object.freeze([
    "boot", "language", "install", "key", "edition", "license", "type", "disk",
    "progress", "restart", "region", "keyboard", "secondKeyboard", "network",
    "updates", "device", "purpose", "account", "credential", "privacy", "prepare", "desktop"
  ])
});

const validOs = (os) => os === "windows10" || os === "windows11";
const cleanText = (value, max = 60) => typeof value === "string" ? value.trim().slice(0, max) : "";

export const createInstallerState = (os) => {
  if (!validOs(os)) throw new TypeError("Sistema operacional inválido.");
  return {
    os,
    step: "boot",
    edition: "",
    language: "Português (Brasil)",
    region: "Brasil",
    keyboard: "Português (Brasil ABNT2)",
    productKeySkipped: true,
    licenseAccepted: false,
    diskId: null,
    progress: 0,
    network: "",
    deviceName: "",
    purpose: "personal",
    username: "",
    accountEmail: "",
    privacy: { location: false, diagnostics: false, experiences: false },
    completed: false
  };
};

export const restoreInstallerState = (value) => {
  if (!value || !validOs(value.os)) return null;
  const state = createInstallerState(value.os);
  state.step = INSTALLER_STEPS[state.os].includes(value.step) ? value.step : "boot";
  state.edition = EDITIONS.includes(value.edition) ? value.edition : "";
  state.language = cleanText(value.language) || state.language;
  state.region = cleanText(value.region) || state.region;
  state.keyboard = cleanText(value.keyboard) || state.keyboard;
  state.productKeySkipped = value.productKeySkipped !== false;
  state.licenseAccepted = value.licenseAccepted === true;
  state.diskId = VIRTUAL_DISKS.some((disk) => disk.id === value.diskId) ? value.diskId : null;
  state.progress = Number.isFinite(value.progress) ? Math.max(0, Math.min(100, Math.floor(value.progress))) : 0;
  state.network = cleanText(value.network);
  state.deviceName = cleanText(value.deviceName, 24);
  state.purpose = value.purpose === "work" ? "work" : "personal";
  state.username = cleanText(value.username, 40);
  const email = cleanText(value.accountEmail, 80).toLowerCase();
  state.accountEmail = /^[a-z0-9._+-]+@exemplo\.com$/.test(email) ? email : "";
  state.privacy = {
    location: value.privacy?.location === true,
    diagnostics: value.privacy?.diagnostics === true,
    experiences: value.privacy?.experiences === true
  };
  state.completed = state.step === "desktop" && value.completed === true;
  // Senhas, PINs e respostas de segurança nunca fazem parte do estado persistido.
  return state;
};

export const nextInstallerStep = (state) => {
  const steps = INSTALLER_STEPS[state.os];
  const index = steps.indexOf(state.step);
  if (index < 0 || index === steps.length - 1) return state.step;
  return steps[index + 1];
};

export const previousInstallerStep = (state) => {
  const steps = INSTALLER_STEPS[state.os];
  const index = steps.indexOf(state.step);
  if (index <= 1 || index >= steps.length) return state.step;
  return steps[index - 1];
};

export const canAdvanceInstaller = (state) => {
  if (!state || !validOs(state.os)) return false;
  if (state.step === "edition") return EDITIONS.includes(state.edition);
  if (state.step === "license") return state.licenseAccepted;
  if (state.step === "disk") return VIRTUAL_DISKS.some((disk) => disk.id === state.diskId);
  if (state.step === "network") return Boolean(state.network);
  if (state.step === "device") return /^[A-Za-z0-9][A-Za-z0-9-]{0,14}$/.test(state.deviceName);
  if (state.step === "account") return state.username.length > 0;
  if (["boot", "progress", "restart", "updates", "prepare", "desktop"].includes(state.step)) return false;
  return true;
};

export const selectedVirtualDisk = (state) => VIRTUAL_DISKS.find((disk) => disk.id === state?.diskId) || null;
