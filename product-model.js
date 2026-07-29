import * as THREE from "three";

const canvas = document.querySelector("#productModelCanvas");
const stage = document.querySelector("#productModelStage");

if (canvas && stage) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f7e5c7");

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 8.2);

  const hemisphere = new THREE.HemisphereLight("#fff8e8", "#c69b75", 1.9);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight("#ffffff", 2.2);
  keyLight.position.set(4, 6, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight("#f8d8e0", 0.9);
  fillLight.position.set(-4, 2, 3);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.9, 32),
    new THREE.MeshToonMaterial({ color: "#e8c79f" }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.75;
  floor.receiveShadow = true;
  scene.add(floor);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  const materials = {
    green: new THREE.MeshToonMaterial({ color: "#78c9b0" }),
    deepGreen: new THREE.MeshToonMaterial({ color: "#5e9786" }),
    mint: new THREE.MeshToonMaterial({ color: "#bcebdc" }),
    pink: new THREE.MeshToonMaterial({ color: "#efacc0" }),
    cream: new THREE.MeshToonMaterial({ color: "#fff1ca" }),
    yellow: new THREE.MeshToonMaterial({ color: "#f6d77c" }),
    blue: new THREE.MeshToonMaterial({ color: "#91cfe0" }),
    brown: new THREE.MeshToonMaterial({ color: "#c99670" }),
  };

  const addMesh = (geometry, material, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    modelRoot.add(mesh);
    return mesh;
  };

  const buildStickerPacket = () => {
    addMesh(new THREE.BoxGeometry(2.15, 2.45, 0.24), materials.cream, [0, -0.04, 0]);
    addMesh(new THREE.BoxGeometry(1.82, 1.55, 0.05), materials.green, [0, 0.02, 0.15]);
    addMesh(new THREE.BoxGeometry(2.18, 0.3, 0.28), materials.deepGreen, [0, 1.04, 0]);
    addMesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16),
      materials.yellow,
      [-0.52, 0.22, 0.22],
      [Math.PI / 2, 0, 0],
    );
    addMesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16),
      materials.pink,
      [0.44, -0.24, 0.22],
      [Math.PI / 2, 0, 0],
    );
  };

  const buildCharacterStickerSheet = () => {
    addMesh(new THREE.BoxGeometry(2.2, 2.6, 0.18), materials.cream, [0, 0, 0]);
    addMesh(new THREE.BoxGeometry(1.94, 2.32, 0.05), materials.blue, [0, 0, 0.12]);
    addMesh(new THREE.BoxGeometry(1.94, 0.28, 0.06), materials.pink, [0, 0.97, 0.16]);
    addMesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.08, 20),
      materials.yellow,
      [-0.5, 0.35, 0.2],
      [Math.PI / 2, 0, 0],
    );
    addMesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.08, 20),
      materials.mint,
      [0.48, 0.5, 0.2],
      [Math.PI / 2, 0, 0],
    );
    addMesh(new THREE.BoxGeometry(0.58, 0.58, 0.07), materials.green, [-0.46, -0.56, 0.17], [0, 0, 0.16]);
    addMesh(new THREE.BoxGeometry(0.48, 0.74, 0.07), materials.cream, [0.44, -0.48, 0.17], [0, 0, -0.12]);
  };

  const buildMapStickerSet = () => {
    addMesh(new THREE.BoxGeometry(2.25, 2.55, 0.12), materials.mint, [0.12, 0.1, -0.06], [0, 0, -0.04]);
    addMesh(new THREE.BoxGeometry(2.2, 2.5, 0.12), materials.cream, [-0.08, -0.06, 0.08], [0, 0, 0.05]);
    addMesh(new THREE.BoxGeometry(1.74, 0.25, 0.06), materials.yellow, [-0.06, 0.74, 0.17], [0, 0, 0.05]);
    addMesh(new THREE.BoxGeometry(0.25, 1.46, 0.06), materials.blue, [0.4, -0.12, 0.18], [0, 0, 0.05]);
    addMesh(new THREE.BoxGeometry(1.2, 0.22, 0.06), materials.green, [-0.32, -0.24, 0.18], [0, 0, 0.18]);
    addMesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.08, 20),
      materials.pink,
      [-0.5, 0.3, 0.2],
      [Math.PI / 2, 0, 0],
    );
  };

  const clearModel = () => {
    while (modelRoot.children.length) {
      const child = modelRoot.children.pop();
      child.geometry?.dispose();
    }
  };

  const showProduct = (productId) => {
    clearModel();
    modelRoot.rotation.set(-0.06, -0.35, 0);
    camera.position.z = 8.2;

    if (productId === "merch-02") buildCharacterStickerSheet();
    else if (productId === "merch-03") buildMapStickerSet();
    else buildStickerPacket();
  };

  let active = false;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  let targetRotationX = -0.08;
  let targetRotationY = -0.45;

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetRotationY += (event.clientX - previousX) * 0.012;
    targetRotationX = THREE.MathUtils.clamp(
      targetRotationX + (event.clientY - previousY) * 0.008,
      -0.55,
      0.55,
    );
    previousX = event.clientX;
    previousY = event.clientY;
  });

  const stopDragging = (event) => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z + event.deltaY * 0.004,
        4.8,
        8.8,
      );
    },
    { passive: false },
  );

  const resize = () => {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  new ResizeObserver(resize).observe(stage);
  resize();

  const render = () => {
    window.requestAnimationFrame(render);
    if (!active) return;

    if (!dragging) targetRotationY += 0.003;
    modelRoot.rotation.x += (targetRotationX - modelRoot.rotation.x) * 0.08;
    modelRoot.rotation.y += (targetRotationY - modelRoot.rotation.y) * 0.08;
    renderer.render(scene, camera);
  };

  window.addEventListener("shop:product-open", (event) => {
    showProduct(event.detail?.productId);
    active = true;
    resize();
  });

  window.addEventListener("shop:product-close", () => {
    active = false;
  });

  render();
}
