import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Status } from './store'

/** Modal native: showModal() membuat latar inert (fokus tertahan di modal), Esc ditangani lewat onCancel. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => {
      dialog.close()
      opener?.focus()
    }
  }, [])
  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onClose() }}>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  )
}

type ConfirmProps = {
  title: string
  confirmLabel: string
  /** Bila diisi, tombol konfirmasi baru aktif setelah teks ini diketik (konfirmasi tegas). */
  typeToConfirm?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  children: ReactNode
}

export function ConfirmDialog({ title, confirmLabel, typeToConfirm, danger, onConfirm, onCancel, children }: ConfirmProps) {
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const ok = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.toLowerCase()
  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onConfirm() }}>
        {children}
        {typeToConfirm && (
          <div className="field">
            <label htmlFor={inputId}>
              Ketik <strong className="mono">{typeToConfirm}</strong> untuk mengonfirmasi
            </label>
            <input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
        )}
        <div className="actions end">
          <button type="button" onClick={onCancel}>Batal</button>
          <button type="submit" className={danger ? 'danger' : 'primary'} disabled={!ok}>{confirmLabel}</button>
        </div>
      </form>
    </Modal>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {status === 'Published' ? 'Published (tayang)' : status}
    </span>
  )
}

export function Summary({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="summary">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
