'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { callbackErrorMessage, friendlyAuthError } from '@/lib/api/errors'
import { useEffect } from 'react'

const esqueciSenhaSchema = z.object({
  email: z.string().min(1, 'Campo obrigatório').email('E-mail inválido'),
})

type EsqueciSenhaInput = z.infer<typeof esqueciSenhaSchema>

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const message = callbackErrorMessage(new URLSearchParams(window.location.search).get('error'))
    if (message) toast.error(message)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EsqueciSenhaInput>({
    resolver: zodResolver(esqueciSenhaSchema),
  })

  async function onSubmit(data: EsqueciSenhaInput) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    })

    if (error) {
      toast.error(friendlyAuthError(error))
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <AuthCard title="Verifique seu e-mail">
        <div className="space-y-4 text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Enviamos um link de redefinição de senha para o e-mail informado. Se o
            e-mail estiver cadastrado, você receberá as instruções em breve.
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Esqueci minha senha"
      description="Digite seu e-mail para receber um link de redefinição"
    >
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar link
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="underline-offset-4 hover:underline hover:text-foreground"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Voltar para o login
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
