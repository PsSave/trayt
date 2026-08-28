import { contextBridge, ipcRenderer } from 'electron'
import type { ProviderUsage } from '../shared/usage'

const api = {
  getUsage: (): Promise<ProviderUsage[]> => ipcRenderer.invoke('trayt:getUsage')
}

contextBridge.exposeInMainWorld('trayt', api)

export type TraytApi = typeof api
