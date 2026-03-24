import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'
import { extractTextFromFile, concatenateTextsBySection, renderPdfToImages } from '@/lib/pdf'
import { getPromptConfig } from '@/lib/prompts'
import { loadKnowledgeBase } from '@/lib/knowledge-base'

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

async function gerarResumo(
  analysisContent: string,
  objeto: string,
  titulo: string | null
): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Crie um RESUMO EXECUTIVO objetivo do caso jurídico abaixo (máx. 400 palavras).

Estruture assim:
**Objeto:** [tipo de ação]
**Contexto:** [1-2 frases sobre o caso específico]
**Teses principais:** [lista com 2-4 argumentos jurídicos centrais]
**Riscos e pontos críticos:** [lista com 2-3 pontos de atenção]
**Recomendação estratégica:** [1-2 frases diretas]

Use linguagem jurídica precisa. Cite artigos e normas relevantes (REN 1.000, PRODIST, CDC, CC).
Este resumo será o contexto da IA para continuar a conversa sobre o caso.

PROCESSO: ${titulo || objeto}
ANÁLISE COMPLETA:
${analysisContent}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 600,
  })

  return res.choices[0]?.message?.content ?? ''
}

interface FileInfo {
  name: string
  size: number
  type: string
  storagePath: string
  category: 'autos' | 'cliente'
}

async function processFile(
  db: ReturnType<typeof createAdminClient>,
  fileInfo: FileInfo,
  caseId: string
): Promise<string> {
  const { data: fileBlob, error: downloadError } = await db.storage
    .from('documents')
    .download(fileInfo.storagePath)

  if (downloadError || !fileBlob) {
    throw new Error(`Erro ao ler "${fileInfo.name}": ${downloadError?.message ?? 'arquivo não encontrado'}`)
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer())

  await db.from('documents').insert({
    case_id: caseId,
    name: fileInfo.name,
    storage_path: fileInfo.storagePath,
    size_bytes: fileInfo.size,
  })

  if (isImage(fileInfo.type, fileInfo.name)) {
    return extractTextFromImage(buffer, fileInfo.type, fileInfo.name)
  }

  try {
    return await extractTextFromFile(buffer, fileInfo.type, fileInfo.name)
  } catch (err) {
    const msg = (err as Error).message ?? ''
    if (msg.startsWith('SCANNED_PDF:')) {
      console.log(`[analyze] PDF escaneado detectado: "${fileInfo.name}" — iniciando OCR`)
      const pages = await renderPdfToImages(buffer)
      const pageTexts = await Promise.all(
        pages.map((img, i) =>
          extractTextFromImage(img, 'image/png', `${fileInfo.name} — p.${i + 1}`)
        )
      )
      return pageTexts.join('\n\n')
    }
    throw err
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const body = await req.json() as {
    caseId: string
    autosFiles: FileInfo[]
    clientFiles: FileInfo[]
    objeto: string
    estado: string | null
    comentario: string | null
    titulo: string | null
  }

  const { caseId, autosFiles, clientFiles, objeto, estado, comentario, titulo } = body

  if (!caseId) return NextResponse.json({ error: 'caseId é obrigatório' }, { status: 400 })
  if (!objeto) return NextResponse.json({ error: 'Objeto é obrigatório' }, { status: 400 })
  if (!autosFiles || autosFiles.length === 0) return NextResponse.json({ error: 'Envie ao menos 1 arquivo na Cópia dos Autos' }, { status: 400 })

  const allFiles = [...autosFiles, ...(clientFiles ?? [])]

  // Verifica que cada arquivo pertence ao usuário autenticado
  for (const f of allFiles) {
    if (!f.storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Acesso negado ao arquivo.' }, { status: 403 })
    }
  }

  // 1. Cria o caso com o ID gerado pelo cliente
  const { data: caseData, error: caseError } = await db
    .from('cases')
    .insert({
      id: caseId,
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
    console.error('[analyze] caseError:', caseError)
    return NextResponse.json({ error: `Erro ao criar caso: ${caseError?.message ?? 'desconhecido'}` }, { status: 500 })
  }

  try {
    // 2. Baixa e processa arquivos em paralelo (autos e cliente separados)
    const [autosResults, clientResults] = await Promise.all([
      Promise.all(autosFiles.map(f => processFile(db, f, caseId))),
      Promise.all((clientFiles ?? []).map(f => processFile(db, f, caseId))),
    ])

    const autosNames = autosFiles.map(f => f.name)
    const clientNames = (clientFiles ?? []).map(f => f.name)

    // 3. Concatena textos por seção (autos separados de documentos do cliente)
    const { autosText, clientText } = concatenateTextsBySection(
      autosResults, autosNames,
      clientResults, clientNames
    )

    // 4. Carrega base de conhecimento interna (modelos + exemplos reais do escritório)
    const kbText = await loadKnowledgeBase(objeto, estado)

    // 5. Gera análise principal via streaming
    const promptConfig = getPromptConfig(objeto)
    const prompt = promptConfig.buildPrompt(autosText, clientText, comentario || undefined, estado || undefined)

    let analysisContent = ''

    // Injeta a base de conhecimento como mensagem de sistema (separada do prompt do caso)
    type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string }
    const messages: ChatMsg[] = []

    if (kbText) {
      messages.push({
        role: 'system',
        content: `Você é um advogado sênior do escritório SAVA (Sebadelhe Aranha & Vasconcelos).

Abaixo está a BASE DE CONHECIMENTO INTERNA DO ESCRITÓRIO, contendo um modelo padrão e exemplos reais de contestações já elaboradas em casos similares ao que será analisado.

USE ESTA BASE como referência principal para:
• Linguagem e estilo da minuta (siga o padrão do escritório)
• Estrutura da contestação (use a mesma organização dos modelos)
• Teses e argumentos jurídicos que o escritório já utilizou com sucesso
• Nível de detalhe e especificidade esperado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASE DE CONHECIMENTO — MODELOS E CASOS REAIS DO ESCRITÓRIO SAVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${kbText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANTE: Adapte os modelos acima ao caso concreto. Não copie dados de outros casos — use apenas o estilo, a estrutura e as teses. Os fatos devem vir dos documentos do caso atual.`,
      })
    }

    messages.push({ role: 'user', content: prompt })

    const stream = await openai.chat.completions.create({
      model: promptConfig.model,
      messages,
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

        // 5. Salva análise completa
        await db.from('analyses').insert({
          case_id: caseId,
          content: analysisContent,
          modelo_usado: promptConfig.label,
          model_ai: promptConfig.model,
        })

        await db.from('cases').update({ status: 'done' }).eq('id', caseId)

        // 6. Gera resumo executivo em background
        gerarResumo(analysisContent, objeto, titulo)
          .then(resumo => {
            if (resumo) {
              db.from('analyses').update({ resumo }).eq('case_id', caseId)
            }
          })
          .catch(e => console.error('[analyze] resumo generation failed:', e))

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, caseId })}\n\n`))
        controller.close()
      },
      async cancel() {
        await db.from('cases').update({ status: 'error' }).eq('id', caseId)
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
    await db.from('cases').update({ status: 'error' }).eq('id', caseId)
    return NextResponse.json({ error: (err as Error).message ?? 'Erro ao processar análise' }, { status: 500 })
  }
}
