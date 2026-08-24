export interface IpcRenderer {
  send(channel: string, ...args: any[]): void;
  invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  once(channel: string, listener: (event: any, ...args: any[]) => void): void;
  removeListener(channel: string, listener: (event: any, ...args: any[]) => void): void;
}

// Рантайм ipcRenderer инжектируется движком (Rust/WebView2) как внутренний глобал
// window.__inter_op_ipc. Прямой window.ipcRenderer больше не выставляется —
// доступ к IPC должен идти через contextBridge.exposeInMainWorld.
const internalIpc: IpcRenderer | undefined = (window as any).__inter_op_ipc ?? (window as any).ipcRenderer;

export const ipcRenderer: IpcRenderer = internalIpc as IpcRenderer;

if (!internalIpc) {
  console.warn('[inter-op/preload] ipcRenderer runtime is not injected by the engine.');
}

/**
 * Electron-style contextBridge. В WebView2 нет настоящих isolated worlds,
 * поэтому это безопасная обёртка над Object.defineProperty + Object.freeze,
 * которая при contextIsolation: true защищает экспортированный API от перезаписи
 * со стороны страницы.
 */
export const contextBridge = {
  exposeInMainWorld: (key: string, api: any): void => {
    const exposeFn = (window as any).__inter_op_expose;
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
