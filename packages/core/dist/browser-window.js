"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserWindow = void 0;
const events_1 = require("events");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ipc_main_1 = require("./ipc-main");
const app_1 = require("./app");
class BrowserWindow extends events_1.EventEmitter {
    nativeWindow; // NativeWindow из napi-rs аддона
    constructor(options = {}) {
        super();
        // Автоматический поиск нативного бинарника
        const candidates = [
            path.resolve(__dirname, '../../../target/release/inter_op.node'),
            path.resolve(__dirname, '../../../target/release/light_node_bridge.node'),
            path.resolve(__dirname, '../../../crates/node-bridge/index.node'),
            path.resolve(__dirname, '../../crates/node-bridge/index.node'),
            path.resolve(__dirname, './inter_op.node'),
            path.resolve(__dirname, './light_node_bridge.node'),
        ];
        let addon = null;
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                try {
                    addon = require(candidate);
                    break;
                }
                catch (e) {
                    console.error(`[Light Electron] Error loading candidate ${candidate}:`, e);
                }
            }
        }
        if (!addon) {
            throw new Error(`[Light Electron] Native bridge binary not found! Checked paths:\n${candidates.join('\n')}`);
        }
        const nativeOpts = {
            title: options.title ?? 'Light App',
            width: options.width ?? 800,
            height: options.height ?? 600,
            resizable: options.resizable ?? true,
            frameless: options.frame === false,
            devtools: options.webPreferences?.devTools ?? false,
            contextIsolation: options.webPreferences?.contextIsolation ?? true,
            nodeIntegration: options.webPreferences?.nodeIntegration ?? false,
            preloadScript: options.webPreferences?.preload ? path.resolve(options.webPreferences.preload) : undefined,
        };
        this.nativeWindow = new addon.NativeWindow(nativeOpts);
        // Регистрируем окно в app для жизненного цикла (quit / window-all-closed)
        app_1.app.registerWindow(this);
        // Подключаем IPC колбэк от Rust к ipcMain
        this.nativeWindow.setIpcCallback((rawJson) => {
            ipc_main_1.ipcMain._dispatch(rawJson, (channel, payload, callbackId) => {
                this.nativeWindow.sendIpc(channel, payload);
            });
        });
        // Подключаем события жизненного цикла окна из Rust
        this.nativeWindow.setEventCallback((rawJson) => {
            try {
                const ev = JSON.parse(rawJson);
                switch (ev.type) {
                    case 'created':
                        this.emit('ready');
                        this.emit('created');
                        break;
                    case 'closed':
                        this.emit('closed');
                        app_1.app.unregisterWindow(this);
                        break;
                    case 'resized':
                        this.emit('resize', { width: ev.width, height: ev.height });
                        break;
                    case 'moved':
                        this.emit('move', { x: ev.x, y: ev.y });
                        break;
                }
            }
            catch {
                /* ignore malformed event */
            }
        });
    }
    loadURL(url) {
        this.nativeWindow.loadUrl(url);
    }
    loadFile(filePath) {
        const absolutePath = path.resolve(filePath).replace(/\\/g, '/');
        this.loadURL(`file:///${absolutePath}`);
    }
    loadHTML(html) {
        this.nativeWindow.loadHtml(html);
    }
    show() {
        this.nativeWindow.show();
    }
    close() {
        this.nativeWindow.close();
    }
    get webContents() {
        return {
            send: (channel, ...args) => {
                this.nativeWindow.sendIpc(channel, args);
            },
            executeJavaScript: (script) => {
                this.nativeWindow.executeScript(script);
            },
        };
    }
}
exports.BrowserWindow = BrowserWindow;
//# sourceMappingURL=browser-window.js.map