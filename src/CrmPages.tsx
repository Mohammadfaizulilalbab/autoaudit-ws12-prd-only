import { useRef, useState, type ChangeEvent } from 'react'
import { useApp } from './app-context'
import {
  applyChange, byteSize, fileError, formatSize, formatTime, MAX_FILE_BYTES, revisionsOf, type CrmPage, type Version,
} from './store'
import { ConfirmDialog, StatusBadge, Summary } from './ui'

export function CrmList({ clientId }: { clientId: string }) {
  const { state } = useApp()
  const client = state.clients.find((c) => c.id === clientId)!
  const pages = state.pages.filter((p) => p.clientId === clientId)
  return (
    <>
      <h1>CRM Pages</h1>
      <p className="muted">Dashboard HTML milik {client.name} yang dibaca manajer atau SPV client.</p>
      {pages.length === 0 ? (
        <p className="empty">Client ini belum punya CRM Page.</p>
      ) : (
        <ul className="cards">
          {pages.map((p) => {
            const versions = state.versions.filter((v) => v.pageId === p.id)
            const pub = versions.find((v) => v.status === 'Published')
            return (
              <li key={p.id} className="card">
                <h2><a href={`#/crm/${p.id}`}>{p.name}</a></h2>
                <p>{versions.length} versi · {pub ? `Sedang tayang: v${pub.number}` : 'Belum ada versi yang tayang'}</p>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export function CrmDetail({ page }: { page: CrmPage }) {
  const { state } = useApp()
  const versions = state.versions.filter((v) => v.pageId === page.id).sort((a, b) => b.number - a.number)
  return (
    <>
      <p className="crumbs"><a href={`#/k/${page.clientId}/crm`}>← Semua CRM Page</a></p>
      <h1>{page.name}</h1>
      <p className="muted">
        Upload mengganti file dashboard pada versi yang dipilih. Ringkasan selalu tampil sebelum file diganti, dan file
        lama tetap tersimpan di riwayat.
      </p>
      <ul className="cards">
        {versions.map((v) => <VersionCard key={v.id} page={page} version={v} />)}
      </ul>
    </>
  )
}

type Pending = { name: string; size: number; content: string }

function VersionCard({ page, version: v }: { page: CrmPage; version: Version }) {
  const { state, commit, notify } = useApp()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const label = `v${v.number}`
  const isPublished = v.status === 'Published'
  const lastSeq = revisionsOf(state, 'versi', v.id)[0]?.seq

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // supaya file yang sama bisa dipilih lagi
    if (!file) return
    const text = file.size <= MAX_FILE_BYTES ? await file.text() : ''
    const error = fileError(file.name, file.size, text)
    if (error) return notify({ kind: 'error', text: error })
    if (file.name === v.fileName && text === v.fileContent) {
      return notify({ kind: 'info', text: `Tidak ada perubahan: "${file.name}" sama persis dengan file ${label} saat ini, jadi tidak ada revisi baru.` })
    }
    notify(null) // pesan file sebelumnya tidak relevan lagi
    setPending({ name: file.name, size: file.size, content: text })
  }

  function confirm(p: Pending) {
    setPending(null)
    const next = applyChange(state, {
      kind: 'versi', id: v.id, snap: { title: p.name, content: p.content }, action: 'diunggah', now: new Date().toISOString(),
    })
    if (!next) return notify({ kind: 'info', text: `Tidak ada perubahan pada ${label}.` })
    commit(next, `File ${label} ${page.name} berhasil diganti dengan "${p.name}". File lama "${v.fileName}" tersimpan di riwayat sebagai revisi #${lastSeq}.`)
  }

  return (
    <li className="card">
      <div className="card-head">
        <h2>{label}</h2>
        <StatusBadge status={v.status} />
      </div>
      <dl className="meta">
        <div><dt>File</dt><dd className="mono">{v.fileName}</dd></div>
        <div><dt>Terakhir diubah</dt><dd>{formatTime(v.updatedAt)} oleh {v.updatedBy}</dd></div>
      </dl>
      <div className="actions">
        <button className="primary" onClick={() => input.current?.click()} aria-label={`Upload file untuk ${label}`}>Upload</button>
        <input ref={input} type="file" accept=".html,.htm" hidden onChange={onFile} />
        <a className="button" href={`#/riwayat/versi/${v.id}`} aria-label={`Riwayat ${label}`}>Riwayat</a>
      </div>
      {pending && (
        <ConfirmDialog
          title={`Ganti file ${label}?`}
          confirmLabel={isPublished ? `Ganti file ${label} yang sedang tayang` : `Ganti file ${label}`}
          typeToConfirm={isPublished ? label : undefined}
          danger={isPublished}
          onConfirm={() => confirm(pending)}
          onCancel={() => setPending(null)}
        >
          {isPublished && (
            <div className="warning">
              <strong>Versi ini sedang tayang.</strong> {label} berstatus Published dan sedang dibaca client. Begitu
              dikonfirmasi, client langsung melihat isi file baru.
            </div>
          )}
          <Summary rows={[
            ['CRM Page', page.name],
            ['Versi', label],
            ['Status', <StatusBadge status={v.status} />],
            ['File lama', `${v.fileName} (${formatSize(byteSize(v.fileContent))})`],
            ['File baru', `${pending.name} (${formatSize(pending.size)})`],
          ]} />
          <p>
            File lama tetap tersimpan di riwayat (revisi #{lastSeq}) dan bisa dikembalikan kapan saja. Batal tidak
            mengubah apa pun.
          </p>
        </ConfirmDialog>
      )}
    </li>
  )
}
