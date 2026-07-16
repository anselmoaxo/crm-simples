'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2,
} from 'lucide-react'
import { getCliente } from '@/lib/api/clientes'
import {
  createContato,
  deleteContato,
  listContatos,
  updateContato,
  type ContatoInput,
} from '@/lib/api/contatos'
import { listOportunidades } from '@/lib/api/oportunidades'
import { listAtividades } from '@/lib/api/atividades'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/layout/empty-state'
import { ClienteActions } from '@/components/clientes/cliente-actions'
import { formatCpfCnpj, formatPhone, formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import type { Contato } from '@/types'
import { toast } from 'sonner'

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

interface ContatoFormData {
  nome: string
  cargo: string
  email: string
  telefone: string
  whatsapp: string
}

const emptyContatoForm: ContatoFormData = {
  nome: '',
  cargo: '',
  email: '',
  telefone: '',
  whatsapp: '',
}

export default function ClienteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const clienteId = params.id as string

  const [contatoDialogOpen, setContatoDialogOpen] = useState(false)
  const [editingContato, setEditingContato] = useState<Contato | null>(null)
  const [contatoForm, setContatoForm] = useState<ContatoFormData>(emptyContatoForm)
  const [contatoDeleteId, setContatoDeleteId] = useState<string | null>(null)

  const clienteQuery = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: ({ signal }) => getCliente(clienteId, signal),
    enabled: !!clienteId,
  })

  const contatosQuery = useQuery({
    queryKey: ['contatos', clienteId],
    queryFn: ({ signal }) => listContatos(clienteId, signal),
    enabled: !!clienteId,
  })

  const oportunidadesQuery = useQuery({
    queryKey: ['oportunidades', 'cliente', clienteId],
    queryFn: ({ signal }) =>
      listOportunidades({ cliente_id: clienteId, por_pagina: 50 }, signal),
    enabled: !!clienteId,
  })

  const atividadesQuery = useQuery({
    queryKey: ['atividades', 'cliente', clienteId],
    queryFn: ({ signal }) =>
      listAtividades({ cliente_id: clienteId, por_pagina: 50 }, signal),
    enabled: !!clienteId,
  })

  const createContatoMutation = useMutation({
    mutationFn: (data: ContatoInput) => createContato(clienteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos', clienteId] })
      toast.success('Contato adicionado com sucesso')
      closeContatoDialog()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao adicionar contato'),
  })

  const updateContatoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContatoInput }) => updateContato(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos', clienteId] })
      toast.success('Contato atualizado com sucesso')
      closeContatoDialog()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao atualizar contato'),
  })

  const deleteContatoMutation = useMutation({
    mutationFn: (id: string) => deleteContato(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos', clienteId] })
      toast.success('Contato excluído com sucesso')
      setContatoDeleteId(null)
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao excluir contato'),
  })

  function openNewContatoDialog() {
    setEditingContato(null)
    setContatoForm(emptyContatoForm)
    setContatoDialogOpen(true)
  }

  function openEditContatoDialog(contato: Contato) {
    setEditingContato(contato)
    setContatoForm({
      nome: contato.nome,
      cargo: contato.cargo ?? '',
      email: contato.email ?? '',
      telefone: contato.telefone ?? '',
      whatsapp: contato.whatsapp ?? '',
    })
    setContatoDialogOpen(true)
  }

  function closeContatoDialog() {
    setContatoDialogOpen(false)
    setEditingContato(null)
    setContatoForm(emptyContatoForm)
  }

  function handleContatoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contatoForm.nome.trim()) {
      toast.error('Nome do contato é obrigatório')
      return
    }
    const payload: ContatoInput = {
      nome: contatoForm.nome.trim(),
      cargo: contatoForm.cargo || null,
      email: contatoForm.email || null,
      telefone: contatoForm.telefone ? contatoForm.telefone.replace(/\D/g, '') : null,
      whatsapp: contatoForm.whatsapp ? contatoForm.whatsapp.replace(/\D/g, '') : null,
    }
    if (editingContato) {
      updateContatoMutation.mutate({ id: editingContato.id, data: payload })
    } else {
      createContatoMutation.mutate(payload)
    }
  }

  const cliente = clienteQuery.data
  const isLoading = clienteQuery.isLoading
  const isError = clienteQuery.isError

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !cliente) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <EmptyState
          title="Cliente não encontrado"
          description="O cliente que você está procurando não existe ou foi removido."
        />
      </div>
    )
  }

  const tipoPessoaLabel = cliente.tipo_pessoa === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'
  const origemLabel = cliente.origem
  const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join(' - ')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{cliente.nome}</h1>
            <Badge variant={cliente.ativo ? 'default' : 'secondary'}>
              {cliente.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {tipoPessoaLabel}
            {cliente.cpf_cnpj && ` • ${formatCpfCnpj(cliente.cpf_cnpj)}`}
          </p>
        </div>
        <div className="ml-auto max-sm:basis-full max-sm:flex max-sm:justify-end">
          <ClienteActions
            telefone={cliente.telefone}
            whatsapp={cliente.whatsapp}
            email={cliente.email}
          />
        </div>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="contatos">
            Contatos
            {contatosQuery.data && contatosQuery.data.length > 0 && (
              <span className="ml-2 rounded-full bg-muted-foreground/20 px-2 py-0.5 text-xs">
                {contatosQuery.data.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="oportunidades">
            Oportunidades
            {oportunidadesQuery.data && oportunidadesQuery.data.total > 0 && (
              <span className="ml-2 rounded-full bg-muted-foreground/20 px-2 py-0.5 text-xs">
                {oportunidadesQuery.data.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="atividades">
            Atividades
            {atividadesQuery.data && atividadesQuery.data.total > 0 && (
              <span className="ml-2 rounded-full bg-muted-foreground/20 px-2 py-0.5 text-xs">
                {atividadesQuery.data.total}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <p className="text-sm font-medium">{tipoPessoaLabel}</p>
                </div>
                {cliente.nome_fantasia && (
                  <div>
                    <span className="text-xs text-muted-foreground">Nome Fantasia</span>
                    <p className="text-sm font-medium">{cliente.nome_fantasia}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">CPF/CNPJ</span>
                  <p className="text-sm font-medium">{formatCpfCnpj(cliente.cpf_cnpj)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">E-mail</span>
                  <p className="text-sm font-medium">{cliente.email ?? '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Telefone</span>
                  <p className="text-sm font-medium">{formatPhone(cliente.telefone)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                  <p className="text-sm font-medium">{formatPhone(cliente.whatsapp)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Cidade/UF</span>
                  <p className="text-sm font-medium">{cidadeUf || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Origem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Origem</span>
                  <p className="text-sm font-medium">{origemLabel || '-'}</p>
                </div>
                {cliente.responsavel_nome && (
                  <div>
                    <span className="text-xs text-muted-foreground">Responsável</span>
                    <p className="text-sm font-medium">{cliente.responsavel_nome}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Datas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Criado em</span>
                  <p className="text-sm font-medium">{formatDateTime(cliente.criado_em)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Atualizado em</span>
                  <p className="text-sm font-medium">{formatDateTime(cliente.atualizado_em)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {cliente.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{cliente.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contatos" className="space-y-4">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Contatos vinculados a este cliente</p>
            <Button size="sm" onClick={openNewContatoDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Novo Contato
            </Button>
          </div>

          {contatosQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contatosQuery.isError ? (
            <EmptyState title="Erro ao carregar contatos" description="Tente novamente mais tarde." />
          ) : !contatosQuery.data || contatosQuery.data.length === 0 ? (
            <EmptyState
              title="Nenhum contato"
              description="Adicione contatos para este cliente."
              action={{ label: 'Novo Contato', onClick: openNewContatoDialog }}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contatosQuery.data.map((contato) => (
                    <TableRow key={contato.id}>
                      <TableCell className="font-medium">{contato.nome}</TableCell>
                      <TableCell>{contato.cargo ?? '-'}</TableCell>
                      <TableCell>{contato.email ?? '-'}</TableCell>
                      <TableCell>{formatPhone(contato.telefone)}</TableCell>
                      <TableCell>{formatPhone(contato.whatsapp)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 sm:h-8 sm:w-8"
                            aria-label={`Editar ${contato.nome}`}
                            onClick={() => openEditContatoDialog(contato)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-destructive sm:h-8 sm:w-8"
                            aria-label={`Excluir ${contato.nome}`}
                            onClick={() => setContatoDeleteId(contato.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="oportunidades" className="space-y-4">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Oportunidades deste cliente</p>
            <Button size="sm" onClick={() => router.push(`/oportunidades?cliente_id=${clienteId}`)}>
              <Plus className="mr-1 h-4 w-4" />
              Nova Oportunidade
            </Button>
          </div>

          {oportunidadesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : oportunidadesQuery.isError ? (
            <EmptyState title="Erro ao carregar oportunidades" description="Tente novamente mais tarde." />
          ) : !oportunidadesQuery.data || oportunidadesQuery.data.data.length === 0 ? (
            <EmptyState
              title="Nenhuma oportunidade"
              description="Nenhuma oportunidade registrada para este cliente."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Previsão</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesQuery.data.data.map((op) => (
                    <TableRow
                      key={op.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/oportunidades?oportunidade_id=${op.id}`)}
                    >
                      <TableCell className="font-medium">{op.titulo}</TableCell>
                      <TableCell>{formatCurrency(op.valor)}</TableCell>
                      <TableCell>
                        {op.etapa_nome ? (
                          <Badge style={{ backgroundColor: op.etapa_cor ?? undefined }}>
                            {op.etapa_nome}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(op.previsao_fechamento)}</TableCell>
                      <TableCell>{op.responsavel_nome ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="atividades" className="space-y-4">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Atividades deste cliente</p>
            <Button size="sm" onClick={() => router.push(`/atividades?cliente_id=${clienteId}`)}>
              <Plus className="mr-1 h-4 w-4" />
              Nova Atividade
            </Button>
          </div>

          {atividadesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : atividadesQuery.isError ? (
            <EmptyState title="Erro ao carregar atividades" description="Tente novamente mais tarde." />
          ) : !atividadesQuery.data || atividadesQuery.data.data.length === 0 ? (
            <EmptyState
              title="Nenhuma atividade"
              description="Nenhuma atividade registrada para este cliente."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Vencimento</TableHead>
                    <TableHead>Data Conclusão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividadesQuery.data.data.map((ativ) => (
                    <TableRow key={ativ.id}>
                      <TableCell className="font-medium">{ativ.titulo}</TableCell>
                      <TableCell>{ativ.tipo}</TableCell>
                      <TableCell>
                        {formatDate(ativ.data_prevista)}
                        {ativ.hora_prevista ? ` às ${ativ.hora_prevista.slice(0, 5)}` : ''}
                      </TableCell>
                      <TableCell>{formatDateTime(ativ.concluida_em)}</TableCell>
                      <TableCell>
                        <Badge variant={ativ.concluida ? 'default' : 'secondary'}>
                          {ativ.concluida ? 'Concluída' : 'Pendente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={contatoDialogOpen} onOpenChange={setContatoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContato ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
            <DialogDescription>
              {editingContato ? 'Edite os dados do contato.' : 'Adicione um novo contato para este cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContatoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contato-nome">Nome *</Label>
              <Input
                id="contato-nome"
                placeholder="Nome do contato"
                value={contatoForm.nome}
                onChange={(e) => setContatoForm((prev) => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contato-cargo">Cargo</Label>
                <Input
                  id="contato-cargo"
                  placeholder="Cargo"
                  value={contatoForm.cargo}
                  onChange={(e) => setContatoForm((prev) => ({ ...prev, cargo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato-email">E-mail</Label>
                <Input
                  id="contato-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={contatoForm.email}
                  onChange={(e) => setContatoForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contato-telefone">Telefone</Label>
                <Input
                  id="contato-telefone"
                  placeholder="(00) 0000-0000"
                  maxLength={15}
                  value={contatoForm.telefone}
                  onChange={(e) =>
                    setContatoForm((prev) => ({ ...prev, telefone: applyPhoneMask(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato-whatsapp">WhatsApp</Label>
                <Input
                  id="contato-whatsapp"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  value={contatoForm.whatsapp}
                  onChange={(e) =>
                    setContatoForm((prev) => ({ ...prev, whatsapp: applyPhoneMask(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeContatoDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createContatoMutation.isPending || updateContatoMutation.isPending}
              >
                {(createContatoMutation.isPending || updateContatoMutation.isPending) && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!contatoDeleteId}
        onOpenChange={(open) => { if (!open) setContatoDeleteId(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setContatoDeleteId(null)}
              disabled={deleteContatoMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => contatoDeleteId && deleteContatoMutation.mutate(contatoDeleteId)}
              disabled={deleteContatoMutation.isPending}
            >
              {deleteContatoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
