import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/register — cria novo usuário com e-mail já confirmado
export async function POST(req: NextRequest) {
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email, name, password } = await req.json() as {
    email: string
    name: string
    password: string
  }

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 })
  }

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !newUser.user) {
    const msg = createError?.message ?? 'Erro ao criar usuário.'
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert({ id: newUser.user.id, name, role: 'user', active: true })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Erro ao criar perfil: ' + profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
