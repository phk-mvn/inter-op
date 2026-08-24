# Changelog

All notable changes to this project are documented in this file.

## [0.3.0] - 2026-08-21

### Added
- **Application lifecycle (`app`)**: `app` now tracks open `BrowserWindow` instances
  (via `registerWindow`/`unregisterWindow`), `app.quit()` closes all windows and exits,
  and `app` emits `before-quit` / `window-all-closed` / `quit` events. `app.getWindows()`
  returns the live windows.
- **`contextIsolation`** (Electron parity): `webPreferences.contextIsolation` (default `true`)
  makes the injected `window.ipcRenderer` (and the `__native_ipc_dispatch` bridge) immutable
  from page scripts via `Object.defineProperty(..., { configurable: false, writable: false })`
  plus `Object.freeze`. When `false`, the globals stay mutable (Electron's legacy behavior).
- **`nodeIntegration`** option added for API parity; always `false` (WebView2 has no Node.js),
  and a warning is printed if set to `true`.
- New `WindowOptions` fields `context_isolation` / `node_integration` (Rust core + N-API bridge).
- **Antivirus false-positive mitigation**: the native addon now embeds a `VERSIONINFO`
  resource (ProductName/Company/Copyright + version) via `winres`, lowering heuristic risk
  scores. A ready-to-use signing step (`pnpm sign` / `scripts/sign.ps1`) is provided so the
  released `inter_op.node` can be **code-signed** with a trusted certificate — the only
  durable way to prevent third-party AV from flagging it on end-user machines.
- **Electron-style `contextBridge`**: `@inter-op/preload` now exports
  `contextBridge.exposeInMainWorld(key, api)`, allowing preload scripts to
  explicitly expose a safe API surface to the renderer.

### Changed
- **Preload isolation model**: the raw `window.ipcRenderer` runtime is no
  longer exposed directly to the renderer page. It is injected as an internal
  global (`window.__inter_op_ipc`) and is only available inside the preload
  script via `@inter-op/preload`. Renderer pages must use the API object
  exported through `contextBridge`.
- Updated `examples/test-win10` to demonstrate `contextBridge.exposeInMainWorld('electronAPI', ...)`
  and `window.electronAPI` usage in the HTML page.

### Security
- Renderer isolation is improved when `contextIsolation: true`: the IPC bridge
  and the context-bridge helper are sealed (`writable: false`, `configurable: false`,
  non-enumerable), and APIs exposed via `contextBridge` are frozen, preventing
  page scripts from tampering with the main-process communication channel.

## [0.2.1] - 2026-08-21

### Added
- **WebView2 backend hardening** (`crates/backend-webview2`):
  - Window style is now derived from `WindowOptions`: `frameless` produces a borderless
    `WS_POPUP` window, `resizable: false` removes `WS_THICKFRAME`/`WS_MAXIMIZEBOX`.
  - DevTools can be enabled via `webPreferences.devTools` (`Settings.SetAreDevToolsEnabled`).
  - Web message pipeline enabled (`Settings.SetIsWebMessageEnabled`).
- **Browser-JS `ipcRenderer` runtime** injected into the WebView2 renderer
  (`AddScriptToExecuteOnDocumentCreated`). It is a self-contained IIFE (no `require`/`import`)
  that exposes `window.ipcRenderer` with `send`, `invoke`, `on`, `once`, `removeListener`,
  and bridges messages via `window.chrome.webview.postMessage`.
- **Window lifecycle events**: `WebView2Window` now emits `Created` / `Closed` / `Resized` /
  `Moved` through an `EventSender<WindowEvent>` (driven from `wnd_proc` via a `thread_local`).
  The N-API addon exposes `NativeWindow.setEventCallback` and forwards events to Node,
  where `BrowserWindow` emits `ready` / `closed` / `resize` / `move`.
- **`@inter-op/preload`** is now a thin, type-safe shim over the engine-injected
  `window.ipcRenderer` global (no duplicated runtime logic), so user preloads can
  `import { ipcRenderer } from '@inter-op/preload'` and bundle cleanly to browser JS (esbuild).

### Changed
- **IPC protocol unified**: message payload is now always a JSON **array of arguments**
  (`{ channel, payload: any[], callback_id? }`), matching Electron semantics. `send`/`on`
  and `invoke`/`handle` spread arguments symmetrically on both sides.
- Native binary discovery in `BrowserWindow` now also resolves `inter_op.node`
  (the actual crate output name) in addition to the documented `index.node` copy.
- `BrowserWindow.loadFile` now produces a valid `file:///` URL with forward slashes on Windows.
- Example preload is bundled to browser JS with esbuild (`build:preload`).

### Fixed
- **`invoke`/`handle` never resolved** (`packages/core/src/ipc-main.ts`): `_dispatch` read
  `callbackId` from the parsed JSON, but the wire format uses the snake_case key `callback_id`.
  As a result `invoke` fell through to the plain `emit` path and the reply promise hung forever.
  Now resolves `callback_id ?? callbackId`.
- Renderer `postMessage` now sends a **JS object** instead of `JSON.stringify(...)`, since
  WebView2's `WebMessageAsJson` returns the raw string and `IpcMessage::from_json` expects an object.
- Corrected package name in README API example (`@light-electron/core` → `@inter-op/core`).

### Removed
- Dead `EventBus` / `WindowEvent::IpcReceived` usage in the hot path (events now flow through
  the dedicated `EventSender<WindowEvent>` channel).
