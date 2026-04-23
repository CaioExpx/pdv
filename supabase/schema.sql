-- ============================================
-- PDV - Schema do Banco de Dados (Supabase)
-- Execute no SQL Editor do Supabase
-- ============================================

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  codigo_barras TEXT,
  unidade TEXT DEFAULT 'UN',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caixas (sessões de operação)
CREATE TABLE IF NOT EXISTS caixas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operador TEXT NOT NULL,
  saldo_inicial DECIMAL(10,2) DEFAULT 0,
  saldo_final DECIMAL(10,2),
  aberto_em TIMESTAMPTZ DEFAULT NOW(),
  fechado_em TIMESTAMPTZ,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado'))
);

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id UUID REFERENCES caixas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'credito', 'debito', 'pix', 'voucher')),
  valor_recebido DECIMAL(10,2),
  troco DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de Venda
CREATE TABLE IF NOT EXISTS itens_venda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- ============================================
-- Índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (ajuste conforme necessidade de autenticação)
CREATE POLICY "Acesso público categorias" ON categorias FOR ALL USING (true);
CREATE POLICY "Acesso público produtos" ON produtos FOR ALL USING (true);
CREATE POLICY "Acesso público clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "Acesso público caixas" ON caixas FOR ALL USING (true);
CREATE POLICY "Acesso público vendas" ON vendas FOR ALL USING (true);
CREATE POLICY "Acesso público itens_venda" ON itens_venda FOR ALL USING (true);

-- ============================================
-- Dados iniciais (seed)
-- ============================================
INSERT INTO categorias (nome, cor) VALUES
  ('Alimentos', '#10b981'),
  ('Bebidas', '#3b82f6'),
  ('Limpeza', '#f59e0b'),
  ('Higiene', '#8b5cf6'),
  ('Outros', '#6b7280')
ON CONFLICT DO NOTHING;

-- ============================================
-- Função: decrementar estoque ao vender
-- ============================================
CREATE OR REPLACE FUNCTION decrementar_estoque(p_produto_id UUID, p_quantidade INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE produtos
  SET estoque = GREATEST(0, estoque - p_quantidade)
  WHERE id = p_produto_id;
END;
$$;
