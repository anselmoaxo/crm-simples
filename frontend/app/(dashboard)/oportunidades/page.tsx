'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutList, Columns3, MoreHorizontal, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { KanbanBoard } from '@/components/oportunidades/kanban-board'
import { OportunidadeForm, type OportunidadeFormData } from '@/components/oportunidades/oportunidade-form'
import {
  listAllOportunidades,
  createOportunidade,
  getOportunidade,
  updateOportunidade,
} from '@/lib/api/oportunidades'
import { listEtapas, listFunis } from '@/lib/api/funis'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Oportunidade, EtapaFunil } from '@/types'
import type { OportunidadeCreate } from '@/lib/api/oportunidades'

type ViewMode = 'kanban' | 'list'

export default function OportunidadesPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(() =>
    Boolean(searchParams.get('cliente_id') || searchParams.get('oportunidade_id') || searchParams.get('acao') === 'nova'),
  )
  const [editingOportunidade, setEditingOportunidade] = useState<Oportunidade | null>(null)

  const funisQuery = useQuery({
    queryKey: ['funis'],
    queryFn: ({ signal }) => listFunis(signal),
  })
  const funis = funisQuery.data
  const funilId = selectedFunilId ?? funis?.[0]?.id ?? null

  const etapasQuery = useQuery({
    queryKey: ['etapas', funilId],
    queryFn: ({ signal }) => listEtapas(funilId!, signal),
    enabled: !!funilId,
  })
  const etapas = etapasQuery.data

  const oportunidadesQuery = useQuery({
    queryKey: ['oportunidades', funilId],
    queryFn: ({ signal }) => listAllOportunidades({ funil_id: funilId! }, signal),
    enabled: !!funilId,
  })

  const oportunidades = useMemo(() => oportunidadesQuery.data ?? [], [oportunidadesQuery.data])
  const oportunidadeId = searchParams.get('oportunidade_id')
  const oportunidadeQuery = useQuery({
    queryKey: ['oportunidade', oportunidadeId],
    queryFn: ({ signal }) => getOportunidade(oportunidadeId!, signal),
    enabled: !!oportunidadeId,
  })
  const activeOportunidade = editingOportunidade ?? oportunidadeQuery.data ?? null

  const etapaMap = useMemo(() => {
    const map = new Map<string, EtapaFunil>()
    if (etapas) {
      for (const etapa of etapas) {
        map.set(etapa.id, etapa)
      }
    }
    return map
  }, [etapas])

  const createMutation = useMutation({
    mutationFn: (data: OportunidadeCreate) => createOportunidade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      toast.success('Oportunidade criada com sucesso')
      setDialogOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao criar oportunidade')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OportunidadeCreate> }) =>
      updateOportunidade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      toast.success('Oportunidade atualizada com sucesso')
      setDialogOpen(false)
      setEditingOportunidade(null)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao atualizar oportunidade')
    },
  })

  const handleNewOportunidade = useCallback(() => {
    setEditingOportunidade(null)
    setDialogOpen(true)
  }, [])

  const handleEditOportunidade = useCallback((op: Oportunidade) => {
    setEditingOportunidade(op)
    setDialogOpen(true)
  }, [])

  const handleFormSubmit = useCallback(
    async (data: OportunidadeFormData) => {
      if (activeOportunidade) {
        await updateMutation.mutateAsync({
          id: activeOportunidade.id,
          data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
    },
    [activeOportunidade, createMutation, updateMutation],
  )

  const columns: Column<Oportunidade>[] = useMemo(() => [
    {
      key: 'titulo',
      header: 'Título',
      sortable: true,
      accessor: (item) => {
        return <span className="font-medium">{item.titulo}</span>
      },
    },
    {
      key: 'cliente_nome',
      header: 'Cliente',
      sortable: true,
      accessor: (item) => item.cliente_nome ?? '-',
    },
    {
      key: 'valor',
      header: 'Valor',
      sortable: true,
      sortKey: 'valor',
      accessor: (item) => formatCurrency(item.valor),
    },
    {
      key: 'etapa_nome',
      header: 'Etapa',
      sortable: true,
      accessor: (item) => {
        const etapa = etapaMap.get(item.etapa_id)
        return (
          <div className="flex items-center gap-1.5">
            {etapa?.cor && (
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: etapa.cor }}
              />
            )}
            <span>{item.etapa_nome ?? '-'}</span>
          </div>
        )
      },
    },
    {
      key: 'responsavel_nome',
      header: 'Responsável',
      sortable: true,
      accessor: (item) => item.responsavel_nome ?? '-',
    },
    {
      key: 'previsao_fechamento',
      header: 'Previsão',
      sortable: true,
      accessor: (item) => {
        if (!item.previsao_fechamento) return '-'
        const isOverdue = new Date(item.previsao_fechamento) < new Date()
        return (
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {formatDate(item.previsao_fechamento)}
          </span>
        )
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      accessor: (item) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8" aria-label={`Ações de ${item.titulo}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditOportunidade(item)}>
                <Pencil className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [etapaMap, handleEditOportunidade])

  const isLoading = funisQuery.isLoading || (!!funilId && (etapasQuery.isLoading || oportunidadesQuery.isLoading))
  const queryError = funisQuery.error || etapasQuery.error || oportunidadesQuery.error

  function selectFunil(value: string) {
    setSelectedFunilId(value)
  }

  if (!funisQuery.isLoading && funis && funis.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Oportunidades" description="Gerencie suas oportunidades de negócio" />
        <EmptyState
          title="Nenhum funil cadastrado"
          description="Crie um funil de vendas antes de adicionar oportunidades."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Oportunidades" description="Gerencie suas oportunidades de negócio">
        <Select
          value={funilId ?? ''}
          onChange={(e) => selectFunil(e.target.value)}
          placeholder="Selecione um funil"
          className="w-full sm:w-56"
        >
          {funis?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </Select>

        <div className="flex items-center rounded-lg border p-0.5 bg-muted/50">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            aria-label="Visualização em Kanban"
            aria-pressed={viewMode === 'kanban'}
          >
            <Columns3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label="Visualização em lista"
            aria-pressed={viewMode === 'list'}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={handleNewOportunidade}>
          <Plus className="h-4 w-4" />
          Nova Oportunidade
        </Button>
      </PageHeader>

      {queryError && (
        <EmptyState
          title="Erro ao carregar oportunidades"
          description={queryError instanceof Error ? queryError.message : 'Tente novamente mais tarde.'}
        />
      )}

      {!funilId && !funisQuery.isLoading && !queryError && (
        <EmptyState
          title="Selecione um funil"
          description="Escolha um funil de vendas para visualizar as oportunidades."
        />
      )}

      {funilId && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="h-96 w-[300px]" />
            <Skeleton className="h-96 w-[300px]" />
            <Skeleton className="h-96 w-[300px]" />
          </div>
        </div>
      )}

      {funilId && !isLoading && !queryError && viewMode === 'kanban' && (
        <KanbanBoard
          funilId={funilId}
          etapas={etapas ?? []}
          oportunidades={oportunidades}
          loading={false}
        />
      )}

      {funilId && !isLoading && !queryError && viewMode === 'list' && (
        <DataTable
          columns={columns}
          data={oportunidades}
          rowKey={(item) => item.id}
          emptyMessage="Nenhuma oportunidade encontrada para este funil."
          pageSize={15}
        />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false)
            setEditingOportunidade(null)
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {activeOportunidade || oportunidadeId ? 'Editar Oportunidade' : 'Nova Oportunidade'}
            </DialogTitle>
            <DialogDescription>
              {activeOportunidade || oportunidadeId
                ? 'Altere os dados da oportunidade.'
                : 'Preencha os dados para criar uma nova oportunidade.'}
            </DialogDescription>
          </DialogHeader>
          {oportunidadeId && oportunidadeQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : oportunidadeQuery.isError ? (
            <p className="text-sm text-destructive">
              {oportunidadeQuery.error.message || 'Não foi possível carregar a oportunidade.'}
            </p>
          ) : (
            <OportunidadeForm
              initialData={activeOportunidade ?? undefined}
              initialClienteId={searchParams.get('cliente_id') ?? undefined}
              initialFunilId={funilId ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setDialogOpen(false)
                setEditingOportunidade(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
