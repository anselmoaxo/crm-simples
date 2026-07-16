import { apiClient } from './client'
import { fetchAllPages, type PaginatedResponse } from './pagination'
import type { Oportunidade } from '@/types'

export interface OportunidadeListParams {
  pagina?: number
  por_pagina?: number
  cliente_id?: string
  funil_id?: string
  etapa_id?: string
  status?: string
  titulo?: string
}

export interface OportunidadeCreate {
  titulo: string
  cliente_id: string
  contato_id?: string | null
  responsavel_id?: string | null
  funil_id: string
  etapa_id: string
  valor: number
  previsao_fechamento?: string | null
  observacoes?: string | null
}

export interface MoverEtapaData {
  etapa_id: string
  motivo_perda?: string
}

function normalizeOptionalFields<T extends Partial<OportunidadeCreate>>(data: T): T {
  return {
    ...data,
    contato_id: data.contato_id?.trim() || null,
    responsavel_id: data.responsavel_id?.trim() || null,
    previsao_fechamento: data.previsao_fechamento?.trim() || null,
    observacoes: data.observacoes?.trim() || null,
  }
}

export function listOportunidades(params?: OportunidadeListParams, signal?: AbortSignal) {
  const searchParams = new URLSearchParams()
  if (params?.pagina) searchParams.set('pagina', String(params.pagina))
  if (params?.por_pagina) searchParams.set('por_pagina', String(Math.min(params.por_pagina, 100)))
  if (params?.cliente_id) searchParams.set('cliente_id', params.cliente_id)
  if (params?.funil_id) searchParams.set('funil_id', params.funil_id)
  if (params?.etapa_id) searchParams.set('etapa_id', params.etapa_id)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.titulo) searchParams.set('titulo', params.titulo)
  const query = searchParams.toString()
  return apiClient.get<PaginatedResponse<Oportunidade>>(
    `/oportunidades${query ? `?${query}` : ''}`,
    signal
  )
}

export function listAllOportunidades(
  params?: Omit<OportunidadeListParams, 'pagina' | 'por_pagina'>,
  signal?: AbortSignal,
) {
  return fetchAllPages((pagina, por_pagina) =>
    listOportunidades({ ...params, pagina, por_pagina }, signal),
  )
}

export function getOportunidade(id: string, signal?: AbortSignal) {
  return apiClient.get<Oportunidade>(`/oportunidades/${id}`, signal)
}

export function createOportunidade(data: OportunidadeCreate, signal?: AbortSignal) {
  return apiClient.post<Oportunidade>('/oportunidades', normalizeOptionalFields(data), signal)
}

export function updateOportunidade(id: string, data: Partial<OportunidadeCreate>, signal?: AbortSignal) {
  return apiClient.patch<Oportunidade>(`/oportunidades/${id}`, normalizeOptionalFields(data), signal)
}

export function deleteOportunidade(id: string, signal?: AbortSignal) {
  return apiClient.delete<void>(`/oportunidades/${id}`, signal)
}

export function moverEtapa(id: string, data: MoverEtapaData, signal?: AbortSignal) {
  return apiClient.patch<Oportunidade>(`/oportunidades/${id}/etapa`, data, signal)
}
