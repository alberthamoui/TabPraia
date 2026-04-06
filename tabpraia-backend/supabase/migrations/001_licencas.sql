-- ============================================================
-- TabPraia — Migração do banco de licenciamento
-- Executar no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS licencas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave         TEXT        UNIQUE NOT NULL,
  tipo          TEXT        NOT NULL CHECK (tipo IN ('permanente', 'mensal')),
  status        TEXT        NOT NULL DEFAULT 'ativa'
                            CHECK (status IN ('ativa', 'inativa', 'revogada')),
  hardware_id   TEXT,
  ativada_em    TIMESTAMPTZ,
  expira_em     TIMESTAMPTZ,          -- NULL para permanente, data futura para mensal
  cliente_nome  TEXT,
  cliente_email TEXT,
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licencas_chave ON licencas(chave);

-- RLS ativo; o backend usa a service role key (bypass automático de RLS).
-- Nenhuma policy de leitura pública é necessária.
ALTER TABLE licencas ENABLE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS validacoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id  UUID        REFERENCES licencas(id) ON DELETE CASCADE,
  hardware_id TEXT        NOT NULL,
  resultado   TEXT        NOT NULL
              CHECK (resultado IN ('ok', 'expirada', 'revogada', 'hardware_mismatch', 'chave_invalida')),
  ip          TEXT,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validacoes_licenca_id ON validacoes(licenca_id);
CREATE INDEX IF NOT EXISTS idx_validacoes_criada_em  ON validacoes(criada_em DESC);

ALTER TABLE validacoes ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Inserir uma licença de teste manualmente (ajuste o e-mail)
-- ============================================================
-- INSERT INTO licencas (chave, tipo, status, cliente_nome, cliente_email)
-- VALUES ('ABCD-1234-EF56-7890', 'permanente', 'ativa', 'Teste', 'teste@exemplo.com');
