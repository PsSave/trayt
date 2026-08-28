import type { TraytApi } from './index'

declare global {
  interface Window {
    trayt: TraytApi
  }
}
