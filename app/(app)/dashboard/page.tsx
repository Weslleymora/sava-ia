import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CaseCard from '@/components/CaseCard'
import { Button } from '@/components/ui/button'
import { PlusCircle, FolderOpen } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Admin vê todos os casos; outros veem apenas os próprios
  let query = supabase
    .from('cases')
    .select(`
      id, titulo, objeto, estado, status, created_at,
      documents(id)
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { data: cases } = await query

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Painel</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {cases?.length ?? 0} {cases?.length === 1 ? 'processo' : 'processos'} analisados
          </p>
        </div>
        <Link href="/analise/nova">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2">
            <PlusCircle className="w-4 h-4" />
            Nova Análise
          </Button>
        </Link>
      </div>

      {/* Cases grid */}
      {cases && cases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <CaseCard
              key={c.id}
              id={c.id}
              titulo={c.titulo}
              objeto={c.objeto}
              estado={c.estado}
              status={c.status}
              createdAt={c.created_at}
              docCount={Array.isArray(c.documents) ? c.documents.length : 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-white font-semibold text-lg">Nenhum processo ainda</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm">
            Inicie uma nova análise enviando a petição inicial e os documentos do processo.
          </p>
          <Link href="/analise/nova" className="mt-6">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2">
              <PlusCircle className="w-4 h-4" />
              Iniciar Primeira Análise
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
