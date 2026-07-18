-- ============================================================
-- SCHEMA.SQL — Project Data Klien Bimbel Manager
-- Jalankan di Supabase SQL Editor SEKALI per klien baru
-- (1 project Supabase = 1 institusi bimbel).
--
-- Beda dari pola LesKu: login (owner & admin) terjadi DI PROJECT
-- INI sendiri lewat Supabase Auth, bukan di License Server. Ini
-- supaya RLS per cabang bisa ditegakkan langsung oleh database.
-- ============================================================

create extension if not exists "pgcrypto";

-- ================= CABANG =================
create table branches (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  address text,
  phone text,
  pic text,
  status text default 'Aktif',
  notes text,
  created_at timestamptz default now()
);

-- ================= STAFF (auth + role) =================
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'admin',        -- 'owner' | 'admin'
  branch_ids text[] not null default '{}',   -- cabang yg boleh diakses; diabaikan kalau role owner
  created_at timestamptz default now()
);

-- ================= SISWA =================
create table students (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  name text not null,
  dob date,
  parent_name text,
  parent_phone text,
  area text,
  address text,
  school_level text,
  source text,
  join_date date,
  status text default 'Aktif',
  status_date date,
  status_reason text,
  status_notes text,
  return_potential text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================= PROGRAM/PAKET =================
create table programs (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  name text not null,
  type text,
  category text,
  default_fee numeric default 0,
  package_type text,
  meetings int,
  capacity int,
  status text default 'Aktif',
  notes text,
  created_at timestamptz default now()
);

-- ================= PENDAFTARAN =================
create table enrollments (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  student_id text references students(id) on delete cascade,
  program_id text references programs(id) on delete set null,
  package_type text,
  fee numeric default 0,
  start_date date,
  end_date date,
  meetings_quota int,           -- total pertemuan dlm paket (kalau package_type = Paket Pertemuan)
  meetings_used int default 0,  -- dasar utk alert "paket hampir habis" (fase 2)
  status text default 'Aktif',
  notes text,
  created_at timestamptz default now()
);

-- ================= GURU & PEGAWAI =================
create table teachers (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  name text not null,
  role text,
  phone text,
  join_date date,
  status text default 'Aktif',
  salary_scheme text,
  salary_amount numeric default 0,
  handled_programs text,
  status_date date,
  status_reason text,
  status_notes text,
  return_potential text,
  notes text,
  created_at timestamptz default now()
);

-- ================= PEMBAYARAN =================
create table payments (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  invoice_no text,
  date date not null,
  due_date date,
  student_id text references students(id) on delete set null,
  program_id text references programs(id) on delete set null,
  period text,
  package_type text,
  amount numeric default 0,
  discount numeric default 0,
  paid numeric default 0,
  method text,
  status text default 'Belum Lunas',
  note text,
  created_at timestamptz default now()
);

-- ================= PEMASUKAN LAIN =================
create table incomes (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  date date not null,
  category text,
  description text,
  amount numeric default 0,
  method text,
  note text,
  created_at timestamptz default now()
);

-- ================= PENGELUARAN =================
create table expenses (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete set null,
  date date not null,
  category text,
  description text,
  employee_id text references teachers(id) on delete set null,
  amount numeric default 0,
  method text,
  note text,
  created_at timestamptz default now()
);

-- ================= TARGET BULANAN PER CABANG (disiapkan utk fase 2) =================
create table branch_targets (
  id text primary key default gen_random_uuid()::text,
  branch_id text references branches(id) on delete cascade,
  month text not null,          -- format 'YYYY-MM'
  target_new_students int default 0,
  target_income numeric default 0,
  created_at timestamptz default now(),
  unique(branch_id, month)
);

-- ================= SETTINGS =================
create table settings (
  id int primary key default 1,
  institution_name text default 'Nama Bimbel',
  address text,
  phone text,
  pic_name text,
  logo_url text,
  theme text default 'mauve',
  theme_locked boolean default false,
  invoice_note text,
  wa_footer text
);
insert into settings (id) values (1);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
create or replace function my_role() returns text
language sql security definer stable as $$
  select role from staff where id = auth.uid()
$$;

create or replace function my_branches() returns text[]
language sql security definer stable as $$
  select branch_ids from staff where id = auth.uid()
$$;

alter table branches enable row level security;
alter table staff enable row level security;
alter table students enable row level security;
alter table programs enable row level security;
alter table enrollments enable row level security;
alter table teachers enable row level security;
alter table payments enable row level security;
alter table incomes enable row level security;
alter table expenses enable row level security;
alter table branch_targets enable row level security;
alter table settings enable row level security;

-- branches: owner CRUD penuh; admin cuma boleh SELECT cabang miliknya
create policy "owner_full_access" on branches for all using (my_role() = 'owner');
create policy "admin_view_own_branch" on branches for select using (my_role() = 'admin' and id = any(my_branches()));

-- staff: hanya owner yang boleh mengelola daftar staf; tiap orang boleh lihat baris dirinya sendiri
create policy "owner_manage_staff" on staff for all using (my_role() = 'owner');
create policy "self_view_staff" on staff for select using (id = auth.uid());

-- tabel dengan branch_id: pola sama untuk semuanya
create policy "owner_full_access" on students for all using (my_role() = 'owner');
create policy "admin_branch_only" on students for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on programs for all using (my_role() = 'owner');
create policy "admin_branch_only" on programs for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on enrollments for all using (my_role() = 'owner');
create policy "admin_branch_only" on enrollments for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on teachers for all using (my_role() = 'owner');
create policy "admin_branch_only" on teachers for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on payments for all using (my_role() = 'owner');
create policy "admin_branch_only" on payments for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on incomes for all using (my_role() = 'owner');
create policy "admin_branch_only" on incomes for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on expenses for all using (my_role() = 'owner');
create policy "admin_branch_only" on expenses for all using (my_role() = 'admin' and branch_id = any(my_branches()));

create policy "owner_full_access" on branch_targets for all using (my_role() = 'owner');
create policy "admin_branch_only" on branch_targets for all using (my_role() = 'admin' and branch_id = any(my_branches()));

-- settings: semua staff yang login boleh baca; hanya owner boleh ubah
create policy "any_staff_read" on settings for select using (my_role() in ('owner', 'admin'));
create policy "owner_update" on settings for update using (my_role() = 'owner');

-- ============================================================
-- STORAGE (logo lembaga)
-- Bucket public read (supaya logo bisa tampil di invoice/PDF tanpa
-- token), tapi upload/update/delete cuma boleh untuk user yang login
-- dan berstatus owner.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "public_read_branding" on storage.objects for select
  using (bucket_id = 'branding');

create policy "owner_manage_branding" on storage.objects for all
  using (bucket_id = 'branding' and my_role() = 'owner')
  with check (bucket_id = 'branding' and my_role() = 'owner');


-- ============================================================
-- AUTO-PROVISION OWNER (otomatis)
-- Blok ini membuat SATU cabang contoh, lalu memasang trigger yang
-- otomatis menjadikan user PERTAMA yang mendaftar/login sebagai
-- 'owner' di tabel staff. Jadi kamu TIDAK perlu copy-paste User UID
-- manual: cukup buat 1 user di Authentication > Users, dan user
-- pertama itu langsung jadi owner.
--
-- User ke-2 dan seterusnya TIDAK otomatis owner (mereka dibuat lewat
-- fitur "Tambah Admin" di dalam aplikasi oleh owner).
-- ============================================================

-- Cabang contoh awal (boleh diedit/ditambah nanti dari dalam aplikasi)
insert into branches (name, status, notes)
values ('Cabang Pusat', 'Aktif', 'Cabang awal - silakan ganti nama/alamat sesuai kebutuhan.');

-- Fungsi: jadikan user pertama sebagai owner
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Kalau belum ada satu pun staff, user baru ini otomatis jadi owner.
  if (select count(*) from public.staff) = 0 then
    insert into public.staff (id, name, role, branch_ids)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      'owner',
      '{}'
    );
  end if;
  return new;
end;
$$;

-- Trigger dipasang di auth.users: tiap kali ada user baru dibuat,
-- fungsi di atas dijalankan.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ============================================================
-- SETUP AWAL (RINGKAS) - tinggal 1 langkah manual:
-- ============================================================
-- Buka Authentication > Users > Add user
--   - Email & password owner
--   - CENTANG "Auto Confirm User"
-- Selesai. User pertama ini otomatis jadi owner (lewat trigger di atas),
-- cabang "Cabang Pusat" sudah otomatis dibuat, dan seluruh tabel + RLS
-- + storage sudah siap. Langsung bisa login dari aplikasi.
-- ============================================================
