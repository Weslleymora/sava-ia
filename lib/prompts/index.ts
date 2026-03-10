import { redeDistribuicaoPrompt } from './rede-distribuicao'
import { danosEletricosPrompt } from './danos-eletricos'
import { regressoPrompt } from './regresso'
import { recuperacaoConsumoPrompt } from './recuperacao-consumo'
import { suspensaoFornecimentoPrompt } from './suspensao-fornecimento'
import { ilegitimidadeAtivaPrompt } from './ilegitimidade-ativa'
import { ligacaoReligacaoPrompt } from './ligacao-religacao'
import { serasaProtestoPrompt } from './serasa-protesto'
import { geracaoDistribuidaPrompt } from './geracao-distribuida'
import { acumuloConsumoPrompt } from './acumulo-consumo'
import { MODELS } from '@/lib/openai'

export interface PromptConfig {
  model: string
  buildPrompt: (documentText: string, comentario?: string) => string
  label: string
}

// Mapa de objeto → prompt
const PROMPT_MAP: Record<string, PromptConfig> = {
  // Modelo 1 — Rede de Distribuição / Obras / Infraestrutura
  'Rede de Distribuição': { ...redeDistribuicaoPrompt, label: 'Rede de Distribuição' },

  // Modelo 2 — Danos Elétricos
  'Danos Elétricos': { ...danosEletricosPrompt, label: 'Danos Elétricos' },

  // Modelo 3 — Ação Regressiva
  'Regresso': { ...regressoPrompt, label: 'Regresso' },

  // Modelo 4 — Recuperação de Consumo / Irregularidade
  'Reclamação de Consumo': { ...recuperacaoConsumoPrompt, label: 'Recuperação de Consumo' },
  'Cobrança por Irregularidade': { ...recuperacaoConsumoPrompt, label: 'Cobrança por Irregularidade' },

  // Modelo 5 — Suspensão / Interrupção
  'Suspensão de Fornecimento': { ...suspensaoFornecimentoPrompt, label: 'Suspensão de Fornecimento' },
  'Suspensão no Fornecimento': { ...suspensaoFornecimentoPrompt, label: 'Suspensão no Fornecimento' },
  'Interrupção no Fornecimento': { ...suspensaoFornecimentoPrompt, label: 'Interrupção no Fornecimento' },

  // Modelo 6 — Ilegitimidade Ativa
  'Ilegitimidade Ativa': { ...ilegitimidadeAtivaPrompt, label: 'Ilegitimidade Ativa' },

  // Modelo 7 — Ligação Nova / Religação
  'Ligação Nova': { ...ligacaoReligacaoPrompt, label: 'Ligação Nova' },
  'Religação': { ...ligacaoReligacaoPrompt, label: 'Religação' },

  // Modelo 8 — Negativação / Protesto / Transferência
  'Inscrição no Serasa': { ...serasaProtestoPrompt, label: 'Inscrição no Serasa' },
  'Protesto': { ...serasaProtestoPrompt, label: 'Protesto' },
  'Transferência de Titularidade': { ...serasaProtestoPrompt, label: 'Transferência de Titularidade' },
  'Parcelamento do Débito': { ...serasaProtestoPrompt, label: 'Parcelamento do Débito' },
  'Falha no Pagamento': { ...serasaProtestoPrompt, label: 'Falha no Pagamento' },

  // Modelo 9 — Geração Distribuída / Receita Extraconcessão
  'Geração Distribuída': { ...geracaoDistribuidaPrompt, label: 'Geração Distribuída' },
  'Receita Extraconcessão': { ...geracaoDistribuidaPrompt, label: 'Receita Extraconcessão' },

  // Modelo 10 — Acúmulo de Consumo / Leitura Estimada
  'Acúmulo de Consumo': { ...acumuloConsumoPrompt, label: 'Acúmulo de Consumo' },
  'Leitura Estimada': { ...acumuloConsumoPrompt, label: 'Leitura Estimada' },
  'Erro de Leitura': { ...acumuloConsumoPrompt, label: 'Erro de Leitura' },
}

// Prompt genérico para objetos não mapeados
const defaultPromptConfig: PromptConfig = {
  model: MODELS.primary,
  label: 'Análise Geral',
  buildPrompt: (documentText: string, comentario?: string) => `
Atue como Advogado Sênior Cível do escritório SAVA (Sebadelhe Aranha & Vasconcelos), defendendo a ENERGISA.

Analise os documentos abaixo e prepare uma ficha de análise jurídica completa para subsidiar a defesa:

${documentText}

${comentario ? `\nINSTRUÇÕES ADICIONAIS DO ADVOGADO:\n${comentario}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FICHA DE ANÁLISE — ENERGISA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 DADOS DO CASO
• Autor/Reclamante: [nome + qualificação]
• Pedido Principal: [o que o autor quer]
• Valor Pleiteado: [R$]
• Resumo dos Fatos: [síntese em 3-4 linhas]

🔍 ANÁLISE JURÍDICA
• Enquadramento Legal: [qual área do direito / base legal aplicável]
• Pontos Favoráveis à ENERGISA: [argumentos de defesa]
• Pontos Desfavoráveis: [vulnerabilidades honestas]
• Documentos Necessários: [lista objetiva]

⚖️ ESTRATÉGIA DE DEFESA
• Tese Principal: [argumento central]
• Fundamentos Legais: [artigos, resoluções, súmulas aplicáveis]
• Proposta de Acordo: [Pertinente / Não pertinente + justificativa]

⚠️ PONTOS DE ATENÇÃO
• Risco de Procedência: [Alto / Médio / Baixo + justificativa]
• Recomendações Imediatas: [ações urgentes]

💬 RESPOSTA ÀS INSTRUÇÕES DO ADVOGADO
${comentario ? '• [Responda diretamente cada ponto das instruções acima]' : '• Nenhuma instrução adicional formulada.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
}

export function getPromptConfig(objeto: string): PromptConfig {
  return PROMPT_MAP[objeto] ?? defaultPromptConfig
}

// Lista de todos os objetos disponíveis no formulário
export const OBJETOS_ENERGISA = [
  'Suspensão de Fornecimento',
  'Transferência de Titularidade',
  'Inscrição no Serasa',
  'Protesto',
  'Regresso',
  'Danos Elétricos',
  'Cobrança por Irregularidade',
  'Reclamação de Consumo',
  'Rede de Distribuição',
  'Ligação Nova',
  'Religação',
  'Geração Distribuída',
  'Receita Extraconcessão',
  'Suspensão no Fornecimento',
  'Interrupção no Fornecimento',
  'Parcelamento do Débito',
  'Falha no Pagamento',
  'Acúmulo de Consumo',
  'Leitura Estimada',
  'Ilegitimidade Ativa',
  'Indenização',
  'Tributos',
  'Recuperação judicial',
  'Ação de cobrança',
  'Iluminação Pública',
  'Execução Fiscal',
] as const

export const ESTADOS_BRASIL = [
  'Paraíba',
  'Mato Grosso do Sul',
  'Sergipe',
  'São Paulo',
  'Tocantins',
  'Minas Gerais',
  'Rio de Janeiro',
  'Goiás',
  'Maranhão',
  'Espírito Santo',
] as const
