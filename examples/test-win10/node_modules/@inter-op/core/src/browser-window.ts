import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { ipcMain } from './ipc-main';

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

export class BrowserWindow extends EventEmitter {
  private nativeWindow: any; // NativeWindow из napi-rs аддона

  constructor(options: BrowserWindowOptions = {}) {
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

    let addon: any = null;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          addon = require(candidate);
          break;
        } catch (e) {
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
      preload_script: options.webPreferences?.preload ? path.resolve(options.webPreferences.preload) : undefined,
    };

    this.nativeWindow = new addon.NativeWindow(nativeOpts);

    // Подключаем IPC колбэк от Rust к ipcMain
    this.nativeWindow.setIpcCallback((rawJson: string) => {
      ipcMain._dispatch(rawJson, (channel, payload, callbackId) => {
        this.nativeWindow.sendIpc(channel, payload);
      });
    });

    // Подключаем события жизненного цикла окна из Rust
    this.nativeWindow.setEventCallback((rawJson: string) => {
      try {
        const ev = JSON.parse(rawJson);
        switch (ev.type) {
          case 'created':
            this.emit('ready');
            this.emit('created');
            break;
          case 'closed':
            this.emit('closed');
            break;
          case 'resized':
            this.emit('resize', { width: ev.width, height: ev.height });
            break;
          case 'moved':
            this.emit('move', { x: ev.x, y: ev.y });
            break;
        }
      } catch {
        /* ignore malformed event */
      }
    });
  }

  public loadURL(url: string): void {
    this.nativeWindow.loadUrl(url);
  }

  public loadFile(filePath: string): void {
    const absolutePath = path.resolve(filePath).replace(/\\/g, '/');
    this.loadURL(`file:///${absolutePath}`);
  }

  public loadHTML(html: string): void {
    this.nativeWindow.loadHtml(html);
  }

  public show(): void {
    this.nativeWindow.show();
  }

  public close(): void {
    this.nativeWindow.close();
  }

  public get webContents() {
    return {
      send: (channel: string, ...args: any[]) => {
        this.nativeWindow.sendIpc(channel, args);
      },
      executeJavaScript: (script: string) => {
        this.nativeWindow.executeScript(script);
      },
    };
  }
}