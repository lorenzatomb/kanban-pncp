-- =============================================
-- SCHEMA DO BANCO DE DADOS — SUPABASE
-- Cole isso no SQL Editor do Supabase
-- =============================================

-- Tabela principal: oportunidades encontradas no PNCP
CREATE TABLE oportunidades (
  id BIGSERIAL PRIMARY KEY,
  pncp_id TEXT UNIQUE NOT NULL,
  objeto TEXT NOT NULL,
  orgao TEXT,
  uf TEXT,
  valor_estimado NUMERIC,
  modalidade TEXT,
  link_edital TEXT,
  data_publicacao TIMESTAMPTZ,
  data_encerramento TIMESTAMPTZ,
  data_encontrada TIMESTAMPTZ DEFAULT NOW(),
  coluna TEXT DEFAULT 'oportunidades-online',
  prioridade TEXT DEFAULT 'média',
  ai_modelo TEXT DEFAULT 'claude',
  keyword_match TEXT,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de mensagens do chat por oportunidade
CREATE TABLE mensagens (
  id BIGSERIAL PRIMARY KEY,
  oportunidade_id BIGINT REFERENCES oportunidades(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  texto TEXT NOT NULL,
  ai_modelo TEXT DEFAULT 'claude',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de log das buscas automáticas
CREATE TABLE buscas_log (
  id BIGSERIAL PRIMARY KEY,
  data_busca TIMESTAMPTZ DEFAULT NOW(),
  total_analisados INTEGER DEFAULT 0,
  total_encontrados INTEGER DEFAULT 0,
  total_novos INTEGER DEFAULT 0,
  estados_buscados INTEGER DEFAULT 27,
  keywords_usadas TEXT,
  status TEXT DEFAULT 'sucesso',
  erro TEXT
);

-- Tabela de configurações (palavras-chave, período, etc.)
CREATE TABLE configuracoes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  keywords TEXT DEFAULT 'videowall,painel led,audiovisual,videoconferência,videoconferencia,sala de controle,NOC,COP,centro de operações,centro de operacoes,integração av,integracao av,led indoor,display profissional,sonorização,automação audiovisual',
  dias_busca INTEGER DEFAULT 15,
  modalidade INTEGER DEFAULT 6,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Insere configuração padrão
INSERT INTO configuracoes (id) VALUES (1);

-- Índices para performance
CREATE INDEX idx_oportunidades_coluna ON oportunidades(coluna);
CREATE INDEX idx_oportunidades_uf ON oportunidades(uf);
CREATE INDEX idx_oportunidades_pncp ON oportunidades(pncp_id);
CREATE INDEX idx_oportunidades_ativo ON oportunidades(ativo);
CREATE INDEX idx_mensagens_oportunidade ON mensagens(oportunidade_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE buscas_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (simplificado — em produção, usar auth)
CREATE POLICY "Acesso público oportunidades" ON oportunidades FOR ALL USING (true);
CREATE POLICY "Acesso público mensagens" ON mensagens FOR ALL USING (true);
CREATE POLICY "Acesso público buscas_log" ON buscas_log FOR ALL USING (true);
CREATE POLICY "Acesso público configuracoes" ON configuracoes FOR ALL USING (true);
