'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, FileSearch } from 'lucide-react'

type Step = 'upload' | 'preview' | 'importing' | 'done'
type ErroDetalhe = { mensagem: string; produto: string } | null

interface ProdutoRow {
  nome: string
  codigo_barras: string
  preco_custo: number
  preco: number
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

  const vistos = new Set<string>()
  const rows: ProdutoRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const col = parseCSVLine(lines[i])
    if (col.length < 4) continue

    const nome = col[1]?.replace(/^"|"$/g, '').trim()
    if (!nome) continue

    const codigoInterno = col[0]?.trim()
    const codigoBarras = col[9]?.trim()
    const barcode =
      codigoBarras && codigoBarras !== codigoInterno && codigoBarras.length > 4
        ? codigoBarras
        : codigoInterno && codigoInterno.length > 4
          ? codigoInterno
          : ''

    // Deduplicar por código de barras
    const chave = barcode || `nome::${nome}`
    if (vistos.has(chave)) continue
    vistos.add(chave)

    rows.push({
      nome,
      codigo_barras: barcode,
      preco_custo: parsePrice(col[2] || '0'),
      preco: parsePrice(col[3] || '0'),
      estoque: Math.max(0, parseInt(col[4]) || 0),
      estoque_minimo: parseInt(col[5]) || 0,
    })
  }
  return rows
}

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let allText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const items = content.items as Array<{ str: string; transform: number[] }>

    // Group text items by Y position to reconstruct rows
    const byY: Record<number, Array<{ str: string; x: number }>> = {}
    for (const item of items) {
      const y = Math.round(item.transform[5])
      if (!byY[y]) byY[y] = []
      byY[y].push({ str: item.str, x: item.transform[4] })
    }

    // Sort Y positions descending (top to bottom), items by X ascending
    const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a)
    for (const y of sortedYs) {
      const lineItems = byY[y].sort((a, b) => a.x - b.x)
      allText += lineItems.map((i) => i.str).join('\t') + '\n'
    }
  }
  return allText
}

function processPDFText(text: string): ProdutoRow[] {
  const rows: ProdutoRow[] = []
  const lines = text.split('\n').filter((l) => l.trim())

  for (const line of lines) {
    // Skip header lines
    if (/código|descrição|preço|produto|nome|valor|total/i.test(line) && !/R\$/.test(line)) continue

    // Must have a price to be a product line
    const priceMatches = [...line.matchAll(/R\$\s*([\d.,]+)/gi)]
    if (priceMatches.length === 0) continue

    // Last price = venda, second-to-last = custo (if two prices)
    const precoVenda = parsePrice(priceMatches[priceMatches.length - 1][0])
    const precoCusto = priceMatches.length >= 2 ? parsePrice(priceMatches[priceMatches.length - 2][0]) : 0

    if (precoVenda <= 0) continue

    // Barcode: long digit sequence (8-14 digits)
    const barcodeMatch = line.match(/\b(\d{8,14})\b/)
    const barcode = barcodeMatch?.[1] || ''

    // Name: strip barcodes, prices, numbers-only tokens, then take what's left
    const nome = line
      .replace(/R\$\s*[\d.,]+/gi, '')
      .replace(/\b\d{8,14}\b/g, '')
      .replace(/\t/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s*\d+[\s.)]?\s*/, '') // strip leading code/index
      .trim()

    if (nome.length < 3) continue

    rows.push({ nome, codigo_barras: barcode, preco_custo: precoCusto, preco: precoVenda, estoque: 0, estoque_minimo: 0 })
  }

  return rows
}

export default function ImportarPage() {
  const [step, setStep] = useState<Step>('upload')
  const [produtos, setProdutos] = useState<ProdutoRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState<'csv' | 'pdf'>('csv')
  const [progresso, setProgresso] = useState(0)
  const [total, setTotal] = useState(0)
  const [erros, setErros] = useState(0)
  const [importados, setImportados] = useState(0)
  const [erroDetalhe, setErroDetalhe] = useState<ErroDetalhe>(null)
  const [dragging, setDragging] = useState(false)
  const [processando, setProcessando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setProcessando(true)

    const buffer = await file.arrayBuffer()

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setFileType('pdf')
      try {
        const text = await extractTextFromPDF(buffer)
        const rows = processPDFText(text)
        setProdutos(rows)
        setStep('preview')
      } catch (e) {
        console.error(e)
        alert('Não foi possível ler o PDF. Tente exportar como CSV.')
      }
    } else {
      setFileType('csv')
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

    setProcessando(false)
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function iniciarImportacao() {
    setStep('importing')
    setTotal(produtos.length)
    setProgresso(0)
    setErros(0)
    setImportados(0)
    setErroDetalhe(null)

    const BATCH = 100
    let importadosCount = 0
    let errosCount = 0
    let primeiroErro: ErroDetalhe = null

    for (let i = 0; i < produtos.length; i += BATCH) {
      const lote = produtos.slice(i, i + BATCH).map((p) => ({
        nome: p.nome,
        codigo_barras: p.codigo_barras || null,
        preco_custo: p.preco_custo || null,
        preco: p.preco,
        estoque: p.estoque,
        estoque_minimo: p.estoque_minimo,
        unidade: 'UN',
        ativo: true,
      }))

      const { error } = await supabase.from('produtos').insert(lote)

      if (error) {
        // Fallback: inserir um a um para salvar o máximo possível
        for (const prod of lote) {
          const { error: e2 } = await supabase.from('produtos').insert([prod])
          if (e2) {
            errosCount++
            if (!primeiroErro) primeiroErro = { mensagem: e2.message, produto: prod.nome }
          } else {
            importadosCount++
          }
        }
      } else {
        importadosCount += lote.length
      }

      setProgresso(Math.min(i + BATCH, produtos.length))
      setImportados(importadosCount)
      setErros(errosCount)
      if (primeiroErro) setErroDetalhe(primeiroErro)
    }

    setStep('done')
  }

  function resetar() {
    setStep('upload')
    setProdutos([])
    setFileName('')
    setProgresso(0)
    setImportados(0)
    setErros(0)
    setErroDetalhe(null)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (step === 'upload') {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Importar Produtos</h1>
          <p className="text-slate-500 text-sm">Importe sua lista de produtos via CSV ou PDF</p>
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
          {processando ? (
            <>
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Lendo arquivo...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-slate-400">Aceita CSV ou PDF exportado do seu sistema</p>
            </>
          )}
          <input ref={inputRef} type="file" accept=".csv,.pdf" className="hidden" onChange={handleFileInput} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-700">Formato CSV</span>
            </div>
            <p>Col 0 — Código · Col 1 — Descrição</p>
            <p>Col 2 — Custo · Col 3 — Venda</p>
            <p>Col 4 — Estoque · Col 9 — Cód. Barras</p>
            <p className="text-slate-400 mt-1">Duplicatas por código de barras serão atualizadas.</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <FileSearch className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-700">Formato PDF</span>
            </div>
            <p>O sistema vai tentar ler a tabela de produtos.</p>
            <p>Identifica nome, preço e código de barras automaticamente.</p>
            <p className="text-slate-400 mt-1">Recomendado usar CSV para maior precisão.</p>
          </div>
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
              {fileType === 'pdf' ? '📄' : '📊'} {fileName} · {produtos.length.toLocaleString('pt-BR')} produto(s) encontrado(s)
            </p>
          </div>
          <button onClick={resetar} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {produtos.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-800">Nenhum produto encontrado</p>
            <p className="text-xs text-amber-600 mt-1">
              {fileType === 'pdf' ? 'O PDF pode ter um formato diferente do esperado. Tente exportar como CSV.' : 'Verifique se o arquivo está no formato correto.'}
            </p>
            <button onClick={resetar} className="mt-3 text-xs text-amber-700 underline">Tentar outro arquivo</button>
          </div>
        ) : (
          <>
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
                        <td className="px-4 py-2.5 text-slate-600">{p.preco_custo > 0 ? fmt(p.preco_custo) : '—'}</td>
                        <td className="px-4 py-2.5 text-slate-700 font-semibold">{fmt(p.preco)}</td>
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
              <button onClick={resetar} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-medium hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={iniciarImportacao} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition">
                Importar {produtos.length.toLocaleString('pt-BR')} produtos
              </button>
            </div>
          </>
        )}
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
            <div className="bg-indigo-600 h-3 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-400 text-right mt-1">{pct}%</p>
        </div>
        {erros > 0 && <p className="text-xs text-amber-600">{erros} erro(s) ao importar</p>}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-5">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${erros === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {erros === 0
          ? <CheckCircle className="w-8 h-8 text-emerald-500" />
          : <AlertCircle className="w-8 h-8 text-amber-500" />}
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-slate-900 text-xl">Importação concluída</p>
        <p className="text-slate-500 text-sm">{importados.toLocaleString('pt-BR')} produto(s) importado(s) com sucesso</p>
        {erros > 0 && <p className="text-amber-600 text-sm">{erros} produto(s) com erro</p>}
        {erroDetalhe && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-left max-w-xs mx-auto">
            <p className="text-xs font-semibold text-red-700 mb-1">Motivo do erro:</p>
            <p className="text-xs text-red-600 font-mono break-all">{erroDetalhe.mensagem}</p>
            <p className="text-xs text-red-400 mt-1">Ex: {erroDetalhe.produto}</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={resetar} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-medium hover:bg-slate-50 transition">
          Nova importação
        </button>
        <a href="/produtos" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-semibold transition text-center">
          Ver produtos
        </a>
      </div>
    </div>
  )
}
