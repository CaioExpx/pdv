'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingCart, Package, FileText,
  Truck, Users, BookOpen, LogOut, ShoppingBag
} from 'lucide-react'

const grupos = [
  {
    titulo: 'Vendas',
    links: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pdv', label: 'PDV / Caixa', icon: ShoppingCart },
      { href: '/fiado', label: 'Fiado', icon: BookOpen },
      { href: '/vendas', label: 'Histórico', icon: FileText },
    ],
  },
  {
    titulo: 'Cadastros',
    links: [
      { href: '/produtos', label: 'Produtos', icon: Package },
      { href: '/fornecedores', label: 'Fornecedores', icon: Truck },
      { href: '/clientes', label: 'Clientes', icon: Users },
    ],
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Bambolê Kids</p>
            <p className="text-slate-400 text-xs">Ponto de Venda</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {grupos.map(({ titulo, links }) => (
          <div key={titulo}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">
              {titulo}
            </p>
            <div className="space-y-0.5">
              {links.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
