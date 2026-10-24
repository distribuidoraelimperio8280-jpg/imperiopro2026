const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  printDocument: (options) => ipcRenderer.invoke('print-document', options),
  savePDF: (data) => ipcRenderer.invoke('save-pdf', data),
});
