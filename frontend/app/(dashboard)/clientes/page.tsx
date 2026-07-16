'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/layout/empty-state'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { listClientes, createCliente, updateCliente, deleteCliente } from '@/lib/api/clientes'
import type { ClienteCreate } from '@/lib/api/clientes'
import { getErrorMessage } from '@/lib/api/errors'
import { formatCpfCnpj, formatPhone } from '@/lib/formatters'
import type { Cliente, ClienteListResponse } from '@/types'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { toast } from 'sonner'

const SITUACAO_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'inativos', label: 'Inativos' },
]

const ORIGEM_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Site', label: 'Site' },
  { value: 'Indicação', label: 'Indicação' },
  { value: 'Redes Sociais', label: 'Redes Sociais' },
  { value: 'Google', label: 'Google' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Ligação', label: 'Ligação' },
  { value: 'Outro', label: 'Outro' },
]

const UF_OPTIONS = [
  { value: '', label: 'Todos' },
  ...['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => ({
    value: uf,
    label: uf,
  })),
]

async function fetchClientes(
  params: Parameters<typeof listClientes>[0],
  signal?: AbortSignal,
): Promise<ClienteListResponse> {
  const result = await listClientes(
    {
      pagina: params?.pagina,
      por_pagina: params?.por_pagina,
      nome: params?.nome,
      ativo: params?.ativo,
      origem: params?.origem,
      uf: params?.uf,
    },
    signal,
  )
  return result
}

export default function ClientesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [situacao, setSituacao] = useState('')
  const [origem, setOrigem] = useState('')
  const [uf, setUf] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(() => searchParams.get('acao') === 'novo')
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])



  const ativoFilter = situacao === 'ativos' ? true : situacao === 'inativos' ? false : undefined

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clientes', debouncedSearch, ativoFilter, origem, uf, page],
    queryFn: ({ signal }) =>
      fetchClientes(
        {
          nome: debouncedSearch || undefined,
          ativo: ativoFilter,
          origem: origem || undefined,
          uf: uf || undefined,
          pagina: page,
          por_pagina: 10,
        },
        signal,
      ),
  })

  const createMutation = useMutation({
    mutationFn: (formData: ClienteCreate) => createCliente(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Cliente criado com sucesso')
      setDialogOpen(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Erro ao criar cliente')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: ClienteCreate }) =>
      updateCliente(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Cliente atualizado com sucesso')
      setDialogOpen(false)
      setEditingCliente(null)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Erro ao atualizar cliente')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Cliente excluído com sucesso')
      setDeleteConfirmOpen(false)
      setDeletingId(null)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Erro ao excluir cliente')
    },
  })

  function handleEdit(e: React.MouseEvent, cliente: Cliente) {
    e.stopPropagation()
    setEditingCliente(cliente)
    setDialogOpen(true)
  }

  function handleDelete(e: React.MouseEvent, cliente: Cliente) {
    e.stopPropagation()
    setDeletingId(cliente.id)
    setDeleteConfirmOpen(true)
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingCliente(null)
    }
  }

  function handleDeleteConfirm() {
    if (deletingId) {
      deleteMutation.mutate(deletingId)
    }
  }

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <PageHeader title="Clientes" description="Gerencie seus clientes">
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingCliente
                  ? 'Altere os dados do cliente abaixo.'
                  : 'Preencha os dados para cadastrar um novo cliente.'}
              </DialogDescription>
            </DialogHeader>
            <ClienteForm
              initialData={editingCliente ?? undefined}
              onSubmit={(data) =>
                (editingCliente
                  ? updateMutation.mutateAsync({ id: editingCliente.id, formData: data })
                  : createMutation.mutateAsync(data)
                ).then(() => {})
              }
              onCancel={() => {
                setDialogOpen(false)
                setEditingCliente(null)
              }}
              isSubmitting={isFormSubmitting}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={situacao}
          onChange={(e) => { setSituacao(e.target.value); setPage(1) }}
          className="w-full sm:w-40"
          options={SITUACAO_OPTIONS}
        />
        <Select
          value={origem}
          onChange={(e) => { setOrigem(e.target.value); setPage(1) }}
          className="w-full sm:w-44"
          options={ORIGEM_OPTIONS}
        />
        <Select
          value={uf}
          onChange={(e) => { setUf(e.target.value); setPage(1) }}
          className="w-full sm:w-32"
          options={UF_OPTIONS}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Erro ao carregar clientes"
          description="Não foi possível carregar a lista de clientes. Tente novamente."
        />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={
            debouncedSearch || situacao || origem || uf
              ? 'Tente ajustar os filtros para encontrar clientes.'
              : 'Cadastre seu primeiro cliente para começar.'
          }
          action={
            !debouncedSearch && !situacao && !origem && !uf
              ? { label: 'Novo Cliente', onClick: () => setDialogOpen(true) }
              : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((cliente) => (
                  <TableRow
                    key={cliente.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/clientes/${cliente.id}`)}
                  >
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{formatCpfCnpj(cliente.cpf_cnpj)}</TableCell>
                    <TableCell>{cliente.email ?? '-'}</TableCell>
                    <TableCell>{formatPhone(cliente.telefone)}</TableCell>
                    <TableCell>
                      {[cliente.cidade, cliente.uf].filter(Boolean).join('/') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cliente.ativo ? 'default' : 'secondary'}>
                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 sm:h-8 sm:w-8"
                              aria-label={`Editar ${cliente.nome}`}
                              onClick={(e) => handleEdit(e, cliente as Cliente)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 text-destructive sm:h-8 sm:w-8"
                              aria-label={`Excluir ${cliente.nome}`}
                              onClick={(e) => handleDelete(e, cliente as Cliente)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.total_paginas > 1 && (
            <Pagination
              currentPage={data.pagina}
              totalPages={data.total_paginas}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setDeletingId(null)
              }}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
