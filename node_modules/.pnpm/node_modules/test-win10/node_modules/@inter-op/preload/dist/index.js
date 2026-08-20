"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IpcRenderer {
    listeners = new Map();
    constructor() {
        window.addEventListener('__native_ipc_message__', (event) => {
            const msg = event.detail;
            if (!msg || !msg.channel)
                return;
            const callbacks = this.listeners.get(msg.channel);
            if (callbacks) {
                callbacks.forEach((cb) => cb({ channel: msg.channel }, msg.payload));
            }
        });
    }
    send(channel, payload) {
        const raw = JSON.stringify({ channel, payload });
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(raw);
        }
        else {
            console.error('[ipcRenderer] WebView2 bridge not found');
        }
    }
    invoke(channel, payload) {
        return new Promise((resolve, reject) => {
            const callbackId = 'cb_' + Math.random().toString(36).substring(2, 9);
            const replyChannel = `__ipc_reply_${callbackId}`;
            const errorChannel = `__ipc_error_${callbackId}`;
            const cleanup = () => {
                this.listeners.delete(replyChannel);
                this.listeners.delete(errorChannel);
            };
            const onReply = (_, data) => {
                cleanup();
                resolve(data);
            };
            const onError = (_, err) => {
                cleanup();
                reject(new Error(err));
            };
            this.once(replyChannel, onReply);
            this.once(errorChannel, onError);
            const raw = JSON.stringify({ channel, payload, callbackId });
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(raw);
            }
            else {
                cleanup();
                reject(new Error('[ipcRenderer] WebView2 bridge not found'));
            }
        });
    }
    on(channel, listener) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, new Set());
        }
        this.listeners.get(channel).add(listener);
    }
    once(channel, listener) {
        const wrapper = (event, ...args) => {
            this.listeners.get(channel)?.delete(wrapper);
            listener(event, ...args);
        };
        this.on(channel, wrapper);
    }
    removeListener(channel, listener) {
        this.listeners.get(channel)?.delete(listener);
    }
}
window.ipcRenderer = new IpcRenderer();
//# sourceMappingURL=index.js.map