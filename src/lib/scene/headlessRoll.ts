import * as CANNON from "cannon-es";
import * as THREE from "three";

/** Passo de simulação usado tanto para gravar quanto para reproduzir os quadros. */
export const SIM_STEP = 1 / 120;
const MAX_SIM_TIME = 3.0;
const SETTLE_SPEED = 0.05;
const GRAVITY = -22;

export interface RollFrame {
  px: number;
  py: number;
  pz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

/**
 * Roda a física "por trás dos panos" (sem renderizar) quantas vezes for
 * preciso até obter uma queda cujo pouso natural bate exatamente com o
 * `targetValue` já sorteado pelo backend. Devolve os quadros dessa queda
 * para serem reproduzidos na cena visível — o que aparece na tela é
 * literalmente a simulação que produziu o resultado, sem nenhum ajuste
 * posterior.
 *
 * Funciona bem para sólidos com pouca variação de área entre faces (d4, d6,
 * d8, d10, d12, d20), onde a chance de pouso natural é ~uniforme entre
 * faces e poucas tentativas bastam. Para dados com muitas faces ou formas
 * muito assimétricas, o número de tentativas necessário cresce — nesses
 * casos vale revisar para uma estratégia híbrida (fase 3+).
 */
export function simulateRollToFace(opts: {
  shape: CANNON.Shape;
  faceNormals: Map<string, THREE.Vector3>;
  targetValue: string;
  restHeight: number;
  dropPosition?: THREE.Vector3;
}): RollFrame[] {
  const { shape, faceNormals, targetValue, restHeight, dropPosition = new THREE.Vector3(0, 6, 0) } = opts;
  // Limitado a 400 mesmo para dados com muitas faces (ex. d100): garante
  // tempo de resposta previsível às custas de, rarissimamente, cair no
  // fallback sintético (ver buildFallbackFrames) para esses casos extremos.
  const maxAttempts = Math.min(400, Math.max(60, faceNormals.size * 20));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { frames, finalQuaternion, settled } = runOneAttempt(shape, restHeight, dropPosition);
    if (!settled) continue;

    const landedValue = findUpFaceValue(faceNormals, finalQuaternion);
    if (landedValue === targetValue) {
      return frames;
    }
  }

  // Extremamente improvável (probabilidade despida a zero com maxAttempts
  // dimensionado pelo nº de faces), mas nunca deixamos a rolagem travar.
  return buildFallbackFrames(faceNormals.get(targetValue) ?? new THREE.Vector3(0, 1, 0), dropPosition, restHeight);
}

function runOneAttempt(
  shape: CANNON.Shape,
  restHeight: number,
  dropPosition: THREE.Vector3,
): { frames: RollFrame[]; finalQuaternion: THREE.Quaternion; settled: boolean } {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);

  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  const body = new CANNON.Body({ mass: 1, shape });
  body.position.set(dropPosition.x, dropPosition.y, dropPosition.z);
  body.angularVelocity.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
  body.quaternion.setFromEuler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
  body.linearDamping = 0.05;
  body.angularDamping = 0.15;
  world.addBody(body);

  // Impulso lateral pequeno: dado cai perto da própria coluna (evita
  // atravessar a coluna do dado vizinho na bandeja multi-dado).
  const impulse = new CANNON.Vec3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
  body.applyImpulse(impulse, body.position);

  const frames: RollFrame[] = [];
  let t = 0;
  let settled = false;

  while (t < MAX_SIM_TIME) {
    world.step(SIM_STEP);
    t += SIM_STEP;
    frames.push({
      px: body.position.x,
      py: body.position.y,
      pz: body.position.z,
      qx: body.quaternion.x,
      qy: body.quaternion.y,
      qz: body.quaternion.z,
      qw: body.quaternion.w,
    });

    const speed = body.velocity.length() + body.angularVelocity.length();
    if (speed < SETTLE_SPEED && body.position.y < restHeight + 0.05) {
      settled = true;
      break;
    }
  }

  return {
    frames,
    finalQuaternion: new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
    settled,
  };
}

function findUpFaceValue(faceNormals: Map<string, THREE.Vector3>, quat: THREE.Quaternion): string | null {
  const up = new THREE.Vector3(0, 1, 0);
  let best: string | null = null;
  let bestDot = -Infinity;
  for (const [value, normal] of faceNormals) {
    const worldNormal = normal.clone().applyQuaternion(quat);
    const dot = worldNormal.dot(up);
    if (dot > bestDot) {
      bestDot = dot;
      best = value;
    }
  }
  return best;
}

function buildFallbackFrames(targetNormal: THREE.Vector3, dropPosition: THREE.Vector3, restHeight: number): RollFrame[] {
  const up = new THREE.Vector3(0, 1, 0);
  const target = new THREE.Quaternion().setFromUnitVectors(targetNormal.clone().normalize(), up);
  const from = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
  );

  const steps = 60;
  const frames: RollFrame[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const q = from.clone().slerp(target, t);
    const y = THREE.MathUtils.lerp(dropPosition.y, restHeight, t);
    frames.push({ px: dropPosition.x, py: y, pz: dropPosition.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w });
  }
  return frames;
}
