"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const events_1 = require("events");
class App extends events_1.EventEmitter {
    isAppReady = false;
    constructor() {
        super();
        // Инициализация готовности окружения
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
    quit() {
        this.emit('before-quit');
        process.exit(0);
    }
}
exports.app = new App();
//# sourceMappingURL=app.js.map