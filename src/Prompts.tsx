import { useState, type FormEvent } from 'react'
import { useApp } from './app-context'
import { applyChange, auditImpactMessage, auditsUsing, formatTime, revisionsOf, type Prompt } from './store'

export function PromptList({ clientId }: { clientId: string }) {
  const { state } = useApp()
  const client = state.clients.find((c) => c.id === clientId)!
  const prompts = state.prompts.filter((p) => p.clientId === clientId)
  return (
    <>
      <h1>Saved Prompt</h1>
      <p className="muted">Aturan audit milik {client.name}. Continuous Audit memakai prompt berdasarkan ID-nya.</p>
      <ul className="cards">
        {prompts.map((p) => {
          const used = auditsUsing(state, p.id).length
          return (
            <li key={p.id} className="card">
              <p className="mono small">ID {p.id}</p>
              <h2><a href={`#/prompt/${p.id}`}>{p.name}</a></h2>
              <p>
                {used
                  ? <span className="badge badge-used">Dipakai {used} Continuous Audit</span>
                  : <span className="badge badge-unused">Tidak dipakai audit</span>}
              </p>
              <p className="muted small">Diubah {formatTime(p.updatedAt)} oleh {p.updatedBy}</p>
              <div className="actions">
                <a className="button" href={`#/prompt/${p.id}`} aria-label={`Ubah ${p.name}`}>Ubah</a>
                <a className="button" href={`#/riwayat/prompt/${p.id}`} aria-label={`Riwayat ${p.name}`}>Riwayat</a>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function PromptEdit({ prompt: p }: { prompt: Prompt }) {
  const { state, commit, notify } = useApp()
  const [name, setName] = useState(p.name)
  const [content, setContent] = useState(p.content)
  const [errors, setErrors] = useState<{ name?: string; content?: string }>({})
  const audits = auditsUsing(state, p.id)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = {
      name: name.trim() ? undefined : 'Nama wajib diisi dan tidak boleh hanya spasi.',
      content: content.trim() ? undefined : 'Isi prompt wajib diisi dan tidak boleh hanya spasi.',
    }
    setErrors(errs)
    if (errs.name || errs.content) {
      document.getElementById(errs.name ? 'prompt-nama' : 'prompt-isi')?.focus()
      return
    }
    const next = applyChange(state, {
      kind: 'prompt', id: p.id, snap: { title: name.trim(), content }, action: 'disimpan', now: new Date().toISOString(),
    })
    if (!next) return notify('info', 'Tidak ada perubahan: nama dan isi sama persis dengan yang tersimpan, jadi tidak ada revisi baru.')
    const seq = revisionsOf(next, 'prompt', p.id)[0].seq
    if (commit(next, `Perubahan disimpan sebagai revisi #${seq}. ${auditImpactMessage(next, p.id)}`)) setName(name.trim())
  }

  return (
    <>
      <p className="crumbs"><a href={`#/k/${p.clientId}/prompt`}>← Semua Saved Prompt</a></p>
      <h1>Ubah Saved Prompt</h1>
      <div className="split">
        <form className="card form" onSubmit={onSubmit} noValidate>
          <p><span className="label">ID prompt</span> <span className="mono">{p.id}</span></p>
          <div className="field">
            <label htmlFor="prompt-nama">Nama</label>
            <input
              id="prompt-nama" value={name} onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-nama' : undefined}
            />
            {errors.name && <p id="err-nama" className="error">{errors.name}</p>}
          </div>
          <div className="field">
            <label htmlFor="prompt-isi">Isi prompt</label>
            <textarea
              id="prompt-isi" rows={16} value={content} onChange={(e) => setContent(e.target.value)}
              aria-invalid={!!errors.content} aria-describedby={errors.content ? 'err-isi' : undefined}
            />
            {errors.content && <p id="err-isi" className="error">{errors.content}</p>}
          </div>
          <div className="actions">
            <button type="submit" className="primary">Simpan Perubahan</button>
            <a className="button" href={`#/riwayat/prompt/${p.id}`}>Lihat riwayat</a>
          </div>
        </form>

        <aside className="card panel" aria-labelledby="dipakai-oleh">
          <h2 id="dipakai-oleh">Dipakai oleh Continuous Audit ({audits.length})</h2>
          {audits.length > 0 ? (
            <>
              <ul className="audit-list">
                {audits.map((a) => (
                  <li key={a.id}>
                    <strong>{a.name}</strong>
                    <span>Jadwal: {a.schedule}</span>
                    <span>Status: {a.status}</span>
                  </li>
                ))}
              </ul>
              <p className="muted small">
                Audit di atas menunjuk prompt ini lewat ID {p.id}. Setelah disimpan, semuanya memakai isi baru pada
                jadwal berikutnya tanpa perlu memilih ulang prompt.
              </p>
            </>
          ) : (
            <>
              <p><span className="badge badge-unused">Tidak dipakai audit</span></p>
              <p className="small">
                Prompt ini punya ID sendiri ({p.id}). Mengubahnya tidak memengaruhi laporan mana pun sampai prompt ini
                dipilih di pengaturan Continuous Audit.
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  )
}

export function AuditList({ clientId }: { clientId: string }) {
  const { state } = useApp()
  const client = state.clients.find((c) => c.id === clientId)!
  const audits = state.audits.filter((a) => a.clientId === clientId)
  return (
    <>
      <h1>Continuous Audit</h1>
      <p className="muted">
        Audit terjadwal milik {client.name}. Halaman ini hanya untuk melihat; mengganti prompt pada pengaturan audit
        berada di luar cakupan prototype ini.
      </p>
      <ul className="cards">
        {audits.map((a) => {
          const prompt = state.prompts.find((p) => p.id === a.promptId)
          return (
            <li key={a.id} className="card">
              <h2>{a.name}</h2>
              <dl className="meta">
                <div><dt>Jadwal</dt><dd>{a.schedule}</dd></div>
                <div><dt>Status</dt><dd>{a.status}</dd></div>
                <div><dt>Saved Prompt</dt><dd><a href={`#/prompt/${a.promptId}`}>{a.promptId} · {prompt?.name}</a></dd></div>
              </dl>
            </li>
          )
        })}
      </ul>
    </>
  )
}
