'use client'

import { useState, useMemo } from 'react'
import CaseCard from '@/components/CaseCard'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

interface CaseItem {
  id: string
  titulo: string | null
  objeto: string
  estado: string | null
  status: string
  createdAt: string
  docCount: number
  resumo?: string
}

interface CasesListProps {
  cases: CaseItem[]
}

const STATUS_LABELS: Record<string, string> = {
  all:       'Todos',
  done:      'Concluídos',
  analyzing: 'Analisando',
  error:     'Com Erro',
  pending:   'Aguardando',
}

export default function CasesList({ cases }: CasesListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return cases.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.objeto.toLowerCase().includes(q) ||
        (c.titulo?.toLowerCase().includes(q) ?? false) ||
        (c.estado?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [cases, search, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cases.length }
    for (const c of cases) {
      counts[c.status] = (counts[c.status] ?? 0) + 1
    }
    return counts
  }, [cases])

  return (
    <div>
      {/* Barra de busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por objeto, título ou estado..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de status */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'done', 'analyzing', 'error'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {STATUS_LABELS[s]}
              {statusCounts[s] !== undefined && statusCounts[s] > 0 && (
                <span className={`ml-1.5 ${statusFilter === s ? 'text-violet-200' : 'text-zinc-600'}`}>
                  {statusCounts[s]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contagem */}
      <p className="text-zinc-500 text-sm mb-4">
        {filtered.length} {filtered.length === 1 ? 'processo encontrado' : 'processos encontrados'}
        {search && <span className="text-zinc-600"> para &quot;{search}&quot;</span>}
      </p>

      {/* Grid de casos */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CaseCard
              key={c.id}
              id={c.id}
              titulo={c.titulo}
              objeto={c.objeto}
              estado={c.estado}
              status={c.status}
              createdAt={c.createdAt}
              docCount={c.docCount}
              resumo={c.resumo}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-600">
          <Search className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm">Nenhum processo encontrado.</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-violet-400 hover:text-violet-300 mt-2 transition-colors"
            >
              Limpar busca
            </button>
          )}
        </div>
      )}
    </div>
  )
}
