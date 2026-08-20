import { EventEmitter } from 'events';
export interface BrowserWindowOptions {
    width?: number;
    height?: number;
    title?: string;
    resizable?: boolean;
    frame?: boolean;
    webPreferences?: {
        preload?: string;
        devTools?: boolean;
    };
}
export declare class BrowserWindow extends EventEmitter {
    private nativeWindow;
    constructor(options?: BrowserWindowOptions);
    loadURL(url: string): void;
    loadFile(filePath: string): void;
    loadHTML(html: string): void;
    show(): void;
    close(): void;
    get webContents(): {
        send: (channel: string, ...args: any[]) => void;
        executeJavaScript: (script: string) => void;
    };
}
//# sourceMappingURL=browser-window.d.ts.map