import { contextBridge, ipcRenderer } from 'electron'
import type { ProviderUsage } from '../shared/usage'

export interface ShownPayload {
  anchor: 'top' | 'bottom'
}

const api = {
  getUsage: (): Promise<ProviderUsage[]> => ipcRenderer.invoke('trayt:getUsage'),
  onShown: (cb: (payload: ShownPayload) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ShownPayload): void => cb(payload)
    ipcRenderer.on('trayt:shown', handler)
    return () => ipcRenderer.off('trayt:shown', handler)
  },
  resize: (height: number): void => ipcRenderer.send('trayt:resize', height)
}

contextBridge.exposeInMainWorld('trayt', api)

export type TraytApi = typeof api
