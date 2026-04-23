'use client'

import { usePathname } from 'next/navigation'
import Navigation from './Navigation'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

const VERSION = '1.0.0'
const BUILD = '2026.04.23'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) return <>{children}</>

  return (
    <>
      {/* Desktop: sidebar */}
      <Navigation />

      {/* Mobile: top header */}
      <MobileHeader />

      {/* Conteúdo principal */}
      <main className="
        md:ml-60 min-h-screen bg-slate-50
        pb-20 md:pb-0
      ">
        {children}
      </main>

      {/* Mobile: bottom nav */}
      <BottomNav />

      {/* Versão do app */}
      <div className="fixed bottom-2 right-2 text-[10px] text-slate-300 md:text-slate-400 z-0">
        v{VERSION} · {BUILD}
      </div>
    </>
  )
}
