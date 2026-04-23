// Script de importação local — rode com: node scripts/import-produtos.mjs caminho/para/arquivo.csv
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = 'https://mclfgimefoeaweriaocl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_fRZuW2yYKR3cEBxOFvVjNQ_6pZGW13p'
const EMAIL = 'robertamacedoa@gmail.com'
const SENHA = 'amomeufilhocaio27'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parsePrice(val = '') {
  return parseFloat(val.replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.').trim()) || 0
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

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Uso: node scripts/import-produtos.mjs caminho/para/arquivo.csv')
    process.exit(1)
  }

  // Login
  console.log('🔐 Fazendo login...')
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: SENHA })
  if (loginError) {
    console.error('❌ Erro no login:', loginError.message)
    process.exit(1)
  }
  console.log('✅ Login OK')

  // Ler arquivo
  const buffer = readFileSync(resolve(filePath))
  let text
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    text = decoder.decode(buffer)
  } catch {
    text = new TextDecoder('iso-8859-1').decode(buffer)
    console.log('📝 Encoding detectado: ISO-8859-1')
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim())
  console.log(`📊 Total de linhas: ${lines.length - 1} produto(s)`)

  // Parsear produtos e deduplicar por código de barras
  const vistos = new Set()
  const produtos = []

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
        : codigoInterno && codigoInterno.length > 4 ? codigoInterno : null

    // Pular duplicatas de código de barras
    const chave = barcode || `nome::${nome}`
    if (vistos.has(chave)) continue
    vistos.add(chave)

    produtos.push({
      nome,
      codigo_barras: barcode,
      preco_custo: parsePrice(col[2]) || null,
      preco: parsePrice(col[3]),
      estoque: Math.max(0, parseInt(col[4]) || 0),
      estoque_minimo: parseInt(col[5]) || 0,
      unidade: 'UN',
      ativo: true,
    })
  }

  console.log(`✂️  Após deduplicação: ${produtos.length} produto(s) únicos`)

  // Importar em lotes de 100
  const BATCH = 100
  let importados = 0
  let erros = 0
  let erroExemplo = null

  for (let i = 0; i < produtos.length; i += BATCH) {
    const lote = produtos.slice(i, i + BATCH)
    const { error } = await supabase.from('produtos').insert(lote)

    if (error) {
      // Tentar um por um para salvar o máximo possível
      for (const prod of lote) {
        const { error: e2 } = await supabase.from('produtos').insert([prod])
        if (e2) {
          erros++
          if (!erroExemplo) erroExemplo = { erro: e2.message, produto: prod.nome }
        } else {
          importados++
        }
      }
    } else {
      importados += lote.length
    }

    const pct = Math.round(((i + lote.length) / produtos.length) * 100)
    process.stdout.write(`\r⏳ ${i + lote.length}/${produtos.length} (${pct}%) — ✅ ${importados} importados, ❌ ${erros} erros`)
  }

  console.log('\n')
  console.log(`✅ Importados com sucesso: ${importados}`)
  if (erros > 0) {
    console.log(`❌ Erros: ${erros}`)
    if (erroExemplo) console.log(`   Exemplo de erro: "${erroExemplo.produto}" → ${erroExemplo.erro}`)
  }
}

main().catch(console.error)
