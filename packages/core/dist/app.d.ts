import { EventEmitter } from 'events';
declare class App extends EventEmitter {
    private isAppReady;
    private windows;
    private quitting;
    private exited;
    constructor();
    whenReady(): Promise<void>;
    /** Регистрируется из BrowserWindow при создании окна. */
    registerWindow(win: unknown): void;
    /** Вызывается из BrowserWindow при закрытии окна. */
    unregisterWindow(win: unknown): void;
    getWindows(): unknown[];
    quit(): void;
    private exit;
}
export declare const app: App;
export {};
//# sourceMappingURL=app.d.ts.map