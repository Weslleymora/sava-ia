/**
 * knowledge-base.ts
 *
 * Carrega modelos de contestação reais do escritório SAVA a partir da pasta
 * "Base informacoes" e os injeta como contexto nas análises da IA.
 *
 * Prioridade:
 *   1. Modelo raiz do tipo de ação (template padrão)
 *   2. Exemplo(s) real(is) do estado específico do caso
 */

import path from 'path'
import fs from 'fs'

// Caminho absoluto para a pasta "Base informacoes" dentro do projeto
const BASE_PATH = path.join(process.cwd(), 'Base informacoes')

// ---------------------------------------------------------------------------
// Mapeamento: objeto da ação → arquivo de modelo raiz
// ---------------------------------------------------------------------------
const TEMPLATE_MAP: Partial<Record<string, string>> = {
  'Suspensão de Fornecimento':   'SUSPENSÃO DE FORNECIMENTO.docx',
  'Suspensão no Fornecimento':   'SUSPENSÃO DE FORNECIMENTO.docx',
  'Interrupção no Fornecimento': 'SUSPENSÃO DE FORNECIMENTO.docx',
  'Danos Elétricos':             'DANOS ELÉTRICOS.docx',
  'Reclamação de Consumo':       'RECUPERAÇÃO DE CONSUMO.docx',
  'Cobrança por Irregularidade': 'RECUPERAÇÃO DE CONSUMO.docx',
  'Recuperação de Consumo':      'RECUPERAÇÃO DE CONSUMO.docx',
  'Inscrição no Serasa':         'SERASA.docx',
  'Protesto':                    'PROTESTO.docx',
  'Transferência de Titularidade': 'SERASA.docx',
  'Parcelamento do Débito':      'SERASA.docx',
  'Falha no Pagamento':          'SERASA.docx',
  'Regresso':                    'REGRESSO.docx',
  'Rede de Distribuição':        'REDE DE DISTRIBUIÇÃO.docx',
  'Ligação Nova':                'LIGAÇÃO NOVA.docx',
  'Religação':                   'LIGAÇÃO NOVA.docx',
  'Acúmulo de Consumo':          'ACÚMULO DE CONSUMO.docx',
  'Leitura Estimada':            'ACÚMULO DE CONSUMO.docx',
  'Erro de Leitura':             'ACÚMULO DE CONSUMO.docx',
  'Ilegitimidade Ativa':         'Texto - ilegitimidade ativa.docx',
}

// ---------------------------------------------------------------------------
// Mapeamento: estado → pasta de exemplos reais
// ---------------------------------------------------------------------------
const ESTADO_FOLDER: Partial<Record<string, string>> = {
  'Paraíba':            'PARAIBA',
  'Mato Grosso do Sul': 'MATO GROSSO DO SUL',
  'Sergipe':            'SERGIPE',
  'Tocantins':          'TOCANTINS',
  'São Paulo':          'SUL SUDESTE',
  'Minas Gerais':       'SUL SUDESTE',
  'Rio de Janeiro':     'SUL SUDESTE',
  'Espírito Santo':     'SUL SUDESTE',
  'Goiás':              'SUL SUDESTE',
  'Maranhão':           'SUL SUDESTE',
}

// ---------------------------------------------------------------------------
// Palavras-chave para encontrar subpasta ou arquivo correspondente ao objeto
// ---------------------------------------------------------------------------
const OBJETO_KEYWORDS: Partial<Record<string, string[]>> = {
  'Suspensão de Fornecimento':   ['suspens'],
  'Suspensão no Fornecimento':   ['suspens'],
  'Interrupção no Fornecimento': ['interrup'],
  'Danos Elétricos':             ['dano el', 'eletric', 'elétric'],
  'Reclamação de Consumo':       ['reclamaç', 'reclamac'],
  'Recuperação de Consumo':      ['recupera'],
  'Cobrança por Irregularidade': ['recupera', 'irregularid'],
  'Inscrição no Serasa':         ['serasa', 'negativ'],
  'Protesto':                    ['protest', 'negativ'],
  'Transferência de Titularidade': ['transfer', 'titular'],
  'Falha no Pagamento':          ['falha', 'fraude', 'pix'],
  'Regresso':                    ['regressiv', 'regressão'],
  'Rede de Distribuição':        ['rede de distrib', 'deslocamento'],
  'Ligação Nova':                ['ligaç', 'ligac', 'nova'],
  'Religação':                   ['religas', 'recorte'],
  'Geração Distribuída':         ['geras', 'distribuíd', 'distribuid'],
  'Receita Extraconcessão':      ['extraconces'],
  'Acúmulo de Consumo':          ['acumulo', 'acúmulo', 'leitura'],
  'Leitura Estimada':            ['acumulo', 'acúmulo', 'leitura'],
  'Erro de Leitura':             ['acumulo', 'leitura'],
  'Ilegitimidade Ativa':         ['ilegitim'],
  'Parcelamento do Débito':      ['parcelamento', 'tcd', 'falha'],
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Verifica se alguma keyword aparece na string normalizada */
function matchesKeywords(text: string, keywords: string[]): boolean {
  const norm = normalizeStr(text)
  return keywords.some(kw => norm.includes(normalizeStr(kw)))
}

/** Extrai texto de um arquivo .doc/.docx usando mammoth */
async function extractDocx(filePath: string, maxChars: number): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) return null
    const buffer = fs.readFileSync(filePath)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as {
      extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>
    }
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()
    if (!text || text.length < 50) return null
    return text.length > maxChars
      ? text.slice(0, maxChars) + '\n[... truncado ...]'
      : text
  } catch {
    return null
  }
}

/**
 * Dado um diretório, retorna os primeiros N arquivos .doc/.docx que
 * batem com as keywords do objeto (ou qualquer arquivo se não houver filtro).
 */
function findMatchingFiles(dir: string, keywords: string[], maxFiles: number): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile() && /\.(doc|docx)$/i.test(e.name) && !e.name.startsWith('~$'))
      .map(e => e.name)

    // Filtra por keywords se fornecidas
    const matched = keywords.length > 0
      ? files.filter(f => matchesKeywords(f, keywords))
      : files

    return matched.slice(0, maxFiles).map(f => path.join(dir, f))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Carrega os documentos de referência da "Base informacoes" relevantes para o caso.
 *
 * Retorna um bloco de texto pronto para ser injetado como contexto na IA,
 * ou null se nenhum documento relevante for encontrado.
 */
export async function loadKnowledgeBase(
  objeto: string,
  estado?: string | null
): Promise<string | null> {
  const parts: string[] = []
  const keywords = OBJETO_KEYWORDS[objeto] ?? []

  // ── 1. Modelo raiz do tipo de ação ────────────────────────────────────────
  const templateFile = TEMPLATE_MAP[objeto]
  if (templateFile) {
    const templatePath = path.join(BASE_PATH, templateFile)
    // PROTESTO.docx é grande — limitar mais
    const limit = templateFile === 'PROTESTO.docx' ? 8000 : 15000
    const text = await extractDocx(templatePath, limit)
    if (text) {
      parts.push(
        `=== MODELO PADRÃO DO ESCRITÓRIO — ${objeto.toUpperCase()} ===\n${text}`
      )
    }
  }

  // ── 2. Exemplos reais do estado ───────────────────────────────────────────
  if (estado) {
    const estadoFolderName = ESTADO_FOLDER[estado]
    if (estadoFolderName) {
      const estadoPath = path.join(BASE_PATH, estadoFolderName)

      if (fs.existsSync(estadoPath)) {
        // Verifica se há subpastas (ex: PARAIBA e SERGIPE)
        const entries = fs.readdirSync(estadoPath, { withFileTypes: true })
        const subfolders = entries.filter(e => e.isDirectory())

        if (subfolders.length > 0) {
          // Estado com subpastas por tipo — encontra a subpasta certa
          const matchingSubfolder = subfolders.find(sf =>
            matchesKeywords(sf.name, keywords.length > 0 ? keywords : [objeto])
          )

          if (matchingSubfolder) {
            const subPath = path.join(estadoPath, matchingSubfolder.name)
            const filePaths = findMatchingFiles(subPath, [], 2) // pega até 2 exemplos
            for (const fp of filePaths) {
              const text = await extractDocx(fp, 8000)
              if (text) {
                parts.push(
                  `=== EXEMPLO REAL — ${estado.toUpperCase()} / ${matchingSubfolder.name} (${path.basename(fp)}) ===\n${text}`
                )
              }
            }
          }
        } else {
          // Estado com arquivos diretos (EMS, ETO, ESS) — filtra por keyword no nome do arquivo
          const filePaths = findMatchingFiles(estadoPath, keywords, 2)
          for (const fp of filePaths) {
            const text = await extractDocx(fp, 8000)
            if (text) {
              parts.push(
                `=== EXEMPLO REAL — ${estado.toUpperCase()} (${path.basename(fp)}) ===\n${text}`
              )
            }
          }
        }
      }
    }
  }

  if (parts.length === 0) return null

  // Limite total ~40k chars para não explodir o contexto
  const combined = parts.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n')
  return combined.length > 40000
    ? combined.slice(0, 40000) + '\n[... base de conhecimento truncada ...]'
    : combined
}
