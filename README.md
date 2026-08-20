# RS-Engine (Lightweight Electron Alternative)

An lightweight alternative to **Electron** that leverages native operating system webview engines instead of bundling a heavy Chromium distribution.

The core engine is written in **Rust**, while exposing a familiar **Node.js / TypeScript API** with full support for application lifecycle (`app`), window management (`BrowserWindow`), `preload` scripts, and bidirectional IPC (`ipcMain` <-> `ipcRenderer`).

---

## Key Features

* **Ultra-Low Memory Footprint:** ~**60–70 MB** idle RAM including the Node.js process (compared to 200–350+ MB with standard Electron).
* **No Bundled Chromium:** Utilizes pre-installed OS webview components.
* **Familiar Electron-Like API:** Write `main.ts` and `preload.ts` almost 1-to-1 as you would in Electron.
* **Dedicated STA UI Thread:** The native window runs on an isolated Windows message loop thread, completely eliminating UI hangs ("Not Responding").
* **Asynchronous N-API Bridge:** High-performance, non-blocking message passing between Node.js (libuv) and WebView2 powered by `napi-rs`.

---

## Platform Support Matrix

| Platform | Native Engine | Status |
| :--- | :--- | :--- |
| **Windows 10 / 11** | Edge WebView2 (Chromium Evergreen) | **Ready for Development & Testing** |
| **Linux (x64 / ARM64)** | WebKitGTK (WebKit2) | In Development |
| **Windows 7 (x86 / x64)** | MSHTML (IE11 Engine + COM) | In Development |

---

## Monorepo Structure

```text
├── Cargo.toml                       # Root Cargo workspace manifest (Rust)
├── package.json                     # Root PNPM workspace manifest
├── pnpm-workspace.yaml
│
├── crates/                          # Native Rust layer
│   ├── core/                        # WindowBackend traits and IPC message protocol
│   ├── backend-webview2/            # Native Win32 window & WebView2 integration for Win 10/11
│   └── node-bridge/                 # N-API native addon bridging Rust and Node.js
│
├── packages/                        # TypeScript packages
│   ├── core/                        # Main library: { app, BrowserWindow, ipcMain }
│   ├── preload/                     # Injected runtime providing { ipcRenderer }
│   ├── cli/                         # Development CLI runner (in development)
│   └── builder/                     # Standalone packager / installer generator (in development)
│
└── examples/
    └── test-win10/                  # Test application for Windows 10/11
        ├── src/
        │   ├── main.ts              # Main Node.js process
        │   └── preload.ts           # Preload script
        └── index.html               # Frontend UI
```

## Prerequisites
- **Node.js** >= 18.x (recommended: 20.x or 22.x LTS, x64).
- **PNPM** >= 8.x (npm install -g pnpm).
- **Rust Toolchain** (stable-msvc x64, install via rustup.rs).
- **Edge WebView2 Runtime** (pre-installed by default on Windows 10/11).

## Quickstart & Development Guide (Windows 10/11)
**1. Install Dependencies**
Run in the root directory:

```Powershell
pnpm install
Note: If you encounter a self-signed certificate in certificate chain error, run:
pnpm config set strict-ssl false
```

**2. Build the Rust Native Bridge**
Compile the native N-API shared library:

```Powershell
cargo build -p inter-op --release
```

**3. Copy the Native Addon**
Node.js requires native binary modules to have a .node extension. Copy the freshly built DLL:

```Powershell
Copy-Item target/release/inter_op.dll crates/node-bridge/index.node -Force
Copy-Item target/release/inter_op.dll target/release/inter_op.node -Force
```

**4. Build TypeScript Packages**
Compile the TypeScript core and preload packages:

```Powershell
pnpm -w run build:ts
```

5. Launch the Test Application
Navigate to the test example and start the app:

```Powershell
cd examples/test-win10
pnpm start
```

## API Usage Example
`main.ts` **(Node.js Main Process):**

```TypeScript
import { app, BrowserWindow, ipcMain } from '@light-electron/core';
import * as path from 'path';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    title: 'My Lightweight App',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 1. One-way / event-based messaging (Send / On)
  ipcMain.on('ping', (event, data) => {
    console.log('Received from UI:', data);
    event.reply('pong', { message: 'Hello from Node.js main process!' });
  });

  // 2. Request-Response pattern with return value (Invoke / Handle)
  ipcMain.handle('math:multiply', async (event, { a, b }) => {
    return { result: a * b };
  });

  win.loadFile(path.join(__dirname, '../index.html'));
  win.show();
});
```

`index.html` **(Renderer UI Process):**

```Html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>App</title>
</head>
<body>
  <h1>Hello from Light Engine!</h1>
  <button id="btnPing">Send Ping</button>
  <button id="btnCalc">Calculate 5 * 10</button>

  <script>
    // Listen for incoming responses from Node.js
    window.ipcRenderer.on('pong', (event, data) => {
      console.log('Response from main.ts:', data);
    });

    // 1. Send an event without waiting for a Promise
    document.getElementById('btnPing').onclick = () => {
      window.ipcRenderer.send('ping', { timestamp: Date.now() });
    };

    // 2. Invoke a method and await the result via Promise
    document.getElementById('btnCalc').onclick = async () => {
      const res = await window.ipcRenderer.invoke('math:multiply', { a: 5, b: 10 });
      console.log('Multiplication result:', res.result); // 50
    };
  </script>
</body>
</html>
```