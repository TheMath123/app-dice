import * as THREE from "three";

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.27, 0.27],
    [0.5, 0.5],
    [0.73, 0.73],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.5, 0.5],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  6: [
    [0.27, 0.22],
    [0.73, 0.22],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.78],
    [0.73, 0.78],
  ],
};

/** Lê uma cor do tema atual (variáveis CSS em :root) para as faces do dado combinarem com claro/escuro. */
function themeColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function faceBaseStyle(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = themeColor("--color-surface", "#f8f7f4");
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.12);
  ctx.fill();
  ctx.strokeStyle = themeColor("--color-border-strong", "#00000014");
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
}

/** Textura de face de dado ao estilo pips (1-6), gerada uma vez via canvas e reaproveitada. */
export function createPipTexture(value: number, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  faceBaseStyle(ctx, size);

  ctx.fillStyle = themeColor("--color-text", "#20201d");
  const pips = PIP_LAYOUTS[value] ?? [];
  const r = size * 0.08;
  for (const [px, py] of pips) {
    ctx.beginPath();
    ctx.arc(px * size, py * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Textura de face numérica para dados com muitas faces (d8, d10, d12, d20, custom). */
export function createNumberTexture(label: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  faceBaseStyle(ctx, size);

  ctx.fillStyle = themeColor("--color-text", "#20201d");
  const fontSize = label.length > 2 ? size * 0.34 : size * 0.42;
  ctx.font = `600 ${fontSize}px Inter, Avenir, Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2 + size * 0.02);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
