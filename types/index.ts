export type Categoria = {
  id: string
  nome: string
  cor: string
  created_at: string
}

export type Fornecedor = {
  id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  observacao: string | null
  created_at: string
}

export type Produto = {
  id: string
  nome: string
  preco: number
  preco_custo: number | null
  estoque: number
  estoque_minimo: number
  categoria_id: string | null
  categoria?: Categoria
  fornecedor_id: string | null
  fornecedor?: Fornecedor
  codigo_barras: string | null
  unidade: string
  tamanho: string | null
  cor: string | null
  ativo: boolean
  created_at: string
}

export type Cliente = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  cpf: string | null
  endereco: string | null
  observacao: string | null
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

export type FormaPagamento = 'dinheiro' | 'credito' | 'debito' | 'pix' | 'fiado'

export type PagamentoVenda = {
  id: string
  venda_id: string
  forma_pagamento: FormaPagamento
  valor: number
  valor_recebido: number | null
  troco: number
}

export type Venda = {
  id: string
  caixa_id: string | null
  cliente_id: string | null
  cliente?: Cliente
  subtotal: number
  desconto: number
  total: number
  forma_pagamento: string
  valor_recebido: number | null
  troco: number
  status: 'concluida' | 'cancelada'
  observacao: string | null
  created_at: string
  itens?: ItemVenda[]
  pagamentos?: PagamentoVenda[]
}

export type ItemVenda = {
  id: string
  venda_id: string
  produto_id: string | null
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

export type FiadoRecord = {
  id: string
  cliente_id: string
  cliente?: Cliente
  venda_id: string | null
  valor_original: number
  valor_pago: number
  valor_restante: number
  status: 'aberto' | 'pago_parcial' | 'quitado'
  observacao: string | null
  created_at: string
  pagamentos?: PagamentoFiado[]
}

export type PagamentoFiado = {
  id: string
  fiado_id: string
  valor: number
  forma_pagamento: string
  observacao: string | null
  created_at: string
}

export type EntradaPagamento = {
  metodo: FormaPagamento
  valor: string
  valorRecebido?: string
}
