'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { friendlyAuthError } from '@/lib/api/errors'

const redefinirSenhaSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Mínimo de 6 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
        'A senha deve conter pelo menos 6 caracteres, uma letra maiúscula e um número'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [supabase])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(redefinirSenhaSchema),
  })

  async function onSubmit(data: RedefinirSenhaInput) {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      toast.error(friendlyAuthError(error))
      return
    }

    toast.success('Senha redefinida com sucesso!')
    router.push('/login')
  }

  if (hasSession === null) {
    return (
      <AuthCard title="Validando link" description="Aguarde um instante...">
        <span className="sr-only">Validando sua sessão de recuperação.</span>
      </AuthCard>
    )
  }

  if (!hasSession) {
    return (
      <AuthCard title="Link inválido ou expirado">
        <div className="space-y-4 text-center text-sm text-muted-foreground">
          <p>Solicite um novo link para redefinir sua senha.</p>
          <Link href="/esqueci-senha" className="underline-offset-4 hover:underline hover:text-foreground">
            Solicitar novo link
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Redefinir senha"
      description="Escolha uma nova senha para sua conta"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha"
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repita a nova senha"
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Redefinir senha
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="underline-offset-4 hover:underline hover:text-foreground"
          >
            Voltar para o login
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
