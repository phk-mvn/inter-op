// Electron-style preload: IPC доступен только через явно экспортированный API.
import { contextBridge, ipcRenderer } from '@inter-op/preload';

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (event: any, ...args: any[]) => void) =>
    ipcRenderer.on(channel, listener),
  once: (channel: string, listener: (event: any, ...args: any[]) => void) =>
    ipcRenderer.once(channel, listener),
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) =>
    ipcRenderer.removeListener(channel, listener),
});

console.log('[Preload] electronAPI exposed:', !!(window as any).electronAPI);
