# Bimbel Manager — by Hasilin

Aplikasi manajemen bisnis bimbel (multi-cabang) untuk owner: dashboard eksekutif,
SWOT & business health score otomatis, CRUD siswa/program/guru/pembayaran,
pusat dokumen (invoice/kwitansi/laporan), dan role Owner + Admin Cabang.

Dibangun dari prototype single-file HTML, dipecah jadi project modular
(Vite + Supabase) dengan pola arsitektur yang sama dengan LesKu:
License Server terpusat (punya Hasilin) + 1 Supabase project data per klien.

---

## 1. Struktur Project

```
src/
  main.js              Titik masuk: cek lisensi → login → muat data → tampilkan app
  lib/                  Logika (tidak ada JSX/HTML besar di sini)
    utils.js             Format tanggal/uang, escape XSS, konversi camelCase<->snake_case
    supabaseClient.js     Wrapper client Supabase project data klien
    license.js            Cek lisensi ke License Server (RPC verify_license)
    auth.js                Login/logout, ambil profil staff, buat admin baru
    schemas.js              Definisi field semua entitas CRUD (SATU sumber kebenaran)
    dataStore.js             Fetch/insert/update/delete ke Supabase + cache di memori
    crud.js                   Mesin form & tabel generik (dipakai 8 entitas sederhana)
    analytics.js               Semua kalkulasi bisnis (SWOT, health score, dst)
    docTemplates.js              Template invoice/kwitansi/laporan
    exportUtils.js                 Export PNG/PDF/Print, backup JSON, link WhatsApp
    charts.js                       Wrapper Chart.js (lazy-loaded)
    theme.js                         Terapkan tema warna
    uiState.js                        State kecil lintas halaman (cabang terpilih, dst)
    router.js                         Navigasi antar halaman
    appShell.js                       Kerangka sidebar + topbar + section kosong
  pages/                Halaman yang perilakunya khusus (bukan CRUD generik)
    login.js, dashboard.js, analyticsPage.js, unpaid.js, reports.js,
    documents.js, staff.js, settings.js
  styles/               CSS dipecah per fungsi (variables/layout/components/documents)
supabase/
  client-project/schema.sql              Jalankan di TIAP project data klien baru
  license-server/migration-add-*.sql     Jalankan SEKALI di License Server (project sama dgn LesKu)
  functions/create-staff/index.ts        Edge Function "Tambah Admin" (deploy per klien)
```

**Menambah field baru ke entitas yang sudah ada?** Cukup edit `src/lib/schemas.js`
(tambah 1 baris field) + tambah kolom yang sama di `schema.sql`. Tidak perlu
sentuh `crud.js` atau halaman lain untuk field sederhana (text/select/date/dll).

**Menambah entitas CRUD baru?** Tambah 1 blok di `schemas.js`, daftarkan tabelnya
di `TABLES` (`dataStore.js`) dan `SIMPLE_CRUD_PAGES` (`router.js`), tambah baris
di `PAGES` (`schemas.js`), lalu buat tabelnya di `schema.sql`.

---

## 2. Setup Development (StackBlitz atau lokal)

1. Buka project ini, `npm install`.
2. Salin `.env.example` jadi `.env`, isi 4 variabel di dalamnya (lihat komentar
   di file tersebut — 2 nilai sama untuk semua klien, 2 nilai beda per klien).
3. `npm run dev`.

Kalau `VITE_LICENSE_KEY` di `.env` menunjuk ke institusi yang sudah pernah
di-setup (lihat bagian 3), aplikasi akan langsung menampilkan layar login
sungguhan — jadi development tetap butuh minimal 1 project Supabase data
klien yang sudah di-provisioning.

---

## 3. Provisioning Klien Baru (checklist)

### A. Project Data Klien (Supabase baru, khusus institusi ini)
1. Buat project Supabase baru.
2. Buka SQL Editor, jalankan seluruh isi `supabase/client-project/schema.sql`.
3. **Authentication → Users → Add user**: buat akun owner (email + password),
   centang *Auto Confirm User*. Copy **User UID**.
4. **Table Editor → staff → Insert row**: `id` = User UID tadi, `name` = nama
   owner, `role` = `owner`, `branch_ids` = `{}`.
5. **Table Editor → branches**: isi minimal 1 cabang.
6. **Storage**: bucket `branding` otomatis dibuat oleh schema.sql (untuk logo).
7. **Edge Functions**: deploy `create-staff` ke project ini:
   ```
   supabase functions deploy create-staff --project-ref <ref-project-klien>
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key-project-klien> --project-ref <ref-project-klien>
   ```
8. Catat **Project URL** dan **anon key** (Settings → API).

### B. License Server (project yang sama dengan LesKu — sekali per klien, bukan sekali seumur hidup)
1. Kalau migration `supabase/license-server/migration-add-bimbel-manager.sql`
   belum pernah dijalankan di project ini, jalankan sekali (aman, tidak
   mengubah data LesKu).
2. **Table Editor → clients → Insert row**: `nama_guru` (PIC), `nama_lembaga`,
   `email`, `no_wa`.
3. **Table Editor → licenses → Insert row**: `client_id` (dari langkah 2),
   `product_id` = `bimbel_manager`, `status` = `active`,
   `supabase_project_url` & `supabase_anon_key` = dari langkah A.8.
4. Catat `licenses.id` (UUID) — ini jadi `VITE_LICENSE_KEY`.

### C. Deploy (Cloudflare Pages via GitHub)
1. Push project ini ke repo GitHub klien (atau branch/folder terpisah per klien).
2. Cloudflare Pages → New Project → hubungkan repo.
   Build command: `npm run build` — Output directory: `dist`.
3. Environment Variables di Cloudflare Pages, isi 4 variabel (sama seperti `.env`)
   dengan nilai khusus klien ini (`VITE_LICENSE_KEY` beda per klien).
4. Deploy. Buka domainnya → harus muncul layar login.

**Untuk memblokir akses klien** (belum bayar dsb): ubah `status` jadi `blocked`
di baris `licenses` klien tersebut, di License Server. Owner & semua admin
cabangnya langsung terkunci dari aplikasi.

---

## 4. Menambah Admin Cabang (dilakukan owner dari dalam aplikasi)

Menu **Admin & Akses** (cuma terlihat untuk owner) → Tambah Admin → isi nama,
WhatsApp, email, password, centang cabang yang boleh diakses → Buat Akun.
Owner lalu mengirim email + password itu ke admin secara manual lewat WhatsApp.

---

## 5. Catatan Perubahan dari Prototype Single-File

- **Fitur "Reset ke Data Contoh" dihapus.** Di versi localStorage lama ini aman
  (cuma menghapus data di 1 browser), tapi di versi Supabase ini akan menghapus
  data hidup milik institusi — terlalu berisiko untuk jadi tombol biasa.
- **Restore backup JSON tidak lagi otomatis menimpa data.** Tombol *Download
  Backup* tetap ada (cadangan tambahan), tapi restore data besar (siswa,
  pembayaran, dll) sengaja tidak dibuat 1-klik untuk menghindari risiko salah
  timpa data produksi. Kalau dibutuhkan, hubungi developer untuk restore manual.
- **Logo** sekarang disimpan di Supabase Storage (bucket `branding`), bukan
  base64 di dalam data — lebih ringan dan tidak membengkakkan setiap baris data.
- **Field "Kalimat Penutup WhatsApp"** ditambahkan ke halaman Pengaturan
  (di prototype lama field ini dipakai di pesan WA tapi tidak ada tempat
  mengisinya dari UI).
- Chart.js, html2canvas, dan jsPDF di-lazy-load (dimuat cuma saat dibutuhkan)
  supaya halaman login dan dashboard pertama kali tetap ringan.

## 6. Known Issue / Untuk Diperhatikan

- `npm audit` melaporkan kerentanan pada dependency `dompurify` (dipakai lewat
  jsPDF) dan `esbuild` (dipakai lewat Vite, dev server saja). Keduanya berkaitan
  dengan fitur yang **tidak dipakai** di app ini (jsPDF `.html()` dan akses
  dev-server dari luar), jadi aman untuk sementara — tapi perlu di-upgrade
  berkala (`npm audit fix`) saat ada waktu maintenance, terutama jika versi
  breaking change (jsPDF v4, Vite v8) sudah sempat diuji.
