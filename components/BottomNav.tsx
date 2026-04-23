'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Package, BookOpen, FileText } from 'lucide-react'

const items = [
  { href: '/', label: 'Início', icon: LayoutDashboard },
  { href: '/pdv', label: 'PDV', icon: ShoppingCart },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/fiado', label: 'Fiado', icon: BookOpen },
  { href: '/vendas', label: 'Vendas', icon: FileText },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden safe-area-bottom">
      <div className="flex items-stretch h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-indigo-50' : ''}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              </div>
              <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
