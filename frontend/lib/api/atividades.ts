import { apiClient } from './client'

export interface AtividadeListParams {
  pagina?: number
  por_pagina?: number
  cliente_id?: string
  oportunidade_id?: string
  tipo?: string
  responsavel_id?: string
  data?: string
  concluida?: boolean
  atrasada?: boolean
  hoje?: boolean
}

export interface Atividade {
  id: string
  empresa_id: string
  tipo: string
  titulo: string
  descricao: string | null
  cliente_id: string | null
  cliente_nome: string | null
  oportunidade_id: string | null
  oportunidade_titulo: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  data_prevista: string | null
  hora_prevista: string | null
  concluida: boolean
  concluida_em: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export interface AtividadeCreate {
  tipo: string
  titulo: string
  descricao?: string
  cliente_id?: string
  oportunidade_id?: string
  responsavel_id?: string
  data_prevista?: string
  hora_prevista?: string
}

export function listAtividades(params?: AtividadeListParams, signal?: AbortSignal) {
  const searchParams = new URLSearchParams()
  if (params?.pagina) searchParams.set('pagina', String(params.pagina))
  if (params?.por_pagina) searchParams.set('por_pagina', String(params.por_pagina))
  if (params?.cliente_id) searchParams.set('cliente_id', params.cliente_id)
  if (params?.oportunidade_id) searchParams.set('oportunidade_id', params.oportunidade_id)
  if (params?.tipo) searchParams.set('tipo', params.tipo)
  if (params?.responsavel_id) searchParams.set('responsavel_id', params.responsavel_id)
  if (params?.data) searchParams.set('data', params.data)
  if (params?.concluida !== undefined) searchParams.set('concluida', String(params.concluida))
  if (params?.atrasada !== undefined) searchParams.set('atrasada', String(params.atrasada))
  if (params?.hoje !== undefined) searchParams.set('hoje', String(params.hoje))
  const query = searchParams.toString()
  return apiClient.get<{ data: Atividade[]; total: number; pagina: number; por_pagina: number; total_paginas: number }>(
    `/atividades${query ? `?${query}` : ''}`,
    signal
  )
}

export function createAtividade(data: AtividadeCreate, signal?: AbortSignal) {
  return apiClient.post<Atividade>('/atividades', data, signal)
}

export function updateAtividade(id: string, data: Partial<AtividadeCreate>, signal?: AbortSignal) {
  return apiClient.patch<Atividade>(`/atividades/${id}`, data, signal)
}

export function concluirAtividade(id: string, signal?: AbortSignal) {
  return apiClient.patch<Atividade>(`/atividades/${id}/concluir`, undefined, signal)
}

export function reabrirAtividade(id: string, signal?: AbortSignal) {
  return apiClient.patch<Atividade>(`/atividades/${id}/reabrir`, undefined, signal)
}

export function deleteAtividade(id: string, signal?: AbortSignal) {
  return apiClient.delete<void>(`/atividades/${id}`, signal)
}
