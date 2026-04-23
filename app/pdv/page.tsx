'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Package,
  Smartphone, BookOpen, X, ScanLine, User, Check, ShoppingCart, ChevronDown
} from 'lucide-react'
import type { Produto, ItemCarrinho, FormaPagamento, Cliente, EntradaPagamento } from '@/types'

const METODOS: { value: FormaPagamento; label: string; icon: React.ReactNode }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
  { value: 'credito', label: 'Crédito', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'debito', label: 'Débito', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'pix', label: 'PIX', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'fiado', label: 'Fiado', icon: <BookOpen className="w-4 h-4" /> },
]

const COMBINACOES_DUPLAS: [FormaPagamento, FormaPagamento][] = [
  ['dinheiro', 'credito'],
  ['dinheiro', 'debito'],
  ['dinheiro', 'pix'],
  ['dinheiro', 'fiado'],
  ['credito', 'fiado'],
  ['pix', 'fiado'],
]

type ModoPagamento = 'simples' | 'duplo'

export default function PDVPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [desconto, setDesconto] = useState('')
  const [modoPag, setModoPag] = useState<ModoPagamento>('simples')
  const [pagSimples, setPagSimples] = useState<FormaPagamento>('dinheiro')
  const [pagDuplo, setPagDuplo] = useState<[FormaPagamento, FormaPagamento]>(['dinheiro', 'credito'])
  const [pagamentos, setPagamentos] = useState<EntradaPagamento[]>([
    { metodo: 'dinheiro', valor: '', valorRecebido: '' },
  ])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteDropdown, setClienteDropdown] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)

  const supabase = createClient()
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const buscaRef = useRef<HTMLInputElement>(null)

  const loadProdutos = useCallback(async () => {
    const { data } = await supabase
      .from('produtos')
      .select('*, categoria:categorias(id,nome,cor)')
      .eq('ativo', true)
      .gt('estoque', 0)
      .order('nome')
    setProdutos(data || [])
  }, [supabase])

  useEffect(() => { loadProdutos() }, [loadProdutos])

  useEffect(() => {
    let lastTime = 0
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isProtected = ['INPUT', 'TEXTAREA'].includes(target.tagName) && target.id !== 'pdv-search'
      if (isProtected) return
      const now = Date.now()
      const delta = now - lastTime
      lastTime = now
      if (delta > 150 && barcodeBuffer.current.length > 0) barcodeBuffer.current = ''
      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim()
        barcodeBuffer.current = ''
        clearTimeout(barcodeTimer.current)
        if (code.length >= 4) {
          setScannerAtivo(true)
          const found = produtos.find((p) => p.codigo_barras === code)
          if (found) { addCarrinho(found); setBusca('') } else { setBusca(code) }
          setTimeout(() => setScannerAtivo(false), 1500)
        }
        return
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer.current += e.key
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 500)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [produtos])

  useEffect(() => {
    if (!buscaCliente) { setClientes([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clientes').select('*').ilike('nome', `%${buscaCliente}%`).limit(8)
      setClientes(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [buscaCliente])

  const precisaCliente = modoPag === 'simples' ? pagSimples === 'fiado' : pagDuplo.includes('fiado')

  function addCarrinho(produto: Produto) {
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produto.id === produto.id)
      if (existe) {
        return prev.map((i) => i.produto.id === produto.id
          ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.produto.preco }
          : i)
      }
      return [...prev, { produto, quantidade: 1, subtotal: produto.preco }]
    })
  }

  function alterarQtd(id: string, delta: number) {
    setCarrinho((prev) =>
      prev.map((i) => i.produto.id === id
        ? { ...i, quantidade: i.quantidade + delta, subtotal: (i.quantidade + delta) * i.produto.preco }
        : i
      ).filter((i) => i.quantidade > 0)
    )
  }

  const subtotal = carrinho.reduce((a, i) => a + i.subtotal, 0)
  const descontoNum = Math.min(Number(desconto) || 0, subtotal)
  const total = Math.max(0, subtotal - descontoNum)
  const totalItens = carrinho.reduce((a, i) => a + i.quantidade, 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  function getPagDuploValores() {
    const v1 = Number(pagamentos[0]?.valor) || 0
    const v2 = Math.max(0, total - v1)
    return { v1, v2 }
  }

  function calcularTroco(metodo: FormaPagamento, valorRecebido: string, valorDaParcela: number) {
    if (metodo !== 'dinheiro') return 0
    return Math.max(0, Number(valorRecebido) - valorDaParcela)
  }

  async function finalizar() {
    if (carrinho.length === 0) return
    if (precisaCliente && !clienteSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o cliente para venda em fiado.' })
      return
    }
    setFinalizando(true)
    setMensagem(null)
    let formaResumo: string
    const pagamentosParaSalvar: { forma: FormaPagamento; valor: number; recebido: number | null; troco: number }[] = []
    if (modoPag === 'simples') {
      const vRec = Number(pagamentos[0]?.valorRecebido) || null
      const troco = calcularTroco(pagSimples, pagamentos[0]?.valorRecebido || '', total)
      formaResumo = pagSimples
      pagamentosParaSalvar.push({ forma: pagSimples, valor: total, recebido: vRec, troco })
    } else {
      const { v1, v2 } = getPagDuploValores()
      formaResumo = 'misto'
      const rec0 = Number(pagamentos[0]?.valorRecebido) || null
      const troco0 = calcularTroco(pagDuplo[0], pagamentos[0]?.valorRecebido || '', v1)
      const rec1 = Number(pagamentos[1]?.valorRecebido) || null
      const troco1 = calcularTroco(pagDuplo[1], pagamentos[1]?.valorRecebido || '', v2)
      pagamentosParaSalvar.push(
        { forma: pagDuplo[0], valor: v1, recebido: rec0, troco: troco0 },
        { forma: pagDuplo[1], valor: v2, recebido: rec1, troco: troco1 }
      )
    }
    const { data: venda, error } = await supabase.from('vendas').insert({
      cliente_id: clienteSelecionado?.id || null,
      subtotal, desconto: descontoNum, total,
      forma_pagamento: formaResumo,
      valor_recebido: pagamentosParaSalvar[0].recebido,
      troco: pagamentosParaSalvar[0].troco,
      status: 'concluida',
    }).select().single()
    if (error || !venda) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar venda.' })
      setFinalizando(false)
      return
    }
    await Promise.all([
      supabase.from('itens_venda').insert(carrinho.map((i) => ({
        venda_id: venda.id, produto_id: i.produto.id, produto_nome: i.produto.nome,
        quantidade: i.quantidade, preco_unitario: i.produto.preco, subtotal: i.subtotal,
      }))),
      supabase.from('pagamentos_venda').insert(pagamentosParaSalvar.map((p) => ({
        venda_id: venda.id, forma_pagamento: p.forma, valor: p.valor,
        valor_recebido: p.recebido, troco: p.troco,
      }))),
      ...carrinho.map((i) =>
        supabase.rpc('decrementar_estoque', { p_produto_id: i.produto.id, p_quantidade: i.quantidade })
      ),
    ])
    for (const p of pagamentosParaSalvar) {
      if (p.forma === 'fiado' && clienteSelecionado) {
        await supabase.from('fiado').insert({
          cliente_id: clienteSelecionado.id, venda_id: venda.id,
          valor_original: p.valor, valor_pago: 0, valor_restante: p.valor, status: 'aberto',
        })
      }
    }
    const trocoTotal = pagamentosParaSalvar.reduce((a, p) => a + p.troco, 0)
    setMensagem({
      tipo: 'ok',
      texto: trocoTotal > 0 ? `Venda finalizada! Troco: ${fmt(trocoTotal)}` : 'Venda finalizada com sucesso!',
    })
    setCarrinho([])
    setDesconto('')
    setModoPag('simples')
    setPagSimples('dinheiro')
    setPagamentos([{ metodo: 'dinheiro', valor: '', valorRecebido: '' }])
    setClienteSelecionado(null)
    setBuscaCliente('')
    loadProdutos()
    setFinalizando(false)
    setCarrinhoAberto(false)
  }

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.codigo_barras || '').includes(busca)
  )

  // Shared cart body (used by both desktop sidebar and mobile bottom sheet)
  function carrinhoConteudo() {
    return (
      <div>
        {mensagem && (
          <div className={`mx-3 mt-3 p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
            mensagem.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className="flex-1">{mensagem.texto}</span>
            <button onClick={() => setMensagem(null)}><X className="w-3 h-3" /></button>
          </div>
        )}

        <div className="px-3 py-2 space-y-1.5">
          {carrinho.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Carrinho vazio</p>
            </div>
          ) : (
            carrinho.map((item) => (
              <div key={item.produto.id} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 mr-2">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.produto.nome}</p>
                    {item.produto.tamanho && <p className="text-xs text-slate-400">Tam. {item.produto.tamanho}</p>}
                  </div>
                  <button
                    onClick={() => setCarrinho((p) => p.filter((i) => i.produto.id !== item.produto.id))}
                    className="text-slate-300 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alterarQtd(item.produto.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center text-slate-800">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQtd(item.produto.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">{fmt(item.subtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 p-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Desconto</label>
              <input
                type="number" min="0" value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                placeholder="R$ 0,00"
              />
            </div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1.5">
              <span className="text-sm">Total</span>
              <span className="text-base text-indigo-600">{fmt(total)}</span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {(['simples', 'duplo'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModoPag(m)
                  setPagamentos(m === 'simples'
                    ? [{ metodo: 'dinheiro', valor: '', valorRecebido: '' }]
                    : [{ metodo: 'dinheiro', valor: '' }, { metodo: 'credito', valor: '' }]
                  )
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                  modoPag === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m === 'simples' ? '1 Pagamento' : '2 Pagamentos'}
              </button>
            ))}
          </div>

          {modoPag === 'simples' && (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-1">
                {METODOS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => { setPagSimples(value); setPagamentos([{ metodo: value, valor: '', valorRecebido: '' }]) }}
                    title={label}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border text-xs transition ${
                      pagSimples === value ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    {icon}
                    <span className="text-[9px] leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
              {pagSimples === 'dinheiro' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Recebido</label>
                    <input
                      type="number" min="0" value={pagamentos[0]?.valorRecebido || ''}
                      onChange={(e) => setPagamentos([{ metodo: 'dinheiro', valor: '', valorRecebido: e.target.value }])}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="0,00"
                    />
                  </div>
                  {Number(pagamentos[0]?.valorRecebido) > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-600">
                      <span>Troco</span>
                      <span>{fmt(Math.max(0, Number(pagamentos[0].valorRecebido) - total))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {modoPag === 'duplo' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1">
                {COMBINACOES_DUPLAS.map(([m1, m2]) => {
                  const active = pagDuplo[0] === m1 && pagDuplo[1] === m2
                  const l1 = METODOS.find((m) => m.value === m1)?.label
                  const l2 = METODOS.find((m) => m.value === m2)?.label
                  return (
                    <button
                      key={`${m1}-${m2}`}
                      onClick={() => { setPagDuplo([m1, m2]); setPagamentos([{ metodo: m1, valor: '' }, { metodo: m2, valor: '' }]) }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {l1} + {l2}
                    </button>
                  )
                })}
              </div>
              {pagDuplo.map((metodo, idx) => {
                const { v1, v2 } = getPagDuploValores()
                const valorParcela = idx === 0 ? v1 : v2
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 whitespace-nowrap w-16">
                        {METODOS.find((m) => m.value === metodo)?.label}
                      </span>
                      {idx === 0 ? (
                        <input
                          type="number" min="0" value={pagamentos[0]?.valor || ''}
                          onChange={(e) => setPagamentos([{ ...pagamentos[0], valor: e.target.value }, pagamentos[1] || { metodo: pagDuplo[1], valor: '' }])}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="R$ 0,00"
                        />
                      ) : (
                        <div className="flex-1 border border-slate-100 bg-slate-50 rounded-lg px-2 py-1 text-xs text-right text-slate-500">
                          {fmt(valorParcela)}
                        </div>
                      )}
                    </div>
                    {metodo === 'dinheiro' && (
                      <div className="flex items-center gap-2 ml-16">
                        <span className="text-xs text-slate-400">Recebido</span>
                        <input
                          type="number" min="0" value={pagamentos[idx]?.valorRecebido || ''}
                          onChange={(e) => { const u = [...pagamentos]; u[idx] = { ...u[idx], valorRecebido: e.target.value }; setPagamentos(u) }}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="0,00"
                        />
                      </div>
                    )}
                    {metodo === 'dinheiro' && Number(pagamentos[idx]?.valorRecebido) > 0 && (
                      <div className="flex justify-end text-xs font-semibold text-emerald-600 ml-16">
                        Troco: {fmt(Math.max(0, Number(pagamentos[idx].valorRecebido) - valorParcela))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {precisaCliente && (
            <div className="relative">
              <label className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Cliente (obrigatório para fiado)
              </label>
              {clienteSelecionado ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">{clienteSelecionado.nome}</p>
                    {clienteSelecionado.telefone && <p className="text-xs text-emerald-600">{clienteSelecionado.telefone}</p>}
                  </div>
                  <button onClick={() => { setClienteSelecionado(null); setBuscaCliente('') }} className="text-emerald-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={buscaCliente}
                    onChange={(e) => { setBuscaCliente(e.target.value); setClienteDropdown(true) }}
                    onFocus={() => setClienteDropdown(true)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Buscar cliente..."
                  />
                  {clienteDropdown && clientes.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-36 overflow-y-auto">
                      {clientes.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setClienteSelecionado(c); setClienteDropdown(false); setBuscaCliente('') }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition"
                        >
                          <p className="font-medium text-slate-800">{c.nome}</p>
                          {c.telefone && <p className="text-slate-400">{c.telefone}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={finalizar}
            disabled={carrinho.length === 0 || finalizando || (precisaCliente && !clienteSelecionado)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            {finalizando ? <>Finalizando...</> : <><Check className="w-4 h-4" /> Finalizar — {fmt(total)}</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="md:flex md:h-screen md:overflow-hidden">
      {/* Produtos — full width on mobile, left panel on desktop */}
      <div className="flex-1 flex flex-col min-w-0 md:border-r border-slate-200">
        <div className="sticky top-14 md:static z-10 p-3 md:p-4 bg-white border-b border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="pdv-search"
              ref={buscaRef}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              placeholder="Buscar produto ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${
            scannerAtivo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <ScanLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{scannerAtivo ? 'Lendo...' : 'Scanner'}</span>
          </div>
        </div>

        <div className="p-3 md:p-4 md:flex-1 md:overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 content-start bg-slate-50 pb-40 md:pb-4">
          {produtosFiltrados.map((p) => (
            <button
              key={p.id}
              onClick={() => addCarrinho(p)}
              className="bg-white border border-slate-200 active:border-indigo-400 active:scale-95 hover:border-indigo-300 hover:shadow-md rounded-2xl p-3 text-left transition-all group"
            >
              <div className="w-full aspect-square bg-slate-100 rounded-xl mb-2 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 transition-colors">
                <Package className="w-7 h-7" />
              </div>
              <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{p.nome}</p>
              {p.tamanho && <p className="text-[10px] text-slate-400 mt-0.5">Tam. {p.tamanho}</p>}
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-sm font-bold text-indigo-600">{fmt(p.preco)}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  p.estoque <= p.estoque_minimo ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {p.estoque}
                </span>
              </div>
            </button>
          ))}
          {produtosFiltrados.length === 0 && (
            <div className="col-span-2 sm:col-span-3 xl:col-span-4 flex flex-col items-center justify-center py-16 text-slate-400">
              <Package className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: cart sidebar */}
      <div className="hidden md:flex w-80 xl:w-96 flex-col bg-white flex-shrink-0">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Carrinho</h2>
          {carrinho.length > 0 && (
            <button onClick={() => setCarrinho([])} className="text-xs text-red-500 hover:text-red-700 transition">
              Limpar
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {carrinhoConteudo()}
        </div>
      </div>

      {/* Mobile: overlay */}
      {carrinhoAberto && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[100]"
          onClick={() => setCarrinhoAberto(false)}
        />
      )}

      {/* Mobile: cart bottom sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-[110] bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          carrinhoAberto ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Carrinho</h2>
            {totalItens > 0 && (
              <p className="text-xs text-slate-400">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {carrinho.length > 0 && (
              <button onClick={() => setCarrinho([])} className="text-xs text-red-500">Limpar</button>
            )}
            <button
              onClick={() => setCarrinhoAberto(false)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carrinhoConteudo()}
        </div>
      </div>

      {/* Mobile: floating cart button */}
      {!carrinhoAberto && (
        <div className="md:hidden fixed bottom-20 inset-x-4 z-50">
          {carrinho.length > 0 ? (
            <button
              onClick={() => setCarrinhoAberto(true)}
              className="w-full bg-indigo-600 text-white py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-indigo-600 text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {totalItens}
                  </span>
                </div>
                <span className="font-semibold text-sm">Ver Carrinho</span>
              </div>
              <span className="font-bold">{fmt(total)}</span>
            </button>
          ) : (
            <div className="w-full bg-white/90 border border-slate-200 text-slate-400 py-3 px-4 rounded-2xl flex items-center gap-2 text-xs shadow-sm">
              <ShoppingCart className="w-4 h-4 flex-shrink-0" />
              <span>Toque em um produto para adicionar</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
