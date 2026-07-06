import * as THREE from "three";
import type { DiceScene } from "./DiceScene";
import type { DieBuild } from "./geometry/types";
import { simulateRollToFace, SIM_STEP, type RollFrame } from "./headlessRoll";

/**
 * Um dado ativo na cena: apenas um mesh Three.js. A física "de verdade"
 * roda nos bastidores (ver headlessRoll.ts): simulamos a queda quantas
 * vezes for preciso até achar uma que pouse naturalmente no valor sorteado
 * pelo backend, e aqui só reproduzimos essa queda exata quadro a quadro —
 * por construção, o dado nunca "troca" de número depois de já ter parado.
 */
export class DiceBody {
  readonly mesh: THREE.Mesh;

  private readonly scene: DiceScene;
  private readonly build: DieBuild;

  private frames: RollFrame[] = [];
  private elapsed = 0;
  private playing = false;
  private resolveRoll: (() => void) | null = null;
  private currentRoll: Promise<void> | null = null;

  constructor(scene: DiceScene, build: DieBuild, position: THREE.Vector3) {
    this.scene = scene;
    this.build = build;

    this.mesh = new THREE.Mesh(build.geometry, build.materials);
    this.mesh.castShadow = true;
    this.mesh.position.copy(position);
    scene.scene.add(this.mesh);

    scene.addTick((dt) => this.tick(dt));
  }

  get restHeight(): number {
    return this.build.restHeight;
  }

  get isRolling(): boolean {
    return this.playing;
  }

  /** Reposiciona o dado (ex.: ao reorganizar a bandeja); ignorado enquanto ele está rolando. */
  placeAt(position: THREE.Vector3) {
    if (this.playing) return;
    this.mesh.position.copy(position);
  }

  /** Se já houver uma rolagem em andamento, devolve a mesma promise em vez de abandoná-la. */
  roll(value: string, dropPosition = new THREE.Vector3(0, 6, 0)): Promise<void> {
    if (this.currentRoll) return this.currentRoll;

    this.frames = simulateRollToFace({
      shape: this.build.shape,
      faceNormals: this.build.faceNormals,
      targetValue: value,
      restHeight: this.build.restHeight,
      dropPosition,
    });
    this.elapsed = 0;
    this.playing = true;
    this.scene.notifyActive(1);

    this.currentRoll = new Promise((resolve) => {
      this.resolveRoll = resolve;
    });
    return this.currentRoll;
  }

  private tick(dt: number) {
    if (!this.playing || this.frames.length === 0) return;

    this.elapsed += dt;
    const raw = this.elapsed / SIM_STEP;
    const idx0 = Math.min(Math.floor(raw), this.frames.length - 1);
    const idx1 = Math.min(idx0 + 1, this.frames.length - 1);
    const frac = raw - idx0;

    const a = this.frames[idx0];
    const b = this.frames[idx1];
    this.mesh.position.set(
      THREE.MathUtils.lerp(a.px, b.px, frac),
      THREE.MathUtils.lerp(a.py, b.py, frac),
      THREE.MathUtils.lerp(a.pz, b.pz, frac),
    );
    this.mesh.quaternion.set(a.qx, a.qy, a.qz, a.qw).slerp(new THREE.Quaternion(b.qx, b.qy, b.qz, b.qw), frac);

    if (idx0 >= this.frames.length - 1) {
      this.playing = false;
      this.scene.notifyActive(-1);
      this.resolveRoll?.();
      this.resolveRoll = null;
      this.currentRoll = null;
    }
  }

  dispose() {
    this.scene.scene.remove(this.mesh);
  }
}
