export interface IpcRenderer {
    send(channel: string, ...args: any[]): void;
    invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    once(channel: string, listener: (event: any, ...args: any[]) => void): void;
    removeListener(channel: string, listener: (event: any, ...args: any[]) => void): void;
}
export declare const ipcRenderer: IpcRenderer;
//# sourceMappingURL=index.d.ts.map