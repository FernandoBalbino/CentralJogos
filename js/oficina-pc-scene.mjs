import * as THREE from "../vendor/three/three.module.min.js";
import { COMPONENTS, CASE_POSES, WORKBENCH, TRAY_POSITIONS, REMOVED_HDD_POSITION, RETIRED_RAM_POSITION, CONNECTION_STARTS, MOUSE_POSITION, EXPLODED_OFFSETS, choicesFor, targetComponent, isUprightPhase } from "./oficina-pc-data.mjs";
import { createModelFactory } from "./oficina-pc-models.mjs";
import { WorkshopCamera } from "./oficina-pc-camera.mjs";

export class WorkshopScene {
  constructor(container, { onMetrics = () => {}, reducedMotion = false, onContextLost = () => {} } = {}) {
    this.container = container; this.reducedMotion = reducedMotion; this.onMetrics = onMetrics;
    this.canvas = container.querySelector("canvas"); this.active = true; this.tweens = []; this.fans = [];
    this.materialsToDispose = new Set(); this.models = new Map(); this.trays = new Map(); this.vector = new THREE.Vector3();
    const gl = this.canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) throw new Error("Seu navegador ou dispositivo não oferece suporte à experiência 3D.");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context: gl, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.35;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0xe7ece8);
    this.scene.fog = new THREE.Fog(0xe7ece8, 24, 45);
    this.camera = new THREE.PerspectiveCamera(39, 1, .1, 65);
    this.navigation = new WorkshopCamera(this.camera, this.canvas, reducedMotion);
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.plane = new THREE.Plane();
    this.factory = createModelFactory();
    this.workshop = this.factory.createWorkshop(); this.scene.add(this.workshop);
    this.caseGroup = this.factory.createCase(); this.scene.add(this.caseGroup);
    this.caseMaterials = new Set();
    this.caseGroup.getObjectByName("case-panels").traverse((mesh) => { if (!mesh.material) return; mesh.material = mesh.material.clone(); this.caseMaterials.add(mesh.material); mesh.castShadow = true; });
    this.caseGroup.position.set(...CASE_POSES.flat.position); this.caseGroup.rotation.set(...CASE_POSES.flat.rotation); this.pose = "flat";
    const light = new THREE.DirectionalLight(0xffeed5, 3.3); light.position.set(-3, 10, 7); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024); Object.assign(light.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: .5, far: 30 }); light.shadow.bias = -.001;
    this.scene.add(light, new THREE.HemisphereLight(0xe7f7ff, 0x838971, 2.3));
    const fill = new THREE.DirectionalLight(0xb8eee8, 1.7); fill.position.set(5, 4, -2); this.scene.add(fill);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd9e2da, roughness: .88 }); this.materialsToDispose.add(floorMaterial);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.y = -.15; floor.receiveShadow = true; this.scene.add(floor);
    this.workshop.children[1].receiveShadow = true;
    const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0x26bfb2, emissive: 0x08796c, emissiveIntensity: .35, transparent: true, opacity: .30, depthWrite: false });
    this.ghostMaterial = ghostMaterial; this.materialsToDispose.add(ghostMaterial);
    Object.keys(COMPONENTS).forEach((id) => {
      const installed = this.factory.create(id); installed.visible = false; installed.userData.kind = "installed"; (COMPONENTS[id].anchorSpace === "world" ? this.scene : this.caseGroup).add(installed); this.models.set(id, installed);
      const tray = this.factory.create(id); tray.visible = false; tray.userData.kind = "tray"; this.scene.add(tray); this.trays.set(id, tray);
    });
    this.screen = this.workshop.getObjectByName("monitor-screen"); this.screen.material = this.screen.material.clone(); this.materialsToDispose.add(this.screen.material);
    this.screenReady = this.workshop.getObjectByName("monitor-ready");
    this.monitorPointer = this.workshop.getObjectByName("monitor-pointer");
    this.retiredRam = this.factory.create("ram"); this.retiredRam.visible = false; this.scene.add(this.retiredRam);
    this.cables = ["power-plug", "mouse-usb"].map((id) => { const mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.factory.materials.dark); mesh.userData.cableId = id; this.scene.add(mesh); return mesh; });
    this.led = this.caseGroup.getObjectByName("power-led"); this.led.visible = false;
    this.highlight = new THREE.BoxHelper(undefined, 0xf6b842); this.highlight.visible = false; this.scene.add(this.highlight);
    this.inspector = new THREE.Group(); this.inspector.visible = false; this.scene.add(this.inspector);
    this.scene.traverse((object) => { if (object.name === "fan") this.fans.push(object); });
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
    this.lostHandler = (event) => { event.preventDefault(); this.pause(); onContextLost(); };
    this.canvas.addEventListener("webglcontextlost", this.lostHandler);
    this.metricStart = performance.now(); this.metricFrames = 0; this.lowSamples = 0;
    this.frame = this.frame.bind(this); this.resume();
  }
  resize() {
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }
  tween(object, position, rotation, scale = 1, duration = 650) {
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    return new Promise((resolve) => this.tweens.push({ object, from: object.position.clone(), to: new THREE.Vector3(...position), fromQuaternion: object.quaternion.clone(), quaternion, fromScale: object.scale.clone(), scale: new THREE.Vector3(scale, scale, scale), start: performance.now(), duration: this.reducedMotion ? 100 : duration, resolve }));
  }
  sync(state) {
    const previousPhase = this.state?.phase;
    this.state = state;
    if (["SELECT_SSD", "SELECT_RAM", "CONNECT_MOUSE", "CONNECT_POWER"].includes(state.phase) && previousPhase !== state.phase) this.navigation.overview(isUprightPhase(state.phase), this.container.clientWidth < 600);
    const pose = isUprightPhase(state.phase) ? "upright" : "flat";
    if (pose !== this.pose) {
      this.pose = pose;
      const configuration = CASE_POSES[pose]; this.tween(this.caseGroup, configuration.position, configuration.rotation, 1, 1000);
      this.navigation.overview(pose === "upright", this.container.clientWidth < 600);
    }
    this.models.forEach((model, id) => {
      const special = ["mouse", "power-plug", "mouse-usb"].includes(id);
      model.visible = id === "mouse" || (id === "power-plug" ? state.plugged : id === "mouse-usb" ? state.mouseConnected : state.installed.includes(id)); if (!model.visible) return;
      const parent = COMPONENTS[id].anchorSpace === "world" ? this.scene : this.caseGroup;
      if (model.parent !== parent) parent.add(model);
      if (special) { model.position.set(...COMPONENTS[id].snapPosition); model.rotation.set(0, 0, 0); model.scale.setScalar(1); return; }
      const position = COMPONENTS[id].snapPosition.map((value, i) => value + (this.exploded ? EXPLODED_OFFSETS[id][i] : 0));
      model.position.set(...position); model.rotation.set(...COMPONENTS[id].snapRotation); model.scale.setScalar(1);
    });
    const choices = ["INTRO", "TUTORIAL", "CASE"].includes(state.phase) ? ["gpu", "hdd", "motherboard"] : choicesFor(state.phase, state.installed);
    this.trays.forEach((model, id) => {
      const removedHdd = id === "hdd" && state.hddRemoved;
      const cable = id === "power-plug" && !state.plugged && state.installed.includes("psu") || id === "mouse-usb" && !state.mouseConnected;
      model.visible = id !== "mouse" && (choices.includes(id) || removedHdd || cable);
      if (!model.visible) return;
      if (model.parent !== this.scene) this.scene.add(model);
      model.userData.kind = choices.includes(id) ? "tray" : "removed";
      const slot = CONNECTION_STARTS[id] || (choices.includes(id) ? TRAY_POSITIONS[choices.indexOf(id)] : REMOVED_HDD_POSITION);
      this.placeOnWorkbench(model, id, slot);
    });
    this.retiredRam.visible = state.ramRemoved; if (this.retiredRam.visible) this.placeOnWorkbench(this.retiredRam, "ram", RETIRED_RAM_POSITION);
    const expected = targetComponent(state.phase);
    if (this.ghost) { this.ghost.parent?.remove(this.ghost); this.ghost = null; }
    if (expected && state.selectedId === expected) {
      this.ghost = this.factory.create(expected); this.ghost.traverse((mesh) => { if (mesh.material) mesh.material = this.ghostMaterial; });
      this.ghost.position.set(...COMPONENTS[expected].snapPosition); (COMPONENTS[expected].anchorSpace === "world" ? this.scene : this.caseGroup).add(this.ghost);
    }
    this.showHighlight(state.selectedId, choices.includes(state.selectedId) ? "tray" : "installed");
    this.setPower(state.powered);
    this.monitorPointer.visible = state.powered && state.mouseTested;
    this.updateLabels();
  }
  showHighlight(id, kind = "tray") {
    const object = (kind === "installed" ? this.models : this.trays).get(id);
    this.highlight.visible = Boolean(object?.visible && !this.examining); this.highlightObject = this.highlight.visible ? object : null;
    if (this.highlightObject) { this.scene.updateMatrixWorld(true); this.highlight.setFromObject(object); }
  }
  placeOnWorkbench(model, id, slot) {
    model.position.set(slot[0], 0, slot[2]); model.rotation.set(...COMPONENTS[id].startRotation); model.scale.setScalar(COMPONENTS[id].startScale);
    model.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(model);
    model.position.y += WORKBENCH.surfaceY - bounds.min.y + .012;
  }
  focus(id) {
    const target = this.snapWorld(id); this.navigation.focus(target, COMPONENTS[id].cameraOffset);
  }
  snapWorld(id) { if (COMPONENTS[id].anchorSpace === "world") return COMPONENTS[id].snapPosition; this.caseGroup.updateWorldMatrix(true, false); return this.caseGroup.localToWorld(new THREE.Vector3(...COMPONENTS[id].snapPosition)).toArray(); }
  toLocal(world) { return this.caseGroup.worldToLocal(new THREE.Vector3(...world)).toArray(); }
  pick(x, y) {
    this.setRay(x, y);
    const candidates = [...this.models.values(), ...this.trays.values()].filter((object) => object.visible && object.parent.visible);
    this.caseGroup.traverse((object) => { if (object.userData.power && this.caseGroup.visible) candidates.push(object); });
    const hits = this.raycaster.intersectObjects(candidates, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && !object.userData.componentId && !object.userData.power) object = object.parent;
      if (object?.userData.power) return { power: true, object };
      if (object) return { componentId: object.userData.componentId, kind: object.userData.kind, object };
    }
    return null;
  }
  setRay(x, y) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set((x - bounds.left) / bounds.width * 2 - 1, -(y - bounds.top) / bounds.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }
  beginDrag(hit, x, y, removing = false) {
    this.navigation.tween = null; this.navigation.controls.enabled = false;
    this.scene.updateMatrixWorld(true);
    const origin = hit.object.getWorldPosition(new THREE.Vector3());
    const planePoint = removing ? origin : new THREE.Vector3(...this.snapWorld(hit.componentId));
    this.plane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()), planePoint);
    this.setRay(x, y); const point = this.raycaster.ray.intersectPlane(this.plane, new THREE.Vector3());
    if (!point) return;
    this.scene.attach(hit.object);
    this.drag = { ...hit, origin: hit.object.position.clone(), rotation: hit.object.rotation.clone(), scale: hit.object.scale.clone(), offset: origin.sub(point), removing };
  }
  dragTo(x, y) {
    if (!this.drag) return;
    this.setRay(x, y); const point = this.raycaster.ray.intersectPlane(this.plane, this.vector); if (!point) return;
    this.drag.object.position.copy(point).add(this.drag.offset); this.dragPoint = point.toArray();
    if (!this.drag.removing) {
      const projected = new THREE.Vector3(...this.snapWorld(this.drag.componentId)).project(this.camera), bounds = this.canvas.getBoundingClientRect();
      const px = bounds.left + (projected.x + 1) * bounds.width / 2, py = bounds.top + (1 - projected.y) * bounds.height / 2;
      this.nearSnap = Math.hypot(x - px, y - py) < 85;
      if (this.nearSnap) this.drag.object.position.lerp(new THREE.Vector3(...this.snapWorld(this.drag.componentId)), .65);
      this.ghostMaterial.opacity = this.nearSnap ? .5 : .3;
    }
  }
  endDrag() {
    const drag = this.drag; if (!drag) return null;
    const world = this.dragPoint || drag.object.position.toArray();
    const position = this.nearSnap && !drag.removing ? COMPONENTS[drag.componentId].snapPosition : COMPONENTS[drag.componentId].anchorSpace === "world" ? world : this.toLocal(world);
    this.drag = null; this.nearSnap = false; this.dragPoint = null; this.navigation.controls.enabled = true;
    return { componentId: drag.componentId, position, removing: drag.removing, object: drag.object };
  }
  cancelDrag() { if (this.drag) { this.endDrag(); if (this.state) this.sync(this.state); } this.navigation.controls.enabled = true; }
  async animateMotion(motion) {
    if (motion.kind === "power") { this.setPower(true); await this.tween(this.caseGroup, CASE_POSES.upright.position, CASE_POSES.upright.rotation, 1, 900); return; }
    if (motion.kind === "mouse-test") { this.monitorPointer.visible = true; this.monitorPointer.position.x = .8; await this.tween(this.monitorPointer, [2.3, 3.42, -3.214], [0, 0, -.4], 1, 1100); return; }
    const id = motion.componentId;
    if (motion.kind === "remove") {
      const object = this.models.get(id); this.scene.attach(object);
      await this.tween(object, id === "ram" ? RETIRED_RAM_POSITION : REMOVED_HDD_POSITION, COMPONENTS[id].startRotation, COMPONENTS[id].startScale, 750);
    } else {
      const object = this.trays.get(id); (COMPONENTS[id].anchorSpace === "world" ? this.scene : this.caseGroup).attach(object);
      await this.tween(object, COMPONENTS[id].snapPosition, COMPONENTS[id].snapRotation, 1, 600);
    }
  }
  examine(id) {
    if (this.examining) return;
    this.examining = id; this.workshop.visible = false; this.caseGroup.visible = false; this.trays.forEach((model) => { model.visible = false; }); this.models.forEach((model) => { if (model.parent === this.scene) model.visible = false; }); this.retiredRam.visible = false; this.cables.forEach((line) => { line.visible = false; }); this.highlight.visible = false;
    this.examineModel = this.factory.create(id);
    const bounds = new THREE.Box3().setFromObject(this.examineModel), size = bounds.getSize(new THREE.Vector3());
    this.examineModel.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z));
    if (["hdd", "ssd", "psu"].includes(id)) this.examineModel.rotation.x = Math.PI / 3;
    this.inspector.add(this.examineModel); this.inspector.position.set(0, 1.8, 0); this.inspector.visible = true;
    this.navigation.examine(); this.updateLabels();
  }
  closeExamine() {
    if (!this.examining) return;
    this.inspector.remove(this.examineModel); this.examineModel = null; this.examining = null;
    this.inspector.visible = false; this.workshop.visible = true; this.caseGroup.visible = true;
    this.sync(this.state); this.navigation.overview(isUprightPhase(this.state.phase), this.container.clientWidth < 600);
  }
  setXray(enabled) {
    this.xray = enabled; this.caseMaterials.forEach((material) => { material.transparent = enabled; material.opacity = enabled ? .19 : 1; material.depthWrite = !enabled; material.needsUpdate = true; });
  }
  async setExploded(enabled) {
    this.exploded = enabled;
    await Promise.all(this.state.installed.map((id) => this.tween(this.models.get(id), COMPONENTS[id].snapPosition.map((value, i) => value + (enabled ? EXPLODED_OFFSETS[id][i] : 0)), COMPONENTS[id].snapRotation, 1, 900)));
    this.navigation.overview(true, this.container.clientWidth < 600); this.updateLabels();
  }
  setPower(on) {
    this.powered = on; this.led.visible = on;
    this.screenReady.visible = on;
    this.screen.material.color.setHex(on ? 0x168f80 : 0x171e2a); this.screen.material.emissive.setHex(on ? 0x09664f : 0); this.screen.material.emissiveIntensity = on ? .5 : 0;
  }
  updateLabels() {
    this.scene.updateMatrixWorld(true);
    this.container.querySelectorAll("[data-part-label]").forEach((label) => {
      const model = this.models.get(label.dataset.partLabel);
      label.hidden = Boolean(this.examining || !this.exploded || !model?.visible);
      if (!label.hidden) this.placeLabel(label, model.getWorldPosition(new THREE.Vector3()));
    });
    const anchor = this.container.querySelector("[data-snap-label]");
    if (anchor) {
      anchor.hidden = !this.ghost || Boolean(this.examining);
      if (!anchor.hidden) this.placeLabel(anchor, new THREE.Vector3(...this.snapWorld(this.state.selectedId)));
    }
  }
  updateCables() {
    this.cables?.forEach((line) => {
      const id = line.userData.cableId, object = this.models.get(id).visible ? this.models.get(id) : this.trays.get(id);
      line.visible = !this.examining && object.visible; if (!line.visible) return;
      const from = id === "mouse-usb" ? new THREE.Vector3(...MOUSE_POSITION).add(new THREE.Vector3(0, 0, -.36)) : this.caseGroup.localToWorld(new THREE.Vector3(-.65, -1.4, -.86));
      const end = object.localToWorld(new THREE.Vector3(0, 0, .32));
      const signature = [this.state.plugged, this.state.mouseConnected, this.drag?.componentId === id, ...[...from.toArray(), ...end.toArray()].map((value) => value.toFixed(2))].join(",");
      if (signature === line.userData.signature) return;
      line.userData.signature = signature;
      const y = WORKBENCH.surfaceY + .045;
      const positions = id === "power-plug" ? (this.state.plugged || this.drag?.componentId === id ? [from.toArray(), [from.x - .55, y, -3.65], [-1.8, y, -3.75], [5.8, y, -3.75], [7.55, y, -3.3], [7.6, y, 1.9], [end.x + .35, end.y - .15, end.z + .2], end.toArray()] : [from.toArray(), [from.x - .5, y, -.8], [-4.8, y, 2.7], [-3.4, y, 3.3], [end.x - .5, y, 3.3], end.toArray()]) : (this.state.mouseConnected || this.drag?.componentId === id ? [from.toArray(), [3.5, y, -3.1], [2.5, y, -3.42], [-.4, y, -3.42], [-1.3, y, -2.4], [-1.65, y, -.8], [end.x + .25, end.y - .35, end.z + .3], end.toArray()] : [from.toArray(), [3.6, y, -3], [4.3, y, -2.6], [4.6, y, -1.9], end.toArray()]);
      const curve = new THREE.CatmullRomCurve3(positions.map((point) => new THREE.Vector3(...point)), false, "centripetal");
      const curvePoint = curve.getPoint.bind(curve);
      curve.getPoint = (t, target = new THREE.Vector3()) => { curvePoint(t, target); target.y = Math.max(y, target.y); target.x = THREE.MathUtils.clamp(target.x, -WORKBENCH.width / 2 + .12, WORKBENCH.width / 2 - .12); target.z = THREE.MathUtils.clamp(target.z, WORKBENCH.centerZ - WORKBENCH.depth / 2 + .12, WORKBENCH.centerZ + WORKBENCH.depth / 2 - .12); return target; };
      const geometry = new THREE.TubeGeometry(curve, 64, id === "power-plug" ? .025 : .018, 5, false);
      line.geometry.dispose(); line.geometry = geometry;
    });
  }
  placeLabel(label, point) {
    point.project(this.camera);
    label.style.left = `${Math.max(6, Math.min(94, (point.x + 1) * 50))}%`;
    label.style.top = `${Math.max(8, Math.min(92, (1 - point.y) * 50))}%`;
  }
  frame(now) {
    this.frameId = null; if (!this.active || this.paused) return;
    const dt = Math.min(.05, Math.max(0, (now - (this.lastFrame || now)) / 1000)); this.lastFrame = now;
    this.navigation.update(now);
    this.tweens = this.tweens.filter((tween) => {
      const t = Math.min(1, Math.max(0, (now - tween.start) / tween.duration)), eased = t * t * (3 - 2 * t);
      tween.object.position.lerpVectors(tween.from, tween.to, eased); tween.object.quaternion.slerpQuaternions(tween.fromQuaternion, tween.quaternion, eased); tween.object.scale.lerpVectors(tween.fromScale, tween.scale, eased);
      if (t === 1) { tween.resolve(true); return false; } return true;
    });
    if (this.powered && !this.reducedMotion) this.fans.forEach((fan) => { if (fan.parent.visible) fan.rotation.z += dt * 8; });
    this.navigation.controls.autoRotate = Boolean(this.state?.phase === "COMPLETED" && !this.exploded && !this.examining && !this.reducedMotion && !this.navigation.tween && !this.drag);
    this.navigation.controls.autoRotateSpeed = .35;
    if (this.highlightObject && this.highlight.visible) this.highlight.setFromObject(this.highlightObject);
    this.updateLabels(); this.updateCables(); this.renderer.render(this.scene, this.camera); this.metricFrames++;
    if (now - this.metricStart >= 2000) {
      const fps = this.metricFrames * 1000 / (now - this.metricStart);
      if (fps < 30) this.lowSamples++; else this.lowSamples = 0;
      if (this.lowSamples >= 2 && !this.lowQuality) { this.lowQuality = true; this.renderer.setPixelRatio(1); this.renderer.shadowMap.enabled = false; this.resize(); }
      this.onMetrics({ fps: Math.round(fps), triangles: this.renderer.info.render.triangles, calls: this.renderer.info.render.calls, quality: this.lowQuality ? "economy" : "normal" });
      this.metricFrames = 0; this.metricStart = now;
    }
    this.frameId = requestAnimationFrame(this.frame);
  }
  pause() { if (this.frameId) cancelAnimationFrame(this.frameId); this.frameId = null; this.paused = true; this.pauseAt = performance.now(); this.cancelDrag(); }
  resume() {
    if (!this.active || this.frameId) return;
    if (this.pauseAt) { const elapsed = performance.now() - this.pauseAt; this.tweens.forEach((tween) => { tween.start += elapsed; }); if (this.navigation.tween) this.navigation.tween.started += elapsed; }
    this.paused = false; this.pauseAt = null; this.lastFrame = null; this.metricStart = performance.now(); this.metricFrames = 0; this.frameId = requestAnimationFrame(this.frame);
  }
  destroy() {
    this.active = false; if (this.frameId) cancelAnimationFrame(this.frameId); this.frameId = null;
    this.tweens.forEach((tween) => tween.resolve(false)); this.tweens = [];
    this.resizeObserver.disconnect(); this.canvas.removeEventListener("webglcontextlost", this.lostHandler); this.navigation.dispose();
    const geometries = new Set(this.factory.geometries), materials = new Set([...this.materialsToDispose, ...Object.values(this.factory.materials)]), textures = new Set();
    this.scene.traverse((object) => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material)); });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => { if (material.map) textures.add(material.map); material.dispose(); }); textures.forEach((texture) => texture.dispose());
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.models.clear(); this.trays.clear(); this.fans = [];
  }
}
