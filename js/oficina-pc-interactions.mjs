import { targetComponent } from "./oficina-pc-data.mjs";

export class WorkshopInteractions {
  constructor(scene, { getState, select, drop, power, inspect }) {
    this.scene = scene; this.getState = getState; this.select = select; this.drop = drop; this.power = power; this.inspect = inspect;
    this.canvas = scene.canvas; this.listeners = [];
    this.listenerOptions = { capture: true };
    const listen = (type, handler) => { this.canvas.addEventListener(type, handler, this.listenerOptions); this.listeners.push([type, handler]); };
    listen("pointerdown", (event) => this.down(event)); listen("pointermove", (event) => this.move(event));
    listen("pointerup", (event) => this.up(event)); listen("pointercancel", () => this.cancel()); listen("lostpointercapture", () => this.cancel());
  }
  down(event) {
    if (event.button !== 0 || this.scene.examining || this.getState().motion) return;
    const hit = this.scene.pick(event.clientX, event.clientY); if (!hit) return;
    // Intercepta a peça antes de OrbitControls iniciar um gesto de câmera.
    event.stopImmediatePropagation();
    const state = this.getState();
    if (hit.power) { this.power(); return; }
    const removable = (state.phase === "REMOVE_HDD" && hit.componentId === "hdd" || state.phase === "REMOVE_RAM" && hit.componentId === "ram") && hit.kind === "installed";
    const draggable = (targetComponent(state.phase) && hit.kind === "tray") || removable;
    this.scene.navigation.controls.enabled = false;
    this.pointer = { id: event.pointerId, hit, x: event.clientX, y: event.clientY, draggable, removable, moved: false };
    this.canvas.setPointerCapture(event.pointerId);
    if (!removable) this.select(hit.componentId, { focus: false });
    event.preventDefault();
  }
  move(event) {
    if (!this.pointer || event.pointerId !== this.pointer.id) return;
    event.stopImmediatePropagation();
    if (!this.pointer.moved && Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 6) {
      this.pointer.moved = true;
      if (this.pointer.draggable) this.scene.beginDrag(this.pointer.hit, this.pointer.x, this.pointer.y, this.pointer.removable);
    }
    if (this.pointer.moved && this.pointer.draggable) this.scene.dragTo(event.clientX, event.clientY);
    event.preventDefault();
  }
  up(event) {
    if (!this.pointer || event.pointerId !== this.pointer.id) return;
    event.stopImmediatePropagation();
    const pointer = this.pointer; this.pointer = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.scene.navigation.controls.enabled = true;
    if (pointer.moved && pointer.draggable) { const result = this.scene.endDrag(); if (result) this.drop(result); }
    else if (!pointer.moved) {
      if (["ASSEMBLED", "COMPLETED"].includes(this.getState().phase)) this.inspect(pointer.hit.componentId);
      else this.select(pointer.hit.componentId, { focus: true });
    }
  }
  cancel() { this.pointer = null; this.scene.cancelDrag(); }
  destroy() { this.cancel(); this.listeners.forEach(([type, handler]) => this.canvas.removeEventListener(type, handler, this.listenerOptions)); this.listeners = []; }
}
