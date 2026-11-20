export const USER = 'Raka Pradipta (System Implementor)'
const REKAN = 'Dimas Ardiansyah (System Implementor)'
export const MAX_FILE_BYTES = 500 * 1024
const KEY = 'autoaudit-ws12-prd-only:data:v1'

export type Status = 'Draft' | 'Published' | 'Archived'
export type Client = { id: string; name: string }
export type Prompt = { id: string; clientId: string; name: string; content: string; updatedAt: string; updatedBy: string }
export type Audit = { id: string; clientId: string; name: string; schedule: string; status: 'Aktif' | 'Dijeda'; promptId: string }
export type CrmPage = { id: string; clientId: string; name: string }
export type Version = {
  id: string; pageId: string; number: number; status: Status
  fileName: string; fileContent: string; updatedAt: string; updatedBy: string
}
export type Kind = 'prompt' | 'versi'
export type Action = 'dibuat' | 'disimpan' | 'diunggah' | 'dikembalikan'
/** Isi lengkap pada satu saat. Prompt: title = nama prompt. Versi: title = nama file. */
export type Snapshot = { title: string; content: string }
export type Revision = Snapshot & {
  id: string; kind: Kind; targetId: string; seq: number; at: string; by: string; action: Action; from?: number
}
export type State = {
  clients: Client[]; prompts: Prompt[]; audits: Audit[]; pages: CrmPage[]; versions: Version[]; revisions: Revision[]
}

export function current(s: State, kind: Kind, id: string): Snapshot | undefined {
  if (kind === 'prompt') {
    const p = s.prompts.find((x) => x.id === id)
    return p && { title: p.name, content: p.content }
  }
  const v = s.versions.find((x) => x.id === id)
  return v && { title: v.fileName, content: v.fileContent }
}

/** Terbaru di atas. */
export function revisionsOf(s: State, kind: Kind, id: string): Revision[] {
  return s.revisions.filter((r) => r.kind === kind && r.targetId === id).sort((a, b) => b.seq - a.seq)
}

export const sameSnapshot = (a: Snapshot, b: Snapshot) => a.title === b.title && a.content === b.content

export const actionLabel = (r: Revision) =>
  r.action === 'dikembalikan' ? `dikembalikan dari revisi #${r.from}` : r.action

type Change = { kind: Kind; id: string; snap: Snapshot; action: Action; now: string; by?: string; from?: number }

/**
 * Satu-satunya jalan untuk mengubah isi prompt atau file versi: mengganti isi dan menambah tepat satu revisi.
 * Mengembalikan null bila isi baru sama persis dengan isi saat ini (tidak ada revisi baru).
 */
export function applyChange(s: State, c: Change): State | null {
  const cur = current(s, c.kind, c.id)
  if (!cur) throw new Error(`Data ${c.kind} ${c.id} tidak ditemukan`)
  if (sameSnapshot(cur, c.snap)) return null
  const by = c.by ?? USER
  const seq = (revisionsOf(s, c.kind, c.id)[0]?.seq ?? 0) + 1
  const rev: Revision = {
    id: `${c.kind}:${c.id}:${seq}`, kind: c.kind, targetId: c.id, seq, at: c.now, by, action: c.action,
    ...(c.from !== undefined && { from: c.from }), title: c.snap.title, content: c.snap.content,
  }
  const meta = { updatedAt: c.now, updatedBy: by }
  return {
    ...s,
    prompts: c.kind !== 'prompt' ? s.prompts
      : s.prompts.map((p) => (p.id === c.id ? { ...p, name: c.snap.title, content: c.snap.content, ...meta } : p)),
    versions: c.kind !== 'versi' ? s.versions
      : s.versions.map((v) => (v.id === c.id ? { ...v, fileName: c.snap.title, fileContent: c.snap.content, ...meta } : v)),
    revisions: [...s.revisions, rev],
  }
}

export function restoreRevision(s: State, rev: Revision, now: string): State | null {
  return applyChange(s, {
    kind: rev.kind, id: rev.targetId, snap: { title: rev.title, content: rev.content },
    action: 'dikembalikan', now, from: rev.seq,
  })
}

export const auditsUsing = (s: State, promptId: string) => s.audits.filter((a) => a.promptId === promptId)

/** Pesan setelah isi prompt berubah: audit mana yang memakai isi baru pada jadwal berikutnya. */
export function auditImpactMessage(s: State, promptId: string): string {
  const list = auditsUsing(s, promptId)
  if (list.length === 0) {
    return 'Prompt ini belum dipakai Continuous Audit mana pun, jadi belum ada laporan yang memakai isi baru.'
  }
  const names = list.map((a) => `${a.name} (${a.schedule}${a.status === 'Dijeda' ? ', sedang dijeda' : ''})`)
  return `${list.length} Continuous Audit akan memakai isi baru pada jadwal berikutnya: ${names.join('; ')}. Tidak perlu memilih ulang prompt.`
}

export const byteSize = (text: string) => new TextEncoder().encode(text).length

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} KB`
}

/** Alasan penolakan file dashboard, atau null bila valid. `text` boleh kosong bila file terlalu besar untuk dibaca. */
export function fileError(name: string, size: number, text: string): string | null {
  if (!/\.html?$/i.test(name)) return `File "${name}" ditolak: hanya file berekstensi .html atau .htm yang diterima.`
  if (size > MAX_FILE_BYTES) {
    const bytes = (n: number) => `${n.toLocaleString('id-ID')} byte`
    return `File "${name}" ditolak: ukurannya ${bytes(size)}, melebihi batas 500 KB (${bytes(MAX_FILE_BYTES)}).`
  }
  if (size === 0 || text.trim() === '') return `File "${name}" ditolak: file kosong.`
  return null
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    // data rusak atau localStorage tidak tersedia: mulai dari data contoh
  }
  return seed()
}

/** Satu kali setItem: data lengkap tersimpan atau melempar error (misalnya kuota penuh) tanpa perubahan sebagian. */
export function save(s: State) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

// ---------- Data contoh (fiktif) ----------

const PROMPT_FOLLOWUP = `Peran: Kamu adalah auditor percakapan WhatsApp tim sales PT Niaga Motor Sentosa.

Tugas:
1. Periksa apakah sales membalas chat pertama pelanggan dalam 5 menit.
2. Periksa apakah sales menawarkan jadwal test ride atau kunjungan showroom.
3. Periksa apakah sales melakukan follow-up paling lambat 1x24 jam jika pelanggan tidak membalas.

Format hasil:
- Nama sales
- Skor (0-100)
- Temuan utama (maksimal 3 poin)
- Saran perbaikan`

const PROMPT_FOLLOWUP_REVISI = PROMPT_FOLLOWUP
  .replace('dalam 5 menit', 'dalam 3 menit')
  .replace('jika pelanggan tidak membalas.', 'jika pelanggan tidak membalas.\n4. Periksa apakah sales menyebut promo yang berlaku bulan ini.')

const PROMPT_RESPON = `Peran: Kamu adalah auditor respon awal lead baru dari iklan.

Tugas:
1. Hitung waktu balas pertama sales untuk setiap lead baru.
2. Tandai lead yang belum dibalas lebih dari 15 menit.
3. Periksa apakah sales menanyakan kebutuhan pelanggan (tipe motor, cara bayar).

Format hasil: tabel per sales berisi jumlah lead, rata-rata waktu balas, dan lead terlambat.`

const PROMPT_KLINIK = `Peran: Kamu adalah auditor pelayanan admin Klinik Gigi Senyum Sehat.

Tugas:
1. Periksa apakah admin menyapa pasien dengan nama dan salam pembuka.
2. Periksa apakah admin menawarkan minimal dua pilihan jadwal.
3. Periksa apakah admin mengirim konfirmasi jadwal dan alamat klinik.

Format hasil: skor per admin (0-100) dan temuan utama.`

const PROMPT_REMINDER = `Peran: Kamu adalah auditor pesan pengingat kontrol pasien.

Tugas:
1. Periksa apakah pengingat dikirim H-1 sebelum jadwal kontrol.
2. Periksa apakah pesan menyebut nama dokter, tanggal, dan jam.

Format hasil: daftar pasien yang tidak mendapat pengingat tepat waktu.`

function dashboard(title: string, columns: string[], note: string): string {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; margin: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${note}</p>
  <table id="ringkasan">
    <thead>
      <tr>
${columns.map((c) => `        <th>${c}</th>`).join('\n')}
      </tr>
    </thead>
    <tbody id="isi"></tbody>
  </table>
  <script>
    const data = window.__CRM_PAGE_DATA__ || [];
    document.getElementById('isi').innerHTML = data.length ? '' : '<tr><td colspan="${columns.length}">Data belum diterima</td></tr>';
  </script>
</body>
</html>
`
}

const DASH_V1 = dashboard('Dashboard Penjualan Harian', ['Sales', 'Jumlah Chat', 'Skor'], 'Versi awal.')
const DASH_V2_LAMA = dashboard('Dashboard Penjualan Harian', ['Sales', 'Jumlah Chat', 'Skor'], 'Data per hari kerja.')
const DASH_V2 = dashboard('Dashboard Penjualan Harian', ['Sales', 'Cabang', 'Jumlah Chat', 'Follow-up 24 Jam', 'Skor'], 'Data per hari kerja, diperbarui setiap pagi.')
const DASH_V3 = dashboard('Dashboard Penjualan Harian (Draft)', ['Sales', 'Cabang', 'Jumlah Chat', 'Follow-up 24 Jam', 'Promo Disebut', 'Skor'], 'Draft: menambah kolom promo.')

export function seed(): State {
  const prompts: Prompt[] = [
    { id: 'PRM-1001', clientId: 'klien-1', name: 'Audit Follow-up Sales', content: PROMPT_FOLLOWUP, updatedAt: '2026-10-02T09:00:00+07:00', updatedBy: REKAN },
    { id: 'PRM-1002', clientId: 'klien-1', name: 'Audit Follow-up Sales - v2', content: PROMPT_FOLLOWUP, updatedAt: '2026-10-20T13:30:00+07:00', updatedBy: USER },
    { id: 'PRM-1003', clientId: 'klien-1', name: 'Audit Respon Awal Lead', content: PROMPT_RESPON, updatedAt: '2026-10-05T10:15:00+07:00', updatedBy: USER },
    { id: 'PRM-2001', clientId: 'klien-2', name: 'Audit Pelayanan Admin Klinik', content: PROMPT_KLINIK, updatedAt: '2026-10-08T08:45:00+07:00', updatedBy: USER },
    { id: 'PRM-2002', clientId: 'klien-2', name: 'Audit Reminder Kontrol Pasien', content: PROMPT_REMINDER, updatedAt: '2026-10-09T15:00:00+07:00', updatedBy: REKAN },
  ]
  const versions: Version[] = [
    { id: 'ver-1', pageId: 'crm-1', number: 1, status: 'Archived', fileName: 'dashboard-penjualan-v1.html', fileContent: DASH_V1, updatedAt: '2026-09-15T11:00:00+07:00', updatedBy: REKAN },
    { id: 'ver-2', pageId: 'crm-1', number: 2, status: 'Published', fileName: 'dashboard-penjualan-v2.html', fileContent: DASH_V2_LAMA, updatedAt: '2026-10-01T14:00:00+07:00', updatedBy: REKAN },
    { id: 'ver-3', pageId: 'crm-1', number: 3, status: 'Draft', fileName: 'dashboard-penjualan-v3-draft.html', fileContent: DASH_V3, updatedAt: '2026-11-18T16:20:00+07:00', updatedBy: USER },
  ]
  let s: State = {
    clients: [
      { id: 'klien-1', name: 'PT Niaga Motor Sentosa' },
      { id: 'klien-2', name: 'Klinik Gigi Senyum Sehat' },
    ],
    prompts,
    audits: [
      { id: 'CA-101', clientId: 'klien-1', name: 'Laporan Pagi Sales Cabang', schedule: 'Setiap hari, 07.00 WIB', status: 'Aktif', promptId: 'PRM-1001' },
      { id: 'CA-102', clientId: 'klien-1', name: 'Rekap Mingguan untuk SPV', schedule: 'Setiap Senin, 08.00 WIB', status: 'Aktif', promptId: 'PRM-1001' },
      { id: 'CA-103', clientId: 'klien-1', name: 'Cek Respon Lead Baru', schedule: 'Setiap 2 jam, 08.00-20.00 WIB', status: 'Dijeda', promptId: 'PRM-1003' },
      { id: 'CA-201', clientId: 'klien-2', name: 'Laporan Harian Admin Klinik', schedule: 'Setiap hari, 06.30 WIB', status: 'Aktif', promptId: 'PRM-2001' },
      { id: 'CA-202', clientId: 'klien-2', name: 'Laporan Reminder Kontrol', schedule: 'Setiap Jumat, 16.00 WIB', status: 'Aktif', promptId: 'PRM-2002' },
    ],
    pages: [{ id: 'crm-1', clientId: 'klien-1', name: 'Dashboard Penjualan Harian' }],
    versions,
    revisions: [
      ...prompts.map((p): Revision => ({ id: `prompt:${p.id}:1`, kind: 'prompt', targetId: p.id, seq: 1, at: p.updatedAt, by: p.updatedBy, action: 'dibuat', title: p.name, content: p.content })),
      ...versions.map((v): Revision => ({ id: `versi:${v.id}:1`, kind: 'versi', targetId: v.id, seq: 1, at: v.updatedAt, by: v.updatedBy, action: 'dibuat', title: v.fileName, content: v.fileContent })),
    ],
  }
  // riwayat awal supaya perbandingan langsung bisa dicoba
  s = applyChange(s, { kind: 'prompt', id: 'PRM-1001', snap: { title: 'Audit Follow-up Sales', content: PROMPT_FOLLOWUP_REVISI }, action: 'disimpan', now: '2026-11-12T09:14:00+07:00', by: REKAN })!
  s = applyChange(s, { kind: 'versi', id: 'ver-2', snap: { title: 'dashboard-penjualan-v2.html', content: DASH_V2 }, action: 'diunggah', now: '2026-11-17T10:05:00+07:00', by: REKAN })!
  return s
}
