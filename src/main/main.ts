import { app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const log = (...args: any[]) => {
    try {
      const line = args.map((a) => String(a)).join(" ");
      console.log(line);
      const logsDir = app.getPath("logs");
      const logFile = path.join(logsDir, "numericalviz_boot.log");
      try {
        fs.mkdirSync(logsDir, { recursive: true });
      } catch {}
      fs.appendFileSync(logFile, line + "\n");
    } catch {}
  };

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.on("did-finish-load", () => {
    log("[did-finish-load] url:", win?.webContents.getURL());
  });
  win.webContents.on(
    "did-fail-load",
    (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      log(
        "[did-fail-load]",
        "code:",
        errorCode,
        "desc:",
        errorDescription,
        "url:",
        validatedURL,
        "main:",
        isMainFrame
      );
    }
  );

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
