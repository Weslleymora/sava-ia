import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface CaseCardProps {
  id: string
  titulo?: string | null
  objeto: string
  estado?: string | null
  status: string
  createdAt: string
  docCount?: number
}

const STATUS_CONFIG = {
  pending: { label: 'Aguardando', icon: Clock, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  analyzing: { label: 'Analisando', icon: Loader2, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  error: { label: 'Erro', icon: AlertCircle, color: 'text-red-400 bg-red-400/10 border-red-400/20' },
} as const

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CaseCard({
  id,
  titulo,
  objeto,
  estado,
  status,
  createdAt,
  docCount = 0,
}: CaseCardProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <Link href={`/analise/${id}`}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-violet-500/30 hover:bg-zinc-900/80 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate group-hover:text-violet-300 transition-colors">
                {titulo || objeto}
              </p>
              {titulo && (
                <p className="text-zinc-500 text-xs truncate">{objeto}</p>
              )}
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${config.color}`}
          >
            <Icon className={`w-3 h-3 ${status === 'analyzing' ? 'animate-spin' : ''}`} />
            {config.label}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {estado && (
            <>
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 py-0">
                {estado}
              </Badge>
              <span>•</span>
            </>
          )}
          <span>{docCount} doc{docCount !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
