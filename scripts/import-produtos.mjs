import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://mclfgimefoeaweriaocl.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_fRZuW2yYKR3cEBxOFvVjNQ_6pZGW13p';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parsePrice(value) {
  if (!value || value === '.') return 0;
  const cleaned = value.replace('R$', '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function importProducts() {
  const csvPath = 'C:/Users/Caio Macedo/OneDrive/Área de Trabalho/planilha nova.csv';
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1);

  const products = [];
  let imported = 0;
  let errors = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/"([^"]+)"|[^,]+/g);
    if (!match) continue;

    const getValue = (idx) => {
      if (idx >= match.length) return '';
      let v = match[idx].trim();
      v = v.replace(/^"|"$/g, '').replace(/^"|"$/g, '');
      return v;
    };

    const descricao = getValue(1);
    const precoCusto = parsePrice(getValue(2));
    const precoVenda = parsePrice(getValue(3));
    const estoque = parseInt(getValue(4)) || 0;
    const estoqueMinimo = parseInt(getValue(5)) || 0;
    const codigoBarras = getValue(9) || null;

    if (!descricao || descricao.includes('Descri')) continue;

    products.push({
      nome: descricao.toUpperCase(),
      preco: precoVenda || precoCusto * 2,
      preco_custo: precoCusto,
      estoque: estoque,
      estoque_minimo: estoqueMinimo,
      codigo_barras: codigoBarras || null,
      unidade: 'UN',
      ativo: true
    });

    imported++;
  }

  console.log(`Parsed ${imported} products, inserting...`);

  for (const product of products) {
    const { error } = await supabase.from('produtos').insert(product);
    if (error) {
      errors++;
      if (errors <= 5) console.log('Error:', error.message);
    }
  }

  console.log(`Done! Imported ${imported} products with ${errors} errors.`);
}

importProducts().catch(console.error);