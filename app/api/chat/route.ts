import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  // Verifica acesso ao caso
  const { data: caseData } = await supabase
    .from('cases')
    .select('user_id, objeto')
    .eq('id', caseId)
    .single()

  if (!caseData) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && caseData.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Busca análise principal como contexto
  const { data: analysis } = await supabase
    .from('analyses')
    .select('content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Busca histórico de mensagens
  const { data: previousMessages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
    .limit(20) // últimas 20 mensagens

  // Salva mensagem do usuário
  await supabase.from('messages').insert({
    case_id: caseId,
    role: 'user',
    content: message.trim(),
  })

  // Monta contexto para a IA
  const systemPrompt = `Você é um assistente jurídico do escritório SAVA (Sebadelhe Aranha & Vasconcelos), especializado em direito do consumidor e regulação de energia elétrica (ENERGISA).

O advogado está trabalhando em um processo de "${caseData.objeto}".

${analysis ? `ANÁLISE PRÉVIA DA IA PARA ESTE CASO:\n${analysis.content}` : 'Nenhuma análise foi gerada ainda para este caso.'}

Responda às perguntas do advogado de forma objetiva, técnica e embasada juridicamente. Quando citar artigos ou resoluções, seja preciso.`

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...(previousMessages?.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })) ?? []),
    { role: 'user', content: message.trim() },
  ]

  // Stream da resposta
  let assistantContent = ''

  const stream = await openai.chat.completions.create({
    model: MODELS.primary,
    messages,
    stream: true,
    temperature: 0.3,
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

      // Salva resposta do assistente
      await supabase.from('messages').insert({
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
