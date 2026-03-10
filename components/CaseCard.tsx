import Link from 'next/link'
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2, MapPin, Files } from 'lucide-react'

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
  pending:   { label: 'Aguardando', icon: Clock,        color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  analyzing: { label: 'Analisando', icon: Loader2,      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', spin: true },
  done:      { label: 'Concluído',  icon: CheckCircle2, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  error:     { label: 'Erro',       icon: AlertCircle,  color: 'text-red-400 bg-red-400/10 border-red-400/20' },
} as const

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays}d atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function CaseCard({
  id, titulo, objeto, estado, status, createdAt, docCount = 0,
}: CaseCardProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <Link href={`/analise/${id}`}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-violet-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer group h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${config.color}`}>
            <Icon className={`w-3 h-3 ${'spin' in config && config.spin ? 'animate-spin' : ''}`} />
            {config.label}
          </span>
        </div>

        {/* Title */}
        <div className="mb-3">
          <p className="text-white font-semibold text-sm leading-snug group-hover:text-violet-200 transition-colors line-clamp-2">
            {titulo || objeto}
          </p>
          {titulo && (
            <p className="text-zinc-500 text-xs mt-1 truncate">{objeto}</p>
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center gap-3 text-xs text-zinc-600 mt-auto pt-3 border-t border-zinc-800/60">
          {estado && (
            <span className="flex items-center gap-1 text-zinc-500">
              <MapPin className="w-3 h-3" />
              {estado}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Files className="w-3 h-3" />
            {docCount} doc{docCount !== 1 ? 's' : ''}
          </span>
          <span className="ml-auto">{formatDate(createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
