-- ============================================================
-- MIGRATION: tambahan untuk Bimbel Manager di License Server
-- Aman dijalankan di project License Server LesKu yang sudah ada.
-- TIDAK ada ALTER/DROP yang mengubah perilaku tabel/data lama.
-- ============================================================

create table if not exists products (
  id text primary key,       -- 'lesku' | 'bimbel_manager' | produk berikutnya
  name text not null
);
insert into products (id, name) values
  ('lesku', 'LesKu'),
  ('bimbel_manager', 'Bimbel Manager')
on conflict (id) do nothing;

alter table licenses
  add column if not exists product_id text references products(id) default 'lesku';

-- Baris lama otomatis product_id = 'lesku', tidak perlu backfill manual.

-- ============================================================
-- Fungsi cek lisensi untuk Bimbel Manager (dan produk berikutnya
-- yang polanya sama: institusi, bukan per-user seperti LesKu).
-- Dipanggil pakai anon key dari browser, tapi tabel `licenses`/
-- `clients` TETAP TERKUNCI (tidak ada policy SELECT langsung) —
-- cuma fungsi ini yang boleh mengintip, dan cuma mengembalikan
-- baris yang key-nya cocok persis.
-- ============================================================
create or replace function verify_license(p_license_key uuid, p_product_id text)
returns table(
  status text,
  project_url text,
  project_anon_key text,
  institution_name text
)
language sql security definer
as $$
  select l.status, l.supabase_project_url, l.supabase_anon_key, c.nama_lembaga
  from licenses l
  join clients c on c.id = l.client_id
  where l.id = p_license_key
    and l.product_id = p_product_id;
$$;

revoke all on function verify_license(uuid, text) from public;
grant execute on function verify_license(uuid, text) to anon;

-- ============================================================
-- CARA PROVISIONING KLIEN BIMBEL MANAGER BARU
-- ============================================================
-- 1. Table Editor > clients > Insert row
--    - nama_guru: nama owner/PIC, nama_lembaga, email, no_wa
--    (TIDAK perlu bikin akun di Authentication > Users di project ini —
--     login Bimbel Manager terjadi di project data klien sendiri)
--
-- 2. Table Editor > licenses > Insert row
--    - client_id: pilih dari langkah 1
--    - product_id: 'bimbel_manager'
--    - status: 'active'
--    - supabase_project_url & supabase_anon_key: dari project data
--      klien yang baru dibuat (Settings > API di project klien itu)
--
-- 3. Catat `licenses.id` (UUID) — ini jadi VITE_LICENSE_KEY, ditanam
--    sebagai environment variable saat build/deploy Cloudflare Pages
--    khusus klien tersebut.
--
-- Kalau perlu blokir: ubah kolom `status` jadi 'blocked' — owner &
-- semua admin cabangnya sekaligus terkunci dari aplikasi.
-- ============================================================
