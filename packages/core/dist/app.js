"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const events_1 = require("events");
class App extends events_1.EventEmitter {
    isAppReady = false;
    windows = new Set();
    quitting = false;
    exited = false;
    constructor() {
        super();
        // Движок (Node + нативный N-API аддон) инициализируется синхронно при загрузке модуля,
        // поэтому сигнализируем о готовности на следующем тике.
        process.nextTick(() => {
            this.isAppReady = true;
            this.emit('ready');
        });
    }
    whenReady() {
        if (this.isAppReady)
            return Promise.resolve();
        return new Promise((resolve) => this.once('ready', () => resolve()));
    }
    /** Регистрируется из BrowserWindow при создании окна. */
    registerWindow(win) {
        this.windows.add(win);
    }
    /** Вызывается из BrowserWindow при закрытии окна. */
    unregisterWindow(win) {
        if (!this.windows.delete(win))
            return;
        if (this.windows.size === 0) {
            this.emit('window-all-closed');
            if (this.quitting)
                this.exit();
        }
    }
    getWindows() {
        return Array.from(this.windows);
    }
    quit() {
        if (this.quitting)
            return;
        this.emit('before-quit');
        if (this.windows.size === 0) {
            this.exit();
            return;
        }
        this.quitting = true;
        // Закрываем все окна; после последнего закрытия unregisterWindow вызовет exit().
        this.windows.forEach((win) => {
            try {
                win.close();
            }
            catch {
                /* ignore */
            }
        });
        // Страховка, если окно не пришлёт событие closed.
        setTimeout(() => this.exit(), 3000);
    }
    exit() {
        if (this.exited)
            return;
        this.exited = true;
        this.emit('quit');
        process.exit(0);
    }
}
exports.app = new App();
//# sourceMappingURL=app.js.map