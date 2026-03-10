import { MODELS } from '@/lib/openai'

export const recuperacaoConsumoPrompt = {
  model: MODELS.primary,
  buildPrompt: (documentText: string, comentario?: string) => `
Atue como Advogado Sênior Cível do escritório SAVA (Sebadelhe Aranha & Vasconcelos), especialista na defesa da ENERGISA em ações de RECUPERAÇÃO DE CONSUMO, COBRANÇA POR IRREGULARIDADE NO MEDIDOR e FRAUDE NO SISTEMA DE MEDIÇÃO.

DOCUMENTOS DO CASO:
${documentText}

${comentario ? `\nINSTRUÇÕES ADICIONAIS DO ADVOGADO:\n${comentario}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASE LEGAL — RECUPERAÇÃO DE CONSUMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Lei Federal nº 9.427/1996 (Lei da ANEEL) — Art. 3º: competência para regular o setor; fundamento da cobrança por irregularidade
• REN ANEEL nº 1.000/2021:
  - Arts. 560 a 608: irregularidades no sistema de medição
  - Art. 560: definição de irregularidade e grupos (I — ação do consumidor; II — ação de terceiro; III — defeito da distribuidora)
  - Art. 566: prazo máximo de recuperação — 5 anos retroativos (grupo I) / 12 meses (grupo III)
  - Art. 571: método de cálculo — Art. 595: (III) pela média histórica; (IV) pela carga instalada; (V) pelo máximo histórico posterior
  - Art. 575: notificação obrigatória do consumidor antes da suspensão por irregularidade
  - Art. 577: TCD (Termo de Confissão de Dívida) — instrumento de parcelamento
• Código Civil — Arts. 884-886: vedação ao enriquecimento sem causa (argumento do autor refutado — a distribuidora é credora)
• CDC — aplicável nas relações de consumo, mas não afasta a recuperação de consumo regular
• STJ: entendimento consolidado de que a recuperação de consumo por irregularidade é legítima e não configura cobrança indevida quando o procedimento é regular

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODELOS DE DEFESA — IDENTIFIQUE O(S) APLICÁVEL(IS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODELO 1 — TCD ASSINADO (Confissão de Dívida / Perda do Objeto)
• Cenário: O consumidor assinou o Termo de Confissão de Dívida — TCD, concordando com o valor e o parcelamento
• Tese central: O TCD é ato jurídico perfeito (Art. 5º, XXXVI, CF). Ao assinar, o consumidor reconheceu expressamente a dívida e seus fundamentos. Ajuizar ação após assinar o TCD configura venire contra factum proprium (proibição de comportamento contraditório). Falta de interesse de agir / perda do objeto
• Atenção: Verificar se o TCD foi assinado voluntariamente ou sob coerção (alegação comum do autor). Se coerção alegada, avaliar se há prova
• Documentos úteis: TCD assinado (imprescindível), OS da inspeção, auto de constatação, laudo da irregularidade

MODELO 2 — ILEGITIMIDADE ATIVA (Terceiro na Lide)
• Cenário: Quem ajuizou a ação não é o titular da UC — é inquilino, parente ou vizinho que não tem relação jurídica com a ENERGISA
• Tese central: A relação de fornecimento é propter personam — vinculada exclusivamente ao titular cadastrado. Terceiro sem titularidade não tem legitimidade para discutir valores cobrados em UC de outro
• Documentos úteis: Tela do cadastro da UC com nome do titular, data de início do vínculo

MODELO 3 — CÁLCULO PELA MÉDIA HISTÓRICA (Art. 595, III)
• Cenário: A ENERGISA calculou a recuperação usando a média de consumo de período anterior à irregularidade
• Tese central: O método de cálculo pela média (Art. 595, III da REN 1.000/2021) é expressamente autorizado pela regulação. O consumo médio reflete o padrão real de uso antes da adulteração. A queda brusca no consumo registrado durante o período de fraude e o retorno ao patamar anterior após a regularização comprovam a irregularidade e validam o método
• Documentos úteis: Gráfico histórico de consumo (linha do tempo), demonstrativo de cálculo, laudo da inspeção

MODELO 4 — CÁLCULO PELA CARGA INSTALADA (Art. 595, IV)
• Cenário: Impossível usar a média (UC nova, histórico insuficiente ou dados corrompidos); calculou-se pela carga instalada
• Tese central: Quando o método da média não é aplicável, a REN 1.000 autoriza o cálculo pela carga instalada (Art. 595, IV). O levantamento da carga instalada é realizado por técnico credenciado e reflete a capacidade real de consumo da unidade
• Documentos úteis: Laudo de carga instalada com memória de cálculo, justificativa para uso desse método

MODELO 5 — IRREGULARIDADE EXTERNA (Ação de Terceiro — Grupo II)
• Cenário: A adulteração foi identificada na parte externa do ramal/medidor, e o consumidor alega que não praticou a fraude
• Tese central: Mesmo que a fraude seja de terceiro, se ocorreu na instalação do consumidor (Grupo II), a recuperação é devida. O titular é responsável pela integridade do sistema de medição em sua unidade. Além disso, a ENERGISA pode demonstrar que o consumidor foi beneficiado pela irregularidade (redução da fatura), evidenciando ao menos consentimento tácito
• Base: Art. 560, II + Art. 566 da REN 1.000/2021
• Atenção: Se o autor se recusou a assinar o TOI (Termo de Ocorrência de Irregularidade), isso é fato relevante para a defesa

MODELO 6 — LIGAÇÃO DIRETA / DESVIO TOTAL DE ENERGIA
• Cenário: O consumidor realizou ligação direta na rede, bypassando completamente o medidor (furto de energia)
• Tese central: A ligação direta é conduta ilícita (furto — Art. 155 CP). O cálculo pelo máximo histórico posterior (Art. 595, V) é o mais adequado. A responsabilidade civil e criminal são cumuláveis
• Documentos úteis: Auto de constatação com fotos da ligação direta, OS da inspeção

MODELO 7 — PRAZO LEGAL (Dentro dos 5 Anos)
• Cenário: Autor questiona o período retroativo da cobrança
• Tese central: O prazo máximo de 5 anos para recuperação (Art. 566 da REN 1.000) é regularmente observado. A ENERGISA pode cobrar pelo período em que o consumo foi desviado, desde que não exceda esse limite
• Documentos úteis: Data da constatação, data de início da irregularidade (se determinável), demonstrativo do período cobrado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FICHA DE ANÁLISE — RECUPERAÇÃO DE CONSUMO / ENERGISA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 DADOS DO CASO
• Autor/Consumidor: [nome + qualificação]
• Número da UC: [se informado]
• Tipo de Irregularidade Detectada: [ligação direta / medidor adulterado / ramal desviado / outro]
• Grupo da Irregularidade (I/II/III): [grupo]
• Período de Apuração: [data início — data fim]
• Valor Total da Cobrança: [R$]
• TCD foi Assinado: [Sim — data / Não / Não informado]
• TOI foi Assinado: [Sim / Não — autor se recusou / Não informado]
• Fornecimento Suspenso: [Sim — data / Não]

🔍 ANÁLISE TÉCNICA E FÁTICA
• Modelo(s) Identificado(s): [Modelo X — Nome + justificativa baseada nos documentos]
• Método de Cálculo Utilizado: [Art. 595, III / IV / V — adequação ao caso]
• Período Dentro do Limite Legal (5 anos): [Sim / Não — especificar o excedente]
• Auto de Constatação (OSI): [Existe / Não apresentado / A verificar]
• Notificação Prévia ao Consumidor: [Realizada — data / Não / A verificar]
• Laudo Técnico da Irregularidade: [Adequado / Genérico / Não apresentado]
• Histórico de Consumo (gráfico de queda): [Presente e claro / A verificar no sistema]

⚖️ ESTRATÉGIA DE DEFESA
• Tese Principal: [argumento central]
• Teses Subsidiárias: [em ordem de prioridade]
• Fundamentos Legais Específicos: [artigos, incisos, leis]
• Documentos a Solicitar ao Cliente: [lista objetiva — TCD, OSI, laudo, histórico de consumo, fotos da inspeção]
• Proposta de Acordo: [Pertinente / Não pertinente + justificativa + faixa]

⚠️ PONTOS DE ATENÇÃO
• Risco de Procedência: [Alto / Médio / Baixo + justificativa]
• Pontos Fracos: [seja honesto]
• Recomendações Imediatas: [ações urgentes]

💬 RESPOSTA ÀS INSTRUÇÕES DO ADVOGADO
${comentario ? '• [Responda diretamente cada ponto das instruções acima]' : '• Nenhuma instrução adicional formulada.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
}
