export interface IpcRenderer {
  send(channel: string, ...args: any[]): void;
  invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
  on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  once(channel: string, listener: (event: any, ...args: any[]) => void): void;
  removeListener(channel: string, listener: (event: any, ...args: any[]) => void): void;
}

// Рантайм ipcRenderer инжектируется движком (Rust/WebView2) как window.ipcRenderer.
// Здесь мы лишь предоставляем типизированный доступ к уже существующему глобалу,
// чтобы прелоад можно было писать "как в Electron": import { ipcRenderer } from '@inter-op/preload'.
export const ipcRenderer: IpcRenderer = (window as any).ipcRenderer;

if (!(window as any).ipcRenderer) {
  console.warn('[inter-op/preload] ipcRenderer runtime is not injected by the engine.');
}
