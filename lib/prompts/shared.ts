/**
 * shared.ts — helpers compartilhados entre todos os prompts jurídicos
 */

const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

/**
 * Monta os blocos de documentos injetados em todos os prompts:
 * - Cópia dos Autos (sempre presente)
 * - Documentos do Cliente (opcional)
 * - Instruções do Advogado (opcional)
 */
export function buildDocumentBlocks(
  autosText: string,
  clientText: string | null,
  comentario?: string
): string {
  let blocks = `${SEP}
CÓPIA DOS AUTOS — PETIÇÃO INICIAL E DOCUMENTOS PROCESSUAIS
${SEP}
${autosText}
`

  if (clientText) {
    blocks += `
${SEP}
DOCUMENTOS DO CLIENTE — RELATÓRIO / MODELOS / INFORMAÇÕES INTERNAS
${SEP}
${clientText}

`
  }

  if (comentario) {
    blocks += `${SEP}
INSTRUÇÕES DO ADVOGADO
${SEP}
${comentario}

`
  }

  return blocks
}
