interface IpcCallback {
  (event: { channel: string }, ...args: any[]): void;
}

class IpcRenderer {
  private listeners: Map<string, Set<IpcCallback>> = new Map();

  constructor() {
    window.addEventListener('__native_ipc_message__', (event: any) => {
      const msg = event.detail;
      if (!msg || !msg.channel) return;

      const callbacks = this.listeners.get(msg.channel);
      if (callbacks) {
        callbacks.forEach((cb) => cb({ channel: msg.channel }, msg.payload));
      }
    });
  }

  public send(channel: string, payload?: any): void {
    const raw = JSON.stringify({ channel, payload });
    if ((window as any).chrome && (window as any).chrome.webview) {
      (window as any).chrome.webview.postMessage(raw);
    } else {
      console.error('[ipcRenderer] WebView2 bridge not found');
    }
  }

  public invoke(channel: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const callbackId = 'cb_' + Math.random().toString(36).substring(2, 9);
      const replyChannel = `__ipc_reply_${callbackId}`;
      const errorChannel = `__ipc_error_${callbackId}`;

      const cleanup = () => {
        this.listeners.delete(replyChannel);
        this.listeners.delete(errorChannel);
      };

      const onReply: IpcCallback = (_, data) => {
        cleanup();
        resolve(data);
      };

      const onError: IpcCallback = (_, err) => {
        cleanup();
        reject(new Error(err));
      };

      this.once(replyChannel, onReply);
      this.once(errorChannel, onError);

      const raw = JSON.stringify({ channel, payload, callbackId });
      if ((window as any).chrome && (window as any).chrome.webview) {
        (window as any).chrome.webview.postMessage(raw);
      } else {
        cleanup();
        reject(new Error('[ipcRenderer] WebView2 bridge not found'));
      }
    });
  }

  public on(channel: string, listener: IpcCallback): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
  }

  public once(channel: string, listener: IpcCallback): void {
    const wrapper: IpcCallback = (event, ...args) => {
      this.listeners.get(channel)?.delete(wrapper);
      listener(event, ...args);
    };
    this.on(channel, wrapper);
  }

  public removeListener(channel: string, listener: IpcCallback): void {
    this.listeners.get(channel)?.delete(listener);
  }
}

(window as any).ipcRenderer = new IpcRenderer();