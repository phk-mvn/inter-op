"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextBridge = exports.ipcRenderer = void 0;
// Рантайм ipcRenderer инжектируется движком (Rust/WebView2) как внутренний глобал
// window.__inter_op_ipc. Прямой window.ipcRenderer больше не выставляется —
// доступ к IPC должен идти через contextBridge.exposeInMainWorld.
const internalIpc = window.__inter_op_ipc ?? window.ipcRenderer;
exports.ipcRenderer = internalIpc;
if (!internalIpc) {
    console.warn('[inter-op/preload] ipcRenderer runtime is not injected by the engine.');
}
/**
 * Electron-style contextBridge. В WebView2 нет настоящих isolated worlds,
 * поэтому это безопасная обёртка над Object.defineProperty + Object.freeze,
 * которая при contextIsolation: true защищает экспортированный API от перезаписи
 * со стороны страницы.
 */
exports.contextBridge = {
    exposeInMainWorld: (key, api) => {
        const exposeFn = window.__inter_op_expose;
        if (typeof exposeFn === 'function') {
            exposeFn(key, api);
            return;
        }
        // Fallback для бэкендов, где runtime не предоставляет expose helper.
        Object.defineProperty(window, key, {
            value: api,
            writable: false,
            configurable: false,
            enumerable: true,
        });
        Object.freeze(api);
    },
};
//# sourceMappingURL=index.js.map