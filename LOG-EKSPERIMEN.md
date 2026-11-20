# Log eksperimen

Eksperimen A: PRD Only (baseline)

Mata kuliah Rekayasa Interaksi, Worksheet 12 (Project Vibe Code). Penyusun dokumen dan peneliti: Mohammad Faiz Ulil Albab (202310370311424).

## Kondisi

| Item | Isi |
|---|---|
| Input dokumen | PRD.md |
| AI coding agent | Claude Code, subagent general-purpose, model Claude Opus 5.5 (sama untuk Eksperimen A dan B) |
| Isolasi | Agent hanya bekerja di folder repo ini dan hanya membaca dokumen di atas |
| Stack | Ditetapkan di PRD (NFR-07): React, Vite, TypeScript, localStorage, GitHub Pages |

## Catatan peneliti

Bagian ini ditulis peneliti: prompt yang diberikan ke agent (verbatim), waktu mulai dan selesai, serta setiap prompt revisi.

### Prompt awal

Waktu mulai: 2026-11-20 22:01 WIB

```text
Kamu adalah AI coding agent dalam sebuah eksperimen vibe coding.

Folder kerja: /Users/macbookpro/Downloads/Rekayasa Interaksi/ws12_vibecode/autoaudit-ws12-prd-only
Bangun aplikasi sesuai PRD.md di folder ini.

Aturan eksperimen (sama untuk semua peserta):
1. Bekerja dan membaca file hanya di dalam folder kerja. Jangan membuka atau mencari file di luar folder kerja.
2. Tidak ada orang yang bisa ditanya selama pengerjaan. Kalau ada yang belum jelas, ambil keputusan sendiri dan catat alasannya.
3. Setiap selesai satu iterasi (satu langkah kerja yang berarti, termasuk perbaikan), tambahkan entri di bagian "Iterasi agent" pada LOG-EKSPERIMEN.md: nomor iterasi, waktu mulai dan selesai (ambil dari perintah date "+%Y-%m-%d %H:%M"), tujuan, file yang berubah, masalah yang ditemui, dan hasil build/test. Jangan mengubah bagian "Kondisi" dan "Catatan peneliti".
4. Commit setiap iterasi ke git (branch main) dengan pesan yang jelas dalam bahasa Indonesia, diakhiri baris kosong lalu baris: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>. Jangan push dan jangan membuat repo GitHub; peneliti yang melakukannya.
5. Jangan commit node_modules atau dist.
6. Jika menjalankan dev server, pakai port 5181 dan matikan sebelum selesai. Jika memakai browser untuk memeriksa tampilan, buka tab sendiri dan jangan menutup tab lain.
7. Perintah yang lama (misalnya npm install) boleh dijalankan di background.

Selesai ketika kamu menilai aplikasi sudah memenuhi dokumen. Pesan terakhirmu berisi: ringkasan yang dibangun, perintah untuk menjalankan, hasil build dan test terakhir, serta hal yang belum selesai.
```

### Jeda karena batas pemakaian

Agent berhenti sekitar 2026-11-20 22:12 WIB karena batas pemakaian API (HTTP 429). Hal yang sama terjadi pada Eksperimen A dan B pada waktu yang sama. Agent dilanjutkan 2026-11-21 02:22 WIB dengan pesan yang sama untuk A dan B:

```text
Lanjutkan pekerjaanmu dari titik terakhir. Pengerjaan sempat terhenti sekitar 22:12 WIB karena batas pemakaian API, bukan karena kesalahanmu. Aturan eksperimen tetap sama. Periksa keadaan folder (git status dan LOG-EKSPERIMEN.md) dulu, lalu lanjutkan sampai selesai.
```

Jeda ini tidak dihitung sebagai waktu pengembangan dan tidak dihitung sebagai revisi.

### Selesai dan verifikasi peneliti

Agent menyatakan selesai pukul 02:29 WIB (2026-11-21). Waktu kerja aktif agent sekitar 18 menit (22:01 sampai 22:12, lalu 02:22 sampai 02:29), tanpa menghitung jeda batas pemakaian. Jumlah prompt revisi dari peneliti sampai titik ini: 0. Agent mencatat 3 iterasi setelah jeda tercatat di bagian Iterasi agent.

Verifikasi ulang oleh peneliti di mesin yang sama, 2026-11-21: `npm ci` berhasil, `npm test` 11 dari 11 test lolos (1 file test), `npm run build` berhasil tanpa error.

## Iterasi agent

Bagian ini ditulis agent setiap selesai satu iterasi: waktu, tujuan, file yang berubah, masalah, dan hasil build/test.

### Iterasi 1: kerangka aplikasi dan semua fitur inti

- Mulai: 2026-11-20 22:03
- Selesai: 2026-11-20 22:12 (build dan test lolos). Terhenti karena batas pemakaian API sebelum sempat dicatat; entri ini dan commit-nya ditulis 2026-11-21 02:24 tanpa perubahan kode.
- Tujuan: membangun aplikasi sesuai PRD (FR-01 sampai FR-06) dengan React, Vite, TypeScript, dan localStorage.
- File yang berubah: package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/app-context.ts, src/store.ts, src/diff.ts, src/ui.tsx, src/CrmPages.tsx, src/Prompts.tsx, src/History.tsx, src/styles.css, src/logic.test.ts.
- Yang dibangun:
  - Daftar CRM Page per client, kartu versi (nomor, status berteks, nama file, waktu dan pengubah terakhir, tombol Upload dan Riwayat).
  - Upload dengan validasi (.html/.htm, tidak kosong, maksimal 500 KB), ringkasan sebelum diganti, Batal tanpa perubahan, dan konfirmasi tegas (ketik nomor versi, tombol merah) untuk versi Published.
  - Daftar Saved Prompt dengan jumlah audit pemakai atau keterangan "Tidak dipakai audit"; halaman ubah prompt dengan validasi nama/isi, panel "Dipakai oleh Continuous Audit", dan pesan simpan yang menyebut audit terdampak.
  - Riwayat untuk prompt dan versi: daftar revisi terbaru di atas, isi lengkap sebagai teks, perbandingan per baris (+ ditambah, − dihapus), dan Kembalikan yang membuat revisi baru "dikembalikan dari revisi #n" (konfirmasi tegas bila versi Published).
  - Data contoh fiktif (2 client, 5 prompt termasuk duplikat "Audit Follow-up Sales - v2" yang tidak dipakai, 5 audit, 1 CRM Page dengan v1 Archived, v2 Published, v3 Draft), penyimpanan localStorage, pesan gagal simpan, dan "Atur ulang data contoh" dengan konfirmasi.
  - Halaman Continuous Audit hanya-baca sebagai tiruan secukupnya.
- Keputusan yang diambil sendiri (tidak ada yang bisa ditanya):
  - Hash routing (#/...) dan `base: './'` di Vite, supaya memuat ulang halaman di subpath GitHub Pages tidak 404 tanpa trik 404.html.
  - Tidak memakai react-router atau library diff; perbandingan memakai algoritma Myers sendiri dengan batas 3000 suntingan (di atas itu bagian tengah ditampilkan sebagai dihapus lalu ditambah) supaya isi 500 KB tidak membuat halaman macet.
  - 500 KB = 512.000 byte (500 × 1024). File "kosong" = 0 byte atau hanya berisi spasi/baris kosong.
  - Nomor versi yang diketik tidak membedakan huruf besar/kecil ("V2" sama dengan "v2").
  - "Isi sama persis" (BR-9) berarti nama (nama prompt atau nama file) dan isinya sama; tidak ada revisi baru dan pengguna diberi tahu.
  - Pesan simpan prompt juga menyebut audit berstatus Dijeda, dengan keterangan "sedang dijeda".
  - Perbandingan dibaca dari revisi terpilih ke isi saat ini; baris sama yang jauh dari perubahan disembunyikan (3 baris konteks).
  - Setiap prompt dan versi di data contoh punya revisi #1 "dibuat", ditambah satu revisi lanjutan pada PRM-1001 dan v2 agar perbandingan bisa langsung dicoba.
  - Modal memakai elemen `<dialog>` bawaan browser (showModal) untuk menahan fokus dan menutup dengan Esc.
- Masalah: tidak ada yang menghambat. Satu baris di diff.ts sempat ditulis terlalu ringkas lalu diperjelas sebelum build.
- Hasil build/test: `npm run build` lolos (tsc tanpa error, bundel JS 248,6 kB / gzip 77,6 kB). `npm test` lolos 11 dari 11 test (diff, validasi file, revisi, pengembalian, pesan audit, data contoh). Tampilan belum diperiksa di browser.

### Iterasi 2: pemeriksaan di browser dan perbaikan temuan

- Mulai: 2026-11-21 02:24
- Selesai: 2026-11-21 02:26
- Tujuan: menguji semua alur di browser (dev server port 5181, tab sendiri di panel browser Claude) pada lebar desktop dan 360 px, lalu memperbaiki yang ditemukan.
- Yang diuji dan hasilnya:
  - Upload ke v2 (Published): ringkasan tampil dengan peringatan tayang; tombol konfirmasi merah dan nonaktif sampai "v2" diketik ("v3" tetap nonaktif, "V2" diterima); Esc menutup tanpa mengubah apa pun (localStorage masih kosong); setelah konfirmasi kartu dan pesan berhasil diperbarui.
  - Penolakan file: .txt, file 0 byte, file berisi spasi saja, dan file 500 KB + 1 byte ditolak dengan alasan; file tepat 500 KB diterima; file yang sama persis memunculkan "Tidak ada perubahan" tanpa revisi baru.
  - Riwayat versi: perbandingan menandai + dan −; Kembalikan revisi #2 pada Published meminta ketik nomor versi dan membuat revisi #4 "dikembalikan dari revisi #2" tanpa menghapus revisi lama.
  - Saved Prompt: daftar menampilkan jumlah audit dan "Tidak dipakai audit" untuk PRM-1002; nama hanya spasi ditolak dan fokus pindah ke kolom; simpan tanpa perubahan tidak membuat revisi; simpan isi baru menampilkan pesan yang menyebut 2 audit beserta jadwalnya.
  - Muat ulang halaman di rute #/riwayat/versi/ver-2: data dan rute tetap.
  - Atur ulang data contoh: konfirmasi tampil, data kembali ke keadaan awal (10 revisi).
  - Simulasi kuota penuh (setItem melempar error): muncul pesan gagal, kartu dan data tersimpan tidak berubah.
  - Lebar 360 px: tidak ada scroll horizontal di 9 rute (scrollWidth = 360); modal bisa digulir.
- Masalah yang ditemukan dan diperbaiki:
  - Pesan file 500 KB + 1 byte terbaca "ukurannya 500 KB, melebihi batas 500 KB" karena pembulatan. Sekarang menyebut byte: "512.001 byte, melebihi batas 500 KB (512.000 byte)".
  - Pesan penolakan file sebelumnya tetap tampil saat ringkasan file berikutnya terbuka. `notify` sekarang menerima `null` dan pesan lama dihapus saat ringkasan dibuka.
  - Label dan nilai di kartu versi terlalu sempit (kolom berdampingan). Label sekarang di atas nilai; ringkasan di modal bertumpuk pada lebar ≤ 480 px; lencana status boleh terbungkus sehingga tidak melewati tepi.
  - Judul tombol revisi ("Revisi #3" dan jenis aksi) terpecah dua baris; sekarang satu baris.
- Belum diperbaiki (dinilai kecil): setelah Kembalikan, tombol pembukanya menjadi nonaktif sehingga fokus keyboard kembali ke awal halaman, bukan ke tombol.
- File yang berubah: src/app-context.ts, src/App.tsx, src/CrmPages.tsx, src/Prompts.tsx, src/History.tsx, src/store.ts, src/styles.css, LOG-EKSPERIMEN.md.
- Hasil build/test: `npm run build` lolos, `npm test` lolos 11 dari 11.

### Iterasi 3: siap GitHub Pages, uji build produksi di subpath, performa, dan kontras

- Mulai: 2026-11-21 02:27
- Selesai: 2026-11-21 02:29
- Tujuan: memastikan aplikasi bisa dihosting di GitHub Pages pada subpath nama repo (NFR-07, kriteria penerimaan 11) dan memeriksa NFR-01 serta NFR-06.
- Yang dikerjakan:
  - Menambah workflow GitHub Actions `.github/workflows/deploy.yml`: setiap push ke main menjalankan `npm ci`, `npm test`, `npm run build`, lalu menerbitkan folder dist ke GitHub Pages. Peneliti perlu memilih Settings > Pages > Source: GitHub Actions setelah push.
  - Menyajikan hasil build di http://localhost:5181/autoaudit-ws12-prd-only/ dengan server statis tanpa fallback SPA (meniru GitHub Pages). Membuka langsung dan memuat ulang #/riwayat/prompt/PRM-1001 di subpath itu berhasil; aset termuat lewat path relatif.
  - Uji performa di build produksi dengan file ±503 KB (9.500 baris): perbandingan dua file besar dengan 3 baris berubah dirender sekitar 30 ms; perbandingan file besar dengan file kecil (9.500 baris berbeda) sekitar 200 ms. Halaman tidak macet.
  - Rasio kontras 18 pasangan warna utama dihitung: terendah 4,78:1 (tombol nonaktif), lainnya 6,19:1 sampai 14,46:1. Semua memenuhi WCAG AA.
  - Data uji di localStorage browser dihapus, server statis dan dev server dimatikan (port 5181 bebas).
- Masalah: pengukuran pertama memakai requestAnimationFrame dan macet karena panel browser sedang tersembunyi; diganti pengukuran berbasis microtask. Upload dua file ±500 KB membuat data tersimpan sekitar 1,5 MB karena isi file disimpan di versi dan di setiap revisi; dengan batas localStorage sekitar 5 MB, kira-kira 8 sampai 9 unggahan file sebesar itu sebelum muncul pesan "Gagal menyimpan". Sesuai asumsi PRD bahwa file dashboard kecil, ini tidak diubah.
- File yang berubah: .github/workflows/deploy.yml, LOG-EKSPERIMEN.md.
- Hasil build/test: `npm run build` lolos, `npm test` lolos 11 dari 11.
