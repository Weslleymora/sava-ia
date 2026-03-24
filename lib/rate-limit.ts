/**
 * Rate limiter simples em memória.
 * Adequado para deployment single-instance (PM2 single process).
 */

interface RateEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateEntry>()

// Limpa entradas expiradas periodicamente (evita vazamento de memória)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000) // a cada 5 minutos

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Verifica se a chave está dentro do limite.
 * @param key       Identificador único (ex: "analyze:user-id")
 * @param max       Número máximo de requisições na janela
 * @param windowMs  Tamanho da janela em milissegundos
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt }
}
