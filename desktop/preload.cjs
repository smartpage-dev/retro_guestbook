'use strict';
const { contextBridge, ipcRenderer } = require('electron');
// No raw IPC, filesystem, process, require, or arbitrary URL opener is exposed.
contextBridge.exposeInMainWorld('RetroDesktop', Object.freeze({
  version: '0.9.0-alpha.1',
  info: () => ipcRenderer.invoke('retro:info'),
  authorizeCloud: origin => ipcRenderer.invoke('retro:cloud', origin),
  fullscreen: () => ipcRenderer.invoke('retro:fullscreen'),
  storageLocation: () => ipcRenderer.invoke('retro:storage'),
  onSuspend: callback => {
    if (typeof callback !== 'function') return;
    const handler = () => callback(); ipcRenderer.on('retro:suspend', handler);
    return () => ipcRenderer.removeListener('retro:suspend', handler);
  },
  onExport: callback => {
    if (typeof callback !== 'function') return;
    const handler = (_event, result) => callback(result); ipcRenderer.on('retro:export', handler);
    return () => ipcRenderer.removeListener('retro:export', handler);
  }
}));
