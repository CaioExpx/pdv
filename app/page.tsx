'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
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
  const [produtosBaixo, setProdutosBaixo] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const [vendasHoje, allProdutos, recentes] = await Promise.all([
        supabase
          .from('vendas')
          .select('total')
          .gte('created_at', hoje.toISOString())
          .eq('status', 'concluida'),
        supabase.from('produtos').select('*').eq('ativo', true),
        supabase
          .from('vendas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const produtos = allProdutos.data || []
      const baixo = produtos.filter((p: Produto) => p.estoque <= p.estoque_minimo)
      const vendas = vendasHoje.data || []

      setStats({
        vendasHoje: vendas.length,
        totalHoje: vendas.reduce((acc: number, v: { total: number }) => acc + Number(v.total), 0),
        produtosAtivos: produtos.length,
        estoqueBaixo: baixo.length,
      })
      setVendasRecentes(recentes.data || [])
      setProdutosBaixo(baixo.slice(0, 5))
      setLoading(false)
    }

    loadDashboard()
  }, [])

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const cards = [
    { label: 'Vendas Hoje', value: stats.vendasHoje.toString(), icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Total Hoje', value: fmt(stats.totalHoje), icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Produtos Ativos', value: stats.produtosAtivos.toString(), icon: Package, color: 'bg-indigo-500' },
    { label: 'Estoque Baixo', value: stats.estoqueBaixo.toString(), icon: AlertTriangle, color: 'bg-amber-500' },
  ]

  return (
    <div className="p-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className={`${color} p-3 rounded-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Vendas Recentes</h2>
          {vendasRecentes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhuma venda registrada</p>
          ) : (
            <div className="space-y-3">
              {vendasRecentes.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">#{v.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 capitalize">{v.forma_pagamento}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{fmt(Number(v.total))}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/vendas" className="block mt-4 text-xs text-indigo-600 hover:underline text-center">
            Ver todas as vendas →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Estoque Baixo</h2>
          {produtosBaixo.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Todos os estoques OK</p>
          ) : (
            <div className="space-y-3">
              {produtosBaixo.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-800">{p.nome}</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.estoque === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.estoque} {p.unidade}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/produtos" className="block mt-4 text-xs text-indigo-600 hover:underline text-center">
            Gerenciar produtos →
          </Link>
        </div>
      </div>
    </div>
  )
}
