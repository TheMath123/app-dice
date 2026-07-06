import * as THREE from "three";

/** Lê uma cor definida como variável CSS no :root (tema claro/escuro já resolvido pelo navegador). */
function readCssColor(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

const TRAY_HALF = 10;
const BASE_CAMERA_POSITION = new THREE.Vector3(0, 9.5, 11.5);

/**
 * Cena compartilhada por todos os dados: câmera, luzes, chão visual e um
 * loop de render "on-demand" — só roda requestAnimationFrame enquanto algum
 * dado está de fato em movimento, mantendo CPU ~0% em repouso. A física real
 * roda nos bastidores por dado (ver headlessRoll.ts); aqui só reproduzimos
 * os quadros já calculados.
 */
export class DiceScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private readonly container: HTMLElement;
  private readonly clock = new THREE.Clock();
  private readonly tickFns: ((dt: number) => void)[] = [];
  private activeCount = 0;
  private running = false;
  private resizeObserver: ResizeObserver;
  private readonly cameraDir = BASE_CAMERA_POSITION.clone().normalize();
  private readonly baseCameraDistance = BASE_CAMERA_POSITION.length();

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene.background = new THREE.Color(readCssColor("--color-bg", "#f3f3f1"));

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.copy(BASE_CAMERA_POSITION);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupTray();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x666655, 1.0);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(6, 12, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -10;
    dir.shadow.camera.right = 10;
    dir.shadow.camera.top = 10;
    dir.shadow.camera.bottom = -10;
    this.scene.add(dir);
  }

  private setupTray() {
    const planeGeo = new THREE.PlaneGeometry(TRAY_HALF * 2, TRAY_HALF * 2);
    const planeMat = new THREE.MeshStandardMaterial({ color: readCssColor("--color-surface-muted", "#e3e2de"), roughness: 0.9 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  addTick(fn: (dt: number) => void) {
    this.tickFns.push(fn);
  }

  /** Afasta a câmera (mantendo o ângulo) o suficiente para enquadrar uma bandeja de `halfExtent` de raio. */
  setViewExtent(halfExtent: number) {
    const distance = Math.max(this.baseCameraDistance, halfExtent * 2.7);
    this.camera.position.copy(this.cameraDir).multiplyScalar(distance);
    this.camera.lookAt(0, 0, 0);
    if (!this.running) this.renderer.render(this.scene, this.camera);
  }

  /** Dados chamam +1 ao começar a rolar e -1 ao terminar de reproduzir o resultado. */
  notifyActive(delta: number) {
    this.activeCount = Math.max(0, this.activeCount + delta);
    if (this.activeCount > 0) this.start();
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      const dt = Math.min(this.clock.getDelta(), 1 / 30);
      for (const fn of this.tickFns) fn(dt);
      this.renderer.render(this.scene, this.camera);
      if (this.activeCount > 0) {
        requestAnimationFrame(loop);
      } else {
        this.running = false;
      }
    };
    requestAnimationFrame(loop);
  }

  private resize() {
    const { clientWidth, clientHeight } = this.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
