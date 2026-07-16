'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { listAllClientes } from '@/lib/api/clientes'
import { listContatos } from '@/lib/api/contatos'
import { listEtapas, listFunis } from '@/lib/api/funis'
import type { Oportunidade } from '@/types'

const formSchema = z.object({
  titulo: z.string().min(2, 'Mínimo de 2 caracteres'),
  cliente_id: z.string().min(1, 'Campo obrigatório'),
  contato_id: z.string().optional().or(z.literal('')),
  funil_id: z.string().min(1, 'Campo obrigatório'),
  etapa_id: z.string().min(1, 'Campo obrigatório'),
  valor: z.number().min(0, 'Valor não pode ser negativo'),
  previsao_fechamento: z.string().optional().or(z.literal('')),
  observacoes: z.string().optional().or(z.literal('')),
})

export type OportunidadeFormData = z.infer<typeof formSchema>

interface OportunidadeFormProps {
  initialData?: Oportunidade
  initialClienteId?: string
  initialFunilId?: string
  onSubmit: (data: OportunidadeFormData) => Promise<void>
  onCancel: () => void
}

export function OportunidadeForm({ initialData, initialClienteId, initialFunilId, onSubmit, onCancel }: OportunidadeFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<OportunidadeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo ?? '',
      cliente_id: initialData?.cliente_id ?? initialClienteId ?? '',
      contato_id: initialData?.contato_id ?? '',
      funil_id: initialData?.funil_id ?? initialFunilId ?? '',
      etapa_id: initialData?.etapa_id ?? '',
      valor: initialData?.valor ?? 0,
      previsao_fechamento: initialData?.previsao_fechamento ?? '',
      observacoes: initialData?.observacoes ?? '',
    },
  })

  const clienteId = useWatch({ control, name: 'cliente_id' })
  const funilId = useWatch({ control, name: 'funil_id' })

  const clientesQuery = useQuery({
    queryKey: ['clientes', 'all'],
    queryFn: ({ signal }) => listAllClientes({ ativo: true }, signal),
  })

  const contatosQuery = useQuery({
    queryKey: ['contatos', clienteId],
    queryFn: ({ signal }) => listContatos(clienteId, signal),
    enabled: !!clienteId,
  })

  const funisQuery = useQuery({
    queryKey: ['funis'],
    queryFn: ({ signal }) => listFunis(signal),
  })

  const etapasQuery = useQuery({
    queryKey: ['etapas', funilId],
    queryFn: ({ signal }) => listEtapas(funilId, signal),
    enabled: !!funilId,
  })

  const etapas = etapasQuery.data

  useEffect(() => {
    if (funilId && etapas && etapas.length > 0) {
      const currentEtapa = etapas.find((e) => e.id === initialData?.etapa_id)
      if (!currentEtapa) {
        setValue('etapa_id', etapas[0].id)
      }
    }
  }, [funilId, etapas, setValue, initialData?.etapa_id])

  const normalizedSearch = clienteSearch.trim().toLocaleLowerCase('pt-BR')
  const clientes = (clientesQuery.data ?? []).filter((cliente) =>
    cliente.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
  )

  async function handleFormSubmit(data: OportunidadeFormData) {
    setSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" {...register('titulo')} hasError={!!errors.titulo} />
        {errors.titulo && (
          <p className="text-xs text-destructive">{errors.titulo.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cliente_id">Cliente</Label>
        <Input
          id="cliente-search"
          value={clienteSearch}
          onChange={(event) => setClienteSearch(event.target.value)}
          placeholder="Buscar cliente..."
        />
        <Select
          id="cliente_id"
          placeholder="Selecione um cliente"
          {...register('cliente_id')}
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        {errors.cliente_id && (
          <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
        )}
        {clientesQuery.isError && (
          <p className="text-xs text-destructive">Não foi possível carregar os clientes.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contato_id">Contato</Label>
        <Select
          id="contato_id"
          placeholder="Selecione um contato"
          {...register('contato_id')}
        >
          {contatosQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        {contatosQuery.isError && (
          <p className="text-xs text-destructive">Não foi possível carregar os contatos.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="funil_id">Funil</Label>
        <Select
          id="funil_id"
          placeholder="Selecione um funil"
          {...register('funil_id')}
        >
          {funisQuery.data?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </Select>
        {errors.funil_id && (
          <p className="text-xs text-destructive">{errors.funil_id.message}</p>
        )}
        {funisQuery.isError && (
          <p className="text-xs text-destructive">Não foi possível carregar os funis.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="etapa_id">Etapa</Label>
        <Select
          id="etapa_id"
          placeholder="Selecione uma etapa"
          {...register('etapa_id')}
        >
          {[...(etapas ?? [])]
            .sort((a, b) => a.ordem - b.ordem)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
        </Select>
        {errors.etapa_id && (
          <p className="text-xs text-destructive">{errors.etapa_id.message}</p>
        )}
        {etapasQuery.isError && (
          <p className="text-xs text-destructive">Não foi possível carregar as etapas.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor">Valor</Label>
        <Input
          id="valor"
          type="number"
          step="0.01"
          {...register('valor', { valueAsNumber: true })}
          hasError={!!errors.valor}
        />
        {errors.valor && (
          <p className="text-xs text-destructive">{errors.valor.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="previsao_fechamento">Previsão de Fechamento</Label>
        <Input id="previsao_fechamento" type="date" {...register('previsao_fechamento')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" {...register('observacoes')} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
