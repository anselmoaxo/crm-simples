'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingSchema, type OnboardingInput } from '@/lib/validators'
import { apiClient } from '@/lib/api/client'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Building2, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { MeResponse } from '@/types'

export default function OnboardingPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  })

  async function onSubmit(data: OnboardingInput) {
    try {
      await apiClient.post('/auth/onboarding', {
        nome_usuario: data.nome_usuario,
        nome_empresa: data.nome_empresa,
      })
      toast.success('Cadastro concluído com sucesso!')
      router.push('/dashboard')
    } catch (err) {
      const error = err as { status?: number; message?: string }
      if (error.status === 409) {
        try {
          const me = await apiClient.get<MeResponse>('/auth/me')
          if (me.empresa_id) {
            toast.success('Seu cadastro já estava concluído.')
            router.push('/dashboard')
            return
          }
        } catch {
          // Exibe abaixo o erro original do onboarding.
        }
      }
      toast.error(error.status
        ? (error.message ?? 'Erro ao finalizar cadastro')
        : 'O serviço está temporariamente indisponível. Tente novamente em instantes.')
    }
  }

  return (
    <AuthCard
      title="Finalizar cadastro"
      description="Configure sua conta e empresa"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome_usuario">Nome do usuário</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome_usuario"
              placeholder="Seu nome de usuário"
              className="pl-10"
              hasError={!!errors.nome_usuario}
              {...register('nome_usuario')}
            />
          </div>
          {errors.nome_usuario && (
            <p className="text-sm text-destructive">
              {errors.nome_usuario.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome_empresa">Nome da empresa</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome_empresa"
              placeholder="Nome da sua empresa"
              className="pl-10"
              hasError={!!errors.nome_empresa}
              {...register('nome_empresa')}
            />
          </div>
          {errors.nome_empresa && (
            <p className="text-sm text-destructive">
              {errors.nome_empresa.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Concluir cadastro
        </Button>
      </form>
    </AuthCard>
  )
}
