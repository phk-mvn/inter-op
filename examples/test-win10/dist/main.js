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
const core_1 = require("@inter-op/core");
const path = __importStar(require("path"));
core_1.app.whenReady().then(() => {
    const win = new core_1.BrowserWindow({
        width: 900,
        height: 650,
        title: 'Lightweight Electron - Windows 10/11 Test',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            devTools: true,
        },
    });
    // Обработка простого сообщения через send/on
    core_1.ipcMain.on('ping', (event, data) => {
        console.log('[Main Process] Received "ping" from renderer:', data);
        event.reply('pong', {
            response: 'Hello from Node.js (Main Process)!',
            time: new Date().toISOString(),
        });
    });
    // Обработка асинхронного вызова с возвратом значения через invoke/handle
    core_1.ipcMain.handle('compute:multiply', async (event, params) => {
        console.log('[Main Process] Handling "compute:multiply" for:', params);
        return {
            result: params.a * params.b,
            serverTimestamp: Date.now(),
        };
    });
    win.loadFile(path.join(__dirname, '../index.html'));
    win.show();
});
//# sourceMappingURL=main.js.map