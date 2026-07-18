// ============================================================
// EDGE FUNCTION: create-staff
// Dipanggil dari halaman "Admin & Akses" (src/pages/staff.js) lewat
// supabase.functions.invoke('create-staff', {...}).
//
// Kenapa harus lewat Edge Function, bukan langsung dari browser?
// Membuat user Supabase Auth dengan password yang DITENTUKAN LANGSUNG
// (bukan lewat proses signup sendiri) butuh hak admin (service_role).
// service_role TIDAK BOLEH pernah dikirim ke browser, jadi harus
// dieksekusi di server — di sinilah tempatnya.
//
// Deploy per project data klien:
//   supabase functions deploy create-staff
// Set secret (SEKALI, tidak akan terlihat lagi setelah di-set):
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxxxx
// (SUPABASE_URL sudah otomatis tersedia di environment Edge Function)
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const callerToken = authHeader.replace('Bearer ', '');
    if (!callerToken) {
      return json({ error: 'Tidak ada token autentikasi.' }, 401, corsHeaders);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) Pastikan pemanggil adalah user yang sudah login & valid
    const { data: callerData, error: callerErr } = await admin.auth.getUser(callerToken);
    if (callerErr || !callerData?.user) {
      return json({ error: 'Sesi tidak valid, silakan login ulang.' }, 401, corsHeaders);
    }

    // 2) Pastikan pemanggil berperan sebagai 'owner' (BUKAN percaya begitu saja
    //    ke input dari client — selalu verifikasi ulang dari database)
    const { data: callerStaff, error: staffErr } = await admin
      .from('staff')
      .select('role')
      .eq('id', callerData.user.id)
      .maybeSingle();
    if (staffErr || callerStaff?.role !== 'owner') {
      return json({ error: 'Hanya owner yang boleh menambah admin.' }, 403, corsHeaders);
    }

    // 3) Ambil & validasi payload
    const body = await req.json();
    const { name, phone, email, password, role, branch_ids } = body || {};
    if (!name || !email || !password) {
      return json({ error: 'Nama, email, dan password wajib diisi.' }, 400, corsHeaders);
    }
    if (String(password).length < 6) {
      return json({ error: 'Password minimal 6 karakter.' }, 400, corsHeaders);
    }
    const finalRole = role === 'owner' ? 'owner' : 'admin';
    const finalBranchIds = Array.isArray(branch_ids) ? branch_ids : [];
    if (finalRole === 'admin' && finalBranchIds.length === 0) {
      return json({ error: 'Admin harus punya minimal 1 cabang.' }, 400, corsHeaders);
    }

    // 4) Buat akun Supabase Auth baru dengan password yang ditentukan owner
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      return json({ error: 'Gagal membuat akun: ' + createErr.message }, 400, corsHeaders);
    }

    // 5) Insert baris staff yang terhubung ke akun baru itu
    const { data: staffRow, error: insertErr } = await admin
      .from('staff')
      .insert({
        id: created.user.id,
        name,
        phone: phone || null,
        role: finalRole,
        branch_ids: finalBranchIds,
      })
      .select()
      .single();

    if (insertErr) {
      // Rollback: kalau insert staff gagal, hapus lagi akun auth yang sudah terlanjur dibuat
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: 'Gagal menyimpan data staff: ' + insertErr.message }, 400, corsHeaders);
    }

    return json({ staff: staffRow }, 200, corsHeaders);
  } catch (e) {
    return json({ error: e.message || 'Terjadi kesalahan tak terduga.' }, 500, corsHeaders);
  }
});

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
