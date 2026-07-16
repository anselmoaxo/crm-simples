'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Shell } from '@/components/layout/shell'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api/client'
import type { ApiError } from '@/lib/api/client'
import { isProfileMissingError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import type { MeResponse } from '@/types'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const me = await apiClient.get<MeResponse>('/auth/me')
        if (!me.empresa_nome && !me.empresa_id) {
          router.replace('/onboarding')
          return
        }
        setUser(me)
      } catch (error) {
        const apiError = error as ApiError
        if (apiError.status === 401) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
          return
        }
        if (isProfileMissingError(apiError)) {
          router.replace('/onboarding')
          return
        }
        setLoadError(apiError.message ?? 'Não foi possível carregar sua conta.')
        return
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, pathname, retryCount])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md space-y-4 text-center" role="alert">
          <h1 className="text-xl font-semibold">Não foi possível carregar sua conta</h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={() => setRetryCount((count) => count + 1)}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <Shell
      perfil={user.perfil}
      userName={user.nome}
      userEmail={user.email}
      userPerfil={user.perfil}
      empresaNome={user.empresa_nome}
      onLogout={handleLogout}
    >
      {children}
    </Shell>
  )
}
