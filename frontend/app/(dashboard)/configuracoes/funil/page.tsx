'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/formularios/confirm-dialog'
import {
  createEtapa,
  deleteEtapa,
  listEtapas,
  listFunis,
  reorderEtapas,
  updateEtapa,
  type EtapaInput,
} from '@/lib/api/funis'
import { GripVertical, Plus, Pencil, Trash2, Funnel } from 'lucide-react'
import { toast } from 'sonner'
import type { EtapaFunil } from '@/types'

interface EtapaComFunil extends EtapaFunil {
  funil_nome?: string
}

function SortableEtapaCard({
  etapa,
  onEdit,
  onDelete,
}: {
  etapa: EtapaComFunil
  onEdit: (e: EtapaComFunil) => void
  onDelete: (e: EtapaComFunil) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: etapa.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
    >
      <button
        className="flex h-11 w-11 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={`Reordenar etapa ${etapa.nome}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: etapa.cor ?? '#94a3b8' }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{etapa.nome}</p>
        <p className="text-xs text-muted-foreground">
          {etapa.probabilidade}% · {etapa.tipo === 'ABERTA' ? 'Inicial/Intermediária' : etapa.tipo === 'GANHA' ? 'Final (Ganha)' : 'Perdida'}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onEdit(etapa)} aria-label={`Editar etapa ${etapa.nome}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(etapa)} aria-label={`Excluir etapa ${etapa.nome}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

export default function FunilConfigPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editingEtapa, setEditingEtapa] = useState<EtapaComFunil | null>(null)
  const [deletingEtapa, setDeletingEtapa] = useState<EtapaComFunil | null>(null)
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null)

  const [formValues, setFormValues] = useState({
    nome: '',
    cor: '#2563eb',
    probabilidade: '50',
    tipo: 'ABERTA',
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const funisQuery = useQuery({
    queryKey: ['funis'],
    queryFn: ({ signal }) => listFunis(signal),
  })
  const funis = funisQuery.data

  const etapasQuery = useQuery({
    queryKey: ['etapas-funil'],
    queryFn: async ({ signal }) => {
      const result: Record<string, EtapaComFunil[]> = {}
      if (funis) {
        for (const funil of funis) {
          const etapas = await listEtapas(funil.id, signal)
          result[funil.id] = etapas.map((e) => ({ ...e, funil_nome: funil.nome }))
        }
      }
      return result
    },
    enabled: !!funis && funis.length > 0,
  })
  const etapasByFunil = etapasQuery.data

  const saveMutation = useMutation({
    mutationFn: async (data: EtapaInput & { funil_id: string; etapa_id?: string }) => {
      if (data.etapa_id) {
        return updateEtapa(data.etapa_id, data)
      }
      return createEtapa(data.funil_id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas-funil'] })
      toast.success(editingEtapa ? 'Etapa atualizada' : 'Etapa criada')
      setDialogOpen(false)
      setEditingEtapa(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (etapaId: string) => {
      await deleteEtapa(etapaId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas-funil'] })
      toast.success('Etapa excluída')
      setDeleteConfirmOpen(false)
      setDeletingEtapa(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ funilId, etapasIds }: { funilId: string; etapasIds: string[]; previous: EtapaComFunil[] }) => {
      await reorderEtapas(funilId, etapasIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas-funil'] })
    },
    onError: (error: Error, variables) => {
      queryClient.setQueryData(['etapas-funil'], (old: Record<string, EtapaComFunil[]> | undefined) =>
        old ? { ...old, [variables.funilId]: variables.previous } : old,
      )
      toast.error(error.message || 'Erro ao reordenar')
    },
  })

  const handleDragEnd = useCallback(
    (event: DragEndEvent, funilId: string) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const currentEtapas = etapasByFunil?.[funilId]
      if (!currentEtapas) return

      const oldIndex = currentEtapas.findIndex((e) => e.id === active.id)
      const newIndex = currentEtapas.findIndex((e) => e.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const newEtapas = arrayMove(currentEtapas, oldIndex, newIndex)
      queryClient.setQueryData(['etapas-funil'], (old: Record<string, EtapaComFunil[]> | undefined) => {
        if (!old) return old
        return { ...old, [funilId]: newEtapas }
      })

      reorderMutation.mutate({ funilId, etapasIds: newEtapas.map((etapa) => etapa.id), previous: currentEtapas })
    },
    [etapasByFunil, queryClient, reorderMutation],
  )

  const openCreateDialog = (funilId: string) => {
    setEditingEtapa(null)
    setSelectedFunilId(funilId)
    setFormValues({ nome: '', cor: '#2563eb', probabilidade: '50', tipo: 'ABERTA' })
    setDialogOpen(true)
  }

  const openEditDialog = (etapa: EtapaComFunil) => {
    setEditingEtapa(etapa)
    setSelectedFunilId(etapa.funil_id)
    setFormValues({
      nome: etapa.nome,
      cor: etapa.cor ?? '#2563eb',
      probabilidade: String(etapa.probabilidade),
      tipo: etapa.tipo,
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!funis || funis.length === 0) return
    const funilId = editingEtapa?.funil_id ?? selectedFunilId
    if (!funilId) return

    saveMutation.mutate({
      funil_id: funilId,
      nome: formValues.nome,
      cor: formValues.cor,
      probabilidade: Number(formValues.probabilidade),
      tipo: formValues.tipo as EtapaInput['tipo'],
      etapa_id: editingEtapa?.id,
    })
  }

  const handleDelete = () => {
    if (!deletingEtapa) return
    deleteMutation.mutate(deletingEtapa.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funil de Vendas"
        description="Configure as etapas do seu funil de vendas"
      />

      {funisQuery.isError || etapasQuery.isError ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {(funisQuery.error ?? etapasQuery.error)?.message || 'Não foi possível carregar os funis.'}
          </CardContent>
        </Card>
      ) : funisQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><CardTitle className="h-5 w-32 bg-muted rounded animate-pulse" /></CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-14 bg-muted rounded animate-pulse" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : funis && funis.length > 0 ? (
        <div className="space-y-8">
          {funis.map((funil) => {
            const etapas = etapasByFunil?.[funil.id] ?? []
            const etapaIds = etapas.map((e) => e.id)

            return (
              <Card key={funil.id}>
                <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Funnel className="h-5 w-5 text-muted-foreground" />
                      {funil.nome}
                    </CardTitle>
                  </div>
                   <Button size="sm" onClick={() => openCreateDialog(funil.id)}>
                    <Plus className="h-4 w-4" />
                    Adicionar Etapa
                  </Button>
                </CardHeader>
                <CardContent>
                  {etapas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma etapa configurada. Adicione a primeira etapa do funil.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, funil.id)}
                    >
                      <SortableContext items={etapaIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {etapas.map((etapa) => (
                            <SortableEtapaCard
                              key={etapa.id}
                              etapa={etapa}
                              onEdit={openEditDialog}
                              onDelete={(e) => {
                                setDeletingEtapa(e)
                                setDeleteConfirmOpen(true)
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Funnel className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum funil configurado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um funil de vendas para começar a gerenciar suas oportunidades.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEtapa(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="etapa-nome">Nome</Label>
              <Input id="etapa-nome" value={formValues.nome} onChange={(e) => setFormValues((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Proposta Enviada" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="etapa-cor">Cor</Label>
              <div className="flex gap-2">
                <Input id="etapa-cor" type="color" value={formValues.cor} onChange={(e) => setFormValues((p) => ({ ...p, cor: e.target.value }))} className="w-12 p-1 h-9" />
                <Input value={formValues.cor} onChange={(e) => setFormValues((p) => ({ ...p, cor: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="etapa-prob">Probabilidade (%)</Label>
              <Input id="etapa-prob" type="number" min={0} max={100} value={formValues.probabilidade} onChange={(e) => setFormValues((p) => ({ ...p, probabilidade: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="etapa-tipo">Tipo</Label>
              <Select id="etapa-tipo" value={formValues.tipo} onChange={(e) => setFormValues((p) => ({ ...p, tipo: e.target.value }))}>
                <option value="ABERTA">Inicial / Intermediária</option>
                <option value="GANHA">Final (Ganha)</option>
                <option value="PERDIDA">Perdida</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingEtapa(null) }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!formValues.nome || saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setDeletingEtapa(null) }}
        title="Excluir etapa"
        description={deletingEtapa ? `Tem certeza que deseja excluir "${deletingEtapa.nome}"? ${deletingEtapa ? '\nSe houver oportunidades vinculadas, elas também serão afetadas.' : ''}` : ''}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
