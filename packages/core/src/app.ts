import { EventEmitter } from 'events';

class App extends EventEmitter {
  private isAppReady = false;
  private windows = new Set<unknown>();
  private quitting = false;
  private exited = false;

  constructor() {
    super();
    // Движок (Node + нативный N-API аддон) инициализируется синхронно при загрузке модуля,
    // поэтому сигнализируем о готовности на следующем тике.
    process.nextTick(() => {
      this.isAppReady = true;
      this.emit('ready');
    });
  }

  public whenReady(): Promise<void> {
    if (this.isAppReady) return Promise.resolve();
    return new Promise((resolve) => this.once('ready', () => resolve()));
  }

  /** Регистрируется из BrowserWindow при создании окна. */
  public registerWindow(win: unknown): void {
    this.windows.add(win);
  }

  /** Вызывается из BrowserWindow при закрытии окна. */
  public unregisterWindow(win: unknown): void {
    if (!this.windows.delete(win)) return;
    if (this.windows.size === 0) {
      this.emit('window-all-closed');
      if (this.quitting) this.exit();
    }
  }

  public getWindows(): unknown[] {
    return Array.from(this.windows);
  }

  public quit(): void {
    if (this.quitting) return;
    this.emit('before-quit');
    if (this.windows.size === 0) {
      this.exit();
      return;
    }
    this.quitting = true;
    // Закрываем все окна; после последнего закрытия unregisterWindow вызовет exit().
    this.windows.forEach((win) => {
      try {
        (win as { close: () => void }).close();
      } catch {
        /* ignore */
      }
    });
    // Страховка, если окно не пришлёт событие closed.
    setTimeout(() => this.exit(), 3000);
  }

  private exit(): void {
    if (this.exited) return;
    this.exited = true;
    this.emit('quit');
    process.exit(0);
  }
}

export const app = new App();
