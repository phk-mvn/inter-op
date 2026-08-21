# Changelog

All notable changes to this project are documented in this file.

## [0.2.0] - 2026-08-21

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
