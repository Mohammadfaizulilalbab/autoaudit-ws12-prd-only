import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from './app-context'
import { collapse, diffLines } from './diff'
import {
  actionLabel, auditImpactMessage, byteSize, current, formatSize, formatTime, restoreRevision, revisionsOf, sameSnapshot,
  type Kind,
} from './store'
import { ConfirmDialog, StatusBadge, Summary } from './ui'

export function History({ kind, id }: { kind: Kind; id: string }) {
  const { state, commit, notify } = useApp()
  const cur = current(state, kind, id)!
  const revs = revisionsOf(state, kind, id)
  // awalnya pilih revisi terbaru yang berbeda dari isi saat ini, supaya perbandingan langsung berguna
  const [selectedId, setSelectedId] = useState(() => (revs.find((r) => !sameSnapshot(r, cur)) ?? revs[0])?.id)
  const [confirming, setConfirming] = useState(false)
  const sel = revs.find((r) => r.id === selectedId) ?? revs[0]

  const prompt = kind === 'prompt' ? state.prompts.find((p) => p.id === id) : undefined
  const version = kind === 'versi' ? state.versions.find((v) => v.id === id) : undefined
  const page = version && state.pages.find((p) => p.id === version.pageId)
  const label = version ? `v${version.number}` : ''
  const isPublished = version?.status === 'Published'
  const identical = sameSnapshot(sel, cur)
  const size = (text: string) => (kind === 'versi' ? ` (${formatSize(byteSize(text))})` : '')
  const targetRows: [string, ReactNode][] = prompt
    ? [['Saved Prompt', `${prompt.name} (${prompt.id})`]]
    : [['CRM Page', page!.name], ['Versi', label], ['Status', <StatusBadge status={version!.status} />]]

  function restore() {
    setConfirming(false)
    const next = restoreRevision(state, sel, new Date().toISOString())
    if (!next) return notify({ kind: 'info', text: 'Tidak ada perubahan: isi revisi ini sama dengan isi saat ini, jadi tidak ada revisi baru.' })
    const seq = revisionsOf(next, kind, id)[0].seq
    const extra = prompt ? ` ${auditImpactMessage(next, id)}` : ''
    commit(next, `Isi dikembalikan dari revisi #${sel.seq} dan dicatat sebagai revisi #${seq}. Revisi lama tetap ada.${extra}`)
  }

  return (
    <>
      <p className="crumbs">
        {prompt
          ? <a href={`#/prompt/${id}`}>← Kembali ke halaman ubah prompt</a>
          : <a href={`#/crm/${page!.id}`}>← Kembali ke {page!.name}</a>}
      </p>
      <h1>{prompt ? `Riwayat prompt: ${prompt.name}` : `Riwayat file: ${page!.name} ${label}`}</h1>
      <p className="muted">
        {prompt ? <>ID <span className="mono">{prompt.id}</span>. </> : <><StatusBadge status={version!.status} /> File saat ini <span className="mono">{version!.fileName}</span>. </>}
        Revisi tidak bisa diubah atau dihapus.
      </p>

      <div className="history">
        <section aria-labelledby="daftar-revisi">
          <h2 id="daftar-revisi">Daftar revisi ({revs.length})</h2>
          <ul className="rev-list">
            {revs.map((r) => (
              <li key={r.id}>
                <button className="rev" aria-pressed={r.id === sel.id} onClick={() => setSelectedId(r.id)}>
                  <span><strong>Revisi #{r.seq}</strong> · {actionLabel(r)}</span>
                  <span className="muted small">{formatTime(r.at)} · {r.by}</span>
                  {sameSnapshot(r, cur) && <span className="badge badge-current">Sama dengan isi saat ini</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="detail-revisi" className="rev-detail card">
          <h2 id="detail-revisi">Revisi #{sel.seq}: {actionLabel(sel)}</h2>
          <dl className="meta">
            <div><dt>Waktu</dt><dd>{formatTime(sel.at)}</dd></div>
            <div><dt>Pengubah</dt><dd>{sel.by}</dd></div>
            <div><dt>{prompt ? 'Nama prompt' : 'File'}</dt><dd className={prompt ? '' : 'mono'}>{sel.title}{size(sel.content)}</dd></div>
          </dl>
          <div className="actions">
            <button className={isPublished ? 'danger' : 'primary'} disabled={identical} onClick={() => setConfirming(true)}>
              Kembalikan revisi #{sel.seq}
            </button>
            {identical && <span className="muted small">Isi revisi ini sama dengan isi saat ini.</span>}
          </div>

          <h3>Perbandingan dengan isi saat ini</h3>
          {sel.title !== cur.title && (
            <p>{prompt ? 'Nama prompt' : 'Nama file'} berbeda: revisi #{sel.seq} “{sel.title}”, saat ini “{cur.title}”.</p>
          )}
          <DiffView from={sel.content} to={cur.content} seq={sel.seq} />

          <details>
            <summary>Lihat isi lengkap revisi #{sel.seq}</summary>
            <pre className="code">{sel.content}</pre>
          </details>
        </section>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Kembalikan revisi #${sel.seq}?`}
          confirmLabel={isPublished ? `Kembalikan ${label} yang sedang tayang` : `Kembalikan revisi #${sel.seq}`}
          typeToConfirm={isPublished ? label : undefined}
          danger={isPublished}
          onConfirm={restore}
          onCancel={() => setConfirming(false)}
        >
          {isPublished && (
            <div className="warning">
              <strong>Versi ini sedang tayang.</strong> {label} berstatus Published dan sedang dibaca client. Begitu
              dikonfirmasi, client langsung melihat isi dari revisi #{sel.seq}.
            </div>
          )}
          <Summary rows={[
            ...targetRows,
            ['Isi saat ini', `${cur.title}${size(cur.content)}`],
            ['Diganti dengan', `revisi #${sel.seq}: ${sel.title}${size(sel.content)}`],
          ]} />
          <p>
            Sistem membuat revisi baru berjenis “dikembalikan dari revisi #{sel.seq}”. Revisi lama, termasuk isi saat ini,
            tetap tersimpan di riwayat.
          </p>
          {prompt && <p>{auditImpactMessage(state, id)}</p>}
        </ConfirmDialog>
      )}
    </>
  )
}

function DiffView({ from, to, seq }: { from: string; to: string; seq: number }) {
  const lines = useMemo(() => diffLines(from, to), [from, to])
  const items = useMemo(() => collapse(lines), [lines])
  const added = lines.filter((l) => l.type === 'add').length
  const removed = lines.filter((l) => l.type === 'del').length
  if (!added && !removed) return <p className="muted">Tidak ada perbedaan isi.</p>
  return (
    <>
      <p className="legend small">
        <span className="tag-add">+ {added} baris ditambah</span> ada di isi saat ini, tidak ada di revisi #{seq}.{' '}
        <span className="tag-del">− {removed} baris dihapus</span> ada di revisi #{seq}, tidak ada di isi saat ini.
      </p>
      <ol className="diff">
        {items.map((it, i) =>
          it.type === 'gap' ? (
            <li key={i} className="gap">… {it.count} baris sama disembunyikan …</li>
          ) : (
            <li key={i} className={it.type}>
              <span className="mark" aria-hidden="true">{it.type === 'add' ? '+' : it.type === 'del' ? '−' : ' '}</span>
              {it.type !== 'same' && <span className="sr-only">{it.type === 'add' ? 'Ditambah: ' : 'Dihapus: '}</span>}
              {it.text || ' '}
            </li>
          ),
        )}
      </ol>
    </>
  )
}
