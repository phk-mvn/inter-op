import { EventEmitter } from 'events';
declare class App extends EventEmitter {
    private isAppReady;
    constructor();
    whenReady(): Promise<void>;
    quit(): void;
}
export declare const app: App;
export {};
//# sourceMappingURL=app.d.ts.map