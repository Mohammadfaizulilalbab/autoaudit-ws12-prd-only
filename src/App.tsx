import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AppCtx, type Ctx, type Notice } from './app-context'
import { CrmDetail, CrmList } from './CrmPages'
import { History } from './History'
import { AuditList, PromptEdit, PromptList } from './Prompts'
import { load, save, seed, USER, type State } from './store'
import { ConfirmDialog } from './ui'

type Section = 'crm' | 'prompt' | 'audit'
const SECTIONS: [Section, string][] = [['crm', 'CRM Pages'], ['prompt', 'Saved Prompt'], ['audit', 'Continuous Audit']]

// Hash routing: GitHub Pages tidak punya fallback SPA, jadi memuat ulang #/... di subpath repo tetap jalan.
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const useHashPath = () => useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || '/')

type Route = { clientId?: string; section?: Section; el: ReactNode }

function resolve(s: State, path: string): Route {
  const [a, b, c] = path.split('/').filter(Boolean)
  const list = (clientId: string, section: Section): Route => ({
    clientId, section,
    el: section === 'crm' ? <CrmList clientId={clientId} /> : section === 'prompt' ? <PromptList clientId={clientId} /> : <AuditList clientId={clientId} />,
  })
  if (!a) return list(s.clients[0].id, 'crm')
  if (a === 'k' && s.clients.some((x) => x.id === b) && SECTIONS.some(([key]) => key === c)) return list(b, c as Section)
  if (a === 'crm') {
    const page = s.pages.find((x) => x.id === b)
    if (page) return { clientId: page.clientId, section: 'crm', el: <CrmDetail page={page} /> }
  }
  if (a === 'prompt') {
    const prompt = s.prompts.find((x) => x.id === b)
    if (prompt) return { clientId: prompt.clientId, section: 'prompt', el: <PromptEdit key={prompt.id} prompt={prompt} /> }
  }
  if (a === 'riwayat' && b === 'prompt') {
    const prompt = s.prompts.find((x) => x.id === c)
    if (prompt) return { clientId: prompt.clientId, section: 'prompt', el: <History key={path} kind="prompt" id={c} /> }
  }
  if (a === 'riwayat' && b === 'versi') {
    const version = s.versions.find((x) => x.id === c)
    const page = version && s.pages.find((x) => x.id === version.pageId)
    if (page) return { clientId: page.clientId, section: 'crm', el: <History key={path} kind="versi" id={c} /> }
  }
  return {
    el: (
      <>
        <h1>Halaman tidak ditemukan</h1>
        <p><a href="#/">Kembali ke CRM Pages</a></p>
      </>
    ),
  }
}

export default function App() {
  const [state, setState] = useState(load)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetCount, setResetCount] = useState(0) // memaksa formulir yang terbuka memuat ulang data setelah atur ulang
  const path = useHashPath()

  useEffect(() => {
    setNotice(null)
    window.scrollTo(0, 0)
  }, [path])

  const ctx: Ctx = {
    state,
    notify: (kind, text) => setNotice({ kind, text }),
    commit: (next, okText) => {
      try {
        save(next)
      } catch {
        setNotice({ kind: 'error', text: 'Gagal menyimpan ke penyimpanan browser (mungkin kuota penuh). Tidak ada data yang diubah.' })
        return false
      }
      setState(next)
      setNotice({ kind: 'ok', text: okText })
      return true
    },
  }

  const route = resolve(state, path)
  const clientId = route.clientId ?? state.clients[0].id
  const section = route.section ?? 'crm'

  return (
    <AppCtx.Provider value={ctx}>
      <a className="skip" href="#konten" onClick={(e) => { e.preventDefault(); document.getElementById('konten')?.focus() }}>
        Lewati ke konten
      </a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <p className="brand">AutoAudit <span>Prototype pengaman perubahan</span></p>
          <p className="who">Masuk sebagai <strong>{USER}</strong></p>
          <button className="ghost" onClick={() => setResetOpen(true)}>Atur ulang data contoh</button>
        </div>
      </header>
      <nav className="wrap subnav" aria-label="Bagian aplikasi">
        <label className="client-pick">
          <span>Client</span>
          <select value={clientId} onChange={(e) => { window.location.hash = `#/k/${e.target.value}/${section}` }}>
            {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <ul className="tabs">
          {SECTIONS.map(([key, text]) => (
            <li key={key}>
              <a href={`#/k/${clientId}/${key}`} aria-current={route.section === key ? 'page' : undefined}>{text}</a>
            </li>
          ))}
        </ul>
      </nav>
      <main key={resetCount} id="konten" className="wrap" tabIndex={-1}>{route.el}</main>

      <div className="toast-area" aria-live="polite">
        {notice && (
          <div className={`toast toast-${notice.kind}`}>
            <p>{notice.text}</p>
            <button className="ghost" onClick={() => setNotice(null)}>Tutup</button>
          </div>
        )}
      </div>

      {resetOpen && (
        <ConfirmDialog
          title="Atur ulang data contoh?"
          confirmLabel="Atur ulang semua data"
          danger
          onCancel={() => setResetOpen(false)}
          onConfirm={() => {
            setResetOpen(false)
            if (ctx.commit(seed(), 'Data contoh dikembalikan ke keadaan awal.')) setResetCount((n) => n + 1)
          }}
        >
          <p>
            Semua perubahan prompt, file dashboard, dan revisi yang dibuat di browser ini akan dihapus, lalu data kembali
            ke keadaan awal. Tindakan ini tidak bisa dibatalkan.
          </p>
        </ConfirmDialog>
      )}
    </AppCtx.Provider>
  )
}
