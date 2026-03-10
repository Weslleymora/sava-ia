import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AnalysisViewer from '@/components/AnalysisViewer'
import ChatBox from '@/components/ChatBox'
import CopyButton from '@/components/CopyButton'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Calendar, MapPin, Tag, AlertCircle,
  ArrowLeft, CheckCircle2, Loader2, Clock,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_CONFIG = {
  pending:   { label: 'Aguardando', icon: Clock,        color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  analyzing: { label: 'Analisando', icon: Loader2,      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  done:      { label: 'Concluído',  icon: CheckCircle2, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  error:     { label: 'Erro',       icon: AlertCircle,  color: 'text-red-400 bg-red-400/10 border-red-400/20' },
} as const

export default async function AnalisePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  const { data: caseData } = await db
    .from('cases')
    .select(`*, documents(*), analyses(*), messages(*)`)
    .eq('id', id)
    .single()

  if (!caseData) notFound()

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && caseData.user_id !== user.id) redirect('/dashboard')

  const analysis = caseData.analyses?.[0]
  const messages = (caseData.messages ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const statusKey = (caseData.status as keyof typeof STATUS_CONFIG) ?? 'pending'
  const statusConfig = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Painel
          </Link>
          <span className="text-zinc-700 text-xs">/</span>
          <span className="text-zinc-400 text-xs truncate max-w-xs">
            {caseData.titulo || caseData.objeto}
          </span>
        </div>

        {/* Title + meta */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate leading-tight">
              {caseData.titulo || caseData.objeto}
            </h1>
            {caseData.titulo && (
              <p className="text-zinc-500 text-sm mt-0.5">{caseData.objeto}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
              <StatusIcon className={`w-3 h-3 ${statusKey === 'analyzing' ? 'animate-spin' : ''}`} />
              {statusConfig.label}
            </span>

            {caseData.estado && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                {caseData.estado}
              </Badge>
            )}
            <Badge variant="outline" className="border-violet-500/30 text-violet-400 text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {caseData.objeto}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(caseData.created_at)}
            </Badge>
          </div>
        </div>

        {/* Documentos */}
        {caseData.documents && caseData.documents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {caseData.documents.map((doc: { id: string; name: string }) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2 py-0.5"
              >
                <FileText className="w-3 h-3 text-violet-400" />
                {doc.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Análise */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-4xl space-y-4">

            {caseData.status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-semibold text-sm">Erro na análise</p>
                  <p className="text-red-400/70 text-xs mt-1">
                    Ocorreu um erro ao processar os documentos. Crie uma nova análise.
                  </p>
                </div>
              </div>
            )}

            {caseData.status === 'analyzing' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 flex items-center gap-4">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-blue-300 text-sm font-semibold">Análise em andamento</p>
                  <p className="text-blue-400/70 text-xs mt-0.5">
                    A IA está processando os documentos. Atualize a página em instantes.
                  </p>
                </div>
              </div>
            )}

            {analysis ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Analysis header */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-500">Gerado por</span>
                    <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                      {analysis.model_ai}
                    </Badge>
                    <span className="text-zinc-700 text-xs">·</span>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                      {analysis.modelo_usado}
                    </Badge>
                  </div>
                  <CopyButton content={analysis.content} />
                </div>

                {/* Analysis content */}
                <div className="p-6">
                  <AnalysisViewer content={analysis.content} />
                </div>
              </div>
            ) : (
              caseData.status === 'pending' && (
                <div className="text-center py-20 text-zinc-600">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                  <p className="text-sm">Nenhuma análise disponível.</p>
                </div>
              )
            )}

            {/* Instrução original */}
            {caseData.comentario && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
                  Instrução original
                </p>
                <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {caseData.comentario}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="w-96 border-l border-zinc-800 flex flex-col flex-shrink-0 bg-zinc-950">
          <ChatBox caseId={id} initialMessages={messages} />
        </div>
      </div>
    </div>
  )
}
