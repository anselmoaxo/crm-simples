'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cadastroSchema, type CadastroInput } from '@/lib/validators'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { friendlyAuthError } from '@/lib/api/errors'

export default function CadastroPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
  })

  const password = useWatch({ control, name: 'password', defaultValue: '' })

  const strengthChecks = [
    { label: 'Mínimo 6 caracteres', ok: password.length >= 6 },
    { label: 'Uma letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', ok: /[a-z]/.test(password) },
    { label: 'Um número', ok: /\d/.test(password) },
  ]

  async function onSubmit(data: CadastroInput) {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: data.nome, email: data.email, password: data.password }),
    }).catch(() => null)

    if (!response) {
      toast.error('Não foi possível acessar o serviço de cadastro local.')
      return
    }

    const result = await response.json().catch(() => ({})) as {
      error?: { code?: string; message?: string }
      hasSession?: boolean
      existingUser?: boolean
    }

    if (!response.ok) {
      toast.error(friendlyAuthError(result.error))
      return
    }

    if (result.existingUser) {
      toast.info('Este e-mail já possui uma conta. Entre com sua senha.')
      router.push('/login')
      return
    }

    toast.success('Conta criada com sucesso!')
    if (result.hasSession) {
      router.push('/onboarding')
    } else {
      router.push('/confirmar-email')
    }
  }

  return (
    <AuthCard title="Criar conta" description="Preencha os dados para se cadastrar">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome"
              placeholder="Seu nome completo"
              className="pl-10"
              hasError={!!errors.nome}
              {...register('nome')}
            />
          </div>
          {errors.nome && (
            <p className="text-sm text-destructive">{errors.nome.message}</p>
          )}
        </div>

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
              placeholder="Crie uma senha"
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
          {password && (
            <ul className="space-y-1 text-xs">
              {strengthChecks.map((check) => (
                <li
                  key={check.label}
                  className={check.ok ? 'text-green-600' : 'text-muted-foreground'}
                >
                  {check.ok ? '✓' : '○'} {check.label}
                </li>
              ))}
            </ul>
          )}
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              className="pl-10 pr-10"
              hasError={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
              aria-pressed={showConfirmPassword}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <input
            id="aceiteTermos"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input accent-primary"
            {...register('aceiteTermos')}
          />
          <Label htmlFor="aceiteTermos" className="text-sm font-normal leading-relaxed">
            Aceito os termos de uso
          </Label>
        </div>
        {errors.aceiteTermos && (
          <p className="text-sm text-destructive">{errors.aceiteTermos.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar conta
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="underline-offset-4 hover:underline hover:text-foreground"
          >
            Fazer login
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
