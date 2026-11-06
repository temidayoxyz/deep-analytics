export interface LocaleSeat {
  t: (key: string, params?: Record<string, string | number>) => string
}

export interface LocaleHost {
  register(ns: string, dictionaries: Record<string, unknown>): void
  bind(ns: string): (key: string, params?: Record<string, string | number>) => string
}

export interface SlotsHost {
  inject(slot: string, factory: () => unknown): void
  register(options: SlotRegistration, component: (props: never) => unknown): unknown
}

export interface SlotRegistration {
  name: string
  id: string
  order: number
  label?: () => string
  locale?: string
  inject?: (owner: unknown) => unknown
}

export interface ObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}

export interface SessionListState {
  ids: readonly string[]
  byId: Record<string, any>
  projectionsBySession: Record<string, any>
  phase: string
}

export interface SessionsHost {
  list: ObservableSnapshot<SessionListState>
  refresh(): Promise<void>
  refreshProjections(sessionId: string): Promise<void>
}

export interface ClientContextLike {
  effect(apply: () => (() => void) | void, label: string): void
  locale: LocaleHost
  slots: SlotsHost
  sessions: SessionsHost
}