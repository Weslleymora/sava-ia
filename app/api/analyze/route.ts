import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { extractTextFromFile, concatenateTexts } from '@/lib/pdf'
import { getPromptConfig } from '@/lib/prompts'

export const maxDuration = 120

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']

function isImage(mimeType: string, fileName: string) {
  return IMAGE_TYPES.includes(mimeType) || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileName)
}

async function extractTextFromImage(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const base64 = buffer.toString('base64')
  const safeType = IMAGE_TYPES.includes(mimeType) ? mimeType : 'image/jpeg'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extraia e transcreva TODO o texto visível nesta imagem de documento jurídico. Preserve a formatação e estrutura. Se for uma petição, intimação ou documento processual, transcreva integralmente.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${safeType};base64,${base64}`, detail: 'high' },
          },
        ],
      },
    ],
    max_tokens: 4000,
  })

  return `=== IMAGEM: ${fileName} ===\n${response.choices[0]?.message?.content ?? ''}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Erro ao ler os arquivos. O total pode ter ultrapassado o limite de tamanho.' }, { status: 413 })
  }

  const objeto = formData.get('objeto') as string
  const estado = formData.get('estado') as string | null
  const comentario = formData.get('comentario') as string | null
  const titulo = formData.get('titulo') as string | null
  const files = formData.getAll('files') as File[]

  if (!objeto) return NextResponse.json({ error: 'Objeto é obrigatório' }, { status: 400 })
  if (!files || files.length === 0) return NextResponse.json({ error: 'Envie ao menos 1 arquivo' }, { status: 400 })

  // 1. Cria o caso no banco
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .insert({
      user_id: user.id,
      titulo: titulo || null,
      objeto,
      estado: estado || null,
      comentario: comentario || null,
      status: 'analyzing',
    })
    .select()
    .single()

  if (caseError || !caseData) {
    return NextResponse.json({ error: 'Erro ao criar caso' }, { status: 500 })
  }

  const caseId = caseData.id

  try {
    // 2. Processa cada arquivo
    const texts: string[] = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload para Storage
      const storagePath = `${user.id}/${caseId}/${file.name}`
      await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, { contentType: file.type, upsert: true })

      await supabase.from('documents').insert({
        case_id: caseId,
        name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
      })

      // Extração de texto — imagens usam Vision, demais usam extração local
      let text: string
      if (isImage(file.type, file.name)) {
        text = await extractTextFromImage(buffer, file.type, file.name)
      } else {
        text = await extractTextFromFile(buffer, file.type, file.name)
      }
      texts.push(text)
    }

    // 3. Seleciona prompt e chama OpenAI com streaming
    const promptConfig = getPromptConfig(objeto)
    const documentText = concatenateTexts(texts)
    const prompt = promptConfig.buildPrompt(documentText, comentario || undefined)

    let analysisContent = ''

    const stream = await openai.chat.completions.create({
      model: promptConfig.model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.3,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ caseId })}\n\n`))

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            analysisContent += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }

        await supabase.from('analyses').insert({
          case_id: caseId,
          content: analysisContent,
          modelo_usado: promptConfig.label,
          model_ai: promptConfig.model,
        })

        await supabase.from('cases').update({ status: 'done' }).eq('id', caseId)

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, caseId })}\n\n`))
        controller.close()
      },
      async cancel() {
        await supabase.from('cases').update({ status: 'error' }).eq('id', caseId)
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[analyze]', err)
    await supabase.from('cases').update({ status: 'error' }).eq('id', caseId)
    return NextResponse.json({ error: (err as Error).message ?? 'Erro ao processar análise' }, { status: 500 })
  }
}
