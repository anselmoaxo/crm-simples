import { AuthCard } from '@/components/auth/auth-card'
import { MailCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmarEmailPage() {
  return (
    <AuthCard title="Verifique seu e-mail">
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para seu e-mail.
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
