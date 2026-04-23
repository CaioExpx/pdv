'use client'

import { usePathname } from 'next/navigation'
import Navigation from './Navigation'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

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
    </>
  )
}
