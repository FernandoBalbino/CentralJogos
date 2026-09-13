import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATEGORIES,
  CONNECTION_FILES,
  DESKTOP_LEVEL_WITH_EXTENSIONS,
  DESKTOP_LEVEL_WITHOUT_EXTENSIONS,
  FILE_TYPES,
  GUIDED_CHALLENGES,
  MEDIA
} from "../js/windows-file-organizer-data.mjs";
import {
  connectFileToCategory,
  createInitialOrganizerState,
  evaluateConnections,
  evaluateDesktop,
  getFolderCounts,
  getGuidedFolderOrder,
  keepCorrectConnections,
  moveOrganizerFile,
  removeConnection,
  removeIncorrectPlacements,
  sanitizeOrganizerState
} from "../js/windows-file-organizer-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedExtensions = [".pdf", ".docx", ".txt", ".xlsx", ".pptx", ".jpg", ".png", ".mp4", ".mp3", ".zip", ".exe"];
const expectedCategory = {
  ".pdf": "documents",
  ".docx": "documents",
  ".txt": "documents",
  ".xlsx": "spreadsheets",
  ".pptx": "presentations",
  ".jpg": "images",
  ".png": "images",
  ".mp4": "videos",
  ".mp3": "music",
  ".zip": "archives",
  ".exe": "programs"
};

const localPath = (assetPath) => resolve(projectRoot, assetPath.replace(/^\.\//, ""));
const allFiles = [
  ...CONNECTION_FILES,
  ...GUIDED_CHALLENGES.map((challenge) => challenge.file),
  ...DESKTOP_LEVEL_WITH_EXTENSIONS,
  ...DESKTOP_LEVEL_WITHOUT_EXTENSIONS
];

test("currículo ensina exatamente as 11 extensões e oito categorias", () => {
  assert.deepEqual(FILE_TYPES.map((type) => type.extension), expectedExtensions);
  assert.equal(CATEGORIES.length, 8);
  assert.equal(new Set(CATEGORIES.map((category) => category.id)).size, 8);
  for (const type of FILE_TYPES) {
    assert.equal(type.category, expectedCategory[type.extension]);
    assert.ok(type.explanation.length > 10);
    assert.match(type.fileTypeLabel, new RegExp(type.extension.replace(".", "\\."), "i"));
  }
});

test("todos os registros possuem os campos obrigatórios e uma extensão real", () => {
  for (const file of allFiles) {
    for (const field of ["id", "realName", "displayName", "extension", "category", "icon", "fileTypeLabel", "sizeLabel"]) {
      assert.equal(typeof file[field], "string", `campo ${field} ausente em ${file.id}`);
      assert.ok(file[field].length > 0, `campo ${field} vazio em ${file.id}`);
    }
    assert.ok(file.realName.toLowerCase().endsWith(file.extension));
    assert.equal(file.category, expectedCategory[file.extension]);
    assert.ok(CATEGORIES.some((category) => category.id === file.category));
  }
});

test("etapa de ligações e desafios guiados usam todos os tipos", () => {
  assert.equal(CONNECTION_FILES.length, 11);
  assert.deepEqual(new Set(CONNECTION_FILES.map((file) => file.extension)), new Set(expectedExtensions));
  assert.equal(GUIDED_CHALLENGES.length, 11);
  assert.deepEqual(new Set(GUIDED_CHALLENGES.map((challenge) => challenge.file.extension)), new Set(expectedExtensions));
  for (const challenge of GUIDED_CHALLENGES) {
    assert.equal(challenge.folderIds.length, 2);
    assert.equal(challenge.folderIds.filter((folderId) => folderId === challenge.file.category).length, 1);
    assert.equal(new Set(challenge.folderIds).size, 2);
  }
});

test("as duas Áreas de Trabalho possuem exatamente 20 arquivos diferentes", () => {
  assert.equal(DESKTOP_LEVEL_WITH_EXTENSIONS.length, 20);
  assert.equal(DESKTOP_LEVEL_WITHOUT_EXTENSIONS.length, 20);
  assert.equal(new Set(DESKTOP_LEVEL_WITH_EXTENSIONS.map((file) => file.id)).size, 20);
  assert.equal(new Set(DESKTOP_LEVEL_WITHOUT_EXTENSIONS.map((file) => file.id)).size, 20);
  assert.notDeepEqual(
    DESKTOP_LEVEL_WITH_EXTENSIONS.map((file) => file.displayName),
    DESKTOP_LEVEL_WITHOUT_EXTENSIONS.map((file) => file.displayName)
  );
});

test("etapa final esconde extensões em displayName e preserva realName", () => {
  for (const file of DESKTOP_LEVEL_WITHOUT_EXTENSIONS) {
    assert.equal(file.displayName.toLowerCase().includes(file.extension), false, file.displayName);
    assert.equal(expectedExtensions.some((extension) => file.displayName.toLowerCase().endsWith(extension)), false, file.displayName);
    assert.ok(file.realName.endsWith(file.extension));
  }
  assert.equal(DESKTOP_LEVEL_WITHOUT_EXTENSIONS.find((file) => file.displayName === "Notas da Turma")?.realName, "notas_turma.xlsx");
  assert.equal(DESKTOP_LEVEL_WITHOUT_EXTENSIONS.find((file) => file.displayName === "Google Chrome")?.realName, "chrome.exe");
});

test("ligações são reversíveis, avaliadas só por envio e mantêm apenas acertos", () => {
  const first = CONNECTION_FILES[0];
  const second = CONNECTION_FILES[1];
  let connections = connectFileToCategory({}, first.id, first.category);
  connections = connectFileToCategory(connections, second.id, "images");
  const result = evaluateConnections(connections);
  assert.equal(result.correctCount, 1);
  assert.equal(result.passed, false);
  assert.deepEqual(keepCorrectConnections(connections), { [first.id]: first.category });
  assert.deepEqual(removeConnection(connections, second.id), { [first.id]: first.category });
});

test("movimentação mantém estado lógico independente de coordenadas", () => {
  const files = DESKTOP_LEVEL_WITH_EXTENSIONS;
  const first = files[0];
  const second = files[1];
  let placements = moveOrganizerFile({}, files, first.id, first.category);
  placements = moveOrganizerFile(placements, files, second.id, "videos");
  assert.equal(evaluateDesktop(files, placements).correctCount, 1);
  assert.deepEqual(removeIncorrectPlacements(files, placements), { [first.id]: first.category });
  placements = moveOrganizerFile(placements, files, second.id, "desktop");
  assert.equal(placements[second.id], undefined);
});

test("contagem e conclusão das pastas exigem conjunto exato", () => {
  const files = DESKTOP_LEVEL_WITH_EXTENSIONS;
  const placements = Object.fromEntries(files.map((file) => [file.id, file.category]));
  const result = evaluateDesktop(files, placements);
  assert.equal(result.passed, true);
  assert.equal(result.correctCount, 20);
  assert.ok(Object.values(result.folderCompletion).every(Boolean));
  assert.equal(Object.values(getFolderCounts(files, placements)).reduce((sum, count) => sum + count, 0), 20);
});

test("posição dos distratores muda sem alterar as duas opções", () => {
  const options = GUIDED_CHALLENGES[0].folderIds;
  assert.deepEqual(getGuidedFolderOrder(0, 4, options), options);
  assert.deepEqual(getGuidedFolderOrder(0, 5, options), [...options].reverse());
  assert.deepEqual(options, GUIDED_CHALLENGES[0].folderIds);
});

test("estado persistido é saneado e não aceita destinos ou fases inventadas", () => {
  const initial = createInitialOrganizerState(42);
  const file = DESKTOP_LEVEL_WITH_EXTENSIONS[0];
  const state = sanitizeOrganizerState({
    ...initial,
    phase: "desktop-visible",
    guidedIndex: 999,
    connections: { [CONNECTION_FILES[0].id]: "documents", intruso: "images" },
    visiblePlacements: { [file.id]: file.category, intruso: "programs" },
    hiddenPlacements: { [DESKTOP_LEVEL_WITHOUT_EXTENSIONS[0].id]: "destino-invalido" }
  });
  assert.equal(state.phase, "desktop-visible");
  assert.equal(state.introIndex, 0);
  assert.equal(state.guidedIndex, GUIDED_CHALLENGES.length - 1);
  assert.deepEqual(state.connections, { [CONNECTION_FILES[0].id]: "documents" });
  assert.deepEqual(state.visiblePlacements, { [file.id]: file.category });
  assert.deepEqual(state.hiddenPlacements, {});
  assert.equal(sanitizeOrganizerState({ ...initial, phase: "hack" }).phase, "start");
  assert.equal(sanitizeOrganizerState({ ...initial, introIndex: 999 }).introIndex, FILE_TYPES.length - 1);
  assert.equal(sanitizeOrganizerState({ ...initial, introIndex: -10 }).introIndex, 0);
});

test("ícones, vídeos e pôsteres são locais, existem e são leves", async () => {
  const paths = new Set([
    ...FILE_TYPES.map((type) => type.icon),
    ...allFiles.map((file) => file.icon),
    MEDIA.drag.video,
    MEDIA.drag.poster,
    MEDIA.properties.video,
    MEDIA.properties.poster
  ]);
  for (const assetPath of paths) {
    assert.match(assetPath, /^\.\//);
    assert.doesNotMatch(assetPath, /^https?:/);
    await access(localPath(assetPath));
  }
  for (const assetPath of [MEDIA.drag.video, MEDIA.drag.poster, MEDIA.properties.video, MEDIA.properties.poster]) {
    const details = await stat(localPath(assetPath));
    assert.ok(details.size > 1000, `asset vazio: ${assetPath}`);
    assert.ok(details.size < 500000, `asset acima de 500 KB: ${assetPath}`);
  }
});

test("integração inclui rota, seleção acessível, trilha, tela cheia e cache v23", async () => {
  const [html, app, css, game, serviceWorker, readme, attributions] = await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "js/app.js"), "utf8"),
    readFile(resolve(projectRoot, "windows-file-organizer-game.css"), "utf8"),
    readFile(resolve(projectRoot, "js/windows-file-organizer-game.mjs"), "utf8"),
    readFile(resolve(projectRoot, "service-worker.js"), "utf8"),
    readFile(resolve(projectRoot, "README.md"), "utf8"),
    readFile(resolve(projectRoot, "ATTRIBUTIONS.md"), "utf8")
  ]);
  assert.match(html, /Jogo 12/);
  assert.match(html, /href="#\/organize-windows"/);
  assert.match(html, /data-screen="windows-file-organizer"/);
  assert.match(app, /windowsFileOrganizerGame\.mount/);
  assert.match(app, /windowsFileOrganizerGame\.enter/);
  assert.match(app, /windowsFileOrganizerGame\.leave/);
  assert.match(game, /requestFullscreen/);
  assert.match(game, /contextmenu/);
  assert.match(game, /pointerdown/);
  assert.match(game, /dragstart/);
  assert.match(game, /aria-pressed/);
  assert.match(game, /Trilha das extensões/);
  assert.match(game, /PRÓXIMA EXTENSÃO/);
  assert.match(game, /wfo-temp-line/);
  assert.match(game, /Shift mais F10/);
  assert.match(game, /Tipo de arquivo:/);
  assert.doesNotMatch(game, /title="/);
  assert.match(css, /windows-file-organizer-active/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(serviceWorker, /central-jogos-offline-v23/);
  assert.match(serviceWorker, /windows-file-organizer-game\.mjs/);
  assert.match(serviceWorker, /drag-file\.webm/);
  assert.match(readme, /#\/organize-windows/);
  assert.match(attributions, /Minecraft Launcher/);
});
