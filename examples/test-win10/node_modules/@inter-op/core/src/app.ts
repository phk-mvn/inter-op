import { EventEmitter } from 'events';

class App extends EventEmitter {
  private isAppReady = false;

  constructor() {
    super();
    // Инициализация готовности окружения
    process.nextTick(() => {
      this.isAppReady = true;
      this.emit('ready');
    });
  }

  public whenReady(): Promise<void> {
    if (this.isAppReady) return Promise.resolve();
    return new Promise((resolve) => this.once('ready', () => resolve()));
  }

  public quit(): void {
    this.emit('before-quit');
    process.exit(0);
  }
}

export const app = new App();