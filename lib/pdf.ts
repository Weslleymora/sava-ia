// Extração de texto de múltiplos formatos de arquivo

export async function extractTextFromFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const nameLower = fileName.toLowerCase()

  // ── TXT ──────────────────────────────────────────────────────────────────
  if (mimeType === 'text/plain' || nameLower.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimeType === 'application/pdf' || nameLower.endsWith('.pdf')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const data = await pdfParse(buffer)
      const text = (data.text || '').trim()
      if (!text) throw new Error('scanned')
      return text
    } catch {
      // PDF escaneado ou sem texto — sinaliza para OCR via Vision
      throw new Error(`SCANNED_PDF:${fileName}`)
    }
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    nameLower.endsWith('.docx')
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> }
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim()
    } catch (err) {
      console.error('Erro ao extrair texto do DOCX:', err)
      throw new Error(`Não foi possível extrair texto de "${fileName}".`)
    }
  }

  // ── DOC (legado) ──────────────────────────────────────────────────────────
  if (
    mimeType === 'application/msword' ||
    nameLower.endsWith('.doc')
  ) {
    try {
      // mammoth lê .doc básico também
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> }
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim()
    } catch {
      throw new Error(`Arquivo .doc "${fileName}" não pôde ser processado. Converta para .docx ou .pdf e tente novamente.`)
    }
  }

  // ── IMAGENS (JPG, PNG, WEBP, GIF) — enviadas ao OpenAI Vision ────────────
  if (
    mimeType.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(nameLower)
  ) {
    return `[IMAGEM: ${fileName}]`
    // O buffer da imagem é tratado diretamente na route.ts com OpenAI Vision
  }

  // ── Formato não suportado ─────────────────────────────────────────────────
  throw new Error(
    `Formato "${fileName}" não suportado. Use: PDF, DOCX, DOC ou TXT.`
  )
}

// Limite por documento: ~120k chars ≈ 30k tokens (seguro para gpt-4o 128k context)
const MAX_CHARS_PER_DOC = 120_000
// Limite total (múltiplos documentos)
const MAX_CHARS_TOTAL = 200_000

function truncate(text: string, max: number, fileName?: string): string {
  if (text.length <= max) return text
  const label = fileName ? ` de "${fileName}"` : ''
  return (
    text.slice(0, max) +
    `\n\n[... texto${label} truncado — documento muito extenso. As primeiras ${max.toLocaleString('pt-BR')} caracteres foram analisadas.]`
  )
}

// Renderiza páginas de um PDF escaneado como imagens PNG (para OCR via Vision)
export async function renderPdfToImages(buffer: Buffer, maxPages = 15): Promise<Buffer[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createCanvas } = require('canvas') as {
    createCanvas: (w: number, h: number) => { getContext: (t: string) => unknown; toBuffer: (f: string) => Buffer }
  }

  // pdfjs-dist v3 — CommonJS, funciona em Node.js sem polyfills de browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as {
    getDocument: (opts: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<unknown> }> }
    GlobalWorkerOptions: { workerSrc: string }
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const pages: Buffer[] = []

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i) as {
      getViewport: (opts: { scale: number }) => { width: number; height: number }
      render: (opts: { canvasContext: unknown; viewport: unknown }) => { promise: Promise<void> }
    }
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    pages.push(canvas.toBuffer('image/png'))
  }

  return pages
}

export function concatenateTexts(texts: string[], fileNames?: string[]): string {
  const truncated = texts.map((t, i) =>
    truncate(t, MAX_CHARS_PER_DOC, fileNames?.[i])
  )

  const joined = truncated
    .map((t, i) => (truncated.length > 1 ? `=== DOCUMENTO ${i + 1} ===\n\n${t}` : t))
    .join('\n\n')

  return truncate(joined, MAX_CHARS_TOTAL)
}
