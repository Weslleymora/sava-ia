import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalysisViewer from '@/components/AnalysisViewer'
import ChatBox from '@/components/ChatBox'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, MapPin, Tag, AlertCircle } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AnalisePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      *,
      documents(*),
      analyses(*),
      messages(*)
    `)
    .eq('id', id)
    .single()

  if (!caseData) notFound()

  // Verifica acesso
  const { data: profile } = await supabase
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">
              {caseData.titulo || caseData.objeto}
            </h1>
            {caseData.titulo && (
              <p className="text-zinc-500 text-sm mt-0.5">{caseData.objeto}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {caseData.estado && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                <MapPin className="w-3 h-3 mr-1" />
                {caseData.estado}
              </Badge>
            )}
            <Badge variant="outline" className="border-violet-500/30 text-violet-400">
              <Tag className="w-3 h-3 mr-1" />
              {caseData.objeto}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(caseData.created_at)}
            </Badge>
          </div>
        </div>

        {/* Documentos */}
        {caseData.documents && caseData.documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {caseData.documents.map((doc: { id: string; name: string; size_bytes: number }) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1"
              >
                <FileText className="w-3 h-3 text-violet-400" />
                {doc.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body: análise + chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Análise */}
        <div className="flex-1 overflow-y-auto p-8">
          {caseData.status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3 mb-6">
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
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 mb-6">
              <p className="text-blue-300 text-sm font-semibold">Análise em andamento...</p>
              <p className="text-blue-400/70 text-xs mt-1">A IA está processando os documentos.</p>
            </div>
          )}

          {analysis ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
                <span className="text-xs text-zinc-500">Análise gerada por</span>
                <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                  {analysis.model_ai}
                </Badge>
                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                  {analysis.modelo_usado}
                </Badge>
              </div>
              <AnalysisViewer content={analysis.content} />
            </div>
          ) : (
            caseData.status === 'pending' && (
              <div className="text-center py-16 text-zinc-600">
                <p>Nenhuma análise disponível.</p>
              </div>
            )
          )}

          {/* Comentário original */}
          {caseData.comentario && (
            <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs text-zinc-500 mb-2 font-medium">Instrução/Pergunta original:</p>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap">{caseData.comentario}</p>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="w-96 border-l border-zinc-800 flex flex-col flex-shrink-0 bg-zinc-950">
          <ChatBox caseId={id} initialMessages={messages} />
        </div>
      </div>
    </div>
  )
}
