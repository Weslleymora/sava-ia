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

  // Carrega TODOS os dados do caso para contexto completo
  const { data: caseData } = await db
    .from('cases')
    .select(`
      id, user_id, titulo, objeto, estado, comentario, status, created_at,
      documents(name, size_bytes),
      analyses(content, modelo_usado, model_ai, created_at)
    `)
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

  // Histórico de mensagens (últimas 30)
  const { data: previousMessages } = await db
    .from('messages')
    .select('role, content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
    .limit(30)

  // Salva mensagem do usuário
  await db.from('messages').insert({
    case_id: caseId,
    role: 'user',
    content: message.trim(),
  })

  // Análise mais recente
  const analyses = caseData.analyses as Array<{ content: string; modelo_usado: string; model_ai: string }> ?? []
  const analysis = analyses.sort ? analyses[analyses.length - 1] : null

  // Documentos do caso
  const docs = (caseData.documents as Array<{ name: string; size_bytes: number }> ?? [])
  const docList = docs.map(d => `• ${d.name}`).join('\n')

  // System prompt com contexto COMPLETO e específico
  const systemPrompt = `Você é um assistente jurídico especializado do escritório SAVA (Sebadelhe Aranha & Vasconcelos), com expertise em direito do consumidor e regulação de energia elétrica — especialmente processos envolvendo a ENERGISA e a ANEEL (REN 1.000/2021, PRODIST, Código Civil, CDC).

═══════════════════════════════════════
DADOS DO PROCESSO EM ANÁLISE
═══════════════════════════════════════
Identificação: ${caseData.titulo || '(sem título)'}
Objeto da ação: ${caseData.objeto}
Estado/jurisdição: ${caseData.estado || 'Não especificado'}
Data de cadastro: ${new Date(caseData.created_at).toLocaleDateString('pt-BR')}
Status: ${caseData.status}
${caseData.comentario ? `\nInstrução do advogado: "${caseData.comentario}"` : ''}

Documentos enviados:
${docList || '(nenhum documento listado)'}

═══════════════════════════════════════
ANÁLISE COMPLETA GERADA PELA IA
═══════════════════════════════════════
${analysis ? `Modelo: ${analysis.model_ai} — ${analysis.modelo_usado}\n\n${analysis.content}` : 'Nenhuma análise disponível para este caso ainda.'}

═══════════════════════════════════════
REGRAS DE RESPOSTA — SIGA RIGOROSAMENTE
═══════════════════════════════════════
1. Responda SEMPRE com base específica neste processo — não use respostas genéricas.
2. Quando a pergunta se referir a algo que está na análise acima, cite diretamente o trecho relevante.
3. Seja direto e objetivo: vá ao ponto sem rodeios.
4. Use linguagem jurídica precisa — cite artigos, resoluções e súmulas relevantes para ESTE caso.
5. Se identificar risco ou ponto fraco neste processo específico, aponte claramente.
6. Se a pergunta não puder ser respondida com base nos dados disponíveis, diga exatamente o que falta.
7. Jamais invente fatos sobre o processo — baseie-se apenas no que está acima.`

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...(previousMessages?.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })) ?? []),
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

      await db.from('messages').insert({
        case_id: caseId,
        role: 'assistant',
        content: assistantContent,
      })

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      controller.close()
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
