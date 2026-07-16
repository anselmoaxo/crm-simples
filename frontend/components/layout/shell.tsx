'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'
import type { PerfilTipo } from '@/types'

interface ShellProps {
  children: React.ReactNode
  perfil?: PerfilTipo
  userName?: string
  userEmail?: string
  userPerfil?: string
  empresaNome?: string
  onLogout: () => void
}

export function Shell({
  children,
  perfil,
  userName,
  userEmail,
  userPerfil,
  empresaNome,
  onLogout,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        perfil={perfil}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden transition-[padding] duration-200',
          sidebarOpen ? 'lg:pl-60' : 'lg:pl-16',
        )}
      >
        <Header
          onMenuToggle={() => setMobileSidebarOpen(true)}
          userName={userName}
          userEmail={userEmail}
          userPerfil={userPerfil}
          empresaNome={empresaNome}
          onLogout={onLogout}
        />

        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
