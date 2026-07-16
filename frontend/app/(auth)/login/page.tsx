'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validators'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api/client'
import type { MeResponse } from '@/types'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { safePostLoginPath } from '@/lib/auth/redirect'
import { callbackErrorMessage, friendlyAuthError, isProfileMissingError } from '@/lib/api/errors'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const message = callbackErrorMessage(new URLSearchParams(window.location.search).get('error'))
    if (message) toast.error(message)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(friendlyAuthError(error))
      return
    }

    const requestedPath = safePostLoginPath(new URLSearchParams(window.location.search).get('redirect'))
    const accessToken = authData.session?.access_token
    if (!accessToken) {
      toast.error('Não foi possível iniciar sua sessão. Tente entrar novamente.')
      return
    }

    try {
      const me = await apiClient.get<MeResponse>('/auth/me', undefined, accessToken)
      router.push(me.empresa_id ? (requestedPath ?? '/dashboard') : '/onboarding')
    } catch (error) {
      const apiError = error as { status?: number; message?: string }
      if (isProfileMissingError(apiError)) {
        router.push('/onboarding')
        return
      }
      if (!apiError.status || apiError.status >= 500) {
        toast.warning('Você entrou, mas o serviço está temporariamente indisponível.')
        router.push(requestedPath ?? '/dashboard')
        return
      }
      toast.error(apiError.message ?? 'Não foi possível conectar à API.')
    }
  }

  return (
    <AuthCard title="Entrar" description="Acesse sua conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="pl-10"
              hasError={!!errors.email}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              className="pl-10 pr-10"
              hasError={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="lembrar"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <Label htmlFor="lembrar" className="text-sm font-normal">
            Lembrar de mim
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Entrar
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/esqueci-senha"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
          <Link
            href="/cadastro"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
