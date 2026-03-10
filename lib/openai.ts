import OpenAI from 'openai'

// Lazy initialization — evita erro em build time quando API key não está definida
let _client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return _client
}

// Proxy para manter a API de uso simples nas rotas
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return Reflect.get(getOpenAI(), prop)
  },
})

export const MODELS = {
  primary: 'gpt-4o',        // substituição ao gpt-5.2 quando disponível
  secondary: 'gpt-4o-mini', // substituição ao gpt-4.1-mini
} as const
