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
  buildPrompt: (autosText: string, clientText: string | null, comentario?: string, estado?: string) => string
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
  buildPrompt: (autosText: string, clientText: string | null, comentario?: string, estado?: string) => `
Atue como Advogado Sênior Cível do escritório SAVA (Sebadelhe Aranha & Vasconcelos), defendendo a ENERGISA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ REGRAS ABSOLUTAS — LEIA ANTES DE COMEÇAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• USE APENAS fatos concretos extraídos dos documentos abaixo: nomes, datas, valores, números de processo/UC, artigos citados
• PROIBIDO linguagem genérica: "conforme documentos", "segundo o informado", "como mencionado", "de acordo com os fatos"
• CITE ARTIGOS ESPECÍFICOS (número + inciso + lei) em CADA argumento jurídico
• Se há relatório ou instruções do cliente nos DOCUMENTOS DO CLIENTE, incorpore suas informações na análise e na minuta
• A MINUTA DE CONTESTAÇÃO deve ser redigida de forma completa, pronta para uso pelo advogado — não use colchetes em branco
• Se uma informação não constar dos documentos, escreva explicitamente "não informado nos autos" — nunca suponha

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CÓPIA DOS AUTOS — PETIÇÃO INICIAL E DOCUMENTOS PROCESSUAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${autosText}

${clientText ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTOS DO CLIENTE — RELATÓRIO / MODELOS / INFORMAÇÕES INTERNAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${clientText}

` : ''}${comentario ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUÇÕES DO ADVOGADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${comentario}

` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FICHA DE ANÁLISE — ENERGISA${estado ? ` / ${estado.toUpperCase()}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 DADOS DO CASO
• Autor/Reclamante: [nome completo + qualificação]
• Pedido Principal: [o que o autor quer — extraído literalmente da petição]
• Valor Pleiteado: [R$ — conforme petição inicial]
• Resumo dos Fatos: [síntese objetiva em 3-4 linhas com fatos específicos dos documentos]

🔍 ANÁLISE JURÍDICA
• Enquadramento Legal: [área do direito + base legal com artigos específicos]
• Pontos Favoráveis à ENERGISA: [argumentos concretos com base nos documentos]
• Pontos Desfavoráveis: [vulnerabilidades honestas — não omita]
• Documentos Necessários: [lista objetiva do que precisa ser reunido]

⚖️ ESTRATÉGIA DE DEFESA
• Tese Principal: [argumento central com fundamento legal específico]
• Fundamentos Legais: [artigos, resoluções, súmulas aplicáveis — cite números e incisos]
• Proposta de Acordo: [Pertinente / Não pertinente + justificativa específica]

⚠️ PONTOS DE ATENÇÃO
• Risco de Procedência: [Alto / Médio / Baixo + justificativa baseada nos fatos]
• Recomendações Imediatas: [ações urgentes e concretas]

💬 RESPOSTA ÀS INSTRUÇÕES DO ADVOGADO
${comentario ? '• [Responda diretamente cada ponto das instruções acima com base nos documentos]' : '• Nenhuma instrução adicional formulada.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 MINUTA DE CONTESTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA [VARA E COMARCA — extrair dos autos]

[RAZÃO SOCIAL DA ENERGISA CONFORME ESTADO], pessoa jurídica de direito privado, concessionária de serviço público de distribuição de energia elétrica, inscrita no CNPJ sob o nº [CNPJ], por seus advogados, vem, respeitosamente, à presença de Vossa Excelência, nos autos do processo nº [NÚMERO — extrair dos autos], em que figura como Autora [NOME DO AUTOR — extrair dos autos], apresentar

CONTESTAÇÃO

com fulcro nos arts. 335 e seguintes do Código de Processo Civil, pelos fatos e fundamentos jurídicos a seguir expostos:

I — DOS FATOS
[Narrar os fatos do caso usando as informações ESPECÍFICAS extraídas dos documentos. Mencionar datas, valores, UC, eventos concretos. Não use linguagem genérica.]

II — DO DIREITO

2.1. [PRIMEIRA TESE — título descritivo]
[Argumento jurídico com citação específica de artigos e legislação aplicável ao caso concreto]

2.2. [SEGUNDA TESE — título descritivo, se houver]
[Argumento jurídico subsidiário]

2.3. Da Ausência de Dano Indenizável
[Se aplicável — argumento específico sobre ausência de dano moral ou material indenizável]

III — DOS PEDIDOS

Ante o exposto, requer-se:
a) A improcedência total dos pedidos formulados na inicial;
b) A condenação da parte Autora ao pagamento de custas processuais e honorários advocatícios, na forma do art. 85 do CPC;
c) A produção de todos os meios de prova em direito admitidos.

Termos em que, pede e espera deferimento.

[Cidade/UF], [data].

[ADVOGADO RESPONSÁVEL — SAVA]

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
