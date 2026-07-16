'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Users,
  Target,
  CheckSquare,
  Funnel,
  UserCog,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import type { PerfilTipo } from '@/types'

interface MenuItem {
  label: string
  icon: React.ElementType
  href: string
  allowedPerfis: PerfilTipo[]
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', allowedPerfis: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
  { label: 'Clientes', icon: Users, href: '/clientes', allowedPerfis: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
  { label: 'Oportunidades', icon: Target, href: '/oportunidades', allowedPerfis: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
  { label: 'Atividades', icon: CheckSquare, href: '/atividades', allowedPerfis: ['ADMIN', 'GERENTE', 'VENDEDOR'] },
  { label: 'Funil de Vendas', icon: Funnel, href: '/configuracoes/funil', allowedPerfis: ['ADMIN'] },
  { label: 'Equipe', icon: UserCog, href: '/equipe', allowedPerfis: ['ADMIN', 'GERENTE'] },
  { label: 'Relatórios', icon: BarChart3, href: '/relatorios', allowedPerfis: ['ADMIN', 'GERENTE'] },
  { label: 'Configurações', icon: Settings, href: '/configuracoes', allowedPerfis: ['ADMIN'] },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  perfil?: PerfilTipo
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ isOpen, onToggle, perfil, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!mobileOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileOpen, onMobileClose])

  const filteredItems = menuItems.filter(
    (item) => perfil && item.allowedPerfis.includes(perfil),
  )

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shrink-0">
          C
        </div>
        <span className={cn('text-sm font-semibold truncate', !isOpen && 'lg:hidden')}>
          CRM Anselmo
        </span>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isOpen ? item.label : undefined}
                onClick={onMobileClose}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn('truncate', !isOpen && 'lg:hidden')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center lg:justify-center"
          title={isOpen ? 'Recolher' : 'Expandir'}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className={cn('sr-only', !isOpen && 'lg:sr-only')}>
            {isOpen ? 'Recolher' : 'Expandir'}
          </span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
       {mobileOpen && (
         <button
           type="button"
           aria-label="Fechar menu de navegação"
           className="fixed inset-0 z-40 bg-black/50 lg:hidden"
           onClick={onMobileClose}
         />
      )}

      {/* Mobile drawer */}
       <div
         role="dialog"
         aria-modal={mobileOpen ? true : undefined}
         aria-label="Menu de navegação"
         aria-hidden={!mobileOpen}
         inert={!mobileOpen}
         className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
         <button
           ref={closeButtonRef}
           type="button"
           aria-label="Fechar menu de navegação"
           onClick={onMobileClose}
           className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 lg:flex',
          isOpen ? 'w-60' : 'w-16',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
