'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, ScanLine, Package, Search, Camera } from 'lucide-react'
import CameraScanner from '@/components/CameraScanner'
import type { Produto, Categoria, Fornecedor } from '@/types'

type Form = {
  nome: string; preco: string; preco_custo: string; estoque: string; estoque_minimo: string
  categoria_id: string; fornecedor_id: string; codigo_barras: string
  unidade: string; tamanho: string; cor: string; ativo: boolean
}

const FORM_VAZIO: Form = {
  nome: '', preco: '', preco_custo: '', estoque: '0', estoque_minimo: '3',
  categoria_id: '', fornecedor_id: '', codigo_barras: '', unidade: 'UN',
  tamanho: '', cor: '', ativo: true,
}

const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'RN', '0-3m', '3-6m', '6-9m', '9-12m', '1', '2', '3', '4', '5', '6', '7', '8', '10', '12', '14', '16']

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [cameraAberta, setCameraAberta] = useState(false)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const supabase = createClient()

  const load = useCallback(async () => {
    const [p, c, f] = await Promise.all([
      supabase.from('produtos').select('*, categoria:categorias(id,nome,cor), fornecedor:fornecedores(id,nome)').order('nome'),
      supabase.from('categorias').select('*').order('nome'),
      supabase.from('fornecedores').select('*').order('nome'),
    ])
    setProdutos(p.data || [])
    setCategorias(c.data || [])
    setFornecedores(f.data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!scanMode) return
    let lastTime = 0
    function onKeyDown(e: KeyboardEvent) {
      const now = Date.now()
      if (now - lastTime > 150 && barcodeBuffer.current.length > 0) barcodeBuffer.current = ''
      lastTime = now
      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim()
        barcodeBuffer.current = ''
        if (code.length >= 4) { setForm((prev) => ({ ...prev, codigo_barras: code })); setScanMode(false) }
        return
      }
      if (e.key.length === 1 && !e.ctrlKey) {
        barcodeBuffer.current += e.key
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 500)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scanMode])

  function abrirCriar() { setForm(FORM_VAZIO); setEditandoId(null); setModal('criar') }

  function abrirEditar(p: Produto) {
    setForm({
      nome: p.nome, preco: p.preco.toString(), preco_custo: p.preco_custo?.toString() || '',
      estoque: p.estoque.toString(), estoque_minimo: p.estoque_minimo.toString(),
      categoria_id: p.categoria_id || '', fornecedor_id: p.fornecedor_id || '',
      codigo_barras: p.codigo_barras || '', unidade: p.unidade,
      tamanho: p.tamanho || '', cor: p.cor || '', ativo: p.ativo,
    })
    setEditandoId(p.id)
    setModal('editar')
  }

  async function salvar() {
    if (!form.nome || !form.preco) return
    setSalvando(true)
    const payload = {
      nome: form.nome, preco: Number(form.preco),
      preco_custo: form.preco_custo ? Number(form.preco_custo) : null,
      estoque: Number(form.estoque), estoque_minimo: Number(form.estoque_minimo),
      categoria_id: form.categoria_id || null, fornecedor_id: form.fornecedor_id || null,
      codigo_barras: form.codigo_barras || null, unidade: form.unidade,
      tamanho: form.tamanho || null, cor: form.cor || null, ativo: form.ativo,
    }
    if (modal === 'criar') await supabase.from('produtos').insert(payload)
    else await supabase.from('produtos').update(payload).eq('id', editandoId!)
    setModal(null); setSalvando(false); load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const filtrados = produtos.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo_barras || '').includes(busca)
    const matchCat = !filtroCategoria || p.categoria_id === filtroCategoria
    return matchBusca && matchCat
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">Produtos</h1>
          <p className="text-slate-500 text-xs md:text-sm">{produtos.length} produto(s)</p>
        </div>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Produto</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {filtrados.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm">{p.nome}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {p.codigo_barras && <span className="text-xs text-slate-400 font-mono">{p.codigo_barras}</span>}
                  {p.tamanho && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">Tam {p.tamanho}</span>}
                  {p.cor && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">{p.cor}</span>}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-indigo-600">{fmt(p.preco)}</span>
                  <span className={`text-xs font-semibold ${p.estoque === 0 ? 'text-red-600' : p.estoque <= p.estoque_minimo ? 'text-amber-600' : 'text-slate-600'}`}>
                    Estoque: {p.estoque} {p.unidade}
                  </span>
                </div>
                {(p.categoria || p.fornecedor) && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {p.categoria && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${p.categoria.cor}20`, color: p.categoria.cor }}>
                        {p.categoria.nome}
                      </span>
                    )}
                    {p.fornecedor && <span className="text-xs text-slate-400">{p.fornecedor.nome}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => abrirEditar(p)} className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={async () => { if (confirm('Desativar produto?')) { await supabase.from('produtos').update({ ativo: false }).eq('id', p.id); load() } }} className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <Package className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhum produto</p>
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-4 py-3">Produto</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Fornecedor</th>
                <th className="text-right px-4 py-3">Preço</th>
                <th className="text-right px-4 py-3">Estoque</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.codigo_barras && <span className="text-xs text-slate-400 font-mono">{p.codigo_barras}</span>}
                      {p.tamanho && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">Tam {p.tamanho}</span>}
                      {p.cor && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">{p.cor}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.categoria ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${p.categoria.cor}20`, color: p.categoria.cor }}>
                        {p.categoria.nome}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.fornecedor?.nome || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-600">{fmt(p.preco)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${p.estoque === 0 ? 'text-red-600' : p.estoque <= p.estoque_minimo ? 'text-amber-600' : 'text-slate-700'}`}>
                      {p.estoque} <span className="text-xs font-normal text-slate-400">{p.unidade}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => abrirEditar(p)} className="text-slate-400 hover:text-indigo-600 transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={async () => { if (confirm('Desativar produto?')) { await supabase.from('produtos').update({ ativo: false }).eq('id', p.id); load() } }} className="text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum produto</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-slate-900">{modal === 'criar' ? 'Novo Produto' : 'Editar Produto'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Nome *</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do produto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Preço Venda *</label>
                  <input type="number" step="0.01" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Preço Custo</label>
                  <input type="number" step="0.01" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} placeholder="0,00" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Estoque</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Mínimo</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Unidade</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}>
                    {['UN', 'PC', 'CX', 'KG', 'PAR'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Tamanho</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.tamanho} onChange={(e) => setForm({ ...form, tamanho: e.target.value })}>
                    <option value="">Sem tamanho</option>
                    {TAMANHOS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Cor</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} placeholder="Ex: Rosa, Azul" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Categoria</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                    <option value="">Sem categoria</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Fornecedor</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.fornecedor_id} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}>
                    <option value="">Sem fornecedor</option>
                    {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Código de Barras */}
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Código de Barras</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    value={form.codigo_barras}
                    onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                    placeholder="EAN / código"
                  />
                  {/* USB scanner button */}
                  <button
                    type="button"
                    onClick={() => setScanMode(true)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition flex items-center gap-1.5 ${
                      scanMode ? 'bg-emerald-600 border-emerald-600 text-white animate-pulse' : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                    title="Scanner USB"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span className="hidden sm:inline">{scanMode ? 'Aguardando...' : 'USB'}</span>
                  </button>
                  {/* Camera scanner button */}
                  <button
                    type="button"
                    onClick={() => setCameraAberta(true)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 text-sm font-medium transition flex items-center gap-1.5"
                    title="Câmera"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Câmera</span>
                  </button>
                </div>
                {scanMode && <p className="text-xs text-emerald-600 mt-1">Passe o scanner no código de barras agora...</p>}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setForm({ ...form, ativo: !form.ativo })}>
                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.ativo ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-slate-700">Produto ativo</span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || !form.nome || !form.preco}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                <Check className="w-4 h-4" />
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera scanner overlay */}
      {cameraAberta && (
        <CameraScanner
          onScan={(code) => {
            setForm((prev) => ({ ...prev, codigo_barras: code }))
            setCameraAberta(false)
          }}
          onClose={() => setCameraAberta(false)}
        />
      )}
    </div>
  )
}
