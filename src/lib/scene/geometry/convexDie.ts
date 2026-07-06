import * as THREE from "three";
import * as CANNON from "cannon-es";
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";
import type { DieBuild } from "./types";

interface Triangle {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Constrói um dado convexo qualquer a partir de uma nuvem de pontos (os
 * vértices do sólido), usando o convex hull para descobrir as faces —
 * evita ter que digitar/validar listas de índices de face manualmente.
 *
 * O hull do three.js sempre devolve faces triangulares; agrupamos os
 * triângulos com normal (quase) idêntica para reconstruir cada face lógica
 * do sólido (ex.: os 3 triângulos de um pentágono do dodecaedro), e mapeamos
 * a textura daquela face sobre todo o grupo com uma base local 2D coerente.
 */
export function buildConvexDie(opts: {
  points: THREE.Vector3[];
  faceValues: string[];
  textureFn: (value: string) => THREE.Texture;
}): DieBuild {
  const { points, faceValues, textureFn } = opts;

  const hull = new ConvexHull().setFromPoints(points);

  // A implementação de ConvexHull do three.js sempre gera faces triangulares
  // (3 half-edges cada), então basta ler os 3 vértices em sequência.
  const triangles: Triangle[] = [];
  for (const face of hull.faces) {
    const e0 = face.edge;
    const e1 = e0.next;
    const e2 = e1.next;
    triangles.push({ a: e0.head().point, b: e1.head().point, c: e2.head().point, normal: face.normal });
  }

  // Agrupa triângulos coplanares (ex.: os 3 triângulos de um pentágono do
  // dodecaedro) comparando o ângulo entre normais em vez de arredondar para
  // string — normais calculadas pelo hull podem diferir por erro de ponto
  // flutuante na última casa, o que quebraria um agrupamento por chave exata
  // em grupos duplicados (e pintaria números diferentes numa mesma face).
  const NORMAL_DOT_THRESHOLD = 0.999;
  const groups: { normal: THREE.Vector3; tris: Triangle[] }[] = [];
  for (const tri of triangles) {
    const group = groups.find((g) => g.normal.dot(tri.normal) > NORMAL_DOT_THRESHOLD);
    if (group) group.tris.push(tri);
    else groups.push({ normal: tri.normal.clone(), tris: [tri] });
  }

  if (groups.length !== faceValues.length) {
    throw new Error(`buildConvexDie: esperava ${faceValues.length} faces, o hull produziu ${groups.length}`);
  }

  const positions: number[] = [];
  const normalsAttr: number[] = [];
  const uvs: number[] = [];
  const faceNormals = new Map<string, THREE.Vector3>();
  const restHeights: number[] = [];
  let vertCount = 0;
  let groupIdx = 0;

  const geometry = new THREE.BufferGeometry();

  for (const { tris: groupTris } of groups) {
    const value = faceValues[groupIdx];
    const normal = groupTris[0].normal.clone().normalize();
    faceNormals.set(value, normal);

    const arbitrary = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const uAxis = arbitrary.clone().cross(normal).normalize();
    const vAxis = normal.clone().cross(uAxis).normalize();

    const allPoints = groupTris.flatMap((t) => [t.a, t.b, t.c]);
    const centroid = allPoints
      .reduce((acc, p) => acc.add(p), new THREE.Vector3())
      .multiplyScalar(1 / allPoints.length);
    restHeights.push(normal.dot(centroid));

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    const rel2d = allPoints.map((p) => {
      const rel = p.clone().sub(centroid);
      const u = rel.dot(uAxis);
      const v = rel.dot(vAxis);
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
      return { u, v };
    });

    const spanU = maxU - minU || 1;
    const spanV = maxV - minV || 1;
    const margin = 0.16;

    const groupStart = vertCount;
    rel2d.forEach(({ u, v }, i) => {
      const p = allPoints[i];
      positions.push(p.x, p.y, p.z);
      normalsAttr.push(normal.x, normal.y, normal.z);
      uvs.push(margin + (1 - 2 * margin) * ((u - minU) / spanU), margin + (1 - 2 * margin) * ((v - minV) / spanV));
      vertCount++;
    });
    geometry.addGroup(groupStart, vertCount - groupStart, groupIdx);

    groupIdx++;
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normalsAttr, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

  const materials = faceValues.map(
    (v) =>
      new THREE.MeshStandardMaterial({
        map: textureFn(v),
        roughness: 0.5,
        metalness: 0.05,
      }),
  );

  const pointIndex = new Map<THREE.Vector3, number>();
  points.forEach((p, i) => pointIndex.set(p, i));
  const cannonVertices = points.map((p) => new CANNON.Vec3(p.x, p.y, p.z));
  const cannonFaces = triangles.map((t) => [pointIndex.get(t.a)!, pointIndex.get(t.b)!, pointIndex.get(t.c)!]);
  const shape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });

  const restHeight = restHeights.reduce((sum, h) => sum + h, 0) / restHeights.length;

  return { geometry, materials, shape, faceNormals, restHeight };
}
