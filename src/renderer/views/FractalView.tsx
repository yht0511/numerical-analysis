import React, { useEffect, useRef, useState } from "react";
import { Github } from "lucide-react";
import { create, all } from "mathjs";

type Method = "newton" | "picard" | "secant";

const math = create(all, {});

export default function FractalView({ theme }: { theme: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [expr, setExpr] = useState("z^3 - 1");
  const [method, setMethod] = useState<Method>("newton");
  const [size, setSize] = useState(800);
  const [res, setRes] = useState(400);
  const [maxIter, setMaxIter] = useState(50);
  const [tol, setTol] = useState(1e-6);
  const [view, setView] = useState({
    minRe: -2,
    maxRe: 2,
    minIm: -2,
    maxIm: 2,
  });
  const [mode, setMode] = useState<"drag" | "box">("drag");
  const [box, setBox] = useState<{
    active: boolean;
    start?: { x: number; y: number };
    rect?: { left: number; top: number; width: number; height: number };
  }>({ active: false });
  const dragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [interacting, setInteracting] = useState(false);
  const interactTimer = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [exprError, setExprError] = useState<string | null>(null);
  const [resError, setResError] = useState(false);
  const [maxIterError, setMaxIterError] = useState(false);
  const [tolError, setTolError] = useState(false);
  const [resText, setResText] = useState<string>("" + res);
  const [maxIterText, setMaxIterText] = useState<string>("" + maxIter);
  const [tolText, setTolText] = useState<string>("" + tol);
  const [phiExpr, setPhiExpr] = useState("");
  const [phiError, setPhiError] = useState<string | null>(null);

  useEffect(() => {
    if (!workerRef.current)
      workerRef.current = new Worker(
        new URL("../workers/fractalWorker.ts", import.meta.url),
        { type: "module" }
      );
    const w = workerRef.current;
    const handler = (e: MessageEvent) => {
      const msg = e.data as any;
      if (msg && msg.type === "progress") {
        const p = Math.max(0, Math.min(100, Math.round(msg.progress)));
        setProgress(p);
        return;
      }
      const data = msg as {
        width: number;
        height: number;
        pixels: Uint8ClampedArray;
      };
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const img = new ImageData(
        new Uint8ClampedArray(data.pixels as any),
        data.width,
        data.height
      );
      ctx.putImageData(img, 0, 0);
      setProgress(100);
    };
    w.addEventListener("message", handler);
    return () => {
      w.removeEventListener("message", handler);
    };
  }, []);

  const render = () => {
    setProgress(0);
    const effIter = interacting
      ? Math.max(10, Math.floor(maxIter / 3))
      : maxIter;
    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch {}
    }
    const w = new Worker(
      new URL("../workers/fractalWorker.ts", import.meta.url),
      { type: "module" }
    );
    const handler = (e: MessageEvent) => {
      const msg = e.data as any;
      if (msg && msg.type === "progress") {
        const p = Math.max(0, Math.min(100, Math.round(msg.progress)));
        setProgress(p);
        return;
      }
      const data = msg as {
        width: number;
        height: number;
        pixels: Uint8ClampedArray;
      };
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const img = new ImageData(
        new Uint8ClampedArray(data.pixels as any),
        data.width,
        data.height
      );
      ctx.putImageData(img, 0, 0);
      setProgress(100);
    };
    w.addEventListener("message", handler);
    workerRef.current = w;
    workerRef.current.postMessage({
      expr,
      method,
      width: res,
      height: res,
      maxIter: effIter,
      tol,
      view,
      phiExpr,
    });
  };

  useEffect(() => {
    render();
  }, [expr, method, res, maxIter, tol, view]);

  useEffect(() => {
    try {
      const tmp = math.compile(expr);
      tmp.evaluate({ z: math.complex(0, 0) });
      setExprError(null);
    } catch (e: any) {
      setExprError(e?.message || "输入错误");
    }
  }, [expr]);

  useEffect(() => {
    if (method === "picard") {
      if (phiExpr && phiExpr.trim().length > 0) {
        try {
          const tmp = math.compile(phiExpr);
          tmp.evaluate({ z: math.complex(0, 0) });
          setPhiError(null);
        } catch (e: any) {
          setPhiError(e?.message || "输入错误");
        }
      } else {
        setPhiError(null);
      }
    } else {
      setPhiError(null);
    }
  }, [phiExpr, method]);

  useEffect(() => {
    setResText("" + res);
  }, [res]);
  useEffect(() => {
    setMaxIterText("" + maxIter);
  }, [maxIter]);
  useEffect(() => {
    setTolText("" + tol);
  }, [tol]);

  const onWheel = (e: React.WheelEvent) => {
    setInteracting(true);
    if (interactTimer.current) window.clearTimeout(interactTimer.current);
    const factor = e.deltaY < 0 ? 0.9 : 1.1;
    const cx = (view.minRe + view.maxRe) / 2;
    const cy = (view.minIm + view.maxIm) / 2;
    const w = (view.maxRe - view.minRe) * factor;
    const h = (view.maxIm - view.minIm) * factor;
    setView({
      minRe: cx - w / 2,
      maxRe: cx + w / 2,
      minIm: cy - h / 2,
      maxIm: cy + h / 2,
    });
    interactTimer.current = window.setTimeout(() => setInteracting(false), 250);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setInteracting(true);
    if (interactTimer.current) window.clearTimeout(interactTimer.current);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (mode === "drag") {
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
    } else if (mode === "box") {
      setBox({
        active: true,
        start: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        rect: {
          left: e.clientX - rect.left,
          top: e.clientY - rect.top,
          width: 0,
          height: 0,
        },
      });
    }
  };
  const onMouseUp = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (mode === "drag") {
      dragging.current = false;
      dragStart.current = null;
    } else if (mode === "box" && box.active && box.start && box.rect) {
      const end = {
        x: Math.min(Math.max(e.clientX - rect.left, 0), size),
        y: Math.min(Math.max(e.clientY - rect.top, 0), size),
      };
      const x0 = Math.min(box.start.x, end.x);
      const x1 = Math.max(box.start.x, end.x);
      const y0 = Math.min(box.start.y, end.y);
      const y1 = Math.max(box.start.y, end.y);
      const newMinRe = view.minRe + (x0 / size) * (view.maxRe - view.minRe);
      const newMaxRe = view.minRe + (x1 / size) * (view.maxRe - view.minRe);
      const newMinIm = view.minIm + (y0 / size) * (view.maxIm - view.minIm);
      const newMaxIm = view.minIm + (y1 / size) * (view.maxIm - view.minIm);
      setView({
        minRe: newMinRe,
        maxRe: newMaxRe,
        minIm: newMinIm,
        maxIm: newMaxIm,
      });
      setBox({ active: false });
    }
    interactTimer.current = window.setTimeout(() => setInteracting(false), 250);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    setInteracting(true);
    if (interactTimer.current) window.clearTimeout(interactTimer.current);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (mode === "drag") {
      if (!dragging.current || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      const w = view.maxRe - view.minRe;
      const h = view.maxIm - view.minIm;
      const shiftRe = (-dx / size) * w;
      const shiftIm = (dy / size) * h;
      setView({
        minRe: view.minRe + shiftRe,
        maxRe: view.maxRe + shiftRe,
        minIm: view.minIm + shiftIm,
        maxIm: view.maxIm + shiftIm,
      });
    } else if (mode === "box" && box.active && box.start) {
      const cx = Math.min(Math.max(e.clientX - rect.left, 0), size);
      const cy = Math.min(Math.max(e.clientY - rect.top, 0), size);
      const left = Math.min(box.start.x, cx);
      const top = Math.min(box.start.y, cy);
      const width = Math.abs(cx - box.start.x);
      const height = Math.abs(cy - box.start.y);
      setBox({
        active: true,
        start: box.start,
        rect: { left, top, width, height },
      });
    }
    interactTimer.current = window.setTimeout(() => setInteracting(false), 250);
  };

  const asideClass =
    theme === "dark"
      ? "w-80 border-r border-gray-800 p-4 space-y-4 bg-black text-gray-200"
      : "w-80 border-r border-gray-200 p-4 space-y-4 bg-white text-gray-900";

  return (
    <div className="h-full w-full flex">
      <aside className={asideClass}>
        <div>
          <label className="block text-sm mb-1">函数</label>
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            className={`w-full ${
              theme === "dark"
                ? "bg-gray-800"
                : "bg-gray-100 border border-gray-300 text-gray-900"
            } p-2 rounded`}
          />
          {exprError && <div className="text-xs text-red-400">输入错误</div>}
        </div>
        <div>
          <label className="block text-sm mb-1">迭代方法</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
            className={`w-full ${
              theme === "dark"
                ? "bg-gray-800"
                : "bg-gray-100 border border-gray-300 text-gray-900"
            } p-2 rounded`}
          >
            <option value="newton">牛顿法</option>
            <option value="picard">基础迭代法</option>
            <option value="secant">弦截法</option>
          </select>
        </div>
        {method === "picard" && (
          <div>
            <label className="block text-sm mb-1">迭代 g(z)（可选）</label>
            <input
              value={phiExpr}
              onChange={(e) => setPhiExpr(e.target.value)}
              placeholder="比如 cbrt(2*z+5)"
              className={`w-full ${
                theme === "dark"
                  ? "bg-gray-800"
                  : "bg-gray-100 border border-gray-300 text-gray-900"
              } p-2 rounded`}
            />
            {phiError && <div className="text-xs text-red-400">输入错误</div>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">最大迭代步数</label>
            <input
              type="text"
              value={maxIterText}
              onChange={(e) => {
                const v = e.target.value;
                setMaxIterText(v);
                const num = parseInt(v);
                if (!isNaN(num) && isFinite(num) && num > 0) {
                  setMaxIter(num);
                  setMaxIterError(false);
                } else {
                  setMaxIterError(true);
                }
              }}
              className={`w-full ${
                theme === "dark"
                  ? "bg-gray-800"
                  : "bg-gray-100 border border-gray-300 text-gray-900"
              } p-2 rounded`}
            />
            {maxIterError && (
              <div className="text-xs text-red-400">输入错误</div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">分辨率</label>
            <input
              type="text"
              value={resText}
              onChange={(e) => {
                const v = e.target.value;
                setResText(v);
                const num = parseInt(v);
                if (!isNaN(num) && isFinite(num) && num > 0) {
                  setRes(num);
                  setResError(false);
                } else {
                  setResError(true);
                }
              }}
              className={`w-full ${
                theme === "dark"
                  ? "bg-gray-800"
                  : "bg-gray-100 border border-gray-300 text-gray-900"
              } p-2 rounded`}
            />
            {resError && <div className="text-xs text-red-400">输入错误</div>}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">收敛阈值</label>
          <input
            type="text"
            value={tolText}
            onChange={(e) => {
              const v = e.target.value;
              setTolText(v);
              const num = parseFloat(v);
              if (!isNaN(num) && isFinite(num) && num > 0) {
                setTol(num);
                setTolError(false);
              } else {
                setTolError(true);
              }
            }}
            className={`w-full ${
              theme === "dark"
                ? "bg-gray-800"
                : "bg-gray-100 border border-gray-300 text-gray-900"
            } p-2 rounded`}
          />
          {tolError && <div className="text-xs text-red-400">输入错误</div>}
        </div>
        <button
          onClick={render}
          disabled={
            !!exprError || resError || maxIterError || tolError || !!phiError
          }
          className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50"
        >
          重新计算
        </button>
        <a
          href="https://github.com/yht0511/numerical-analysis"
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded ${
            theme === "dark"
              ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
          }`}
        >
          <Github size={16} />
          <span>GitHub 仓库</span>
        </a>
      </aside>
      <section
        className={`flex-1 flex items-center justify-center relative ${
          theme === "dark" ? "bg-black" : "bg-white"
        }`}
      >
        <canvas
          ref={canvasRef}
          width={res}
          height={res}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          className="border border-gray-800"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
        {progress > 0 && progress < 100 && (
          <div
            className={`absolute top-3 right-3 w-56 rounded border shadow ${
              theme === "dark"
                ? "bg-gray-900/80 border-gray-700"
                : "bg-gray-100/90 border-gray-300"
            }`}
          >
            <div
              className={`px-3 pt-2 text-xs ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              进度 {progress}%
            </div>
            <div
              className={`h-2 mx-3 my-2 rounded ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <div
                style={{ width: `${progress}%` }}
                className="h-2 rounded bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              ></div>
            </div>
          </div>
        )}
        {box.active && box.rect && (
          <div
            style={{
              position: "absolute",
              left: box.rect.left,
              top: box.rect.top,
              width: box.rect.width,
              height: box.rect.height,
              border: "1px solid #22c55e",
              background: "rgba(34,197,94,0.15)",
            }}
          />
        )}
      </section>
    </div>
  );
}
