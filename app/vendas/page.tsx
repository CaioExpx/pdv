'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Search, FileText } from 'lucide-react'
import type { Venda, ItemVenda } from '@/types'

type VendaComItens = Venda & { itens?: ItemVenda[]; cliente?: { nome: string } | null }

const LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito',
  pix: 'PIX', fiado: 'Fiado', misto: 'Misto',
}

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
      .select('*, cliente:clientes(nome)')
      .order('created_at', { ascending: false })
      .limit(200)
    setVendas((data || []) as VendaComItens[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function loadItens(vendaId: string) {
    if (expanded === vendaId) { setExpanded(null); return }
    const { data } = await supabase.from('itens_venda').select('*').eq('venda_id', vendaId)
    setVendas((prev) => prev.map((v) => v.id === vendaId ? { ...v, itens: data || [] } : v))
    setExpanded(vendaId)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  const filtradas = vendas.filter((v) => {
    const matchBusca = v.id.toLowerCase().includes(busca.toLowerCase()) ||
      (v.cliente?.nome || '').toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'todos' || v.status === filtroStatus
    return matchBusca && matchStatus
  })

  const totalFiltrado = filtradas.filter((v) => v.status === 'concluida').reduce((a, v) => a + Number(v.total), 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Histórico de Vendas</h1>
          <p className="text-slate-500 text-sm">
            {filtradas.filter((v) => v.status === 'concluida').length} venda(s) ·{' '}
            <span className="font-semibold text-emerald-600">{fmt(totalFiltrado)}</span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-52"
            placeholder="Buscar venda ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {([['todos', 'Todas'], ['concluida', 'Concluídas'], ['cancelada', 'Canceladas']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltroStatus(v)}
              className={`px-3 py-2 text-xs font-medium rounded-xl transition ${filtroStatus === v ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-slate-400">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtradas.map((venda) => (
              <div key={venda.id}>
                <button
                  className="w-full flex items-center px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => loadItens(venda.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium text-slate-500">#{venda.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        venda.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {venda.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {LABEL[venda.forma_pagamento] || venda.forma_pagamento}
                      </span>
                      {venda.cliente?.nome && (
                        <span className="text-xs text-slate-500">{venda.cliente.nome}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(venda.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {Number(venda.desconto) > 0 && (
                      <span className="text-xs text-red-400">-{fmt(Number(venda.desconto))}</span>
                    )}
                    <span className={`font-bold text-base ${venda.status === 'cancelada' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                      {fmt(Number(venda.total))}
                    </span>
                    {expanded === venda.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {expanded === venda.id && venda.itens && (
                  <div className="bg-slate-50 px-5 py-4 border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-wide">
                          <th className="text-left pb-2">Produto</th>
                          <th className="text-center pb-2">Qtd</th>
                          <th className="text-right pb-2">Unit.</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {venda.itens.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 text-slate-700 font-medium">{item.produto_nome}</td>
                            <td className="py-1.5 text-center text-slate-500">{item.quantidade}</td>
                            <td className="py-1.5 text-right text-slate-500">{fmt(Number(item.preco_unitario))}</td>
                            <td className="py-1.5 text-right font-semibold text-slate-800">{fmt(Number(item.subtotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {venda.status === 'concluida' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={async () => {
                            if (confirm('Cancelar esta venda?')) {
                              await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', venda.id)
                              load()
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition"
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
