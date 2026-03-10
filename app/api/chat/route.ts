import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { openai, MODELS } from '@/lib/openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { caseId, message } = body as { caseId: string; message: string }

  if (!caseId || !message?.trim()) {
    return NextResponse.json({ error: 'caseId e message são obrigatórios' }, { status: 400 })
  }

  const db = createAdminClient()

  // Carrega caso completo
  const { data: caseData } = await db
    .from('cases')
    .select('id, user_id, titulo, objeto, estado, comentario, status, created_at')
    .eq('id', caseId)
    .single()

  if (!caseData) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && caseData.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Busca documentos do caso
  const { data: documents } = await db
    .from('documents')
    .select('name')
    .eq('case_id', caseId)

  // Busca análise — prefere o resumo para economizar tokens
  const { data: analysis } = await db
    .from('analyses')
    .select('content, resumo, modelo_usado, model_ai')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Histórico (últimas 30 mensagens)
  const { data: previousMessages } = await db
    .from('messages')
    .select('role, content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
    .limit(30)

  // Salva mensagem do usuário
  await db.from('messages').insert({ case_id: caseId, role: 'user', content: message.trim() })

  // Contexto da análise: usa resumo se disponível (econômico), senão trunca o conteúdo completo
  const docList = (documents ?? []).map(d => `• ${d.name}`).join('\n') || '(nenhum listado)'

  let analysisContext: string
  if (analysis?.resumo) {
    analysisContext = `RESUMO EXECUTIVO DO CASO (gerado por IA):\n${analysis.resumo}`
  } else if (analysis?.content) {
    // Fallback: primeiros 3000 chars da análise completa
    const truncated = analysis.content.length > 3000
      ? analysis.content.slice(0, 3000) + '\n\n[... análise completa disponível na tela ...]'
      : analysis.content
    analysisContext = `ANÁLISE DO CASO:\n${truncated}`
  } else {
    analysisContext = 'Nenhuma análise disponível ainda para este caso.'
  }

  const systemPrompt = `Você é o assistente jurídico do escritório SAVA (Sebadelhe Aranha & Vasconcelos), com expertise em direito do consumidor e regulação da ENERGISA (REN 1.000/2021, PRODIST, CDC, Código Civil).

═══════════════════════════════════
PROCESSO EM PAUTA
═══════════════════════════════════
Identificação: ${caseData.titulo || '(sem título)'}
Objeto: ${caseData.objeto}
Estado: ${caseData.estado || 'Não especificado'}
Data: ${new Date(caseData.created_at).toLocaleDateString('pt-BR')}
${caseData.comentario ? `Instrução do advogado: "${caseData.comentario}"` : ''}

Documentos analisados:
${docList}

═══════════════════════════════════
${analysisContext}
═══════════════════════════════════

REGRAS:
• Responda com base ESPECÍFICA neste processo — sem respostas genéricas
• Seja direto e objetivo: vá ao ponto
• Cite artigos, resoluções e precedentes aplicáveis A ESTE caso
• Se a pergunta tratar de algo mencionado no resumo/análise, referencie diretamente
• Aponte riscos e pontos fracos específicos deste processo quando relevante
• Se não houver informação suficiente, diga o que falta
• Jamais invente fatos sobre o processo`

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...(previousMessages?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) ?? []),
    { role: 'user', content: message.trim() },
  ]

  let assistantContent = ''

  const stream = await openai.chat.completions.create({
    model: MODELS.primary,
    messages: chatMessages,
    stream: true,
    temperature: 0.2,
  })

  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          assistantContent += delta
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
        }
      }

      await db.from('messages').insert({ case_id: caseId, role: 'assistant', content: assistantContent })

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })

  return new Response(readableStream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
