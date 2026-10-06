// O gesto só é arraste após ultrapassar o limiar. Um toque comum continua
// sendo seleção; um pointercancel nunca coloca produtos na sacola.
export class ProductGesture {
  constructor() { this.active = null; this.suppressedId = null; }
  start(id, pointerId, x, y) { this.suppressedId = null; this.active = { id, pointerId, x, y, dragging: false }; }
  move(pointerId, x, y) {
    if (!this.active || this.active.pointerId !== pointerId) return null;
    if (Math.hypot(x - this.active.x, y - this.active.y) >= 8) this.active.dragging = true;
    return this.active;
  }
  finish(pointerId, inside, cancelled = false) {
    const gesture = this.active;
    if (!gesture || gesture.pointerId !== pointerId) return null;
    this.active = null;
    if (gesture.dragging || cancelled) this.suppressedId = gesture.id;
    return gesture.dragging && inside && !cancelled ? gesture.id : null;
  }
  consumeClick(id) { const suppress = this.suppressedId === id; this.suppressedId = null; return suppress; }
  cancel() { if (this.active) this.suppressedId = this.active.id; this.active = null; }
}
