'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { Produto, Categoria } from '@/types'

type Form = {
  nome: string
  preco: string
  estoque: string
  estoque_minimo: string
  categoria_id: string
  codigo_barras: string
  unidade: string
  ativo: boolean
}

const FORM_VAZIO: Form = {
  nome: '', preco: '', estoque: '0', estoque_minimo: '5',
  categoria_id: '', codigo_barras: '', unidade: 'UN', ativo: true,
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [editando, setEditando] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('produtos').select('*, categoria:categorias(id, nome, cor)').order('nome'),
      supabase.from('categorias').select('*').order('nome'),
    ])
    setProdutos(p.data || [])
    setCategorias(c.data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  function abrirCriar() {
    setForm(FORM_VAZIO)
    setEditando(null)
    setModal('criar')
  }

  function abrirEditar(p: Produto) {
    setForm({
      nome: p.nome,
      preco: p.preco.toString(),
      estoque: p.estoque.toString(),
      estoque_minimo: p.estoque_minimo.toString(),
      categoria_id: p.categoria_id || '',
      codigo_barras: p.codigo_barras || '',
      unidade: p.unidade,
      ativo: p.ativo,
    })
    setEditando(p.id)
    setModal('editar')
  }

  async function salvar() {
    if (!form.nome || !form.preco) return
    setSalvando(true)

    const payload = {
      nome: form.nome,
      preco: Number(form.preco),
      estoque: Number(form.estoque),
      estoque_minimo: Number(form.estoque_minimo),
      categoria_id: form.categoria_id || null,
      codigo_barras: form.codigo_barras || null,
      unidade: form.unidade,
      ativo: form.ativo,
    }

    if (modal === 'criar') {
      await supabase.from('produtos').insert(payload)
    } else {
      await supabase.from('produtos').update(payload).eq('id', editando!)
    }

    setModal(null)
    setSalvando(false)
    load()
  }

  async function deletar(id: string) {
    if (!confirm('Deseja desativar este produto?')) return
    await supabase.from('produtos').update({ ativo: false }).eq('id', id)
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const filtrados = produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm mt-1">{produtos.length} produto(s) cadastrado(s)</p>
        </div>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <input
            className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-right px-4 py-3">Preço</th>
                <th className="text-right px-4 py-3">Estoque</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.nome}
                    {p.codigo_barras && <span className="ml-2 text-xs text-gray-400">{p.codigo_barras}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.categoria ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${p.categoria.cor}20`, color: p.categoria.cor }}
                      >
                        {p.categoria.nome}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-600">{fmt(p.preco)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${p.estoque <= p.estoque_minimo ? 'text-red-600' : 'text-gray-700'}`}>
                      {p.estoque} {p.unidade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.ativo
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirEditar(p)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deletar(p.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum produto encontrado</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">{modal === 'criar' ? 'Novo Produto' : 'Editar Produto'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Nome *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do produto"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Preço *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Unidade</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  >
                    {['UN', 'KG', 'LT', 'MT', 'CX', 'PC'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Estoque</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.estoque}
                    onChange={(e) => setForm({ ...form, estoque: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.estoque_minimo}
                    onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Categoria</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Código de Barras</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.codigo_barras}
                  onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                  placeholder="EAN / código"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, ativo: !form.ativo })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.ativo ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700">Produto ativo</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.nome || !form.preco}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
