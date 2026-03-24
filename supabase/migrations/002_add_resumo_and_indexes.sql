-- Migration 002 — campo resumo + índices de performance
-- Execute no Supabase SQL Editor

-- Campo resumo na tabela analyses (para o chat usar como contexto econômico)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS resumo TEXT;

-- Índices para melhorar performance das queries de listagem e detalhe
CREATE INDEX IF NOT EXISTS idx_documents_case_id  ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_analyses_case_id   ON analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_case_id   ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_user_created ON cases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_created      ON cases(created_at DESC);
