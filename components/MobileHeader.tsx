'use client'

import { ShoppingBag } from 'lucide-react'

export default function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 h-14 flex items-center px-4 gap-3">
      <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 leading-tight">Bambolê Kids</p>
        <p className="text-xs text-slate-400">PDV</p>
      </div>
    </header>
  )
}
