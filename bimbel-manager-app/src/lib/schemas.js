// ============================================================
// SCHEMAS
// Satu sumber kebenaran untuk field tiap entitas: dipakai untuk
// generate form (lib/crud.js), kolom tabel, dan validasi ringan.
// Menambah/mengubah field cukup di sini — tidak perlu sentuh
// crud.js atau pages lain untuk field baru yang sederhana.
//
// Format tiap field: [name, label, type, required?, options?]
// type yang dikenali lib/crud.js:
//   text | textarea | tel | date | number | currency | monthText
//   select (butuh options)
//   branch | student | program | teacher  (dropdown relasi otomatis)
// ============================================================

export const STUDENT_REASONS = [
  'Pindah rumah', 'Jadwal tidak cocok', 'Biaya', 'Sudah masuk sekolah formal',
  'Tidak cocok dengan metode belajar', 'Orang tua belum melanjutkan',
  'Anak kurang minat', 'Masalah transportasi', 'Sakit / keluarga', 'Lainnya',
];

export const TEACHER_REASONS = [
  'Pindah tempat kerja', 'Jadwal tidak cocok', 'Gaji / kompensasi',
  'Kuliah / keluarga', 'Performa kerja', 'Kontrak selesai', 'Domisili berubah', 'Lainnya',
];

export const THEME_LIST = [
  ['mauve', 'Luxury Mauve Navy', '#182033', '#A86B8B', '#D6A84F', 'Profesional, lembut, premium'],
  ['emerald', 'Emerald Executive', '#113B34', '#2F8F75', '#C9A45C', 'Tenang dan corporate'],
  ['champagne', 'Champagne Gold', '#2E2A24', '#B08A45', '#E0B85C', 'Hangat dan mewah'],
  ['royal', 'Royal Blue Clean', '#172554', '#3758D8', '#BFA76A', 'Modern dan terpercaya'],
  ['cocoa', 'Soft Cocoa Rose', '#3B2B2F', '#B46A7B', '#D5A85E', 'Feminin halus dan elegan'],
];

export const PAGES = [
  ['dashboard', 'Dashboard', '📊', 'Ringkasan performa siswa, keuangan, dan operasional bimbel.'],
  ['analytics', 'Analisis Bisnis', '📈', 'Chart perkembangan dan evaluasi strategi bimbel.'],
  ['branches', 'Cabang', '🏢', 'Kelola nama, alamat, dan informasi setiap cabang.'],
  ['students', 'Siswa & Orang Tua', '👧', 'Data siswa, orang tua, status, alasan cuti/keluar.'],
  ['programs', 'Program & Paket', '🎓', 'Kelola kelas, program, harga, dan paket belajar.'],
  ['enrollments', 'Pendaftaran Program', '🧩', 'Hubungkan siswa dengan satu atau beberapa program.'],
  ['teachers', 'Guru & Pegawai', '👩‍🏫', 'Data SDM, gaji fleksibel, status, dan alasan keluar.'],
  ['payments', 'Pembayaran', '💳', 'Tagihan, invoice, pembayaran sebagian/lunas.'],
  ['unpaid', 'Belum Bayar', '⏰', 'Prioritas penagihan dan reminder WhatsApp.'],
  ['incomes', 'Pemasukan', '💰', 'Pemasukan manual selain pembayaran siswa.'],
  ['expenses', 'Pengeluaran', '🧾', 'Biaya operasional, gaji, dan kategori pengeluaran.'],
  ['reports', 'Laporan Owner', '📋', 'Laporan bulanan untuk evaluasi usaha.'],
  ['documents', 'Pusat Dokumen', '🖨️', 'Invoice, kwitansi, laporan PNG/PDF/Print.'],
  ['staff', 'Admin & Akses', '🔐', 'Kelola akun owner/admin dan hak akses per cabang.'],
  ['settings', 'Pengaturan', '⚙️', 'Branding lembaga, tema, backup, dan restore.'],
];

// Menu yang cuma boleh tampil untuk role 'owner'
export const OWNER_ONLY_PAGES = new Set(['staff', 'branches']);

export const schemas = {
  branches: {
    title: 'Cabang', singular: 'Cabang',
    fields: [
      ['name', 'Nama Cabang', 'text', true],
      ['address', 'Alamat Cabang', 'textarea'],
      ['phone', 'Nomor Kontak', 'tel'],
      ['pic', 'Penanggung Jawab', 'text'],
      ['status', 'Status', 'select', true, ['Aktif', 'Nonaktif']],
      ['notes', 'Catatan', 'textarea'],
    ],
    columns: ['name', 'address', 'phone', 'pic', 'status'],
  },

  students: {
    title: 'Siswa & Orang Tua', singular: 'Siswa',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['name', 'Nama Siswa', 'text', true],
      ['dob', 'Tanggal Lahir', 'date'],
      ['parentName', 'Nama Orang Tua', 'text'],
      ['parentPhone', 'WhatsApp Orang Tua', 'tel'],
      ['area', 'Daerah Tempat Tinggal', 'text'],
      ['address', 'Alamat Lengkap', 'textarea'],
      ['schoolLevel', 'Usia/Kelas Sekolah', 'text'],
      ['source', 'Sumber Informasi', 'select', false, ['Instagram', 'WhatsApp', 'Brosur', 'Teman/Referral', 'Sekolah', 'Spanduk', 'Lainnya']],
      ['joinDate', 'Tanggal Daftar', 'date'],
      ['status', 'Status Siswa', 'select', true, ['Aktif', 'Baru Daftar', 'Cuti', 'Keluar']],
      ['statusDate', 'Tanggal Status', 'date'],
      ['statusReason', 'Alasan Cuti/Keluar', 'select', false, STUDENT_REASONS],
      ['statusNotes', 'Catatan Alasan', 'textarea'],
      ['returnPotential', 'Potensi Kembali', 'select', false, ['Ya', 'Mungkin', 'Tidak', 'Belum Tahu']],
      ['notes', 'Catatan Umum', 'textarea'],
    ],
    columns: ['branchId', 'name', 'parentName', 'parentPhone', 'area', 'source', 'joinDate', 'status', 'statusReason'],
    conditionalGroup: { triggerField: 'status', showValues: ['Cuti', 'Keluar'], fields: ['statusDate', 'statusReason', 'statusNotes', 'returnPotential'] },
    rowActions: (row) => [{ label: 'Status', onclick: `openStudentMovementDoc('${row.id}')` }],
  },

  programs: {
    title: 'Program & Paket', singular: 'Program',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['name', 'Nama Program/Kelas', 'text', true],
      ['type', 'Tipe', 'select', true, ['Privat', 'Semi Private', 'Kelompok', 'Hybrid']],
      ['category', 'Kategori', 'text'],
      ['defaultFee', 'Biaya Default', 'currency'],
      ['packageType', 'Jenis Paket Default', 'select', false, ['Bulanan', 'Paket Pertemuan', 'Per Pertemuan', 'Custom']],
      ['meetings', 'Jumlah Pertemuan/Paket', 'number'],
      ['capacity', 'Kapasitas Kelas', 'number'],
      ['status', 'Status', 'select', true, ['Aktif', 'Nonaktif']],
      ['notes', 'Catatan', 'textarea'],
    ],
    columns: ['branchId', 'name', 'type', 'category', 'defaultFee', 'packageType', 'capacity', 'status'],
  },

  enrollments: {
    title: 'Pendaftaran Program', singular: 'Pendaftaran',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['studentId', 'Siswa', 'student', true],
      ['programId', 'Program/Paket', 'program', true],
      ['packageType', 'Jenis Pembayaran', 'select', true, ['Bulanan', 'Paket Pertemuan', 'Per Pertemuan', 'Custom']],
      ['fee', 'Biaya', 'currency'],
      ['startDate', 'Mulai', 'date'],
      ['endDate', 'Selesai', 'date'],
      ['meetingsQuota', 'Kuota Pertemuan (opsional)', 'number'],
      ['meetingsUsed', 'Pertemuan Terpakai', 'number'],
      ['status', 'Status', 'select', true, ['Aktif', 'Selesai', 'Berhenti']],
      ['notes', 'Catatan', 'textarea'],
    ],
    columns: ['branchId', 'studentId', 'programId', 'packageType', 'fee', 'startDate', 'status'],
  },

  teachers: {
    title: 'Guru & Pegawai', singular: 'Guru/Pegawai',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['name', 'Nama', 'text', true],
      ['role', 'Jabatan', 'select', true, ['Guru', 'Admin', 'Kasir', 'Owner', 'Helper', 'Pegawai Lain']],
      ['phone', 'WhatsApp', 'tel'],
      ['joinDate', 'Tanggal Masuk', 'date'],
      ['status', 'Status', 'select', true, ['Aktif', 'Cuti', 'Keluar', 'Nonaktif']],
      ['salaryScheme', 'Sistem Gaji', 'select', true, ['Tetap Bulanan', 'Per Sesi', 'Bagi Hasil', 'Custom']],
      ['salaryAmount', 'Nominal Gaji/Estimasi', 'currency'],
      ['handledPrograms', 'Program yang Ditangani', 'text'],
      ['statusDate', 'Tanggal Status', 'date'],
      ['statusReason', 'Alasan Cuti/Keluar', 'select', false, TEACHER_REASONS],
      ['statusNotes', 'Catatan Alasan', 'textarea'],
      ['returnPotential', 'Potensi Kembali', 'select', false, ['Ya', 'Mungkin', 'Tidak', 'Belum Tahu']],
      ['notes', 'Catatan Umum', 'textarea'],
    ],
    columns: ['branchId', 'name', 'role', 'phone', 'salaryScheme', 'salaryAmount', 'status', 'statusReason'],
    conditionalGroup: { triggerField: 'status', showValues: ['Cuti', 'Keluar', 'Nonaktif'], fields: ['statusDate', 'statusReason', 'statusNotes', 'returnPotential'] },
  },

  payments: {
    title: 'Pembayaran', singular: 'Pembayaran',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['invoiceNo', 'Nomor Invoice', 'text'],
      ['date', 'Tanggal Invoice', 'date', true],
      ['dueDate', 'Jatuh Tempo', 'date'],
      ['studentId', 'Siswa', 'student', true],
      ['programId', 'Program', 'program'],
      ['period', 'Periode', 'monthText', true],
      ['packageType', 'Jenis Pembayaran', 'select', true, ['Bulanan', 'Paket Pertemuan', 'Per Pertemuan', 'Custom']],
      ['amount', 'Nominal Tagihan', 'currency', true],
      ['discount', 'Diskon', 'currency'],
      ['paid', 'Sudah Dibayar', 'currency'],
      ['method', 'Metode Bayar', 'select', false, ['Tunai', 'Transfer', 'QRIS', 'Lainnya']],
      ['status', 'Status', 'select', true, ['Belum Lunas', 'Sebagian', 'Lunas', 'Jatuh Tempo']],
      ['note', 'Catatan', 'textarea'],
    ],
    columns: ['branchId', 'invoiceNo', 'date', 'studentId', 'programId', 'period', 'amount', 'paid', 'dueDate', 'status'],
    rowActions: (row) => [
      { label: 'Invoice', onclick: `previewPaymentDoc('${row.id}','invoice')` },
      { label: 'Kwitansi', onclick: `previewPaymentDoc('${row.id}','receipt')` },
      { label: 'WA', className: 'waBtn', onclick: `sendInvoiceWA('${row.id}')` },
    ],
  },

  incomes: {
    title: 'Pemasukan', singular: 'Pemasukan',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['date', 'Tanggal', 'date', true],
      ['category', 'Kategori', 'select', true, ['Pendaftaran', 'Modul', 'Seragam', 'Pemasukan Lain']],
      ['description', 'Keterangan', 'text', true],
      ['amount', 'Nominal', 'currency', true],
      ['method', 'Metode', 'select', false, ['Tunai', 'Transfer', 'QRIS', 'Lainnya']],
      ['note', 'Catatan', 'textarea'],
    ],
    columns: ['branchId', 'date', 'category', 'description', 'amount', 'method'],
  },

  expenses: {
    title: 'Pengeluaran', singular: 'Pengeluaran',
    fields: [
      ['branchId', 'Cabang', 'branch', true],
      ['date', 'Tanggal', 'date', true],
      ['category', 'Kategori', 'select', true, ['Gaji Guru', 'Gaji Admin/Pegawai', 'Sewa', 'Listrik', 'Internet', 'ATK', 'Marketing', 'Konsumsi', 'Operasional', 'Lainnya']],
      ['description', 'Keterangan', 'text', true],
      ['employeeId', 'Guru/Pegawai Terkait', 'teacher'],
      ['amount', 'Nominal', 'currency', true],
      ['method', 'Metode', 'select', false, ['Tunai', 'Transfer', 'QRIS', 'Lainnya']],
      ['note', 'Catatan', 'textarea'],
    ],
    columns: ['branchId', 'date', 'category', 'description', 'employeeId', 'amount', 'method'],
  },
};

// Field yang selalu dianggap angka saat dikirim ke Supabase (lihat lib/dataStore.js)
export const NUMERIC_FIELDS = new Set([
  'amount', 'discount', 'paid', 'defaultFee', 'fee', 'salaryAmount',
  'meetings', 'capacity', 'meetingsQuota', 'meetingsUsed',
  'targetNewStudents', 'targetIncome',
]);
