import * as THREE from "../vendor/three/three.module.min.js";
import { OrbitControls } from "../vendor/three/controls/OrbitControls.js";
import { CAMERA_VIEWS } from "./oficina-pc-data.mjs";

export class WorkshopCamera {
  constructor(camera, canvas, reducedMotion = false) {
    this.camera = camera; this.reducedMotion = reducedMotion;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = .09;
    this.controls.enablePan = false; this.controls.minPolarAngle = .18; this.controls.maxPolarAngle = Math.PI * .49;
    this.controls.minDistance = 2.1; this.controls.maxDistance = 27;
    this.controls.target.set(...CAMERA_VIEWS.target); this.camera.position.set(...CAMERA_VIEWS.overview);
    this.controls.update();
    this.controls.addEventListener("start", () => { this.tween = null; });
    this.overview();
  }
  move(position, target, duration = 850) {
    this.tween = { fromPosition: this.camera.position.clone(), fromTarget: this.controls.target.clone(), position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), started: performance.now(), duration: this.reducedMotion ? 120 : duration };
  }
  overview(upright = false, narrow = false) {
    this.move(narrow ? CAMERA_VIEWS.narrow : CAMERA_VIEWS.overview, [0, upright ? 2.5 : 1.9, 0]);
    this.controls.minDistance = 2.1; this.controls.maxDistance = narrow ? 40 : 27;
  }
  focus(worldTarget, offset = [3.3, 4.2, 5.2]) {
    this.move(worldTarget.map((value, i) => value + offset[i]), worldTarget);
  }
  computer() { this.move([3.4, 6.5, 9], [-1.2, 2.8, -.6]); }
  examine() { this.controls.minDistance = 1; this.controls.maxDistance = 8; this.move([2.7, 2, 3.5], [0, 1.8, 0]); }
  rotate(horizontal, vertical = 0) {
    this.tween = null;
    const spherical = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    spherical.theta += horizontal; spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls.update();
  }
  zoom(factor) {
    this.tween = null;
    const direction = this.camera.position.clone().sub(this.controls.target);
    direction.setLength(THREE.MathUtils.clamp(direction.length() * factor, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(direction); this.controls.update();
  }
  update(now) {
    if (this.tween) {
      const t = Math.min(1, Math.max(0, (now - this.tween.started) / this.tween.duration)), eased = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(this.tween.fromPosition, this.tween.position, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.target, eased);
      if (t === 1) this.tween = null;
    }
    this.controls.update();
  }
  dispose() { this.controls.dispose(); this.tween = null; }
}
