'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'

type Step = 'upload' | 'preview' | 'importing' | 'done'

interface ProdutoRow {
  nome: string
  codigo_barras: string
  preco_custo: number
  preco_venda: number
  estoque: number
  estoque_minimo: number
}

function parsePrice(val: string): number {
  const cleaned = val.replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current.trim())
  return cols
}

function processCSV(text: string): ProdutoRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const rows: ProdutoRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const col = parseCSVLine(lines[i])
    if (col.length < 4) continue

    const nome = col[1]?.replace(/^"|"$/g, '').trim()
    if (!nome) continue

    const codigoInterno = col[0]?.trim()
    const codigoBarras = col[9]?.trim()
    const barcode = codigoBarras && codigoBarras !== codigoInterno && codigoBarras.length > 4
      ? codigoBarras
      : codigoInterno && codigoInterno.length > 4
        ? codigoInterno
        : ''

    const estoque = parseInt(col[4]) || 0

    rows.push({
      nome,
      codigo_barras: barcode,
      preco_custo: parsePrice(col[2] || '0'),
      preco_venda: parsePrice(col[3] || '0'),
      estoque: Math.max(0, estoque),
      estoque_minimo: parseInt(col[5]) || 0,
    })
  }
  return rows
}

export default function ImportarPage() {
  const [step, setStep] = useState<Step>('upload')
  const [produtos, setProdutos] = useState<ProdutoRow[]>([])
  const [fileName, setFileName] = useState('')
  const [progresso, setProgresso] = useState(0)
  const [total, setTotal] = useState(0)
  const [erros, setErros] = useState(0)
  const [importados, setImportados] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const processFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      let text: string
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      } catch {
        text = new TextDecoder('iso-8859-1').decode(buffer)
      }
      const rows = processCSV(text)
      setProdutos(rows)
      setStep('preview')
    }
    reader.readAsArrayBuffer(file)
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) processFile(file)
  }

  async function iniciarImportacao() {
    setStep('importing')
    setTotal(produtos.length)
    setProgresso(0)
    setErros(0)
    setImportados(0)

    const BATCH = 50
    let importadosCount = 0
    let errosCount = 0

    for (let i = 0; i < produtos.length; i += BATCH) {
      const lote = produtos.slice(i, i + BATCH).map((p) => ({
        nome: p.nome,
        codigo_barras: p.codigo_barras || null,
        preco_custo: p.preco_custo,
        preco_venda: p.preco_venda,
        estoque: p.estoque,
        estoque_minimo: p.estoque_minimo,
        ativo: true,
      }))

      const { error } = await supabase.from('produtos').upsert(lote, {
        onConflict: 'codigo_barras',
        ignoreDuplicates: false,
      })

      if (error) {
        // fallback: insert one by one
        for (const prod of lote) {
          const { error: e2 } = await supabase.from('produtos').upsert([prod], {
            onConflict: 'codigo_barras',
            ignoreDuplicates: false,
          })
          if (e2) errosCount++
          else importadosCount++
        }
      } else {
        importadosCount += lote.length
      }

      setProgresso(Math.min(i + BATCH, produtos.length))
      setImportados(importadosCount)
      setErros(errosCount)
    }

    setStep('done')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (step === 'upload') {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Importar Produtos</h1>
          <p className="text-slate-500 text-sm">Importe produtos de um arquivo CSV</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-indigo-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Clique ou arraste o arquivo CSV</p>
          <p className="text-xs text-slate-400">Exportado do sistema de gestão (máx. 10MB)</p>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 space-y-1.5">
          <p className="font-semibold text-slate-700 mb-2">Formato esperado (colunas):</p>
          <p>0 — Código interno · 1 — Descrição · 2 — Preço de Custo · 3 — Preço de Venda</p>
          <p>4 — Estoque · 5 — Estoque mínimo · 9 — Código de Barras</p>
          <p className="mt-2 text-slate-400">Produtos com código de barras duplicado serão atualizados.</p>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    const preview = produtos.slice(0, 10)
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pré-visualização</h1>
            <p className="text-slate-500 text-sm">
              <FileText className="inline w-3.5 h-3.5 mr-1" />{fileName} · {produtos.length.toLocaleString('pt-BR')} produto(s) encontrado(s)
            </p>
          </div>
          <button onClick={() => { setStep('upload'); setProdutos([]); setFileName('') }} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Nome', 'Cód. Barras', 'Custo', 'Venda', 'Estoque'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800 font-medium max-w-[200px] truncate">{p.nome}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">{p.codigo_barras || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{fmt(p.preco_custo)}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-semibold">{fmt(p.preco_venda)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.estoque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {produtos.length > 10 && (
            <div className="px-4 py-3 border-t border-slate-50 text-xs text-slate-400 text-center">
              +{(produtos.length - 10).toLocaleString('pt-BR')} produto(s) não exibido(s)
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('upload'); setProdutos([]); setFileName('') }}
            className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-medium hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={iniciarImportacao}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition"
          >
            Importar {produtos.length.toLocaleString('pt-BR')} produtos
          </button>
        </div>
      </div>
    )
  }

  if (step === 'importing') {
    const pct = total > 0 ? Math.round((progresso / total) * 100) : 0
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-900 text-lg">Importando produtos...</p>
          <p className="text-slate-500 text-sm mt-1">{progresso.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}</p>
        </div>
        <div className="w-full max-w-sm">
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-right mt-1">{pct}%</p>
        </div>
        {erros > 0 && (
          <p className="text-xs text-amber-600">{erros} erro(s) ao importar</p>
        )}
      </div>
    )
  }

  // done
  return (
    <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-5">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${erros === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {erros === 0
          ? <CheckCircle className="w-8 h-8 text-emerald-500" />
          : <AlertCircle className="w-8 h-8 text-amber-500" />
        }
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-slate-900 text-xl">Importação concluída</p>
        <p className="text-slate-500 text-sm">{importados.toLocaleString('pt-BR')} produto(s) importado(s) com sucesso</p>
        {erros > 0 && <p className="text-amber-600 text-sm">{erros} produto(s) com erro</p>}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => { setStep('upload'); setProdutos([]); setFileName(''); setProgresso(0) }}
          className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-medium hover:bg-slate-50 transition"
        >
          Nova importação
        </button>
        <a href="/produtos" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition text-center">
          Ver produtos
        </a>
      </div>
    </div>
  )
}
