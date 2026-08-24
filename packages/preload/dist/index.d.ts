export interface IpcRenderer {
    send(channel: string, ...args: any[]): void;
    invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    once(channel: string, listener: (event: any, ...args: any[]) => void): void;
    removeListener(channel: string, listener: (event: any, ...args: any[]) => void): void;
}
export declare const ipcRenderer: IpcRenderer;
/**
 * Electron-style contextBridge. В WebView2 нет настоящих isolated worlds,
 * поэтому это безопасная обёртка над Object.defineProperty + Object.freeze,
 * которая при contextIsolation: true защищает экспортированный API от перезаписи
 * со стороны страницы.
 */
export declare const contextBridge: {
    exposeInMainWorld: (key: string, api: any) => void;
};
//# sourceMappingURL=index.d.ts.map