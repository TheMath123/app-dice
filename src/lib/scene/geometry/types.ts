import * as THREE from "three";
import * as CANNON from "cannon-es";

export interface DieBuild {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  shape: CANNON.Shape;
  /** valor de face -> normal local (espaço do objeto) daquela face */
  faceNormals: Map<string, THREE.Vector3>;
  /** altura do centro do dado quando repousando sobre uma face no chão */
  restHeight: number;
}
