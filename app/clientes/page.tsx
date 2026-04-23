'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, Users, BookOpen } from 'lucide-react'
import type { Cliente } from '@/types'
import Link from 'next/link'

type Form = { nome: string; telefone: string; email: string; cpf: string; endereco: string; observacao: string }
const FORM_VAZIO: Form = { nome: '', telefone: '', email: '', cpf: '', endereco: '', observacao: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<(Cliente & { fiado_aberto?: number })[]>([])
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: cs } = await supabase.from('clientes').select('*').order('nome')
    if (!cs) return

    const comFiado = await Promise.all(
      cs.map(async (c) => {
        const { data: fiados } = await supabase
          .from('fiado')
          .select('valor_restante')
          .eq('cliente_id', c.id)
          .in('status', ['aberto', 'pago_parcial'])
        const total = (fiados || []).reduce((a, f) => a + Number(f.valor_restante), 0)
        return { ...c, fiado_aberto: total }
      })
    )
    setClientes(comFiado)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function abrirEditar(c: Cliente) {
    setForm({ nome: c.nome, telefone: c.telefone || '', email: c.email || '', cpf: c.cpf || '', endereco: c.endereco || '', observacao: c.observacao || '' })
    setEditandoId(c.id)
    setModal('editar')
  }

  async function salvar() {
    if (!form.nome) return
    setSalvando(true)
    const payload = { nome: form.nome, telefone: form.telefone || null, email: form.email || null, cpf: form.cpf || null, endereco: form.endereco || null, observacao: form.observacao || null }
    if (modal === 'criar') await supabase.from('clientes').insert(payload)
    else await supabase.from('clientes').update(payload).eq('id', editandoId!)
    setModal(null); setSalvando(false); load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca) ||
    (c.cpf || '').includes(busca)
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm">{clientes.length} cliente(s)</p>
        </div>
        <button onClick={() => { setForm(FORM_VAZIO); setEditandoId(null); setModal('criar') }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <input
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64"
        placeholder="Buscar por nome, telefone..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Telefone</th>
              <th className="text-left px-4 py-3">CPF</th>
              <th className="text-right px-4 py-3">Fiado Aberto</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.nome}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{c.telefone || '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{c.cpf || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {(c.fiado_aberto || 0) > 0 ? (
                    <span className="text-sm font-semibold text-red-600">{fmt(c.fiado_aberto!)}</span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {(c.fiado_aberto || 0) > 0 && (
                      <Link href="/fiado" className="text-slate-400 hover:text-indigo-600 transition" title="Ver fiado">
                        <BookOpen className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button onClick={() => abrirEditar(c)} className="text-slate-400 hover:text-indigo-600 transition"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={async () => { if (confirm('Excluir cliente?')) { await supabase.from('clientes').delete().eq('id', c.id); load() } }} className="text-slate-400 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{modal === 'criar' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Nome *', field: 'nome', ph: 'Nome completo' },
                { label: 'Telefone', field: 'telefone', ph: '(00) 00000-0000' },
                { label: 'E-mail', field: 'email', ph: 'email@exemplo.com' },
                { label: 'CPF', field: 'cpf', ph: '000.000.000-00' },
                { label: 'Endereço', field: 'endereco', ph: 'Rua, número, bairro...' },
              ].map(({ label, field, ph }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">{label}</label>
                  <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form[field as keyof Form]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={ph} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Observação</label>
                <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
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
