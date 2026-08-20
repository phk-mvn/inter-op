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
      const { channel, payload, callbackId } = parsed;

      const event: IpcMainEvent = {
        channel,
        sender: {
          send: (ch: string, ...args: any[]) => sendReply(ch, args),
        },
        reply: (ch: string, ...args: any[]) => sendReply(ch, args),
      };

      // Если это асинхронный вызов (invoke -> handle)
      if (callbackId && this.handlers.has(channel)) {
        const handler = this.handlers.get(channel)!;
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
    } catch (err) {
      console.error('[IPC Main] Failed to parse message:', err);
    }
  }
}

export const ipcMain = new IpcMain();