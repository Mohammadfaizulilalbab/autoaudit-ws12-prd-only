import { createContext, useContext } from 'react'
import type { State } from './store'

export type Notice = { kind: 'ok' | 'info' | 'error'; text: string }
export type Ctx = {
  state: State
  /** Simpan ke localStorage dulu; state hanya berubah bila penyimpanan berhasil. */
  commit: (next: State, okText: string) => boolean
  notify: (kind: Notice['kind'], text: string) => void
}

export const AppCtx = createContext<Ctx>(null!)
export const useApp = () => useContext(AppCtx)
