'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api/client'
import { listPerfis, updatePerfil } from '@/lib/api/perfis'
import { Users, Search, Shield, UserCog, User } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import type { Column } from '@/components/ui/data-table'
import type { MeResponse, Perfil } from '@/types'
import { toast } from 'sonner'

const perfilLabels: Record<string, string> = {
  ADMIN: 'Admin',
  GERENTE: 'Gerente',
  VENDEDOR: 'Vendedor',
}

const perfilOptions = [
  { value: '', label: 'Todos os perfis' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'GERENTE', label: 'Gerente' },
  { value: 'VENDEDOR', label: 'Vendedor' },
]

const situacaoOptions = [
  { value: '', label: 'Todas' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
]

export default function EquipePage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [perfilFilter, setPerfilFilter] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('')
  const [editingMember, setEditingMember] = useState<Perfil | null>(null)
  const [editName, setEditName] = useState('')

  const membersQuery = useQuery({
    queryKey: ['perfis'],
    queryFn: ({ signal }) => listPerfis(signal),
  })

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) =>
      apiClient.get<MeResponse>('/auth/me', signal),
  })

  const isAdmin = currentUser?.perfil === 'ADMIN'
  const members = membersQuery.data

  const updateMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) =>
      updatePerfil(id, { nome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] })
      toast.success('Membro atualizado com sucesso')
      setEditingMember(null)
    },
    onError: (error: Error) => toast.error(error.message || 'Não foi possível atualizar o membro'),
  })

  function openEdit(member: Perfil) {
    setEditingMember(member)
    setEditName(member.nome)
  }

  const filteredMembers = useMemo(() => {
    if (!members) return []
    return members.filter((m) => {
      if (search && !m.nome.toLowerCase().includes(search.toLowerCase())) return false
      if (perfilFilter && m.perfil !== perfilFilter) return false
      if (situacaoFilter === 'ativo' && !m.ativo) return false
      if (situacaoFilter === 'inativo' && m.ativo) return false
      return true
    })
  }, [members, search, perfilFilter, situacaoFilter])

  const columns: Column<Perfil>[] = [
    {
      key: 'nome',
      header: 'Nome',
      sortable: true,
      accessor: (m) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {m.nome.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <p className="font-medium">{m.nome}</p>
        </div>
      ),
    },
    {
      key: 'perfil',
      header: 'Perfil',
      sortable: true,
      accessor: (m) => {
        const icon = m.perfil === 'ADMIN' ? Shield : m.perfil === 'GERENTE' ? UserCog : User
        const Icon = icon
        return (
          <Badge variant="secondary" className="gap-1">
            <Icon className="h-3 w-3" />
            {perfilLabels[m.perfil] ?? m.perfil}
          </Badge>
        )
      },
    },
    {
      key: 'ativo',
      header: 'Situação',
      sortable: true,
      sortKey: 'ativo',
      accessor: (m) => (
        <Badge variant={m.ativo ? 'default' : 'secondary'}>
          {m.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'acoes' as const,
            header: 'Ações',
            accessor: (member: Perfil) => (
              <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                Editar
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Equipe" description="Gerencie os membros da sua equipe" />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-[200px] sm:basis-auto sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={perfilFilter}
          onChange={(e) => setPerfilFilter(e.target.value)}
          options={perfilOptions}
          className="w-full sm:w-40"
        />
        <Select
          value={situacaoFilter}
          onChange={(e) => setSituacaoFilter(e.target.value)}
          options={situacaoOptions}
          className="w-full sm:w-36"
        />
      </div>

      {membersQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : membersQuery.isError ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Erro ao carregar equipe"
          description={membersQuery.error.message || 'Tente novamente mais tarde.'}
        />
      ) : !members || members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nenhum membro na equipe"
          description="Nenhum perfil foi cadastrado para esta empresa."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredMembers}
          pageSize={10}
          rowKey={(m) => m.id}
        />
      )}

      <Dialog open={!!editingMember && isAdmin} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar membro</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!editingMember || !isAdmin) return
              updateMutation.mutate({ id: editingMember.id, nome: editName.trim() })
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome</Label>
              <Input id="member-name" value={editName} onChange={(event) => setEditName(event.target.value)} required minLength={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Perfil e métricas de desempenho não estão disponíveis para edição neste contrato.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending || editName.trim().length < 2}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
