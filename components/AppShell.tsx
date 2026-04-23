'use client'

import { usePathname } from 'next/navigation'
import Navigation from './Navigation'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) return <>{children}</>

  return (
    <>
      <Navigation />
      <main className="ml-60 min-h-screen bg-slate-50">
        {children}
      </main>
    </>
  )
}
