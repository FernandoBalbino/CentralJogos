import * as THREE from "../vendor/three/three.module.min.js";
import { WORKBENCH, OUTLET_POSITION } from "./oficina-pc-data.mjs";

// Formas originais; materiais e geometrias são compartilhados por todas as cópias.
export function createModelFactory() {
  const materials = {
    shell: new THREE.MeshStandardMaterial({ color: 0xe9e9e4, metalness: .35, roughness: .42 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x24344a, metalness: .2, roughness: .54 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x171e2a, roughness: .57 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x197567, metalness: .12, roughness: .54 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd4a851, metalness: .65, roughness: .32 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xafbfca, metalness: .65, roughness: .37 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x16b5ae, roughness: .36 }),
    copper: new THREE.MeshStandardMaterial({ color: 0x9e5c37, metalness: .55, roughness: .38 }),
    label: new THREE.MeshStandardMaterial({ color: 0xf5f3e9, roughness: .85 }),
    glow: new THREE.MeshStandardMaterial({ color: 0x65f7dd, emissive: 0x21caaa, emissiveIntensity: 1, roughness: .35 })
  };
  const geometries = new Set();
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1); geometries.add(boxGeometry);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16); geometries.add(cylinderGeometry);
  const ringGeometry = new THREE.TorusGeometry(1, .035, 4, 24); geometries.add(ringGeometry);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 10); geometries.add(sphereGeometry);
  const prototypes = new Map();
  const box = (parent, size, position, material = "dark") => {
    const mesh = new THREE.Mesh(boxGeometry, materials[material]); mesh.scale.set(...size); mesh.position.set(...position); parent.add(mesh); return mesh;
  };
  const cylinder = (parent, radius, depth, position, material = "silver") => {
    const mesh = new THREE.Mesh(cylinderGeometry, materials[material]); mesh.scale.set(radius, depth, radius); mesh.position.set(...position); mesh.rotation.x = Math.PI / 2; parent.add(mesh); return mesh;
  };
  const repeatBoxes = (parent, positions, size, material) => {
    const mesh = new THREE.InstancedMesh(boxGeometry, materials[material], positions.length);
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(...size);
    positions.forEach((position, index) => mesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(...position), quaternion, scale)));
    parent.add(mesh); return mesh;
  };
  const fan = (parent, radius, position) => {
    const frame = new THREE.Group(); frame.position.set(...position); parent.add(frame);
    const ring = new THREE.Mesh(ringGeometry, materials.navy); ring.scale.setScalar(radius); frame.add(ring);
    const blades = new THREE.Group(); blades.name = "fan"; frame.add(blades);
    cylinder(blades, radius * .19, .09, [0, 0, .035], "silver");
    const rotor = new THREE.InstancedMesh(boxGeometry, materials.dark, 7);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      matrix.compose(new THREE.Vector3(Math.cos(angle) * radius * .51, Math.sin(angle) * radius * .51, .035), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle + .5)), new THREE.Vector3(radius * .48, radius * .17, .04));
      rotor.setMatrixAt(i, matrix);
    }
    blades.add(rotor);
    return frame;
  };
  const textPlate = (parent, text, size, position, rotation = [0, 0, 0]) => {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
    const context = canvas.getContext("2d"); context.fillStyle = "#f7f5ee"; context.fillRect(0, 0, 256, 128);
    context.fillStyle = "#193b4b"; context.font = "bold 34px sans-serif"; context.textAlign = "center"; context.fillText(text, 128, 57);
    context.fillStyle = "#168b80"; context.fillRect(32, 82, 192, 5);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .8 });
    const geometry = new THREE.PlaneGeometry(...size); geometries.add(geometry);
    const plane = new THREE.Mesh(geometry, material); plane.position.set(...position); plane.rotation.set(...rotation); parent.add(plane); return plane;
  };
  function build(id) {
    const group = new THREE.Group(); group.name = id; group.userData.componentId = id;
    switch (id) {
      case "mouse": {
        const body = new THREE.Mesh(sphereGeometry, materials.navy); body.scale.set(.28, .17, .42); body.position.y = .08; group.add(body);
        repeatBoxes(group, [[-.12, .21, -.14], [.12, .21, -.14]], [.19, .04, .3], "shell");
        box(group, [.055, .045, .15], [0, .245, -.14], "teal");
        break;
      }
      case "power-plug":
        box(group, [.38, .38, .22], [0, 0, .1], "navy");
        repeatBoxes(group, [[-.1, .04, -.12], [.1, .04, -.12], [0, -.1, -.12]], [.045, .045, .22], "silver");
        box(group, [.14, .14, .18], [0, 0, .27], "dark");
        break;
      case "mouse-usb":
        box(group, [.27, .13, .28], [0, 0, .14], "navy");
        box(group, [.23, .105, .2], [0, 0, -.08], "silver");
        box(group, [.17, .055, .012], [0, 0, -.185], "dark");
        break;
      case "motherboard": {
        box(group, [2.3, 2.65, .08], [0, 0, 0], "pcb");
        box(group, [.7, .7, .08], [-.45, .63, .065], "silver");
        box(group, [.58, .58, .055], [-.45, .63, .12], "dark");
        repeatBoxes(group, [[.68, .35, .13], [.9, .35, .13]], [.1, 1.6, .16], "dark");
        repeatBoxes(group, [[-.12, -.76, .12], [-.12, -1.03, .12]], [1.68, .08, .16], "dark");
        repeatBoxes(group, [[-.98, .85, .12], [-.98, .42, .12], [-.98, -.01, .12]], [.3, .36, .23], "silver");
        box(group, [.44, .44, .12], [.35, -.25, .10], "navy");
        repeatBoxes(group, Array.from({ length: 8 }, (_, i) => [-.76 + i * .18, -1.24, .08]), [.06, .08, .045], "gold");
        repeatBoxes(group, Array.from({ length: 6 }, (_, i) => [-.65 + i * .12, 1.1, .08]), [.08, .20, .08], "navy");
        repeatBoxes(group, Array.from({ length: 7 }, (_, i) => [-.65 + i * .22, .06, .047]), [.012, .82, .008], "teal");
        box(group, [.72, .10, .09], [.24, -.53, .09], "dark"); // representação discreta de M.2
        cylinder(group, .11, .08, [.67, -.75, .1]);
        break;
      }
      case "cpu":
        box(group, [.55, .55, .055], [0, 0, 0], "pcb");
        box(group, [.47, .47, .065], [0, 0, .05], "silver");
        repeatBoxes(group, Array.from({ length: 16 }, (_, i) => [(i % 4 - 1.5) * .11, (Math.floor(i / 4) - 1.5) * .11, -.034]), [.065, .065, .01], "gold");
        textPlate(group, "CPU", [.31, .16], [0, 0, .086]);
        break;
      case "ram":
        box(group, [.07, 1.45, .44], [0, 0, 0], "pcb");
        repeatBoxes(group, Array.from({ length: 8 }, (_, i) => [.05, -.6 + i * .17, .05]), [.05, .12, .24], "dark");
        repeatBoxes(group, Array.from({ length: 20 }, (_, i) => [.047, -.69 + i * .071, -.195]), [.028, .038, .05], "gold");
        box(group, [.09, .08, .06], [0, .15, -.20], "navy");
        break;
      case "cooler":
        box(group, [.76, .76, .40], [0, 0, -.10], "silver");
        repeatBoxes(group, Array.from({ length: 9 }, (_, i) => [-.37 + i * .09, 0, -.10]), [.014, .80, .43], "dark");
        box(group, [.86, .86, .07], [0, 0, .15], "navy");
        fan(group, .35, [0, 0, .20]);
        repeatBoxes(group, [[-.23, 0, -.22], [.23, 0, -.22]], [.06, .84, .07], "copper");
        break;
      case "gpu":
        box(group, [2.25, .40, .07], [0, 0, -.25], "pcb");
        box(group, [2.18, .56, .40], [0, 0, 0], "navy");
        box(group, [.08, .68, .68], [-1.14, 0, -.04], "silver");
        fan(group, .23, [-.54, 0, .23]); fan(group, .23, [.44, 0, .23]);
        repeatBoxes(group, Array.from({ length: 18 }, (_, i) => [-.86 + i * .055, -.255, -.27]), [.025, .07, .025], "gold");
        repeatBoxes(group, [[-1.19, .17, .06], [-1.19, -.07, .06]], [.03, .11, .27], "dark");
        break;
      case "hdd":
        box(group, [.95, .25, 1.32], [0, 0, 0], "silver");
        box(group, [.88, .06, 1.24], [0, .148, 0], "label");
        textPlate(group, 'HD 3.5"', [.75, .44], [0, .182, .1], [-Math.PI / 2, 0, 0]);
        repeatBoxes(group, [[-.36, .181, -.48], [.36, .181, -.48], [-.36, .181, .48], [.36, .181, .48]], [.045, .008, .045], "dark");
        box(group, [.52, .11, .09], [.07, 0, -.66], "dark");
        break;
      case "ssd":
        box(group, [.72, .14, .98], [0, 0, 0], "navy");
        textPlate(group, "SSD SATA", [.61, .36], [0, .075, .02], [-Math.PI / 2, 0, 0]);
        box(group, [.48, .06, .06], [.04, -.02, -.49], "gold");
        break;
      case "psu":
        box(group, [1.25, .82, 1.25], [0, 0, 0], "navy");
        fan(group, .32, [0, 0, .635]);
        repeatBoxes(group, Array.from({ length: 9 }, (_, i) => [-.48 + i * .12, 0, .68]), [.027, .71, .024], "silver");
        textPlate(group, "FONTE", [.76, .3], [0, .42, .03], [-Math.PI / 2, 0, 0]);
        break;
    }
    return group;
  }
  function create(id) {
    if (!prototypes.has(id)) prototypes.set(id, build(id));
    return prototypes.get(id).clone(true);
  }
  function createCase() {
    const group = new THREE.Group();
    const panels = new THREE.Group(); panels.name = "case-panels"; group.add(panels);
    box(panels, [2.9, 4.06, .09], [0, 0, -.8], "shell");
    box(panels, [2.9, .09, 1.7], [0, -2, 0], "shell");
    box(panels, [2.9, .09, 1.7], [0, 2, 0], "shell");
    box(panels, [.10, 4, 1.7], [-1.45, 0, 0], "shell");
    // A face direita é aberta na montagem; moldura mantém a forma do gabinete.
    box(panels, [.12, 4, .13], [1.45, 0, -.75], "shell");
    box(panels, [.12, 4, .13], [1.45, 0, .78], "shell");
    box(group, [2.7, .06, 1.5], [0, -.93, 0], "navy");
    repeatBoxes(group, Array.from({ length: 12 }, (_, i) => [-1.18 + i * .21, 1.88, .85]), [.10, .028, .008], "navy");
    const power = cylinder(group, .16, .07, [1.08, 1.68, .86], "teal"); power.userData.power = true;
    textPlate(group, "POWER", [.48, .18], [.98, 1.35, .87]);
    const led = cylinder(group, .06, .025, [.75, 1.68, .86], "glow"); led.name = "power-led";
    box(group, [.39, .25, .06], [1.48, -1.45, .86], "silver");
    box(group, [.28, .13, .03], [1.48, -1.45, .9], "dark");
    textPlate(group, "USB", [.35, .16], [1.48, -1.7, .88]);
    fan(group, .37, [-.88, -.34, -.69]);
    return group;
  }
  function createWorkshop() {
    const group = new THREE.Group();
    box(group, [WORKBENCH.width, .22, WORKBENCH.depth], [0, 1.1, WORKBENCH.centerZ], "label");
    box(group, [WORKBENCH.width - .04, .06, WORKBENCH.depth - .04], [0, 1.25, WORKBENCH.centerZ], "shell");
    repeatBoxes(group, [[-7.2, .45, -3.4], [7.2, .45, -3.4], [-7.2, .45, 3], [7.2, .45, 3]], [.18, 1.1, .18], "navy");
    box(group, [WORKBENCH.width, .12, .1], [0, .6, -3.4], "teal");
    box(group, [3.1, 1.85, .15], [1.5, 3.08, -3.35], "navy");
    const screen = box(group, [2.85, 1.6, .025], [1.5, 3.08, -3.258], "dark"); screen.name = "monitor-screen";
    const ready = textPlate(group, "PRONTO!", [1.8, .65], [1.5, 3.08, -3.226]); ready.name = "monitor-ready"; ready.visible = false;
    box(group, [.15, .95, .16], [1.5, 1.83, -3.35], "silver");
    box(group, [1.1, .07, .6], [1.5, 1.32, -3.25], "navy");
    box(group, [2.5, .07, .82], [1.5, 1.35, -2.65], "navy");
    repeatBoxes(group, Array.from({ length: 30 }, (_, i) => [.48 + (i % 10) * .22, 1.40, -2.9 + Math.floor(i / 10) * .2]), [.16, .04, .13], "shell");
    textPlate(group, "OFICINA DO PC", [2.75, .95], [-3.4, 5, -3.95]);
    const wallGeometry = new THREE.PlaneGeometry(18, 7); geometries.add(wallGeometry);
    const wall = new THREE.Mesh(wallGeometry, materials.label); wall.name = "workshop-wall"; wall.position.set(0, 3.1, -4.2); group.add(wall);
    repeatBoxes(group, [[4.8, 4.5, -4.05], [4.8, 3.9, -4.05]], [2.5, .06, .16], "teal");
    const outlet = new THREE.Group(); outlet.position.set(...OUTLET_POSITION); group.add(outlet);
    box(outlet, [.78, 1.16, .2], [0, -.1, -.02], "shell");
    repeatBoxes(outlet, [[-.1, .04, .09], [.1, .04, .09], [0, -.1, .09]], [.07, .07, .012], "dark");
    box(outlet, [.9, .08, .65], [0, -.57, .05], "navy");
    textPlate(outlet, "TOMADA", [.66, .19], [0, .39, .09]);
    const pointer = new THREE.Group(); pointer.position.set(1.1, 3.08, -3.214); pointer.name = "monitor-pointer"; pointer.rotation.z = -.4; pointer.visible = false; group.add(pointer);
    box(pointer, [.12, .17, .016], [0, 0, 0], "shell");
    return group;
  }
  function dispose() {
    const allMaterials = new Set(Object.values(materials));
    prototypes.forEach((model) => model.traverse((object) => { if (object.material) allMaterials.add(object.material); }));
    // Objetos do ambiente podem conter placas de texto fora dos protótipos.
    geometries.forEach((geometry) => geometry.dispose());
    allMaterials.forEach((material) => { material.map?.dispose(); material.dispose(); });
  }
  return { create, createCase, createWorkshop, materials, geometries, dispose };
}
