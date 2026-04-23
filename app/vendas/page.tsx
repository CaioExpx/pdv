'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import type { Venda, ItemVenda } from '@/types'

type VendaComItens = Venda & { itens?: ItemVenda[] }

export default function VendasPage() {
  const [vendas, setVendas] = useState<VendaComItens[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'concluida' | 'cancelada'>('todos')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setVendas(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function loadItens(vendaId: string) {
    if (expanded === vendaId) {
      setExpanded(null)
      return
    }
    const { data } = await supabase.from('itens_venda').select('*').eq('venda_id', vendaId)
    setVendas((prev) =>
      prev.map((v) => (v.id === vendaId ? { ...v, itens: data || [] } : v))
    )
    setExpanded(vendaId)
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar esta venda?')) return
    await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', id)
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filtradas = vendas.filter((v) => {
    const matchBusca = v.id.includes(busca.toLowerCase()) ||
      v.forma_pagamento.includes(busca.toLowerCase()) ||
      fmt(Number(v.total)).includes(busca)
    const matchStatus = filtroStatus === 'todos' || v.status === filtroStatus
    return matchBusca && matchStatus
  })

  const totalFiltrado = filtradas
    .filter((v) => v.status === 'concluida')
    .reduce((acc, v) => acc + Number(v.total), 0)

  const PAGAMENTO_LABEL: Record<string, string> = {
    dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', pix: 'PIX', voucher: 'Voucher',
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtradas.filter((v) => v.status === 'concluida').length} venda(s) — Total: <span className="font-semibold text-green-600">{fmt(totalFiltrado)}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar venda..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(['todos', 'concluida', 'cancelada'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors capitalize ${filtroStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s === 'todos' ? 'Todos' : s === 'concluida' ? 'Concluídas' : 'Canceladas'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma venda encontrada</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtradas.map((venda) => (
              <div key={venda.id}>
                <div
                  className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadItens(venda.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium text-gray-700">
                        #{venda.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        venda.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {venda.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {PAGAMENTO_LABEL[venda.forma_pagamento] || venda.forma_pagamento}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(venda.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {venda.desconto > 0 && (
                      <span className="text-xs text-red-500">- {fmt(Number(venda.desconto))}</span>
                    )}
                    <span className={`text-base font-bold ${venda.status === 'cancelada' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {fmt(Number(venda.total))}
                    </span>
                    {expanded === venda.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expanded === venda.id && venda.itens && (
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 uppercase tracking-wide">
                          <th className="text-left py-1">Produto</th>
                          <th className="text-center py-1">Qtd</th>
                          <th className="text-right py-1">Unit.</th>
                          <th className="text-right py-1">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {venda.itens.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 text-gray-700">{item.produto_nome}</td>
                            <td className="py-1.5 text-center text-gray-600">{item.quantidade}</td>
                            <td className="py-1.5 text-right text-gray-600">{fmt(Number(item.preco_unitario))}</td>
                            <td className="py-1.5 text-right font-medium text-gray-800">{fmt(Number(item.subtotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {venda.status === 'concluida' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => cancelar(venda.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                        >
                          Cancelar venda
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
