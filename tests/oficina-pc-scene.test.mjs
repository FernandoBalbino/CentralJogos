import test from "node:test";
import assert from "node:assert/strict";
import { WorkshopScene } from "../js/oficina-pc-scene.mjs";
import * as THREE from "../vendor/three/three.module.min.js";
import { createModelFactory } from "../js/oficina-pc-models.mjs";
import { COMPONENTS, INSTALL_ORDER, choicesFor, TRAY_POSITIONS, WORKBENCH, CASE_POSES } from "../js/oficina-pc-data.mjs";

test("cabos usam curvas com volume, caminhos separados e geometria reutilizada", () => {
  const group = new THREE.Group(); group.position.set(...CASE_POSES.upright.position);
  const models = new Map(["power-plug", "mouse-usb"].map((id) => { const model = new THREE.Group(); model.position.set(...COMPONENTS[id].snapPosition); if (id === "mouse-usb") group.add(model); return [id, model]; }));
  group.updateMatrixWorld(true);
  const material = new THREE.MeshBasicMaterial();
  const cables = [...models.keys()].map((id) => { const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material); mesh.userData.cableId = id; return mesh; });
  const scene = Object.assign(Object.create(WorkshopScene.prototype), { cables, models, trays: new Map(), caseGroup: group, state: { plugged: true, mouseConnected: true } });
  scene.updateCables(); const first = cables.map((cable) => cable.geometry);
  scene.updateCables();
  cables.forEach((cable, index) => { assert.equal(cable.geometry, first[index]); assert.ok(cable.geometry.attributes.position.count > 100); assert.ok([...cable.geometry.attributes.position.array].every(Number.isFinite)); assert.equal(cable.geometry.parameters.path.curveType, "centripetal"); for (let i = 0; i <= 100; i++) assert.ok(cable.geometry.parameters.path.getPoint(i / 100).y >= WORKBENCH.surfaceY + .04); });
  scene.state.plugged = false; scene.updateCables(); assert.notEqual(cables[0].geometry, first[0]); cables.forEach((cable) => cable.geometry.dispose()); material.dispose();
});
test("ponteiro do monitor mantém o tamanho após a animação do grupo", () => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  const factory = createModelFactory();
  try { const workshop = factory.createWorkshop(), pointer = workshop.getObjectByName("monitor-pointer"); pointer.scale.setScalar(1); const size = new THREE.Box3().setFromObject(pointer).getSize(new THREE.Vector3()); assert.ok(size.x < .3 && size.y < .3 && size.z < .1); const wall = workshop.getObjectByName("workshop-wall"); assert.equal(wall.geometry.type, "PlaneGeometry"); assert.equal(wall.material.side, THREE.FrontSide); } finally { factory.dispose(); globalThis.document = oldDocument; }
});

test("modelos da bancada ficam apoiados na superfície, lado a lado, sem peças instaladas", () => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  const factory = createModelFactory();
  try {
    const installed = [];
    for (const id of INSTALL_ORDER) {
      const choices = choicesFor(id.toUpperCase(), installed), bounds = [];
      choices.forEach((part, index) => { const model = factory.create(part); WorkshopScene.prototype.placeOnWorkbench(model, part, TRAY_POSITIONS[index]); const box = new THREE.Box3().setFromObject(model); assert.ok(Math.abs(box.min.y - WORKBENCH.surfaceY - .012) < .0001, part); assert.ok(box.max.x < WORKBENCH.width / 2); bounds.push(box); });
      for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) assert.equal(bounds[i].intersectsBox(bounds[j]), false, choices.join(","));
      installed.push(id);
    }
    assert.ok(COMPONENTS.mouse && COMPONENTS["power-plug"] && COMPONENTS["mouse-usb"]);
  } finally { factory.dispose(); globalThis.document = oldDocument; }
});

test("ausência de WebGL2 apresenta a incompatibilidade solicitada", () => {
  const requested = [];
  assert.throws(() => new WorkshopScene({ querySelector: () => ({ getContext: (type) => { requested.push(type); return null; } }) }), /Seu navegador ou dispositivo não oferece suporte à experiência 3D\./);
  assert.deepEqual(requested, ["webgl2"]);
});
test("qualidade só reduz após FPS baixo sustentado e mantém um único loop", () => {
  const oldRequest = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  let scheduled = 0, cancelled = 0, resized = 0, ratio = 1.5;
  globalThis.requestAnimationFrame = () => ++scheduled; globalThis.cancelAnimationFrame = () => cancelled++;
  try {
    const scene = Object.assign(Object.create(WorkshopScene.prototype), {
      active: true, paused: false, tweens: [], fans: [], metricStart: 0, metricFrames: 0, lowSamples: 0,
      navigation: { controls: {}, update() {} }, renderer: { shadowMap: { enabled: true }, info: { render: { triangles: 4200, calls: 90 } }, render() {}, setPixelRatio: (value) => { ratio = value; } },
      updateLabels() {}, resize() { resized++; }, cancelDrag() {}, onMetrics() {}
    });
    scene.frame(2100); assert.equal(scene.lowQuality, undefined); assert.equal(ratio, 1.5);
    scene.frame(4200); assert.equal(scene.lowQuality, true); assert.equal(ratio, 1); assert.equal(scene.renderer.shadowMap.enabled, false); assert.equal(resized, 1);
    const count = scheduled; scene.resume(); scene.resume(); assert.equal(scheduled, count);
    scene.pause(); assert.equal(cancelled, 1); assert.equal(scene.frameId, null);
    scene.resume(); scene.resume(); assert.equal(scheduled, count + 1); scene.pause();
  } finally { globalThis.requestAnimationFrame = oldRequest; globalThis.cancelAnimationFrame = oldCancel; }
});
test("descarte libera recursos compartilhados uma vez e resolve animações pendentes", () => {
  const oldCancel = globalThis.cancelAnimationFrame; globalThis.cancelAnimationFrame = () => {};
  try {
    const counts = {}, resource = (name) => ({ dispose() { counts[name] = (counts[name] || 0) + 1; } });
    const geometry = resource("geometry"), texture = resource("texture"), material = { ...resource("material"), map: texture };
    let resolved;
    const scene = Object.assign(Object.create(WorkshopScene.prototype), {
      active: true, frameId: 1, tweens: [{ resolve: (value) => { resolved = value; } }],
      factory: { geometries: new Set([geometry]), materials: { shared: material } }, materialsToDispose: new Set([material]),
      scene: { traverse: (visit) => { visit({ geometry, material }); visit({ geometry, material }); } },
      resizeObserver: { disconnect() { counts.observer = 1; } }, canvas: { removeEventListener() { counts.listener = 1; } }, navigation: resource("controls"),
      renderer: { ...resource("renderer"), forceContextLoss() { counts.context = 1; } }, models: new Map(), trays: new Map()
    });
    scene.destroy(); assert.equal(scene.active, false); assert.equal(scene.frameId, null); assert.equal(resolved, false);
    for (const key of ["geometry", "texture", "material", "observer", "listener", "controls", "renderer", "context"]) assert.equal(counts[key], 1, key);
  } finally { globalThis.cancelAnimationFrame = oldCancel; }
});
