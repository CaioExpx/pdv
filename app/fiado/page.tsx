'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, ChevronDown, ChevronUp, Plus, X, Check, DollarSign } from 'lucide-react'
import type { FiadoRecord, Cliente } from '@/types'

type ClienteComFiado = Cliente & { fiados: FiadoRecord[]; total_aberto: number }

export default function FiadoPage() {
  const [clientesFiado, setClientesFiado] = useState<ClienteComFiado[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modalPagamento, setModalPagamento] = useState<FiadoRecord | null>(null)
  const [valorPag, setValorPag] = useState('')
  const [metodoPag, setMetodoPag] = useState('dinheiro')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: fiados } = await supabase
      .from('fiado')
      .select('*, cliente:clientes(*)')
      .in('status', ['aberto', 'pago_parcial'])
      .order('created_at', { ascending: false })

    if (!fiados) { setLoading(false); return }

    const porCliente: Record<string, ClienteComFiado> = {}
    for (const f of fiados as (FiadoRecord & { cliente: Cliente })[]) {
      if (!f.cliente) continue
      if (!porCliente[f.cliente_id]) {
        porCliente[f.cliente_id] = { ...f.cliente, fiados: [], total_aberto: 0 }
      }
      porCliente[f.cliente_id].fiados.push(f)
      porCliente[f.cliente_id].total_aberto += Number(f.valor_restante)
    }

    setClientesFiado(Object.values(porCliente).sort((a, b) => b.total_aberto - a.total_aberto))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function registrarPagamento() {
    if (!modalPagamento || !valorPag) return
    setSalvando(true)

    const valor = Number(valorPag)
    const novoValorPago = Number(modalPagamento.valor_pago) + valor
    const novoRestante = Math.max(0, Number(modalPagamento.valor_restante) - valor)
    const novoStatus = novoRestante === 0 ? 'quitado' : 'pago_parcial'

    await Promise.all([
      supabase.from('fiado').update({
        valor_pago: novoValorPago,
        valor_restante: novoRestante,
        status: novoStatus,
      }).eq('id', modalPagamento.id),
      supabase.from('pagamentos_fiado').insert({
        fiado_id: modalPagamento.id,
        valor,
        forma_pagamento: metodoPag,
      }),
    ])

    setModalPagamento(null)
    setValorPag('')
    setMetodoPag('dinheiro')
    setSalvando(false)
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const totalGeral = clientesFiado.reduce((a, c) => a + c.total_aberto, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fiado</h1>
          <p className="text-slate-500 text-sm">{clientesFiado.length} cliente(s) com débito em aberto</p>
        </div>
        {totalGeral > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5 text-right">
            <p className="text-xs text-red-500 font-medium">Total a Receber</p>
            <p className="text-lg font-bold text-red-700">{fmt(totalGeral)}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : clientesFiado.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-400">
          <BookOpen className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum fiado em aberto</p>
          <p className="text-xs mt-1">Tudo quitado!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientesFiado.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Header do cliente */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === cliente.id ? null : cliente.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-red-600">{cliente.nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 text-sm">{cliente.nome}</p>
                    <p className="text-xs text-slate-400">{cliente.telefone || 'Sem telefone'} · {cliente.fiados.length} conta{cliente.fiados.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-red-600">{fmt(cliente.total_aberto)}</span>
                  {expanded === cliente.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* Detalhes das contas */}
              {expanded === cliente.id && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {cliente.fiados.map((fiado) => (
                    <div key={fiado.id} className="px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{fmtDate(fiado.created_at)}</p>
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-xs text-slate-400">Original</p>
                              <p className="text-sm font-medium text-slate-700">{fmt(Number(fiado.valor_original))}</p>
                            </div>
                            {Number(fiado.valor_pago) > 0 && (
                              <div>
                                <p className="text-xs text-slate-400">Pago</p>
                                <p className="text-sm font-medium text-emerald-600">{fmt(Number(fiado.valor_pago))}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-slate-400">Restante</p>
                              <p className="text-base font-bold text-red-600">{fmt(Number(fiado.valor_restante))}</p>
                            </div>
                          </div>
                          {fiado.observacao && <p className="text-xs text-slate-400 mt-1 italic">{fiado.observacao}</p>}
                        </div>
                        <button
                          onClick={() => { setModalPagamento(fiado); setValorPag(String(fiado.valor_restante)) }}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Receber
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal pagamento fiado */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Registrar Pagamento</h2>
              <button onClick={() => setModalPagamento(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="text-slate-500 text-xs">Valor em aberto</p>
                <p className="font-bold text-red-600 text-lg">{fmt(Number(modalPagamento.valor_restante))}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Valor Recebido</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorPag}
                  onChange={(e) => setValorPag(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  {[['dinheiro', 'Dinheiro'], ['credito', 'Crédito'], ['debito', 'Débito'], ['pix', 'PIX']].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setMetodoPag(v)}
                      className={`py-2 rounded-xl text-xs font-medium transition ${metodoPag === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {Number(valorPag) > 0 && (
                <div className={`rounded-xl p-3 text-xs font-medium ${
                  Number(valorPag) >= Number(modalPagamento.valor_restante)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {Number(valorPag) >= Number(modalPagamento.valor_restante)
                    ? '✓ Quitará o débito completo'
                    : `Restará ${fmt(Number(modalPagamento.valor_restante) - Number(valorPag))} após este pagamento`}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalPagamento(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Cancelar</button>
              <button
                onClick={registrarPagamento}
                disabled={salvando || !valorPag || Number(valorPag) <= 0}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                <Check className="w-4 h-4" />{salvando ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
