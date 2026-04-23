'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingBag, X } from 'lucide-react'
import type { Produto, ItemCarrinho, FormaPagamento } from '@/types'

const PAGAMENTOS: { value: FormaPagamento; label: string; icon: React.ReactNode }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote className="w-5 h-5" /> },
  { value: 'credito', label: 'Crédito', icon: <CreditCard className="w-5 h-5" /> },
  { value: 'debito', label: 'Débito', icon: <CreditCard className="w-5 h-5" /> },
  { value: 'pix', label: 'PIX', icon: <Smartphone className="w-5 h-5" /> },
  { value: 'voucher', label: 'Voucher', icon: <ShoppingBag className="w-5 h-5" /> },
]

export default function PDVPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [desconto, setDesconto] = useState(0)
  const [pagamento, setPagamento] = useState<FormaPagamento>('dinheiro')
  const [valorRecebido, setValorRecebido] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const supabase = createClient()

  const loadProdutos = useCallback(async () => {
    const { data } = await supabase
      .from('produtos')
      .select('*, categoria:categorias(id, nome, cor)')
      .eq('ativo', true)
      .gt('estoque', 0)
      .order('nome')
    setProdutos(data || [])
  }, [supabase])

  useEffect(() => { loadProdutos() }, [loadProdutos])

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.codigo_barras || '').includes(busca)
  )

  function addCarrinho(produto: Produto) {
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produto.id === produto.id)
      if (existe) {
        return prev.map((i) =>
          i.produto.id === produto.id
            ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.produto.preco }
            : i
        )
      }
      return [...prev, { produto, quantidade: 1, subtotal: produto.preco }]
    })
  }

  function alterarQtd(id: string, delta: number) {
    setCarrinho((prev) =>
      prev
        .map((i) =>
          i.produto.id === id
            ? { ...i, quantidade: i.quantidade + delta, subtotal: (i.quantidade + delta) * i.produto.preco }
            : i
        )
        .filter((i) => i.quantidade > 0)
    )
  }

  function removerItem(id: string) {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== id))
  }

  const subtotal = carrinho.reduce((acc, i) => acc + i.subtotal, 0)
  const total = Math.max(0, subtotal - desconto)
  const troco = pagamento === 'dinheiro' && valorRecebido ? Math.max(0, Number(valorRecebido) - total) : 0
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  async function finalizar() {
    if (carrinho.length === 0) return
    setFinalizando(true)
    setMensagem(null)

    const { data: venda, error } = await supabase
      .from('vendas')
      .insert({
        subtotal,
        desconto,
        total,
        forma_pagamento: pagamento,
        valor_recebido: pagamento === 'dinheiro' ? Number(valorRecebido) || total : null,
        troco,
        status: 'concluida',
      })
      .select()
      .single()

    if (error || !venda) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar venda. Tente novamente.' })
      setFinalizando(false)
      return
    }

    const itens = carrinho.map((i) => ({
      venda_id: venda.id,
      produto_id: i.produto.id,
      produto_nome: i.produto.nome,
      quantidade: i.quantidade,
      preco_unitario: i.produto.preco,
      subtotal: i.subtotal,
    }))

    await supabase.from('itens_venda').insert(itens)

    // Atualizar estoque
    await Promise.all(
      carrinho.map((i) =>
        supabase.rpc('decrementar_estoque', {
          p_produto_id: i.produto.id,
          p_quantidade: i.quantidade,
        })
      )
    )

    setCarrinho([])
    setDesconto(0)
    setValorRecebido('')
    setPagamento('dinheiro')
    setMensagem({ tipo: 'sucesso', texto: `Venda #${venda.id.slice(0, 8).toUpperCase()} finalizada!` })
    loadProdutos()
    setFinalizando(false)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)] p-2 -m-6">
      {/* Painel de Produtos */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar produto ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
          {produtosFiltrados.map((p) => (
            <button
              key={p.id}
              onClick={() => addCarrinho(p)}
              className="bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg p-3 text-left transition-colors"
            >
              <p className="text-sm font-medium text-gray-800 line-clamp-2">{p.nome}</p>
              <p className="text-xs text-gray-400 mt-1">{p.estoque} em estoque</p>
              <p className="text-base font-bold text-indigo-600 mt-2">{fmt(p.preco)}</p>
            </button>
          ))}
          {produtosFiltrados.length === 0 && (
            <p className="col-span-4 text-center text-gray-400 text-sm py-12">Nenhum produto encontrado</p>
          )}
        </div>
      </div>

      {/* Carrinho / Caixa */}
      <div className="w-80 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-900 text-white">
          <h2 className="font-semibold text-sm">Carrinho</h2>
          <p className="text-xs text-gray-400">{carrinho.length} item(s)</p>
        </div>

        {mensagem && (
          <div className={`mx-3 mt-3 p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span className="flex-1">{mensagem.texto}</span>
            <button onClick={() => setMensagem(null)}><X className="w-3 h-3" /></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {carrinho.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Carrinho vazio</p>
          ) : (
            carrinho.map((item) => (
              <div key={item.produto.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-gray-800 flex-1 mr-2 line-clamp-2">{item.produto.nome}</p>
                  <button onClick={() => removerItem(item.produto.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alterarQtd(item.produto.id, -1)}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQtd(item.produto.id, 1)}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{fmt(item.subtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t space-y-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Desconto R$</label>
            <input
              type="number"
              min="0"
              value={desconto || ''}
              onChange={(e) => setDesconto(Number(e.target.value))}
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="0,00"
            />
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-2">
            <span>Total</span>
            <span className="text-indigo-600">{fmt(total)}</span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {PAGAMENTOS.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setPagamento(value)}
                title={label}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border text-xs transition-colors ${pagamento === value ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-500 hover:border-indigo-300'}`}
              >
                {icon}
                <span className="text-[9px] leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {pagamento === 'dinheiro' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Recebido R$</label>
              <input
                type="number"
                min="0"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="0,00"
              />
            </div>
          )}
          {pagamento === 'dinheiro' && Number(valorRecebido) > 0 && (
            <div className="flex justify-between text-xs font-medium text-green-600">
              <span>Troco</span>
              <span>{fmt(troco)}</span>
            </div>
          )}

          <button
            onClick={finalizar}
            disabled={carrinho.length === 0 || finalizando}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {finalizando ? 'Finalizando...' : 'Finalizar Venda'}
          </button>
        </div>
      </div>
    </div>
  )
}
