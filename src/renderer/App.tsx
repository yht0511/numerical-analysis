import React, { useState } from "react";
import { FlaskConical, Sigma, Zap, Sun, Moon } from "lucide-react";
import RealRootView from "./views/RealRootView";
import FractalView from "./views/FractalView";

export default function App() {
  const [tab, setTab] = useState<"real" | "fractal">("real");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return (
    <div
      className={`${
        theme === "dark" ? "bg-black text-gray-200" : "bg-white text-gray-900"
      } h-screen w-screen flex flex-col`}
    >
      <header
        className={`flex items-center justify-between px-4 py-3 border-b ${
          theme === "dark" ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <Zap className="text-emerald-500" />
          <span className="font-semibold text-lg">迭代解法可视化 by 杨浩天</span>
        </div>
        <nav className="flex gap-2 items-center">
          <button
            onClick={() => setTab("real")}
            className={`px-3 py-2 rounded-md ${
              tab === "real"
                ? "bg-emerald-600 text-white"
                : theme === "dark"
                ? "bg-gray-800 text-gray-200"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            <Sigma className="inline mr-1" size={16} /> XY视图
          </button>
          <button
            onClick={() => setTab("fractal")}
            className={`px-3 py-2 rounded-md ${
              tab === "fractal"
                ? "bg-emerald-600 text-white"
                : theme === "dark"
                ? "bg-gray-800 text-gray-200"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            <FlaskConical className="inline mr-1" size={16} /> 复数域
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`ml-4 px-3 py-2 rounded-md border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-200"
                : "bg-gray-100 border-gray-300 text-gray-900"
            }`}
            aria-label="切换黑白主题"
          >
            {theme === "dark" ? (
              <Sun size={16} className="inline mr-1" />
            ) : (
              <Moon size={16} className="inline mr-1" />
            )}
            {theme === "dark" ? "白色" : "黑色"}
          </button>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        {tab === "real" ? (
          <RealRootView theme={theme} />
        ) : (
          <FractalView theme={theme} />
        )}
      </main>
    </div>
  );
}
