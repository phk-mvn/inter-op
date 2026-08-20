"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcMain = void 0;
const events_1 = require("events");
class IpcMain extends events_1.EventEmitter {
    handlers = new Map();
    /** Регистрация обработчика для ipcRenderer.send */
    on(channel, listener) {
        return super.on(channel, listener);
    }
    /** Регистрация обработчика для ipcRenderer.invoke (асинхронный ответ) */
    handle(channel, handler) {
        if (this.handlers.has(channel)) {
            throw new Error(`Handler already registered for IPC channel: ${channel}`);
        }
        this.handlers.set(channel, handler);
    }
    removeHandler(channel) {
        this.handlers.delete(channel);
    }
    /** Внутренний диспетчер входящих сообщений из Rust */
    _dispatch(rawMessage, sendReply) {
        try {
            const parsed = JSON.parse(rawMessage);
            const { channel, payload, callbackId } = parsed;
            const event = {
                channel,
                sender: {
                    send: (ch, ...args) => sendReply(ch, args),
                },
                reply: (ch, ...args) => sendReply(ch, args),
            };
            // Если это асинхронный вызов (invoke -> handle)
            if (callbackId && this.handlers.has(channel)) {
                const handler = this.handlers.get(channel);
                Promise.resolve(handler(event, payload))
                    .then((result) => {
                    sendReply(`__ipc_reply_${callbackId}`, result, callbackId);
                })
                    .catch((err) => {
                    sendReply(`__ipc_error_${callbackId}`, err?.message || String(err), callbackId);
                });
                return;
            }
            // Обычный вызов через emit
            this.emit(channel, event, payload);
        }
        catch (err) {
            console.error('[IPC Main] Failed to parse message:', err);
        }
    }
}
exports.ipcMain = new IpcMain();
//# sourceMappingURL=ipc-main.js.map