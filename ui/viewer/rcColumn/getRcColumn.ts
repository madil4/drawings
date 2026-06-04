import * as THREE from "three";
import { getElementLocalAxes } from "../common/getElementLocalAxes";

export type RcColumnDetail = {
  start: [number, number, number];
  end: [number, number, number];
  width: number;
  depth: number;
  cover: number;
  mainBarDiameter: number;
  mainBarCount?: number;
  linkDiameter: number;
  generalLinkSpacing: number;
  endLinkSpacing: number;
  endZoneLength: number;
  mark?: string;
  jacketThickness?: number;
  jacketLabel?: string;
};

const CONCRETE_COLOR = 0xb9afa3;
const CONCRETE_EDGE_COLOR = 0xf0e5d8;
const REBAR_COLOR = 0x15181b;
const LINK_COLOR = 0x26313a;

export function getRcColumns(details: RcColumnDetail[]): THREE.Group {
  const group = new THREE.Group();

  details.forEach((detail) => {
    const column = getRcColumn(detail);
    if (column) group.add(column);
  });

  return group;
}

function getRcColumn(detail: RcColumnDetail): THREE.Group | null {
  const start = new THREE.Vector3(...detail.start);
  const end = new THREE.Vector3(...detail.end);
  const axes = getElementLocalAxes(start, end);
  if (!axes) return null;

  const { localX, localY, localZ, length } = axes;
  const group = new THREE.Group();
  const center = start.clone().add(localX.clone().multiplyScalar(length / 2));
  const rotation = new THREE.Matrix4().makeBasis(localY, localZ, localX);

  // For a vertical column localY ≈ world Y and localZ ≈ world X, so width is
  // placed along localZ (the X axis) and depth along localY (the Y axis).
  const concrete = new THREE.Mesh(
    new THREE.BoxGeometry(detail.depth, detail.width, length),
    new THREE.MeshStandardMaterial({
      color: CONCRETE_COLOR,
      transparent: true,
      opacity: 0.5,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  concrete.position.copy(center);
  concrete.setRotationFromMatrix(rotation);
  concrete.castShadow = true;
  concrete.receiveShadow = true;
  group.add(concrete);

  const concreteEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(concrete.geometry),
    new THREE.LineBasicMaterial({
      color: CONCRETE_EDGE_COLOR,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    }),
  );
  concreteEdges.position.copy(center);
  concreteEdges.setRotationFromMatrix(rotation);
  concreteEdges.renderOrder = 2;
  group.add(concreteEdges);

  const barInset = detail.cover + detail.linkDiameter + detail.mainBarDiameter / 2;
  const mainBarOffsetY = detail.depth / 2 - barInset;
  const mainBarOffsetZ = detail.width / 2 - barInset;
  const barOffsets: [number, number][] = [
    [-mainBarOffsetY, -mainBarOffsetZ],
    [mainBarOffsetY, -mainBarOffsetZ],
    [mainBarOffsetY, mainBarOffsetZ],
    [-mainBarOffsetY, mainBarOffsetZ],
  ];

  barOffsets.forEach(([sectionY, sectionZ]) => {
    const p1 = getSectionPoint(start, localX, localY, localZ, sectionY, sectionZ, 0);
    const p2 = getSectionPoint(
      start,
      localX,
      localY,
      localZ,
      sectionY,
      sectionZ,
      length,
    );
    group.add(getCylinderBetween(p1, p2, detail.mainBarDiameter / 2, REBAR_COLOR, 24));
  });

  const linkInset = detail.cover + detail.linkDiameter / 2;
  const linkOffsetY = detail.depth / 2 - linkInset;
  const linkOffsetZ = detail.width / 2 - linkInset;
  getLinkStations(length, detail).forEach((station) => {
    addLink({
      group,
      start,
      localX,
      localY,
      localZ,
      station,
      yHalf: linkOffsetY,
      zHalf: linkOffsetZ,
      radius: detail.linkDiameter / 2,
    });
  });

  return group;
}

function getSectionPoint(
  start: THREE.Vector3,
  localX: THREE.Vector3,
  localY: THREE.Vector3,
  localZ: THREE.Vector3,
  sectionY: number,
  sectionZ: number,
  station: number,
): THREE.Vector3 {
  return start
    .clone()
    .add(localX.clone().multiplyScalar(station))
    .add(localY.clone().multiplyScalar(sectionY))
    .add(localZ.clone().multiplyScalar(sectionZ));
}

function addLink({
  group,
  start,
  localX,
  localY,
  localZ,
  station,
  yHalf,
  zHalf,
  radius,
}: {
  group: THREE.Group;
  start: THREE.Vector3;
  localX: THREE.Vector3;
  localY: THREE.Vector3;
  localZ: THREE.Vector3;
  station: number;
  yHalf: number;
  zHalf: number;
  radius: number;
}) {
  const corners = [
    getSectionPoint(start, localX, localY, localZ, -yHalf, -zHalf, station),
    getSectionPoint(start, localX, localY, localZ, yHalf, -zHalf, station),
    getSectionPoint(start, localX, localY, localZ, yHalf, zHalf, station),
    getSectionPoint(start, localX, localY, localZ, -yHalf, zHalf, station),
  ];

  corners.forEach((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    group.add(getCylinderBetween(corner, next, radius, LINK_COLOR, 10));
  });

  corners.forEach((corner) => {
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 10, 8),
      new THREE.MeshStandardMaterial({
        color: LINK_COLOR,
        roughness: 0.42,
        metalness: 0.15,
      }),
    );
    elbow.position.copy(corner);
    group.add(elbow);
  });
}

function getCylinderBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  color: number,
  radialSegments: number,
): THREE.Mesh {
  const direction = p2.clone().sub(p1);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    radialSegments,
  );
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.42,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.position.copy(p1).add(direction.multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    p2.clone().sub(p1).normalize(),
  );

  return mesh;
}

function getLinkStations(length: number, detail: RcColumnDetail): number[] {
  const stations = new Set<number>();

  addStations(stations, 0, Math.min(detail.endZoneLength, length), detail.endLinkSpacing);

  const middleStart = detail.endZoneLength + detail.generalLinkSpacing;
  const middleEnd = length - detail.endZoneLength - detail.generalLinkSpacing;
  if (middleStart <= middleEnd) {
    addStations(stations, middleStart, middleEnd, detail.generalLinkSpacing);
  }

  addStations(
    stations,
    Math.max(length - detail.endZoneLength, 0),
    length,
    detail.endLinkSpacing,
  );

  return [...stations].sort((a, b) => a - b);
}

function addStations(
  stations: Set<number>,
  start: number,
  end: number,
  spacing: number,
) {
  for (let station = start; station <= end + 1e-9; station += spacing) {
    stations.add(Number(station.toFixed(6)));
  }
}
