import { describe, expect, it } from 'vitest'
import { collapse, diffLines, type DiffLine } from './diff'
import {
  applyChange, auditImpactMessage, auditsUsing, current, fileError, MAX_FILE_BYTES, restoreRevision, revisionsOf, seed,
} from './store'

const side = (lines: DiffLine[], drop: 'add' | 'del') => lines.filter((l) => l.type !== drop).map((l) => l.text).join('\n')

describe('diffLines', () => {
  it('menandai baris yang ditambah dan dihapus', () => {
    expect(diffLines('a\nb\nc', 'a\nB\nc\nd')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'B' },
      { type: 'same', text: 'c' },
      { type: 'add', text: 'd' },
    ])
  })

  it('selalu bisa menyusun ulang isi lama dan isi baru (acak)', () => {
    let seedNum = 7
    const rnd = () => (seedNum = (seedNum * 16807) % 2147483647) / 2147483647
    const make = () => Array.from({ length: Math.floor(rnd() * 12) }, () => 'xyz'[Math.floor(rnd() * 3)]).join('\n')
    for (let i = 0; i < 500; i++) {
      const a = make()
      const b = make()
      const d = diffLines(a, b)
      expect(side(d, 'add')).toBe(a)
      expect(side(d, 'del')).toBe(b)
    }
  })

  it('isi 500 KB dengan perubahan tersebar selesai cepat dan minimal', () => {
    const lines = Array.from({ length: 12000 }, (_, i) => `<div class="baris">Baris nomor ${i} isi contoh</div>`)
    const a = lines.join('\n')
    expect(a.length).toBeGreaterThan(450_000)
    const changed = [...lines]
    changed[10] = 'ubah awal'
    changed[6000] = 'ubah tengah'
    changed[11990] = 'ubah akhir'
    const t = performance.now()
    const d = diffLines(a, changed.join('\n'))
    expect(performance.now() - t).toBeLessThan(1000)
    expect(d.filter((l) => l.type === 'add')).toHaveLength(3)
    expect(d.filter((l) => l.type === 'del')).toHaveLength(3)
  })

  it('isi besar yang berbeda total tetap selesai cepat', () => {
    const a = Array.from({ length: 8000 }, (_, i) => `lama ${i}`).join('\n')
    const b = Array.from({ length: 8000 }, (_, i) => `baru ${i}`).join('\n')
    const t = performance.now()
    const d = diffLines(a, b)
    expect(performance.now() - t).toBeLessThan(2000)
    expect(side(d, 'add')).toBe(a)
    expect(side(d, 'del')).toBe(b)
  })

  it('collapse menyembunyikan baris sama yang jauh dari perubahan', () => {
    const a = Array.from({ length: 20 }, (_, i) => `${i}`).join('\n')
    const b = a.replace('\n10\n', '\nsepuluh\n')
    const items = collapse(diffLines(a, b), 2)
    expect(items[0]).toEqual({ type: 'gap', count: 8 })
    expect(items.at(-1)).toEqual({ type: 'gap', count: 7 })
    expect(items.filter((i) => i.type !== 'gap')).toHaveLength(6)
  })
})

describe('fileError', () => {
  it('menolak file dengan alasan yang jelas', () => {
    expect(fileError('data.txt', 10, 'x')).toMatch(/\.html atau \.htm/)
    expect(fileError('kosong.html', 0, '')).toMatch(/kosong/)
    expect(fileError('spasi.htm', 3, '  \n')).toMatch(/kosong/)
    expect(fileError('besar.html', MAX_FILE_BYTES + 1, '')).toMatch(/melebihi batas 500 KB/)
  })
  it('menerima .html dan .htm sampai tepat 500 KB', () => {
    expect(fileError('ok.HTML', MAX_FILE_BYTES, '<p>x</p>')).toBeNull()
    expect(fileError('ok.htm', 5, '<p>x</p>')).toBeNull()
  })
})

describe('revisi', () => {
  const now = '2026-11-20T22:00:00+07:00'

  it('data contoh sesuai FR-06 dan revisi terakhir sama dengan isi saat ini', () => {
    const s = seed()
    expect(s.clients).toHaveLength(2)
    expect(s.pages).toHaveLength(1)
    expect(s.versions.map((v) => v.status).sort()).toEqual(['Archived', 'Draft', 'Published'])
    expect(auditsUsing(s, 'PRM-1002')).toHaveLength(0)
    for (const p of s.prompts) expect(revisionsOf(s, 'prompt', p.id)[0].content).toBe(p.content)
    for (const v of s.versions) expect(revisionsOf(s, 'versi', v.id)[0].content).toBe(v.fileContent)
  })

  it('setiap perubahan membuat tepat satu revisi, isi sama tidak membuat revisi', () => {
    const s = seed()
    const before = s.revisions.length
    const snap = { title: 'baru.html', content: '<p>baru</p>' }
    const s2 = applyChange(s, { kind: 'versi', id: 'ver-2', snap, action: 'diunggah', now })!
    expect(s2.revisions).toHaveLength(before + 1)
    expect(current(s2, 'versi', 'ver-2')).toEqual(snap)
    expect(s2.versions.find((v) => v.id === 'ver-2')!.status).toBe('Published')
    expect(applyChange(s2, { kind: 'versi', id: 'ver-2', snap, action: 'diunggah', now })).toBeNull()
    expect(s.versions.find((v) => v.id === 'ver-2')!.fileName).toBe('dashboard-penjualan-v2.html') // state lama tidak berubah
  })

  it('mengembalikan revisi membuat revisi baru tanpa menghapus revisi lama', () => {
    const s = seed()
    const [latest, first] = revisionsOf(s, 'prompt', 'PRM-1001')
    const s2 = restoreRevision(s, first, now)!
    const revs = revisionsOf(s2, 'prompt', 'PRM-1001')
    expect(revs.map((r) => r.seq)).toEqual([3, 2, 1])
    expect(revs[0]).toMatchObject({ action: 'dikembalikan', from: 1, content: first.content })
    expect(revs[1]).toEqual(latest)
    expect(current(s2, 'prompt', 'PRM-1001')!.content).toBe(first.content)
    expect(restoreRevision(s2, first, now)).toBeNull()
  })

  it('pesan simpan prompt menyebut audit yang memakai ID prompt', () => {
    const s = seed()
    const msg = auditImpactMessage(s, 'PRM-1001')
    expect(msg).toContain('2 Continuous Audit')
    expect(msg).toContain('Laporan Pagi Sales Cabang')
    expect(msg).toContain('Rekap Mingguan untuk SPV')
    expect(auditImpactMessage(s, 'PRM-1002')).toMatch(/belum dipakai Continuous Audit mana pun/)
  })
})
