import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function parsePrice(value) {
  if (!value || value === '.') return 0
  const cleaned = value.replace('R$', '').replace(',', '.').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseCSVLine(line) {
  const cols = []
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

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const csvPath = 'C:/Users/Caio Macedo/OneDrive/Área de Trabalho/planilha nova.csv'
    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.split('\n').slice(1)

    const produtos = []
    const seen = new Set()

    for (const line of lines) {
      if (!line.trim()) continue
      
      const col = parseCSVLine(line)
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
      
      const key = barcode || `nome::${nome}`
      if (seen.has(key)) continue
      seen.add(key)

      produtos.push({
        nome: nome.toUpperCase(),
        preco: parsePrice(col[3] || '0'),
        preco_custo: parsePrice(col[2] || '0'),
        estoque: Math.max(0, parseInt(col[4]) || 0),
        estoque_minimo: parseInt(col[5]) || 0,
        codigo_barras: barcode || null,
        unidade: 'UN',
        ativo: true
      })
    }

    const { data, error } = await supabase.rpc('importar_produtos', { p_produtos: produtos })

    if (error) {
      console.error('RPC Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, imported: data || produtos.length })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}