"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcMain = exports.BrowserWindow = exports.app = void 0;
var app_1 = require("./app");
Object.defineProperty(exports, "app", { enumerable: true, get: function () { return app_1.app; } });
var browser_window_1 = require("./browser-window");
Object.defineProperty(exports, "BrowserWindow", { enumerable: true, get: function () { return browser_window_1.BrowserWindow; } });
var ipc_main_1 = require("./ipc-main");
Object.defineProperty(exports, "ipcMain", { enumerable: true, get: function () { return ipc_main_1.ipcMain; } });
//# sourceMappingURL=index.js.map