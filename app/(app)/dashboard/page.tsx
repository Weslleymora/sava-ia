import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import CaseCard from '@/components/CaseCard'
import { Button } from '@/components/ui/button'
import { PlusCircle, FolderOpen, CheckCircle2, Loader2, AlertCircle, LayoutGrid } from 'lucide-react'

// Força renderização dinâmica a cada request (evita cache com dados vazios)
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Query separada para evitar problemas com join
  const { data: cases, error: casesError } = isAdmin
    ? await db
        .from('cases')
        .select('id, titulo, objeto, estado, status, created_at, user_id')
        .order('created_at', { ascending: false })
    : await db
        .from('cases')
        .select('id, titulo, objeto, estado, status, created_at, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

  if (casesError) {
    console.error('[dashboard] casesError:', casesError)
  }

  const all = cases ?? []

  // Busca contagem de documentos para cada caso
  const caseIds = all.map(c => c.id)
  const { data: documents } = caseIds.length > 0
    ? await db
        .from('documents')
        .select('case_id')
        .in('case_id', caseIds)
    : { data: [] }

  // Busca resumos das análises
  const { data: analyses } = caseIds.length > 0
    ? await db
        .from('analyses')
        .select('case_id, resumo')
        .in('case_id', caseIds)
    : { data: [] }

  const docCountMap: Record<string, number> = {}
  for (const doc of documents ?? []) {
    docCountMap[doc.case_id] = (docCountMap[doc.case_id] ?? 0) + 1
  }

  const resumoMap: Record<string, string> = {}
  for (const a of analyses ?? []) {
    if (a.resumo) resumoMap[a.case_id] = a.resumo
  }

  const stats = {
    total:     all.length,
    done:      all.filter(c => c.status === 'done').length,
    analyzing: all.filter(c => c.status === 'analyzing').length,
    error:     all.filter(c => c.status === 'error').length,
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'usuário'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-zinc-500 text-sm">
            {greeting}, <span className="text-zinc-300 font-medium">{firstName}</span>
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Painel de Processos</h1>
        </div>
        <Link href="/analise/nova">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2 shadow-lg shadow-violet-500/20">
            <PlusCircle className="w-4 h-4" />
            Nova Análise
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total"      value={stats.total}     icon={<LayoutGrid   className="w-4 h-4 text-zinc-400"  />} color="border-zinc-700" />
          <StatCard label="Concluídos" value={stats.done}      icon={<CheckCircle2 className="w-4 h-4 text-green-400" />} color="border-green-500/20" valueColor="text-green-400" />
          <StatCard label="Analisando" value={stats.analyzing} icon={<Loader2      className="w-4 h-4 text-blue-400"  />} color="border-blue-500/20"  valueColor="text-blue-400" />
          <StatCard label="Com Erro"   value={stats.error}     icon={<AlertCircle  className="w-4 h-4 text-red-400"   />} color="border-red-500/20"   valueColor="text-red-400" />
        </div>
      )}

      {/* Cases */}
      {all.length > 0 ? (
        <>
          <p className="text-zinc-500 text-sm mb-4">
            {stats.total} {stats.total === 1 ? 'processo encontrado' : 'processos encontrados'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {all.map((c) => (
              <CaseCard
                key={c.id}
                id={c.id}
                titulo={c.titulo}
                objeto={c.objeto}
                estado={c.estado}
                status={c.status}
                createdAt={c.created_at}
                docCount={docCountMap[c.id] ?? 0}
                resumo={resumoMap[c.id]}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
            <FolderOpen className="w-9 h-9 text-zinc-700" />
          </div>
          <h3 className="text-white font-semibold text-lg">Nenhum processo ainda</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm leading-relaxed">
            Inicie uma nova análise enviando a petição inicial e os documentos do processo.
          </p>
          {casesError && (
            <p className="text-red-400/60 text-xs mt-3 font-mono">{casesError.message}</p>
          )}
          <Link href="/analise/nova" className="mt-6">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2 shadow-lg shadow-violet-500/20">
              <PlusCircle className="w-4 h-4" />
              Iniciar Primeira Análise
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label, value, icon, color, valueColor = 'text-white',
}: {
  label: string; value: number; icon: React.ReactNode; color: string; valueColor?: string
}) {
  return (
    <div className={`bg-zinc-900 border ${color} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-500 text-xs font-medium">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}
