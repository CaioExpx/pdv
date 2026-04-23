'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Package, FileText } from 'lucide-react'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pdv', label: 'PDV / Caixa', icon: ShoppingCart },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/vendas', label: 'Vendas', icon: FileText },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">PDV</h1>
        <p className="text-xs text-gray-400 mt-1">Ponto de Venda</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
