'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ClipboardList,
  Phone,
  Video,
  Mail,
  MessageCircle,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  RotateCcw,
  Pencil,
  Trash2,
  CalendarClock,
  Clock,
} from 'lucide-react'
import {
  listAtividades,
  createAtividade,
  updateAtividade,
  concluirAtividade,
  reabrirAtividade,
  deleteAtividade,
} from '@/lib/api/atividades'
import type { Atividade, AtividadeCreate } from '@/lib/api/atividades'
import { AtividadeForm } from '@/components/atividades/atividade-form'
import { ConfirmDialog } from '@/components/formularios/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

const tipoIconMap: Record<string, React.ElementType> = {
  TAREFA: ClipboardList,
  LIGACAO: Phone,
  REUNIAO: Video,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  ANOTACAO: FileText,
}

const tipoLabelMap: Record<string, string> = {
  TAREFA: 'Tarefa',
  LIGACAO: 'Ligação',
  REUNIAO: 'Reunião',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  ANOTACAO: 'Anotação',
}

const tipoOptions = [
  { value: '', label: 'Tudo' },
  ...Object.entries(tipoLabelMap).map(([value, label]) => ({ value, label })),
]

const statusOptions = [
  { value: '', label: 'Todas' },
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'concluidas', label: 'Concluídas' },
  { value: 'atrasadas', label: 'Atrasadas' },
]

const dateFilterOptions = [
  { value: '', label: 'Todas' },
  { value: 'hoje', label: 'Hoje' },
]

function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(`${dateStr}T12:00:00`)
  const now = new Date(`${todayInSaoPaulo()}T12:00:00`)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} dia(s) atrasada`
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  return `Em ${diffDays} dias`
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return dateStr < todayInSaoPaulo()
}

export default function AtividadesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['atividades', page, tipoFilter, statusFilter, dateFilter],
    queryFn: ({ signal }) =>
      listAtividades(
        {
          pagina: page,
          por_pagina: 20,
          tipo: tipoFilter || undefined,
          ...(statusFilter === 'concluidas' ? { concluida: true } : {}),
          ...(statusFilter === 'pendentes' ? { concluida: false } : {}),
          ...(statusFilter === 'atrasadas' ? { atrasada: true } : {}),
          ...(dateFilter === 'hoje' ? { hoje: true } : {}),
        },
        signal,
      ),
  })

  const createMutation = useMutation({
    mutationFn: (formData: AtividadeCreate) => createAtividade(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      toast.success('Atividade criada com sucesso')
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtividadeCreate }) =>
      updateAtividade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      toast.success('Atividade atualizada com sucesso')
      setDialogOpen(false)
      setEditingAtividade(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const concluirMutation = useMutation({
    mutationFn: (id: string) => concluirAtividade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      toast.success('Atividade concluída')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reabrirMutation = useMutation({
    mutationFn: (id: string) => reabrirAtividade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      toast.success('Atividade reaberta')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAtividade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      toast.success('Atividade excluída')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleFormSubmit = useCallback(
    async (formData: AtividadeCreate) => {
      if (editingAtividade) {
        await updateMutation.mutateAsync({ id: editingAtividade.id, data: formData })
      } else {
        await createMutation.mutateAsync(formData)
      }
    },
    [editingAtividade, createMutation, updateMutation],
  )

  const handleEdit = useCallback((atividade: Atividade) => {
    setEditingAtividade(atividade)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDelete = useCallback(() => {
    if (deletingId) {
      deleteMutation.mutate(deletingId)
      setDeletingId(null)
    }
  }, [deletingId, deleteMutation])

  const atividades = data?.data ?? []
  const totalPaginas = data?.total_paginas ?? 1

  const filteredAtividades = atividades.filter((a) =>
    !search || a.titulo.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Atividades" description="Gerencie suas tarefas e atividades">
        <Button onClick={() => { setEditingAtividade(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4" />
          Nova Atividade
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-[200px] sm:basis-auto sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
        </div>
        <Select
          value={tipoFilter}
          onChange={(e) => { setTipoFilter(e.target.value); setPage(1) }}
          options={tipoOptions}
          className="w-full sm:w-36"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          options={statusOptions}
          className="w-full sm:w-36"
        />
        <Select
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
          options={dateFilterOptions}
          className="w-full sm:w-40"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredAtividades.length === 0 ? (
        <EmptyState
          title="Nenhuma atividade encontrada"
          description="Crie uma nova atividade para começar."
          action={{ label: 'Nova Atividade', onClick: () => { setEditingAtividade(null); setDialogOpen(true) } }}
        />
      ) : (
        <div className="space-y-3">
          {filteredAtividades.map((atividade) => {
            const TipoIcon = tipoIconMap[atividade.tipo] ?? ClipboardList
            const overdue = !atividade.concluida && isOverdue(atividade.data_prevista)

            return (
              <div
                key={atividade.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:p-4"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  atividade.concluida ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                  overdue ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  'bg-primary/10 text-primary'
                }`}>
                  <TipoIcon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-medium truncate ${atividade.concluida ? 'line-through text-muted-foreground' : ''}`}>
                      {atividade.titulo}
                    </h3>
                    <Badge variant={atividade.concluida ? 'secondary' : 'default'} className="shrink-0">
                      {atividade.concluida ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span>{tipoLabelMap[atividade.tipo] ?? atividade.tipo}</span>
                    {atividade.cliente_nome && (
                      <span>{atividade.cliente_nome}</span>
                    )}
                    {atividade.data_prevista && (
                      <span className={`flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : ''}`}>
                        {overdue ? <Clock className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                        {getRelativeTime(atividade.data_prevista)}
                        {atividade.hora_prevista ? ` às ${atividade.hora_prevista.slice(0, 5)}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1 max-sm:basis-full max-sm:justify-end">
                  {atividade.concluida ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reabrir"
                      onClick={() => reabrirMutation.mutate(atividade.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Concluir"
                      onClick={() => concluirMutation.mutate(atividade.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => handleEdit(atividade)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    onClick={() => handleDelete(atividade.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })}

          {totalPaginas > 1 && (
            <Pagination currentPage={page} totalPages={totalPaginas} onPageChange={setPage} />
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingAtividade(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAtividade ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          </DialogHeader>
          <AtividadeForm
            key={editingAtividade?.id ?? 'new'}
            defaultValues={editingAtividade ? {
              tipo: editingAtividade.tipo as 'TAREFA' | 'LIGACAO' | 'REUNIAO' | 'EMAIL' | 'WHATSAPP' | 'ANOTACAO',
              titulo: editingAtividade.titulo,
              descricao: editingAtividade.descricao ?? '',
              cliente_id: editingAtividade.cliente_id ?? '',
              oportunidade_id: editingAtividade.oportunidade_id ?? '',
              data_prevista: editingAtividade.data_prevista
                ? `${editingAtividade.data_prevista}T${editingAtividade.hora_prevista?.slice(0, 5) ?? '00:00'}`
                : '',
            } : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => { setDialogOpen(false); setEditingAtividade(null) }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir atividade"
        description="Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
