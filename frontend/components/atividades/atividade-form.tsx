'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { listClientes, type Cliente } from '@/lib/api/clientes'
import { listOportunidades } from '@/lib/api/oportunidades'
import type { Oportunidade } from '@/types'
import type { AtividadeCreate } from '@/lib/api/atividades'

const atividadeFormSchema = z.object({
  tipo: z.enum(['TAREFA', 'LIGACAO', 'REUNIAO', 'EMAIL', 'WHATSAPP', 'ANOTACAO'], {
    message: 'Selecione um tipo',
  }),
  titulo: z.string().min(2, 'Mínimo de 2 caracteres'),
  descricao: z.string().optional().or(z.literal('')),
  cliente_id: z.string().optional().or(z.literal('')),
  oportunidade_id: z.string().optional().or(z.literal('')),
  data_prevista: z.string().optional().or(z.literal('')),
})

type AtividadeFormData = z.infer<typeof atividadeFormSchema>

const tipoOptions = [
  { value: 'TAREFA', label: 'Tarefa' },
  { value: 'LIGACAO', label: 'Ligação' },
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'ANOTACAO', label: 'Anotação' },
]

interface AtividadeFormProps {
  defaultValues?: Partial<AtividadeFormData>
  onSubmit: (data: AtividadeCreate) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function AtividadeForm({ defaultValues, onSubmit, onCancel, isSubmitting }: AtividadeFormProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AtividadeFormData>({
    resolver: zodResolver(atividadeFormSchema),
    defaultValues: {
      tipo: 'TAREFA',
      titulo: '',
      descricao: '',
      cliente_id: '',
      oportunidade_id: '',
      data_prevista: '',
      ...defaultValues,
    },
  })

  const clienteId = useWatch({ control, name: 'cliente_id' })

  useEffect(() => {
    listClientes({ por_pagina: 100 }).then((res) => {
      setClientes(res.data)
    }).catch(() => {
      toast.error('Não foi possível carregar a lista de clientes.')
    })
  }, [])

  useEffect(() => {
    if (!clienteId) return
    listOportunidades({ cliente_id: clienteId, por_pagina: 50 }).then((res) => {
      setOportunidades(res.data)
    }).catch(() => {
      toast.error('Não foi possível carregar as oportunidades do cliente.')
    })
  }, [clienteId])

  const oportunidadesDoCliente = clienteId ? oportunidades : []

  return (
    <form onSubmit={handleSubmit(async (data) => {
      const [data_prevista, hora_prevista] = data.data_prevista?.split('T') ?? []
      await onSubmit({
        tipo: data.tipo,
        titulo: data.titulo,
        ...(data.descricao ? { descricao: data.descricao } : {}),
        ...(data.cliente_id ? { cliente_id: data.cliente_id } : {}),
        ...(data.oportunidade_id ? { oportunidade_id: data.oportunidade_id } : {}),
        ...(data_prevista ? { data_prevista } : {}),
        ...(hora_prevista ? { hora_prevista } : {}),
      })
    })} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        <select id="tipo" {...register('tipo')} className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[right_0.5rem_center] bg-no-repeat sm:h-9" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`, backgroundSize: '16px 12px' }}>
          {tipoOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.tipo && (
          <p className="text-xs text-destructive">{errors.tipo.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" {...register('titulo')} hasError={!!errors.titulo} placeholder="Título da atividade" />
        {errors.titulo && (
          <p className="text-xs text-destructive">{errors.titulo.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" {...register('descricao')} placeholder="Descrição (opcional)" rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cliente_id">Cliente</Label>
        <div className="flex flex-col gap-1">
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-1"
          />
          <select
            id="cliente_id"
            {...register('cliente_id')}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm sm:h-9"
          >
            <option value="">Sem cliente</option>
            {clientes
              .filter((c) => !searchTerm || c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="oportunidade_id">Oportunidade</Label>
        <select
          id="oportunidade_id"
          {...register('oportunidade_id')}
          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:opacity-50 sm:h-9"
          disabled={!clienteId}
        >
          <option value="">Sem oportunidade</option>
          {oportunidadesDoCliente.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titulo}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_prevista">Data prevista</Label>
        <Input id="data_prevista" type="datetime-local" {...register('data_prevista')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
