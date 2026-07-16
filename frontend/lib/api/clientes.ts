import { apiClient } from './client'
import { fetchAllPages } from './pagination'

export interface ClienteListParams {
  pagina?: number
  por_pagina?: number
  nome?: string
  cpf_cnpj?: string
  cidade?: string
  uf?: string
  origem?: string
  ativo?: boolean
}

export interface Cliente {
  id: string
  empresa_id: string
  tipo_pessoa: 'FISICA' | 'JURIDICA'
  nome: string
  nome_fantasia: string | null
  cpf_cnpj: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  cidade: string | null
  uf: string | null
  origem: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  observacoes: string | null
  ativo: boolean
  criado_em: string | null
  atualizado_em: string | null
}

export interface ClienteCreate {
  tipo_pessoa: 'FISICA' | 'JURIDICA'
  nome: string
  nome_fantasia?: string | null
  cpf_cnpj?: string | null
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  cidade?: string | null
  uf?: string | null
  origem?: string | null
  responsavel_id?: string | null
  observacoes?: string | null
  ativo?: boolean
}

export interface Contato {
  id: string
  cliente_id: string
  empresa_id: string
  nome: string
  cargo: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export function listClientes(params?: ClienteListParams, signal?: AbortSignal) {
  const searchParams = new URLSearchParams()
  if (params?.pagina) searchParams.set('pagina', String(params.pagina))
  if (params?.por_pagina) searchParams.set('por_pagina', String(Math.min(params.por_pagina, 100)))
  if (params?.nome) searchParams.set('nome', params.nome)
  if (params?.cpf_cnpj) searchParams.set('cpf_cnpj', params.cpf_cnpj)
  if (params?.cidade) searchParams.set('cidade', params.cidade)
  if (params?.uf) searchParams.set('uf', params.uf)
  if (params?.origem) searchParams.set('origem', params.origem)
  if (params?.ativo !== undefined) searchParams.set('ativo', String(params.ativo))
  const query = searchParams.toString()
  return apiClient.get<PaginatedResponse<Cliente>>(`/clientes${query ? `?${query}` : ''}`, signal)
}

export function listAllClientes(params?: Omit<ClienteListParams, 'pagina' | 'por_pagina'>, signal?: AbortSignal) {
  return fetchAllPages((pagina, por_pagina) => listClientes({ ...params, pagina, por_pagina }, signal))
}

export function getCliente(id: string, signal?: AbortSignal) {
  return apiClient.get<Cliente>(`/clientes/${id}`, signal)
}

export function createCliente(data: ClienteCreate, signal?: AbortSignal) {
  return apiClient.post<Cliente>('/clientes', data, signal)
}

export function updateCliente(id: string, data: Partial<ClienteCreate>, signal?: AbortSignal) {
  return apiClient.patch<Cliente>(`/clientes/${id}`, data, signal)
}

export function deleteCliente(id: string, signal?: AbortSignal) {
  return apiClient.delete<void>(`/clientes/${id}`, signal)
}

export function createClientesTeste() {
  return apiClient.post<{ mensagem: string; criados: number; ignorados: number }>(
    '/clientes/dados-teste',
  )
}

export function getContatos(clienteId: string, signal?: AbortSignal) {
  return apiClient.get<Contato[]>(`/clientes/${clienteId}/contatos`, signal)
}
