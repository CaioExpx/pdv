-- ============================================
-- PDV Bambolê Kids - Schema Completo
-- Execute no SQL Editor do Supabase
-- ============================================

-- Categorias de produtos
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  contato TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  preco_custo DECIMAL(10,2),
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  codigo_barras TEXT,
  unidade TEXT DEFAULT 'UN',
  tamanho TEXT,
  cor TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  endereco TEXT,
  observacao TEXT,
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
  forma_pagamento TEXT NOT NULL,
  valor_recebido DECIMAL(10,2),
  troco DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos por venda (suporte a pagamento duplo)
CREATE TABLE IF NOT EXISTS pagamentos_venda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  valor_recebido DECIMAL(10,2),
  troco DECIMAL(10,2) DEFAULT 0
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

-- Fiado (crédito a receber por cliente)
CREATE TABLE IF NOT EXISTS fiado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  valor_original DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  valor_restante DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago_parcial', 'quitado')),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamentos de Fiado
CREATE TABLE IF NOT EXISTS pagamentos_fiado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fiado_id UUID NOT NULL REFERENCES fiado(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor ON produtos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_produtos_barcode ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_fiado_cliente ON fiado(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fiado_status ON fiado(status);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_fiado ENABLE ROW LEVEL SECURITY;

-- Políticas: acesso apenas para usuários autenticados
CREATE POLICY "Auth categorias" ON categorias FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth fornecedores" ON fornecedores FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth produtos" ON produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth clientes" ON clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth caixas" ON caixas FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth vendas" ON vendas FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth pagamentos_venda" ON pagamentos_venda FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth itens_venda" ON itens_venda FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth fiado" ON fiado FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth pagamentos_fiado" ON pagamentos_fiado FOR ALL TO authenticated USING (true);

-- ============================================
-- Dados iniciais (seed)
-- ============================================
INSERT INTO categorias (nome, cor) VALUES
  ('Bebês (0-2)', '#f9a8d4'),
  ('Infantil (3-8)', '#86efac'),
  ('Juvenil (9-14)', '#93c5fd'),
  ('Calçados', '#fcd34d'),
  ('Acessórios', '#c4b5fd'),
  ('Outros', '#d1d5db')
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

-- ============================================
-- Função: resumo fiado por cliente
-- ============================================
CREATE OR REPLACE FUNCTION resumo_fiado_cliente(p_cliente_id UUID)
RETURNS TABLE(total_aberto DECIMAL, total_pago DECIMAL, qtd_abertos INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(valor_restante), 0)::DECIMAL,
    COALESCE(SUM(valor_pago), 0)::DECIMAL,
    COUNT(*)::INTEGER
  FROM fiado
  WHERE cliente_id = p_cliente_id AND status IN ('aberto', 'pago_parcial');
END;
$$;
