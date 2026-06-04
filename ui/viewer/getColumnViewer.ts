import * as THREE from "three";
import van, { State } from "vanjs-core";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getAxes } from "./axes/getAxes";
import { getGrid } from "./grid/getGrid";
import { getRcColumns, RcColumnDetail } from "./rcColumn/getRcColumn";

import "../layout/styles.css";
import "./style.css";

export function getColumnViewer({
  rcColumnDetails,
  controls: controlsOverlay,
}: {
  rcColumnDetails: State<RcColumnDetail[]>;
  controls?: HTMLElement;
}): HTMLDivElement {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181a1f);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.up.set(0, 0, 1);
  camera.position.set(3.35, -4.25, 2.65);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const render = () => renderer.render(scene, camera);

  const container = document.createElement("div");
  container.id = "viewer";
  container.appendChild(renderer.domElement);

  const resize = () => {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.4;
  controls.maxDistance = 8;
  controls.target.set(2, 0, 1.5);
  controls.update();
  controls.addEventListener("change", render);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener("resize", resize);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1f2428, 1.45));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(4, -5, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 14;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x88b8ff, 1.2);
  rimLight.position.set(-3, 3, 4);
  scene.add(rimLight);

  scene.add(
    getGrid({
      grid: {
        size: van.state(4),
        spacing: van.state(0.25),
      },
      render,
    }),
  );
  scene.add(getAxes({ displayScale: van.state(1), render }));
  scene.add(getFooting());

  let columns: THREE.Group | null = null;
  van.derive(() => {
    const details = rcColumnDetails.val;
    if (columns) {
      scene.remove(columns);
      disposeGroup(columns);
    }
    columns = getRcColumns(details);
    scene.add(columns);
    render();
  });

  if (controlsOverlay) container.appendChild(controlsOverlay);

  function animate() {
    controls.update();
    render();
    requestAnimationFrame(animate);
  }

  animate();
  resize();

  return container;
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();

    const material = (mesh as { material?: THREE.Material | THREE.Material[] })
      .material;
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function getFooting(): THREE.Group {
  const group = new THREE.Group();

  const footing = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.95, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x9d968d,
      roughness: 0.86,
      metalness: 0,
    }),
  );
  footing.position.set(2, 0, -0.06);
  footing.receiveShadow = true;
  footing.castShadow = true;
  group.add(footing);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(footing.geometry),
    new THREE.LineBasicMaterial({
      color: 0xd8cec0,
      transparent: true,
      opacity: 0.75,
    }),
  );
  edges.position.copy(footing.position);
  group.add(edges);

  return group;
}
