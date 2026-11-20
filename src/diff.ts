export type DiffLine = { type: 'same' | 'add' | 'del'; text: string }
export type DiffItem = DiffLine | { type: 'gap'; count: number }

// shortcut: di atas batas ini bagian tengah ditampilkan sebagai "semua dihapus lalu semua ditambah"; naikkan bila file besar yang sangat berbeda perlu diff rinci.
const MAX_EDITS = 3000

const same = (text: string): DiffLine => ({ type: 'same', text })
const del = (text: string): DiffLine => ({ type: 'del', text })
const add = (text: string): DiffLine => ({ type: 'add', text })

/** Perbandingan per baris dari `a` (lama) ke `b` (baru). */
export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.split('\n')
  const B = b.split('\n')
  let start = 0
  while (start < A.length && start < B.length && A[start] === B[start]) start++
  let endA = A.length
  let endB = B.length
  while (endA > start && endB > start && A[endA - 1] === B[endB - 1]) { endA--; endB-- }
  return [
    ...A.slice(0, start).map(same),
    ...myers(A.slice(start, endA), B.slice(start, endB)),
    ...A.slice(endA).map(same),
  ]
}

/** Algoritma Myers O((N+M)·D), menyimpan hanya rentang diagonal yang terpakai per langkah. */
function myers(A: string[], B: string[]): DiffLine[] {
  const N = A.length
  const M = B.length
  if (N === 0 || M === 0) return [...A.map(del), ...B.map(add)]
  const max = N + M
  const v = new Int32Array(2 * max + 2)
  const off = max
  const trace: Int32Array[] = []
  for (let d = 0; d <= Math.min(max, MAX_EDITS); d++) {
    trace.push(v.slice(off - d, off + d + 1))
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1
      let y = x - k
      while (x < N && y < M && A[x] === B[y]) { x++; y++ }
      v[off + k] = x
      if (x >= N && y >= M) return backtrack(A, B, trace)
    }
  }
  return [...A.map(del), ...B.map(add)]
}

function backtrack(A: string[], B: string[], trace: Int32Array[]): DiffLine[] {
  const out: DiffLine[] = []
  let x = A.length
  let y = B.length
  for (let d = trace.length - 1; d > 0; d--) {
    const prev = trace[d] // keadaan v setelah langkah d-1, indeks k + d
    const k = x - y
    const prevK = k === -d || (k !== d && prev[k - 1 + d] < prev[k + 1 + d]) ? k + 1 : k - 1
    const prevX = prev[prevK + d]
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) { x--; y--; out.push(same(A[x])) }
    if (x === prevX) out.push(add(B[--y]))
    else out.push(del(A[--x]))
  }
  while (x > 0 && y > 0) { x--; y--; out.push(same(A[x])) }
  return out.reverse()
}

/** Sembunyikan baris sama yang jauh dari perubahan, sisakan `context` baris di sekitar perubahan. */
export function collapse(lines: DiffLine[], context = 3): DiffItem[] {
  const show = new Uint8Array(lines.length)
  lines.forEach((l, i) => {
    if (l.type === 'same') return
    for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) show[j] = 1
  })
  const out: DiffItem[] = []
  let gap = 0
  lines.forEach((l, i) => {
    if (!show[i]) { gap++; return }
    if (gap) out.push({ type: 'gap', count: gap })
    gap = 0
    out.push(l)
  })
  if (gap) out.push({ type: 'gap', count: gap })
  return out
}
