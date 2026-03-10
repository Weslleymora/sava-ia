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
      if (!text) throw new Error('PDF sem texto extraível')
      return text
    } catch (err) {
      console.error('Erro ao extrair texto do PDF:', err)
      throw new Error(`Não foi possível extrair texto de "${fileName}". O PDF pode estar protegido ou ser baseado em imagem (escaneado).`)
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

export function concatenateTexts(texts: string[]): string {
  return texts
    .map((t, i) => (texts.length > 1 ? `=== DOCUMENTO ${i + 1} ===\n\n${t}` : t))
    .join('\n\n')
}
