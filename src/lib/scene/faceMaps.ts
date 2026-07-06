import * as THREE from "three";

/**
 * Para cada face (valor -> normal local), calcula o quaternion que, aplicado
 * ao dado, deixa aquela face voltada para cima (+Y). Usado para "encaixar"
 * o dado no resultado já sorteado pelo backend, após a física de queda.
 */
export function buildFaceQuaternionMap(faceNormals: Map<number, THREE.Vector3>): Map<number, THREE.Quaternion> {
  const up = new THREE.Vector3(0, 1, 0);
  const map = new Map<number, THREE.Quaternion>();
  for (const [value, normal] of faceNormals) {
    const q = new THREE.Quaternion().setFromUnitVectors(normal.clone().normalize(), up);
    map.set(value, q);
  }
  return map;
}
