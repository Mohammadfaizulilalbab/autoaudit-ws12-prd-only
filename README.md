# Eksperimen A: PRD Only (AutoAudit, Worksheet 12)

Repo ini berisi hasil Eksperimen A untuk Worksheet 12 Rekayasa Interaksi (Project Vibe Code). AI coding agent membangun aplikasi hanya dari satu dokumen, `PRD.md`.

- Demo: https://mohammadfaizulilalbab.github.io/autoaudit-ws12-prd-only/
- Repo pasangan: [Eksperimen B (PRD + Skill)](https://github.com/Mohammadfaizulilalbab/autoaudit-ws12-prd-skill)

## Aplikasi yang dibangun

Aplikasi ini adalah tiruan fitur AutoAudit (aplikasi audit chat WhatsApp milik PT ORDO) untuk tim System Implementor. Fiturnya berasal dari empat kebutuhan UX berprioritas Must di Worksheet 8:

1. Ringkasan versi, status, dan file sebelum Upload mengganti file dashboard CRM Pages.
2. Konfirmasi tegas (mengetik nomor versi) sebelum versi Published diganti.
3. Daftar Continuous Audit yang memakai sebuah Saved Prompt, langsung di halaman prompt dan di pesan sesudah simpan.
4. Riwayat isi prompt dan file dashboard yang bisa dibandingkan dan dikembalikan.

Semua data fiktif dan disimpan di localStorage browser. Aplikasi tidak terhubung ke AutoAudit asli.

## Isi repo

| File | Isi |
|---|---|
| `PRD.md` | Satu-satunya dokumen yang diberikan ke agent |
| `LOG-EKSPERIMEN.md` | Prompt verbatim, jeda, waktu kerja, dan catatan setiap iterasi agent |
| `src/` | Kode aplikasi (React, Vite, TypeScript) |
| `.github/workflows/deploy.yml` | Workflow GitHub Pages yang dibuat agent |

Histori commit di branch `main` mengikuti iterasi agent. Waktu kerja dan setiap prompt dari peneliti tercatat di `LOG-EKSPERIMEN.md`.

## Cara eksperimen dijalankan

Eksperimen A dan B memakai AI yang sama, yaitu Claude Code dengan model Claude Opus 5.5, dalam dua sesi agent terpisah. Prompt keduanya hanya berbeda pada dokumen yang boleh dibaca. Agent bekerja tanpa bisa bertanya, mencatat setiap iterasi, dan commit sendiri. Peneliti hanya menulis dokumen, menjalankan agent, memverifikasi build dan test, lalu men-deploy hasilnya ke GitHub Pages.

## Menjalankan di komputer sendiri

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
npm test
npm run build
```

## Penyusun

Mohammad Faiz Ulil Albab (202310370311424), Rekayasa Interaksi kelas C, Informatika Universitas Muhammadiyah Malang, 2026.
