import { EventEmitter } from 'events';

export interface IpcMainEvent {
  channel: string;
  sender: {
    send: (channel: string, ...args: any[]) => void;
  };
  reply: (channel: string, ...args: any[]) => void;
}

type IpcHandler = (event: IpcMainEvent, ...args: any[]) => Promise<any> | any;

class IpcMain extends EventEmitter {
  private handlers = new Map<string, IpcHandler>();

  /** Регистрация обработчика для ipcRenderer.send */
  public on(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void): this {
    return super.on(channel, listener);
  }

  /** Регистрация обработчика для ipcRenderer.invoke (асинхронный ответ) */
  public handle(channel: string, handler: IpcHandler): void {
    if (this.handlers.has(channel)) {
      throw new Error(`Handler already registered for IPC channel: ${channel}`);
    }
    this.handlers.set(channel, handler);
  }

  public removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  /** Внутренний диспетчер входящих сообщений из Rust */
  public _dispatch(rawMessage: string, sendReply: (channel: string, payload: any, callbackId?: string) => void): void {
    try {
      const parsed = JSON.parse(rawMessage);
      const channel: string = parsed.channel;
      const payload = parsed.payload;
      const callbackId: string | undefined = parsed.callback_id ?? parsed.callbackId;
      const args: any[] = Array.isArray(payload) ? payload : [payload];

      const event: IpcMainEvent = {
        channel,
        sender: {
          send: (ch: string, ...a: any[]) => sendReply(ch, a),
        },
        reply: (ch: string, ...a: any[]) => sendReply(ch, a),
      };

      // Если это асинхронный вызов (invoke -> handle)
      if (callbackId && this.handlers.has(channel)) {
        const handler = this.handlers.get(channel)!;
        Promise.resolve(handler(event, ...args))
          .then((result) => {
            sendReply(`__ipc_reply_${callbackId}`, [result], callbackId);
          })
          .catch((err) => {
            sendReply(`__ipc_error_${callbackId}`, [err?.message || String(err)], callbackId);
          });
        return;
      }

      // Обычный вызов через emit (spread аргументов, как в Electron)
      this.emit(channel, event, ...args);
    } catch (err) {
      console.error('[IPC Main] Failed to parse message:', err);
    }
  }
}

export const ipcMain = new IpcMain();