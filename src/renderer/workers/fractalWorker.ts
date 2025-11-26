import { create, all, Complex } from "mathjs";

const math = create(all, {});

const palette = [
  [16, 185, 129],
  [59, 130, 246],
  [244, 63, 94],
  [234, 179, 8],
  [99, 102, 241],
  [147, 51, 234],
];

type C = { re: number; im: number };

const cAbs = (a: C) => Math.hypot(a.re, a.im);
const cAdd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: C, b: C): C => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const cScale = (a: C, s: number): C => ({ re: a.re * s, im: a.im * s });
const cDiv = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return { re: Infinity, im: Infinity };
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};

onmessage = (e: MessageEvent) => {
  const { expr, method, width, height, maxIter, tol, view, phiExpr } =
    e.data as {
      expr: string;
      method: "newton" | "picard" | "secant";
      width: number;
      height: number;
      maxIter: number;
      tol: number;
      view: { minRe: number; maxRe: number; minIm: number; maxIm: number };
      phiExpr?: string;
    };
  const f = math.compile(expr);
  const df = math.derivative(expr, "z").compile();
  const phi =
    method === "picard" && phiExpr && phiExpr.trim().length > 0
      ? math.compile(phiExpr)
      : null;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const roots: C[] = [];
  const rootIdx = (z: C) => {
    for (let i = 0; i < roots.length; i++) {
      const r = roots[i];
      const dx = z.re - r.re;
      const dy = z.im - r.im;
      if (Math.hypot(dx, dy) < 1e-3) return i;
    }
    roots.push({ re: z.re, im: z.im });
    return roots.length - 1;
  };
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const re = view.minRe + (i / (width - 1)) * (view.maxRe - view.minRe);
      const im = view.minIm + (j / (height - 1)) * (view.maxIm - view.minIm);
      let z: Complex = math.complex(re, im);
      let zr = z.re;
      let zi = z.im;
      let zpr = zr + 1e-3;
      let zpi = zi + 1e-3;
      let k = 0;
      while (k < maxIter) {
        z.re = zr;
        z.im = zi;
        const fv = f.evaluate({ z }) as Complex;
        const mag = Math.hypot(fv.re, fv.im);
        if (mag < tol) break;
        if (method === "newton") {
          const dfv = df.evaluate({ z }) as Complex;
          const step = cDiv(
            { re: fv.re, im: fv.im },
            { re: dfv.re, im: dfv.im }
          );
          zr = zr - step.re;
          zi = zi - step.im;
        } else if (method === "picard") {
          if (phi) {
            const znew = phi.evaluate({ z }) as Complex | number;
            if (typeof znew === "number") {
              zr = znew as number;
              zi = 0;
            } else {
              zr = (znew as Complex).re;
              zi = (znew as Complex).im;
            }
          } else {
            zr = zr - fv.re;
            zi = zi - fv.im;
          }
        } else if (method === "secant") {
          const fPrev = f.evaluate({ z: math.complex(zpr, zpi) }) as Complex;
          const denom = cSub(
            { re: fv.re, im: fv.im },
            { re: fPrev.re, im: fPrev.im }
          );
          const denAbs = cAbs(denom);
          if (!isFinite(denAbs) || denAbs < 1e-12) break;
          const dz = { re: zr - zpr, im: zi - zpi };
          const step = cDiv(cMul({ re: fv.re, im: fv.im }, dz), denom);
          const newZ = cSub({ re: zr, im: zi }, step);
          zpr = zr;
          zpi = zi;
          zr = newZ.re;
          zi = newZ.im;
        }
        k++;
      }
      const idx = rootIdx({ re: zr, im: zi });
      const base = palette[idx % palette.length];
      const shade = k / maxIter;
      const off = (j * width + i) * 4;
      pixels[off] = Math.min(255, base[0] + 50 * shade);
      pixels[off + 1] = Math.min(255, base[1] + 50 * shade);
      pixels[off + 2] = Math.min(255, base[2] + 50 * shade);
      pixels[off + 3] = 255;
    }
    if ((j + 1) % 20 === 0 || j === height - 1) {
      (self as DedicatedWorkerGlobalScope).postMessage({
        type: "progress",
        progress: ((j + 1) / height) * 100,
      });
    }
  }
  (self as DedicatedWorkerGlobalScope).postMessage(
    { type: "image", width, height, pixels },
    [pixels.buffer]
  );
};
