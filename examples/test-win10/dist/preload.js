"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // ../../packages/preload/dist/index.js
  var require_dist = __commonJS({
    "../../packages/preload/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.contextBridge = exports.ipcRenderer = void 0;
      var internalIpc = window.__inter_op_ipc ?? window.ipcRenderer;
      exports.ipcRenderer = internalIpc;
      if (!internalIpc) {
        console.warn("[inter-op/preload] ipcRenderer runtime is not injected by the engine.");
      }
      exports.contextBridge = {
        exposeInMainWorld: (key, api) => {
          const exposeFn = window.__inter_op_expose;
          if (typeof exposeFn === "function") {
            exposeFn(key, api);
            return;
          }
          Object.defineProperty(window, key, {
            value: api,
            writable: false,
            configurable: false,
            enumerable: true
          });
          Object.freeze(api);
        }
      };
    }
  });

  // src/preload.ts
  var import_preload = __toESM(require_dist());
  import_preload.contextBridge.exposeInMainWorld("electronAPI", {
    send: (channel, ...args) => import_preload.ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => import_preload.ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => import_preload.ipcRenderer.on(channel, listener),
    once: (channel, listener) => import_preload.ipcRenderer.once(channel, listener),
    removeListener: (channel, listener) => import_preload.ipcRenderer.removeListener(channel, listener)
  });
  console.log("[Preload] electronAPI exposed:", !!window.electronAPI);
})();
