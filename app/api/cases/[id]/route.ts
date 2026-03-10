import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caseData, error } = await supabase
    .from('cases')
    .select(`
      *,
      documents(*),
      analyses(*),
      messages(*)
    `)
    .eq('id', id)
    .single()

  if (error || !caseData) {
    return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })
  }

  // Verifica acesso
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && caseData.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Ordena mensagens por data
  if (caseData.messages) {
    caseData.messages.sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  return NextResponse.json(caseData)
}
