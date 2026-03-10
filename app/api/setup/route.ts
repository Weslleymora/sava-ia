import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/setup — cria o primeiro admin (só funciona se não existir nenhum usuário)
export async function POST(req: NextRequest) {
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Bloqueia se já existir qualquer usuário
  const { count } = await adminSupabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Setup já realizado. Acesse /login.' }, { status: 403 })
  }

  const { email, name, password } = await req.json() as {
    email: string
    name: string
    password: string
  }

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'email, name e password são obrigatórios' }, { status: 400 })
  }

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Erro ao criar usuário' }, { status: 400 })
  }

  // Upsert garante que o perfil existe mesmo se o trigger falhar
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert({ id: newUser.user.id, name, role: 'admin', active: true })

  if (profileError) {
    // Rollback: remove o usuário criado
    await adminSupabase.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Erro ao criar perfil: ' + profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
