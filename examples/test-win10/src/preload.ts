// Подключаем рантайм IPC моста (инжектится движком как window.ipcRenderer).
// Импорт типизированного значения работает после бандлинга прелоада в browser-JS.
import { ipcRenderer } from '@inter-op/preload';

console.log('[Preload] ipcRenderer injected:', !!ipcRenderer);
