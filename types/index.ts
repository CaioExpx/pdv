export type Categoria = {
  id: string
  nome: string
  cor: string
  created_at: string
}

export type Produto = {
  id: string
  nome: string
  preco: number
  estoque: number
  estoque_minimo: number
  categoria_id: string | null
  categoria?: Categoria
  codigo_barras: string | null
  unidade: string
  ativo: boolean
  created_at: string
}

export type Cliente = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  cpf: string | null
  created_at: string
}

export type Caixa = {
  id: string
  operador: string
  saldo_inicial: number
  saldo_final: number | null
  aberto_em: string
  fechado_em: string | null
  status: 'aberto' | 'fechado'
}

export type FormaPagamento = 'dinheiro' | 'credito' | 'debito' | 'pix' | 'voucher'

export type Venda = {
  id: string
  caixa_id: string | null
  cliente_id: string | null
  cliente?: Cliente
  subtotal: number
  desconto: number
  total: number
  forma_pagamento: FormaPagamento
  valor_recebido: number | null
  troco: number
  status: 'concluida' | 'cancelada'
  created_at: string
  itens?: ItemVenda[]
}

export type ItemVenda = {
  id: string
  venda_id: string
  produto_id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export type ItemCarrinho = {
  produto: Produto
  quantidade: number
  subtotal: number
}

export type ResumoVendas = {
  total_vendas: number
  ticket_medio: number
  quantidade_vendas: number
  vendas_por_pagamento: Record<FormaPagamento, number>
}
