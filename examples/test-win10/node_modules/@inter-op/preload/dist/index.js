"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcRenderer = void 0;
// Рантайм ipcRenderer инжектируется движком (Rust/WebView2) как window.ipcRenderer.
// Здесь мы лишь предоставляем типизированный доступ к уже существующему глобалу,
// чтобы прелоад можно было писать "как в Electron": import { ipcRenderer } from '@inter-op/preload'.
exports.ipcRenderer = window.ipcRenderer;
if (!window.ipcRenderer) {
    console.warn('[inter-op/preload] ipcRenderer runtime is not injected by the engine.');
}
//# sourceMappingURL=index.js.map