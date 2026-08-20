import { EventEmitter } from 'events';
export interface IpcMainEvent {
    channel: string;
    sender: {
        send: (channel: string, ...args: any[]) => void;
    };
    reply: (channel: string, ...args: any[]) => void;
}
type IpcHandler = (event: IpcMainEvent, ...args: any[]) => Promise<any> | any;
declare class IpcMain extends EventEmitter {
    private handlers;
    /** Регистрация обработчика для ipcRenderer.send */
    on(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void): this;
    /** Регистрация обработчика для ipcRenderer.invoke (асинхронный ответ) */
    handle(channel: string, handler: IpcHandler): void;
    removeHandler(channel: string): void;
    /** Внутренний диспетчер входящих сообщений из Rust */
    _dispatch(rawMessage: string, sendReply: (channel: string, payload: any, callbackId?: string) => void): void;
}
export declare const ipcMain: IpcMain;
export {};
//# sourceMappingURL=ipc-main.d.ts.map