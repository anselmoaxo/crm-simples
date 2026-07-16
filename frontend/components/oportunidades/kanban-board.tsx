'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

import { KanbanCard } from './kanban-card'
import { moverEtapa } from '@/lib/api/oportunidades'
import { formatCurrency } from '@/lib/formatters'
import type { Oportunidade, EtapaFunil } from '@/types'

interface KanbanBoardProps {
  funilId: string
  etapas: EtapaFunil[]
  oportunidades: Oportunidade[]
  loading?: boolean
}

function ColumnDroppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-[calc(100vw-2rem)] min-w-[280px] max-w-[320px] flex-none rounded-lg border bg-muted/30',
        isOver && 'border-primary/50 bg-primary/5 ring-1 ring-primary/20',
      )}
    >
      <div className="flex flex-col h-full max-h-full">
        {children}
      </div>
    </div>
  )
}

function ColumnSkeleton() {
  return (
    <div className="w-[calc(100vw-2rem)] min-w-[280px] max-w-[320px] flex-none space-y-3 rounded-lg border bg-muted/30 p-4">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-3/4" />
      </div>
    </div>
  )
}

export function KanbanBoard({ funilId, etapas, oportunidades, loading }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeCard, setActiveCard] = useState<Oportunidade | null>(null)
  const [confirmPerda, setConfirmPerda] = useState<{
    oportunidade: Oportunidade
    etapaDestino: EtapaFunil
  } | null>(null)
  const [motivoPerda, setMotivoPerda] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const oportunidadesByEtapa = useMemo(() => {
    const map = new Map<string, Oportunidade[]>()
    for (const etapa of etapas) {
      map.set(etapa.id, [])
    }
    for (const op of oportunidades) {
      const existing = map.get(op.etapa_id) ?? []
      existing.push(op)
      map.set(op.etapa_id, existing)
    }
    return map
  }, [etapas, oportunidades])

  const mutation = useMutation({
    mutationFn: ({
      id,
      etapa_id,
      motivo_perda,
    }: {
      id: string
      etapa_id: string
      motivo_perda?: string
    }) => moverEtapa(id, { etapa_id, motivo_perda: motivo_perda?.trim() || undefined }),
    onMutate: async ({ id, etapa_id }) => {
      const queryKey = ['oportunidades', funilId] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Oportunidade[]>(queryKey)

      queryClient.setQueryData<Oportunidade[]>(
        queryKey,
        (old) => {
          if (!old) return old
          return old.map((op) => op.id === id ? { ...op, etapa_id } : op)
        },
      )

      return { previous, queryKey }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
      toast.error(error.message || 'Não foi possível mover a oportunidade')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades', funilId] })
    },
  })

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = event.active.data.current?.oportunidade as Oportunidade | undefined
    if (card) {
      setActiveCard(card)
    }
  }, [])

  const performMove = useCallback(
    (oportunidade: Oportunidade, etapaDestino: EtapaFunil, motivo?: string) => {
      mutation.mutate({
        id: oportunidade.id,
        etapa_id: etapaDestino.id,
        motivo_perda: motivo,
      })
    },
    [mutation],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)

      if (!over) return

      const cardData = active.data.current?.oportunidade as
        | Oportunidade
        | undefined
      if (!cardData) return

      const sourceEtapaId = cardData.etapa_id

      let targetEtapaId: string | null = null

      if (typeof over.id === 'string' && over.id.startsWith('column-')) {
        targetEtapaId = over.id.replace('column-', '')
      } else if (typeof over.id === 'string' && over.id.startsWith('card-')) {
        const overCardData = over.data.current?.oportunidade as
          | Oportunidade
          | undefined
        if (overCardData) {
          targetEtapaId = overCardData.etapa_id
        }
      }

      if (!targetEtapaId || targetEtapaId === sourceEtapaId) return

      const etapaDestino = etapas.find((e) => e.id === targetEtapaId)
      if (!etapaDestino) return

      if (etapaDestino.tipo === 'PERDIDA') {
        setConfirmPerda({
          oportunidade: cardData,
          etapaDestino,
        })
        return
      }

      performMove(cardData, etapaDestino)
    },
    [etapas, performMove],
  )

  function handleConfirmPerda() {
    if (!confirmPerda) return
    if (!motivoPerda.trim()) {
      toast.error('Informe o motivo da perda')
      return
    }
    performMove(confirmPerda.oportunidade, confirmPerda.etapaDestino, motivoPerda)
    setConfirmPerda(null)
    setMotivoPerda('')
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ColumnSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex snap-x snap-proximity gap-4 overflow-x-auto overscroll-x-contain pb-4" style={{ maxHeight: 'calc(100dvh - 12rem)' }}>
          {[...etapas]
            .sort((a, b) => a.ordem - b.ordem)
            .map((etapa) => {
              const cards = oportunidadesByEtapa.get(etapa.id) ?? []
              const totalValue = cards.reduce((sum, c) => sum + c.valor, 0)

              return (
                <ColumnDroppable key={etapa.id} id={`column-${etapa.id}`}>
                  <div className="flex items-center gap-2 p-3 border-b shrink-0">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: etapa.cor ?? '#94a3b8' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {etapa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cards.length}{' '}
                        {cards.length === 1 ? 'oportunidade' : 'oportunidades'}{' '}
                        · {formatCurrency(totalValue)}
                      </p>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-2 p-3">
                      <SortableContext
                        items={cards.map((c) => `card-${c.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {cards.length === 0 ? (
                          <p className="py-8 text-center text-xs text-muted-foreground">
                            Nenhuma oportunidade
                          </p>
                        ) : (
                          cards.map((op) => (
                            <KanbanCard
                              key={op.id}
                              oportunidade={op}
                              etapaCor={etapa.cor}
                            />
                          ))
                        )}
                      </SortableContext>
                    </div>
                  </ScrollArea>
                </ColumnDroppable>
              )
            })}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[280px] opacity-90">
              <KanbanCard
                oportunidade={activeCard}
                etapaCor={
                  etapas.find((e) => e.id === activeCard.etapa_id)?.cor
                }
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={!!confirmPerda}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmPerda(null)
            setMotivoPerda('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Perder Oportunidade
            </DialogTitle>
            <DialogDescription>
              Você está movendo &ldquo;{confirmPerda?.oportunidade.titulo}&rdquo; para a etapa
              &ldquo;{confirmPerda?.etapaDestino.nome}&rdquo;. Informe o motivo da perda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="motivo_perda">Motivo da Perda</Label>
              <Input
                id="motivo_perda"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                placeholder="Descreva o motivo..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmPerda(null)
                  setMotivoPerda('')
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmPerda}
              >
                Confirmar Perda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
