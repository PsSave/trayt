import { app } from 'electron'

export const is = {
  dev: !app.isPackaged
}
