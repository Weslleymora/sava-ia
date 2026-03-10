// Extração de texto de PDFs usando pdf-parse
// Fallback para text/plain e outros formatos

export async function extractTextFromFile(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8')
  }

  if (
    mimeType === 'application/pdf' ||
    fileName.toLowerCase().endsWith('.pdf')
  ) {
    try {
      // Importação dinâmica para evitar problemas com SSR
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const data = await pdfParse(buffer)
      return data.text || ''
    } catch (err) {
      console.error('Erro ao extrair texto do PDF:', err)
      throw new Error(`Não foi possível extrair texto de "${fileName}". Verifique se o PDF não está protegido por senha.`)
    }
  }

  // DOC/DOCX: retorna aviso (requer biblioteca adicional se necessário)
  throw new Error(`Formato "${mimeType}" não suportado para extração de texto. Use PDF ou TXT.`)
}

export function concatenateTexts(texts: string[]): string {
  return texts
    .map((t, i) => (texts.length > 1 ? `=== DOCUMENTO ${i + 1} ===\n\n${t}` : t))
    .join('\n\n')
}
