import { app, BrowserWindow, ipcMain } from '@inter-op/core';
import * as path from 'path';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    title: 'Lightweight Electron - Windows 10/11 Test',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Обработка простого сообщения через send/on
  ipcMain.on('ping', (event, data) => {
    console.log('[Main Process] Received "ping" from renderer:', data);
    event.reply('pong', {
      response: 'Hello from Node.js (Main Process)!',
      time: new Date().toISOString(),
    });
  });

  // Обработка асинхронного вызова с возвратом значения через invoke/handle
  ipcMain.handle('compute:multiply', async (event, params: { a: number; b: number }) => {
    console.log('[Main Process] Handling "compute:multiply" for:', params);
    return {
      result: params.a * params.b,
      serverTimestamp: Date.now(),
    };
  });

  win.loadFile(path.join(__dirname, '../index.html'));
  win.show();
});