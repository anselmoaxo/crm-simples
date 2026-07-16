'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isPast, parseISO } from 'date-fns'
import { Building2, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Oportunidade } from '@/types'

interface KanbanCardProps {
  oportunidade: Oportunidade
  etapaCor?: string | null
}

export function KanbanCard({ oportunidade, etapaCor }: KanbanCardProps) {
  const isOverdue =
    oportunidade.previsao_fechamento &&
    isPast(parseISO(oportunidade.previsao_fechamento))

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${oportunidade.id}`,
    data: {
      type: 'card',
      oportunidade,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        'cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg',
      )}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: etapaCor ?? '#6b7280' }}
      />

      <div className="space-y-1.5 pl-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{oportunidade.titulo}</p>
          {isOverdue && (
            <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0">
              Atrasado
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{oportunidade.cliente_nome ?? 'Sem cliente'}</span>
        </div>

        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(oportunidade.valor)}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {oportunidade.responsavel_nome && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {oportunidade.responsavel_nome}
            </span>
          )}
          {oportunidade.previsao_fechamento && (
            <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive')}>
              <Calendar className="h-3 w-3" />
              {formatDate(oportunidade.previsao_fechamento)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
