import React, { useEffect, useMemo, useRef, useState } from "react";
import { Github } from "lucide-react";
import Plotly from "plotly.js-dist-min";
import { create, all } from "mathjs";

type Method =
  | "picard"
  | "aitken"
  | "regula"
  | "secant"
  | "newton"
  | "newton-damped"
  | "bisection";

const math = create(all, {});

const presets = [
  {
    label: "x^3 - 2x - 5",
    expr: "x^3 - 2*x - 5",
    defaults: { bracket: { a: 1, b: 8 }, x0: 10, x1: 9, phi: "cbrt(2*x+5)" },
  },
  {
    label: "sin(x) * x",
    expr: "sin(x) * x",
    defaults: {
      bracket: { a: 1, b: 5 },
      x0: 3,
      x1: 2.5,
      phi: "x - 0.5*sin(x)*x",
    },
  },
  {
    label: "e^x - 3x",
    expr: "exp(x) - 3*x",
    defaults: { bracket: { a: 1, b: 10 }, x0: 10, x1: 9, phi: "log(3x)" },
  },
  {
    label: "自定义",
    expr: "",
    defaults: { bracket: { a: -3, b: 3 }, x0: 0, x1: 1, phi: "" },
  },
];

export default function RealRootView({ theme }: { theme: "light" | "dark" }) {
  const [expr, setExpr] = useState(presets[0].expr);
  const [preset, setPreset] = useState(presets[0].label);
  const [method, setMethod] = useState<Method>("newton");
  const [delay, setDelay] = useState(300);
  const [range, setRange] = useState<{ a: number; b: number; step: number }>({
    a: -10,
    b: 10,
    step: 0.2,
  });
  const [bracket, setBracket] = useState<{ a: number; b: number }>({
    a: -3,
    b: 3,
  });
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ x: number; fx: number; err: number }[]>([]);
  const [lambda, setLambda] = useState(1);
  const [plotMode, setPlotMode] = useState<"pan" | "zoom">("pan");
  const [parseError, setParseError] = useState<string | null>(null);
  const [iterError, setIterError] = useState<string | null>(null);
  const [bracketInit, setBracketInit] = useState<{ a: number; b: number }>({
    a: -3,
    b: 3,
  });
  const [eps, setEps] = useState(1e-6);
  const [stopNote, setStopNote] = useState<string | null>(null);
  const [phiExpr, setPhiExpr] = useState("");
  const [phiParseError, setPhiParseError] = useState<string | null>(null);
  const [x0, setX0] = useState(0);
  const [x1, setX1] = useState(1);
  const [rangeAText, setRangeAText] = useState<string>(
    "" + (typeof range.a === "number" ? range.a : 0)
  );
  const [rangeBText, setRangeBText] = useState<string>(
    "" + (typeof range.b === "number" ? range.b : 0)
  );
  const [stepText, setStepText] = useState<string>(
    "" + (typeof range.step === "number" ? range.step : 0)
  );
  const [bracketAText, setBracketAText] = useState<string>(
    "" + (typeof bracketInit.a === "number" ? bracketInit.a : 0)
  );
  const [bracketBText, setBracketBText] = useState<string>(
    "" + (typeof bracketInit.b === "number" ? bracketInit.b : 0)
  );
  const [x0Text, setX0Text] = useState<string>("" + x0);
  const [x1Text, setX1Text] = useState<string>("" + x1);
  const [rangeAErr, setRangeAErr] = useState(false);
  const [rangeBErr, setRangeBErr] = useState(false);
  const [stepErr, setStepErr] = useState(false);
  const [bracketAErr, setBracketAErr] = useState(false);
  const [bracketBErr, setBracketBErr] = useState(false);
  const [x0Err, setX0Err] = useState(false);
  const [x1Err, setX1Err] = useState(false);
  const [epsErr, setEpsErr] = useState(false);
  const [lambdaErr, setLambdaErr] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);
  const miniPlotRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const iterShapesRef = useRef<any[]>([]);
  const signRectsRef = useRef<any[]>([]);
  const pushShape = (s: any) => {
    const arr = iterShapesRef.current;
    arr.push(s);
    if (arr.length > 50) arr.splice(0, arr.length - 50);
    if (plotRef.current)
      Plotly.relayout(plotRef.current, {
        shapes: [...signRectsRef.current, ...arr],
      });
  };

  const compiled = useMemo(() => {
    try {
      const e = expr && expr.trim().length > 0 ? expr : presets[0].expr;
      setParseError(null);
      return math.compile(e);
    } catch (err: any) {
      setParseError(err?.message || "Invalid expression");
      return null;
    }
  }, [expr]);
  const dCompiled = useMemo(() => {
    try {
      const e = expr && expr.trim().length > 0 ? expr : presets[0].expr;
      return math.derivative(e, "x").compile();
    } catch {
      return null;
    }
  }, [expr]);

  const evalFx = (x: number) => {
    try {
      if (!compiled) return NaN;
      return compiled.evaluate({ x });
    } catch {
      return NaN;
    }
  };
  const evalDx = (x: number) => {
    try {
      if (!dCompiled) {
        const h = 1e-6;
        const fp = evalFx(x + h);
        const fm = evalFx(x - h);
        if (!isFinite(fp) || !isFinite(fm)) return NaN;
        return (fp - fm) / (2 * h);
      }
      return dCompiled.evaluate({ x });
    } catch {
      const h = 1e-6;
      const fp = evalFx(x + h);
      const fm = evalFx(x - h);
      if (!isFinite(fp) || !isFinite(fm)) return NaN;
      return (fp - fm) / (2 * h);
    }
  };
  const phiCompiled = useMemo(() => {
    try {
      if (!phiExpr || phiExpr.trim().length === 0) {
        setPhiParseError(null);
        return null;
      }
      setPhiParseError(null);
      return math.compile(phiExpr);
    } catch (err: any) {
      setPhiParseError(err?.message || "g(x) 表达式错误");
      return null;
    }
  }, [phiExpr]);
  const stableMove = (xn: number, target: number) => {
    const maxStep = Math.max(1, (range.b - range.a) / 2);
    let step = target - xn;
    let t = target;
    let tries = 0;
    while (
      (!isFinite(t) || Math.abs(step) > maxStep || !isFinite(evalFx(t))) &&
      tries < 20
    ) {
      step *= 0.5;
      t = xn + step;
      tries++;
    }
    const ok = isFinite(t) && Math.abs(step) <= maxStep && isFinite(evalFx(t));
    return { value: t, ok };
  };

  useEffect(() => {
    if (!plotRef.current) return;
    if (parseError) return;
    const renderBase = () => {
      const xs = [] as number[];
      const ys = [] as number[];
      for (let x = range.a; x <= range.b; x += Math.max(1e-3, range.step)) {
        xs.push(x);
        ys.push(evalFx(x));
      }
      const data: any[] = [
        {
          x: xs,
          y: ys,
          type: "scatter",
          mode: "lines",
          line: { color: "#10b981" },
          name: "f(x)",
        },
      ];
      const layout: any = {
        margin: { l: 40, r: 20, t: 20, b: 40 },
        plot_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
        paper_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
        font: { color: theme === "dark" ? "#e5e7eb" : "#24292e" },
        showlegend: false,
        xaxis: { range: [range.a, range.b] },
        yaxis: { autorange: true },
        dragmode: plotMode,
      };
      Plotly.newPlot(plotRef.current!, data, layout, {
        displayModeBar: false,
        scrollZoom: true,
      });
    };
    renderBase();
  }, [expr, range, parseError, theme]);

  useEffect(() => {
    if (!plotRef.current) return;
    Plotly.relayout(plotRef.current, {
      paper_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
      plot_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
      font: { color: theme === "dark" ? "#e5e7eb" : "#24292e" },
      xaxis: {
        gridcolor: theme === "dark" ? "#334155" : "#e5e7eb",
        zerolinecolor: theme === "dark" ? "#475569" : "#d1d5db",
      },
      yaxis: {
        gridcolor: theme === "dark" ? "#334155" : "#e5e7eb",
        zerolinecolor: theme === "dark" ? "#475569" : "#d1d5db",
      },
    });
  }, [theme]);

  useEffect(() => {
    if (!plotRef.current) return;
    Plotly.relayout(plotRef.current, { dragmode: plotMode });
  }, [plotMode]);

  useEffect(() => {
    if (!miniPlotRef.current) return;
    const xs = log.map((_, i) => i + 1);
    const ys = log.map((s) => Math.max(s.err, 1e-14));
    const data: any[] = [
      {
        x: xs,
        y: ys,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#22c55e", width: 1 },
        marker: { size: 3, color: "#22c55e" },
        name: "error",
      },
    ];
    const layout: any = {
      margin: { l: 35, r: 10, t: 8, b: 16 },
      plot_bgcolor: theme === "dark" ? "#111827" : "#f3f4f6",
      paper_bgcolor: theme === "dark" ? "#111827" : "#f3f4f6",
      font: { color: theme === "dark" ? "#e5e7eb" : "#24292e" },
      showlegend: false,
      dragmode: "pan",
      xaxis: {
        title: undefined,
        tickfont: { size: 9 },
        gridcolor: theme === "dark" ? "#334155" : "#e5e7eb",
        zerolinecolor: theme === "dark" ? "#475569" : "#d1d5db",
        automargin: true,
      },
      yaxis: {
        title: undefined,
        type: "log",
        tickfont: { size: 9 },
        gridcolor: theme === "dark" ? "#334155" : "#e5e7eb",
        zerolinecolor: theme === "dark" ? "#475569" : "#d1d5db",
        automargin: true,
      },
    };
    Plotly.react(miniPlotRef.current, data, layout, {
      displayModeBar: false,
      scrollZoom: false,
    });
  }, [log, theme]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setLog((prev) => {
        const next = [...prev];
        if (method === "bisection") {
          const a = bracket.a;
          const b = bracket.b;
          const fa = evalFx(a);
          const fb = evalFx(b);
          if (!isFinite(fa) || !isFinite(fb)) {
            setIterError("二分法失败：函数数值不稳定");
            setRunning(false);
            return next;
          }
          if (fa * fb > 0) {
            setIterError("二分法失败：初始区间未夹住根（f(a)·f(b)>0）");
            setRunning(false);
            return next;
          }
          const c = (a + b) / 2;
          const fc = evalFx(c);
          const prevX = next.length ? next[next.length - 1].x : null;
          const nerr =
            prevX != null ? Math.abs(c - prevX) : Math.abs(b - a) / 2;
          pushShape({
            type: "line",
            x0: a,
            y0: fa,
            x1: b,
            y1: fb,
            line: { color: "#f59e0b" },
          });
          const left = fa * fc < 0;
          const na = left ? a : c;
          const nb = left ? c : b;
          next.push({ x: c, fx: fc, err: nerr });
          if (prevX != null && Math.abs(c - prevX) < eps) {
            setRunning(false);
            setStopNote("误差达到终止条件");
            return next;
          }
          setBracket({ a: na, b: nb });
        } else {
          let xn: number;
          let xn_1: number;
          if (method === "secant") {
            if (next.length === 0) {
              xn = x1;
              xn_1 = x0;
            } else if (next.length === 1) {
              xn = next[0].x;
              xn_1 = x0;
            } else {
              xn = next[next.length - 1].x;
              xn_1 = next[next.length - 2].x;
            }
          } else {
            xn = next.length ? next[next.length - 1].x : x0;
            xn_1 = next.length > 1 ? next[next.length - 2].x : x0;
          }
          let xnp1 = xn;
          if (method === "newton") {
            const fx = evalFx(xn);
            const dfx = evalDx(xn);
            if (!isFinite(fx) || !isFinite(dfx) || Math.abs(dfx) < 1e-14) {
              if (next.length > 0) {
                const fxn1 = evalFx(xn_1);
                const denom = fx - fxn1;
                if (isFinite(fxn1) && Math.abs(denom) > 1e-14) {
                  const cand = xn - (fx * (xn - xn_1)) / denom;
                  const sm = stableMove(xn, cand);
                  if (!sm.ok) {
                    setIterError("迭代失败：函数或导数数值不稳定");
                    return next;
                  }
                  xnp1 = sm.value;
                } else {
                  setIterError("迭代失败：函数或导数数值不稳定");
                  return next;
                }
              } else {
                setIterError("迭代失败：函数或导数数值不稳定");
                return next;
              }
            } else {
              const cand = xn - fx / dfx;
              const sm = stableMove(xn, cand);
              if (!sm.ok) {
                setIterError("迭代失败：函数或导数数值不稳定");
                return next;
              }
              xnp1 = sm.value;
            }
            const fxn = fx;
            pushShape({
              type: "line",
              x0: xn,
              y0: 0,
              x1: xn,
              y1: fxn,
              line: { color: "#22c55e" },
            });
            pushShape({
              type: "line",
              x0: xn,
              y0: fxn,
              x1: xnp1,
              y1: 0,
              line: { color: "#3b82f6" },
            });
          } else if (method === "newton-damped") {
            const fx = evalFx(xn);
            const dfx = evalDx(xn);
            if (!isFinite(fx) || !isFinite(dfx) || Math.abs(dfx) < 1e-14) {
              if (next.length > 0) {
                const fxn1 = evalFx(xn_1);
                const denom = fx - fxn1;
                if (isFinite(fxn1) && Math.abs(denom) > 1e-14) {
                  const rawCand = xn - (fx * (xn - xn_1)) / denom;
                  const cand = xn + lambda * (rawCand - xn);
                  const sm = stableMove(xn, cand);
                  if (!sm.ok) {
                    setIterError("迭代失败：函数或导数数值不稳定");
                    return next;
                  }
                  xnp1 = sm.value;
                } else {
                  setIterError("迭代失败：函数或导数数值不稳定");
                  return next;
                }
              } else {
                setIterError("迭代失败：函数或导数数值不稳定");
                return next;
              }
            } else {
              const raw = xn - fx / dfx;
              const cand = xn + lambda * (raw - xn);
              const sm = stableMove(xn, cand);
              if (!sm.ok) {
                setIterError("迭代失败：函数或导数数值不稳定");
                return next;
              }
              xnp1 = sm.value;
            }
            const fxn = fx;
            pushShape({
              type: "line",
              x0: xn,
              y0: 0,
              x1: xn,
              y1: fxn,
              line: { color: "#22c55e" },
            });
            pushShape({
              type: "line",
              x0: xn,
              y0: fxn,
              x1: xnp1,
              y1: 0,
              line: { color: "#3b82f6" },
            });
          } else if (method === "secant") {
            const fxn = evalFx(xn);
            const fxn1 = evalFx(xn_1);
            const denom = fxn - fxn1;
            if (!isFinite(fxn) || !isFinite(fxn1) || Math.abs(denom) < 1e-14) {
              setIterError("迭代失败：割线分母过小或数值不稳定");
              return next;
            }
            {
              const cand = xn - (fxn * (xn - xn_1)) / denom;
              const sm = stableMove(xn, cand);
              if (!sm.ok) {
                setIterError("迭代失败：割线分母过小或数值不稳定");
                return next;
              }
              xnp1 = sm.value;
            }
            pushShape({
              type: "line",
              x0: xn_1,
              y0: fxn1,
              x1: xn,
              y1: fxn,
              line: { color: "#ef4444" },
            });
          } else if (method === "regula") {
            const a = bracket.a;
            const b = bracket.b;
            const fa = evalFx(a);
            const fb = evalFx(b);
            if (!isFinite(fa) || !isFinite(fb)) {
              setIterError("迭代失败：函数数值不稳定");
              return next;
            }
            if (fa * fb > 0) {
              setIterError("单点弦截法失败：初始区间未夹住根（f(a)·f(b)>0）");
              setRunning(false);
              return next;
            }
            const c = b - (fb * (b - a)) / (fb - fa);
            const fc = evalFx(c);
            const left = fa * fc < 0;
            const na = left ? a : c;
            const nb = left ? c : b;
            setBracket({ a: na, b: nb });
            xnp1 = c;
            pushShape({
              type: "line",
              x0: a,
              y0: fa,
              x1: b,
              y1: fb,
              line: { color: "#a78bfa" },
            });
          } else if (method === "picard" || method === "aitken") {
            const fx = evalFx(xn);
            const phi = (x: number) => {
              if (phiCompiled) {
                try {
                  const v = phiCompiled.evaluate({ x });
                  return typeof v === "number" ? v : NaN;
                } catch {
                  return NaN;
                }
              }
              return x - evalFx(x);
            };
            let s1 = phi(xn);
            if (!isFinite(s1)) {
              setIterError("迭代失败：g(x) 数值不稳定");
              return next;
            }
            if (method === "aitken") {
              const s2 = phi(s1);
              const s3 = phi(s2);
              const denom = s3 - 2 * s2 + s1;
              if (!isFinite(denom) || Math.abs(denom) < 1e-14) {
                setIterError("迭代失败：艾特肯加速分母过小");
                return next;
              }
              xnp1 = s1 - ((s2 - s1) * (s2 - s1)) / denom;
            } else {
              xnp1 = s1;
            }
            const fx1 = evalFx(xnp1);
            pushShape({
              type: "line",
              x0: xn,
              y0: fx,
              x1: xnp1,
              y1: fx1,
              line: { color: "#f97316" },
            });
          }
          const fxnp1 = evalFx(xnp1);
          const err = Math.abs(xnp1 - xn);
          if (!isFinite(xnp1) || !isFinite(fxnp1)) {
            setIterError("迭代发散或产生 NaN");
            return next;
          }
          next.push({ x: xnp1, fx: fxnp1, err });
          if (Math.abs(xnp1 - xn) < eps) {
            setRunning(false);
            setStopNote("误差达到终止条件");
            return next;
          }
        }
        return next;
      });
    };
    intervalRef.current = window.setInterval(tick, Math.max(0, delay));
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, delay, method, bracket, lambda]);

  useEffect(() => {
    // 切换方法或函数时清空迭代可视化的形状，避免残留
    iterShapesRef.current = [];
    if (plotRef.current) {
      Plotly.relayout(plotRef.current, { shapes: [...signRectsRef.current] });
    }
  }, [method, expr]);

  const start = () => {
    setLog([]);
    setIterError(null);
    setBracket(bracketInit);
    setStopNote(null);
    iterShapesRef.current = [];
    if (plotRef.current) {
      Plotly.relayout(plotRef.current, { shapes: [...signRectsRef.current] });
    }
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setLog([]);
    setBracket(bracketInit);
    setStopNote(null);
    iterShapesRef.current = [];
    if (plotRef.current) {
      Plotly.purge(plotRef.current);
      const xs = [] as number[];
      const ys = [] as number[];
      for (let x = range.a; x <= range.b; x += Math.max(1e-3, range.step)) {
        xs.push(x);
        ys.push(evalFx(x));
      }
      const data: any[] = [
        {
          x: xs,
          y: ys,
          type: "scatter",
          mode: "lines",
          line: { color: "#10b981" },
          name: "f(x)",
        },
      ];
      const layout: any = {
        margin: { l: 40, r: 20, t: 20, b: 40 },
        plot_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
        paper_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
        font: { color: theme === "dark" ? "#e5e7eb" : "#24292e" },
        showlegend: false,
        xaxis: { range: [range.a, range.b] },
        yaxis: { autorange: true },
        dragmode: plotMode,
      };
      Plotly.newPlot(plotRef.current, data, layout, {
        displayModeBar: false,
        scrollZoom: true,
      }).then(() => {
        Plotly.relayout(plotRef.current!, {
          paper_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
          plot_bgcolor: theme === "dark" ? "#0f172a" : "#ffffff",
          font: { color: theme === "dark" ? "#e5e7eb" : "#24292e" },
          xaxis: {
            gridcolor: theme === "dark" ? "#334155" : "#e5e7eb",
            zerolinecolor: theme === "dark" ? "#475569" : "#d1d5db",
          },
          yaxis: {
            gridcolor: theme === "dark" ? "#334155" : "#e5e7eb",
            zerolinecolor: theme === "dark" ? "#475569" : "#d1d5db",
          },
          shapes: [...signRectsRef.current],
        });
      });
    }
  };

  useEffect(() => {
    const p = presets.find((p) => p.label === preset);
    if (p) {
      setExpr(p.expr);
      if (p.defaults) {
        setBracketInit(p.defaults.bracket);
        setX0(p.defaults.x0);
        setX1(p.defaults.x1);
        setPhiExpr(p.defaults.phi || "");
      }
    }
  }, [preset]);

  useEffect(() => {
    if (method === "picard" || method === "aitken") {
      if (!phiExpr || phiExpr.trim().length === 0) {
        const p = presets.find((p) => p.label === preset);
        if (p?.defaults?.phi) setPhiExpr(p.defaults.phi);
      }
    }
  }, [method, preset]);
  useEffect(() => {
    setRangeAText("" + range.a);
  }, [range.a]);
  useEffect(() => {
    setRangeBText("" + range.b);
  }, [range.b]);
  useEffect(() => {
    setStepText("" + range.step);
  }, [range.step]);
  useEffect(() => {
    setBracketAText("" + bracketInit.a);
  }, [bracketInit.a]);
  useEffect(() => {
    setBracketBText("" + bracketInit.b);
  }, [bracketInit.b]);
  useEffect(() => {
    setX0Text("" + x0);
  }, [x0]);
  useEffect(() => {
    setX1Text("" + x1);
  }, [x1]);

  const signIntervals = useMemo(() => {
    const res: [number, number][] = [];
    let prevX = range.a;
    let prevY = evalFx(prevX);
    for (let x = range.a + range.step; x <= range.b; x += range.step) {
      const y = evalFx(x);
      if (
        prevY === 0 ||
        y === 0 ||
        (prevY < 0 && y > 0) ||
        (prevY > 0 && y < 0)
      )
        res.push([prevX, x]);
      prevX = x;
      prevY = y;
    }
    return res;
  }, [range, expr]);

  useEffect(() => {
    if (!plotRef.current) return;
    const rects = signIntervals.map((iv) => ({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: iv[0],
      x1: iv[1],
      y0: 0,
      y1: 1,
      fillcolor:
        theme === "dark" ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.12)",
      line: { width: 0 },
      layer: "below",
    }));
    signRectsRef.current = rects;
    Plotly.relayout(plotRef.current, {
      shapes: [...signRectsRef.current, ...iterShapesRef.current],
    });
  }, [signIntervals, theme]);

  const inputClass =
    theme === "dark"
      ? "bg-gray-800 p-2 rounded"
      : "bg-gray-100 text-gray-900 p-2 rounded border border-gray-300";
  const asideClass =
    theme === "dark"
      ? "w-96 border-r border-gray-800 p-4 space-y-4 overflow-auto bg-black text-gray-200"
      : "w-96 border-r border-gray-200 p-4 space-y-4 overflow-auto bg-white text-gray-900";
  return (
    <div className="h-full w-full flex">
      <aside className={asideClass}>
        <div>
          <label className="block text-sm mb-1">函数</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className={`w-full ${inputClass}`}
          >
            {presets.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
          {preset === "自定义" && (
            <input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="输入 f(x)"
              className={`mt-2 w-full ${inputClass}`}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">区间左端 a</label>
            <input
              type="text"
              value={rangeAText}
              onChange={(e) => {
                const v = e.target.value;
                setRangeAText(v);
                const num = parseFloat(v);
                if (!isNaN(num) && isFinite(num)) {
                  setRange({ ...range, a: num });
                  setRangeAErr(false);
                } else {
                  setRangeAErr(true);
                }
              }}
              className={`w-full ${inputClass}`}
            />
            {rangeAErr && <div className="text-xs text-red-400">输入错误</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">区间右端 b</label>
            <input
              type="text"
              value={rangeBText}
              onChange={(e) => {
                const v = e.target.value;
                setRangeBText(v);
                const num = parseFloat(v);
                if (!isNaN(num) && isFinite(num)) {
                  setRange({ ...range, b: num });
                  setRangeBErr(false);
                } else {
                  setRangeBErr(true);
                }
              }}
              className={`w-full ${inputClass}`}
            />
            {rangeBErr && <div className="text-xs text-red-400">输入错误</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">采样步长</label>
            <input
              type="text"
              value={stepText}
              onChange={(e) => {
                const v = e.target.value;
                setStepText(v);
                const num = parseFloat(v);
                if (!isNaN(num) && isFinite(num) && num > 0) {
                  setRange({ ...range, step: num });
                  setStepErr(false);
                } else {
                  setStepErr(true);
                }
              }}
              className={`w-full ${inputClass}`}
            />
            {stepErr && <div className="text-xs text-red-400">输入错误</div>}
          </div>
        </div>
        {(method === "bisection" || method === "regula") && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm mb-1">初始区间 a</label>
              <input
                type="text"
                value={bracketAText}
                onChange={(e) => {
                  const v = e.target.value;
                  setBracketAText(v);
                  const num = parseFloat(v);
                  if (!isNaN(num) && isFinite(num)) {
                    setBracketInit({ ...bracketInit, a: num });
                    setBracketAErr(false);
                  } else {
                    setBracketAErr(true);
                  }
                }}
                disabled={running}
                className={`w-full ${inputClass}`}
              />
              {bracketAErr && (
                <div className="text-xs text-red-400">输入错误</div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">初始区间 b</label>
              <input
                type="text"
                value={bracketBText}
                onChange={(e) => {
                  const v = e.target.value;
                  setBracketBText(v);
                  const num = parseFloat(v);
                  if (!isNaN(num) && isFinite(num)) {
                    setBracketInit({ ...bracketInit, b: num });
                    setBracketBErr(false);
                  } else {
                    setBracketBErr(true);
                  }
                }}
                disabled={running}
                className={`w-full ${inputClass}`}
              />
              {bracketBErr && (
                <div className="text-xs text-red-400">输入错误</div>
              )}
            </div>
            <div className="col-span-2 text-xs text-gray-300">
              当前区间：[{bracket.a.toFixed(6)}, {bracket.b.toFixed(6)}]
            </div>
          </div>
        )}
        {(method === "picard" ||
          method === "aitken" ||
          method === "secant" ||
          method === "newton" ||
          method === "newton-damped") && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm mb-1">初始点 x₀</label>
              <input
                type="text"
                value={x0Text}
                onChange={(e) => {
                  const v = e.target.value;
                  setX0Text(v);
                  const num = parseFloat(v);
                  if (!isNaN(num) && isFinite(num)) {
                    setX0(num);
                    setX0Err(false);
                  } else {
                    setX0Err(true);
                  }
                }}
                className={`w-full ${inputClass}`}
              />
              {x0Err && <div className="text-xs text-red-400">输入错误</div>}
            </div>
            {method === "secant" && (
              <div>
                <label className="block text-sm mb-1">初始点 x₁</label>
                <input
                  type="text"
                  value={x1Text}
                  onChange={(e) => {
                    const v = e.target.value;
                    setX1Text(v);
                    const num = parseFloat(v);
                    if (!isNaN(num) && isFinite(num)) {
                      setX1(num);
                      setX1Err(false);
                    } else {
                      setX1Err(true);
                    }
                  }}
                  className={`w-full ${inputClass}`}
                />
                {x1Err && <div className="text-xs text-red-400">输入错误</div>}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">迭代方法</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
            className={`w-full ${inputClass}`}
          >
            <option value="picard">基础迭代法</option>
            <option value="aitken">艾特肯加速法</option>
            <option value="regula">单点弦截法</option>
            <option value="secant">双点弦截法</option>
            <option value="newton">牛顿法</option>
            <option value="newton-damped">牛顿下山法</option>
            <option value="bisection">二分法</option>
          </select>
        </div>
        {method === "newton-damped" && (
          <div>
            <label className="block text-sm mb-1">λ</label>
            <input
              type="text"
              value={"" + lambda}
              onChange={(e) => {
                const v = e.target.value;
                const num = parseFloat(v);
                if (!isNaN(num) && isFinite(num)) {
                  setLambda(num);
                  setLambdaErr(false);
                } else {
                  setLambdaErr(true);
                }
              }}
              className={`w-full ${inputClass}`}
            />
            {lambdaErr && <div className="text-xs text-red-400">输入错误</div>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">终止阈值 ε</label>
            <input
              type="text"
              value={"" + eps}
              onChange={(e) => {
                const v = e.target.value;
                const num = parseFloat(v);
                if (!isNaN(num) && isFinite(num) && num > 0) {
                  setEps(num);
                  setEpsErr(false);
                } else {
                  setEpsErr(true);
                }
              }}
              className={`w-full ${inputClass}`}
            />
            {epsErr && <div className="text-xs text-red-400">输入错误</div>}
          </div>
          <div>
            <label className="block text-sm mb-1">迭代间隔 {delay} ms</label>
            <input
              type="range"
              min={0}
              max={2000}
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        {(method === "picard" || method === "aitken") && (
          <div>
            <label className="block text-sm mb-1">
              不动点映射 g(x)（可选）
            </label>
            <input
              value={phiExpr}
              onChange={(e) => setPhiExpr(e.target.value)}
              placeholder="例如 cbrt(2*x+5) 或 (x^3-5)/2"
              className={`w-full ${inputClass}`}
            />
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={start}
            disabled={
              !!parseError ||
              (!!phiExpr.trim() && !!phiParseError) ||
              rangeAErr ||
              rangeBErr ||
              stepErr ||
              bracketAErr ||
              bracketBErr ||
              x0Err ||
              x1Err ||
              epsErr ||
              lambdaErr
            }
            className={`px-3 py-2 rounded ${
              theme === "dark"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            开始
          </button>
          <button
            onClick={pause}
            className={`px-3 py-2 rounded ${
              theme === "dark"
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-200 text-gray-900 border border-gray-300"
            }`}
          >
            暂停
          </button>
          <button
            onClick={reset}
            className={`px-3 py-2 rounded ${
              theme === "dark"
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-200 text-gray-900 border border-gray-300"
            }`}
          >
            重置
          </button>
        </div>
        {parseError && <div className="text-xs text-red-400">{parseError}</div>}
        {phiParseError && phiExpr.trim() && (
          <div className="text-xs text-red-400">{phiParseError}</div>
        )}
        {iterError && <div className="text-xs text-red-400">{iterError}</div>}
        <div className="mt-4">
          <div className="text-sm mb-1">迭代日志</div>
          <div
            className={`max-h-64 overflow-auto text-xs rounded ${
              theme === "dark"
                ? "bg-gray-900 border border-gray-800"
                : "bg-gray-100 border border-gray-300 text-gray-900"
            }`}
          >
            {log.map((s, i) => (
              <div key={i} className="px-2 py-1 border-b border-gray-800">
                步={i}，x={s.x.toFixed(6)}，f(x)={s.fx.toFixed(6)}，误差=
                {s.err.toExponential(2)}
              </div>
            ))}
            {stopNote && (
              <div className="px-2 py-1 text-emerald-400">{stopNote}</div>
            )}
          </div>
        </div>
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
        className={`flex-1 p-2 relative ${
          theme === "dark" ? "bg-black" : "bg-white"
        }`}
      >
        <div ref={plotRef} className="w-full h-full" />
        <div className="absolute top-3 left-3 w-56">
          <div
            ref={miniPlotRef}
            className={`h-32 rounded shadow-sm ${
              theme === "dark"
                ? "bg-gray-900/80 border border-gray-800"
                : "bg-gray-100/80 border border-gray-300"
            }`}
          />
          <div
            className={`mt-1 text-center text-xs ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
              误差-步
          </div>
        </div>
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={() => setPlotMode("pan")}
            className={`px-2 py-1 rounded ${
              plotMode === "pan"
                ? "bg-emerald-600 text-white"
                : theme === "dark"
                ? "bg-gray-800 text-gray-200"
                : "bg-gray-200 text-gray-900 border border-gray-300"
            }`}
          >
            拖动
          </button>
          <button
            onClick={() => setPlotMode("zoom")}
            className={`px-2 py-1 rounded ${
              plotMode === "zoom"
                ? "bg-emerald-600 text-white"
                : theme === "dark"
                ? "bg-gray-800 text-gray-200"
                : "bg-gray-200 text-gray-900 border border-gray-300"
            }`}
          >
            放缩
          </button>
        </div>
      </section>
    </div>
  );
}
