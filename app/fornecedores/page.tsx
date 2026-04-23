'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, Truck } from 'lucide-react'
import type { Fornecedor } from '@/types'

type Form = { nome: string; cnpj: string; telefone: string; email: string; contato: string; observacao: string }
const FORM_VAZIO: Form = { nome: '', cnpj: '', telefone: '', email: '', contato: '', observacao: '' }

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setFornecedores(data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  function abrirEditar(f: Fornecedor) {
    setForm({ nome: f.nome, cnpj: f.cnpj || '', telefone: f.telefone || '', email: f.email || '', contato: f.contato || '', observacao: f.observacao || '' })
    setEditandoId(f.id)
    setModal('editar')
  }

  async function salvar() {
    if (!form.nome) return
    setSalvando(true)
    const payload = { nome: form.nome, cnpj: form.cnpj || null, telefone: form.telefone || null, email: form.email || null, contato: form.contato || null, observacao: form.observacao || null }
    if (modal === 'criar') await supabase.from('fornecedores').insert(payload)
    else await supabase.from('fornecedores').update(payload).eq('id', editandoId!)
    setModal(null); setSalvando(false); load()
  }

  const F = ({ label, field, placeholder, type = 'text' }: { label: string; field: keyof Form; placeholder?: string; type?: string }) => (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1.5 block">{label}</label>
      <input
        type={type}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-slate-500 text-sm">{fornecedores.length} fornecedor(es)</p>
        </div>
        <button onClick={() => { setForm(FORM_VAZIO); setEditandoId(null); setModal('criar') }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fornecedores.map((f) => (
          <div key={f.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => abrirEditar(f)} className="text-slate-400 hover:text-indigo-600 transition">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={async () => { if (confirm('Excluir fornecedor?')) { await supabase.from('fornecedores').delete().eq('id', f.id); load() } }} className="text-slate-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">{f.nome}</h3>
            {f.cnpj && <p className="text-xs text-slate-400 mt-0.5">CNPJ: {f.cnpj}</p>}
            <div className="mt-3 space-y-1">
              {f.contato && <p className="text-xs text-slate-600">👤 {f.contato}</p>}
              {f.telefone && <p className="text-xs text-slate-600">📞 {f.telefone}</p>}
              {f.email && <p className="text-xs text-slate-600">✉️ {f.email}</p>}
            </div>
            {f.observacao && <p className="text-xs text-slate-400 mt-2 italic">{f.observacao}</p>}
          </div>
        ))}
        {fornecedores.length === 0 && (
          <div className="col-span-3 flex flex-col items-center py-16 text-slate-400">
            <Truck className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum fornecedor cadastrado</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{modal === 'criar' ? 'Novo Fornecedor' : 'Editar Fornecedor'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <F label="Nome *" field="nome" placeholder="Nome da empresa" />
              <div className="grid grid-cols-2 gap-3">
                <F label="CNPJ" field="cnpj" placeholder="00.000.000/0001-00" />
                <F label="Telefone" field="telefone" placeholder="(00) 00000-0000" />
              </div>
              <F label="E-mail" field="email" placeholder="email@fornecedor.com" type="email" />
              <F label="Nome do Contato" field="contato" placeholder="Nome da pessoa de contato" />
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Observação</label>
                <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Informações adicionais..." />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                <Check className="w-4 h-4" />{salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
