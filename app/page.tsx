'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, ShoppingCart, Package, AlertTriangle, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Produto, Venda } from '@/types'

type Stats = {
  vendasHoje: number
  totalHoje: number
  produtosAtivos: number
  estoqueBaixo: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ vendasHoje: 0, totalHoje: 0, produtosAtivos: 0, estoqueBaixo: 0 })
  const [vendasRecentes, setVendasRecentes] = useState<Venda[]>([])
  const [semEstoque, setSemEstoque] = useState<Produto[]>([])
  const [estoqueBaixo, setEstoqueBaixo] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const [{ data: vendasHoje }, { data: produtos }, { data: recentes }] = await Promise.all([
        supabase.from('vendas').select('total').gte('created_at', hoje.toISOString()).eq('status', 'concluida'),
        supabase.from('produtos').select('*, categoria:categorias(id,nome,cor)').eq('ativo', true).order('estoque'),
        supabase.from('vendas').select('*, cliente:clientes(nome)').order('created_at', { ascending: false }).limit(8),
      ])

      const ps = (produtos || []) as Produto[]
      const semEst = ps.filter((p) => p.estoque === 0)
      const baixo = ps.filter((p) => p.estoque > 0 && p.estoque <= p.estoque_minimo)

      setStats({
        vendasHoje: (vendasHoje || []).length,
        totalHoje: (vendasHoje || []).reduce((a, v) => a + Number(v.total), 0),
        produtosAtivos: ps.length,
        estoqueBaixo: semEst.length + baixo.length,
      })
      setVendasRecentes((recentes || []) as Venda[])
      setSemEstoque(semEst.slice(0, 6))
      setEstoqueBaixo(baixo.slice(0, 6))
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtHora = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const PAGAMENTO_LABEL: Record<string, string> = {
    dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito',
    pix: 'PIX', fiado: 'Fiado', misto: 'Misto',
  }

  const cards = [
    { label: 'Vendas Hoje', value: String(stats.vendasHoje), icon: ShoppingCart, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600' },
    { label: 'Total Hoje', value: fmt(stats.totalHoje), icon: TrendingUp, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600' },
    { label: 'Produtos Ativos', value: String(stats.produtosAtivos), icon: Package, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-600' },
    { label: 'Alertas de Estoque', value: String(stats.estoqueBaixo), icon: AlertTriangle, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-600' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Alertas críticos */}
      {!loading && semEstoque.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Sem Estoque ({semEstoque.length} produto{semEstoque.length > 1 ? 's' : ''})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {semEstoque.map((p) => (
              <span key={p.id} className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
                {p.nome}
              </span>
            ))}
          </div>
        </div>
      )}
      {!loading && estoqueBaixo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">Estoque Baixo ({estoqueBaixo.length} produto{estoqueBaixo.length > 1 ? 's' : ''})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {estoqueBaixo.map((p) => (
              <span key={p.id} className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
                {p.nome} — {p.estoque} un.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)
          : cards.map(({ label, value, icon: Icon, light }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className={`inline-flex p-2 rounded-xl mb-3 ${light}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
      </div>

      {/* Vendas recentes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Vendas Recentes</h2>
          <Link href="/vendas" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : vendasRecentes.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">Nenhuma venda hoje</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {vendasRecentes.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {v.cliente?.nome || `#${v.id.slice(0, 6).toUpperCase()}`}
                    </p>
                    <p className="text-xs text-slate-400">{fmtHora(v.created_at)} · {PAGAMENTO_LABEL[v.forma_pagamento] || v.forma_pagamento}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${v.status === 'cancelada' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {fmt(Number(v.total))}
                  </p>
                  {v.status === 'cancelada' && (
                    <span className="text-xs text-red-500">Cancelada</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
