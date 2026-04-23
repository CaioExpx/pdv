import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function parsePrice(value: string): number {
  if (!value || value === '.') return 0
  const cleaned = value.replace('R$', '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}

function parseCSV(line: string): string[] {
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

export async function POST() {
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return [] },
        setAll() { }
      }
    })
    
    const csvPath = 'C:/Users/Caio Macedo/OneDrive/Área de Trabalho/planilha nova.csv'
    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.split('\n').slice(1)

    let inserted = 0
    let errors = 0
    const seen = new Set<string>()

    for (const line of lines) {
      if (!line.trim()) continue
      
      const col = parseCSV(line)
      if (col.length < 4) continue

      const nome = col[1]?.replace(/^"|"$/g, '').trim()
      if (!nome || nome.includes('Descri')) continue

      const codigoInterno = col[0]?.trim()
      const codigoBarras = col[9]?.trim()
      const barcode = codigoBarras && codigoBarras.length > 4 ? codigoBarras : (codigoInterno && codigoInterno.length > 4 ? codigoInterno : '')

      const key = barcode || `nome::${nome}`
      if (seen.has(key)) continue
      seen.add(key)

      const produto = {
        nome: nome.toUpperCase(),
        preco: parsePrice(col[3]),
        preco_custo: parsePrice(col[2]),
        estoque: Math.max(0, parseInt(col[4]) || 0),
        estoque_minimo: parseInt(col[5]) || 0,
        codigo_barras: barcode || null,
        unidade: 'UN',
        ativo: true
      }

      const { error } = await supabase.from('produtos').insert(produto)
      
      if (error) {
        errors++
      } else {
        inserted++
      }
    }

    return NextResponse.json({ success: true, imported: inserted, errors })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}