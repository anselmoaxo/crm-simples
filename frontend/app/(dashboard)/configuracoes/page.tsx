'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { ConfirmDialog } from '@/components/formularios/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/lib/api/client'
import { createClientesTeste } from '@/lib/api/clientes'
import { Building2, FlaskConical, Mail, Shield, User } from 'lucide-react'
import type { MeResponse } from '@/types'
import { toast } from 'sonner'

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => apiClient.get<MeResponse>('/auth/me', signal),
  })

  const testDataMutation = useMutation({
    mutationFn: createClientesTeste,
    onSuccess: ({ criados, ignorados }) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success(
        criados
          ? `${criados} clientes de teste adicionados.`
          : 'Os clientes de teste já estavam cadastrados.',
        { description: ignorados ? `${ignorados} registros duplicados foram ignorados.` : undefined },
      )
    },
    onError: (error: Error) => toast.error(error.message || 'Não foi possível criar os dados de teste.'),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Informações da empresa e do usuário" />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{user?.empresa_nome ?? '—'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-medium">Grátis</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{user?.nome ?? '—'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email
                </p>
                <p className="font-medium">{user?.email ?? '—'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Perfil
                </p>
                <Badge variant="secondary" className="mt-1">
                  {user?.perfil === 'ADMIN' ? 'Admin' : user?.perfil === 'GERENTE' ? 'Gerente' : 'Vendedor'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            Dados para testes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="font-medium">Popular clientes fictícios</p>
            <p className="text-sm text-muted-foreground">
              Adiciona 10 clientes identificados com “(Teste)” à empresa atual, sem duplicar registros.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={testDataMutation.isPending}
            onClick={() => setConfirmOpen(true)}
            className="w-full shrink-0 sm:w-auto"
          >
            <FlaskConical />
            {testDataMutation.isPending ? 'Gerando...' : 'Gerar clientes'}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Adicionar clientes de teste?"
        description="Serão criados até 10 registros fictícios na empresa atual. Executar novamente não gera duplicatas."
        confirmLabel="Adicionar clientes"
        onConfirm={() => testDataMutation.mutate()}
      />
    </div>
  )
}
