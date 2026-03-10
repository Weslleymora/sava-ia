import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/users — lista todos os usuários
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await db
    .from('profiles')
    .select('id, name, role, active, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/users — cria novo usuário
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, name, password, role } = body as {
    email: string; name: string; password: string; role: string
  }

  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, name, password, role' }, { status: 400 })
  }

  const { data: newUser, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Erro ao criar usuário' }, { status: 400 })
  }

  // Atualiza role no perfil (o trigger cria com 'advogado' por padrão)
  await db.from('profiles').update({ role, name }).eq('id', newUser.user.id)

  return NextResponse.json({ success: true, userId: newUser.user.id })
}

// PATCH /api/admin/users — atualiza role ou active
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, role, active } = body as { userId: string; role?: string; active?: boolean }

  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (active !== undefined) updates.active = active

  const { error } = await db.from('profiles').update(updates).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
