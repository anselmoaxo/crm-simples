import type { EtapaFunil, Funil } from '@/types'
import { apiClient } from './client'

export interface EtapaInput {
  nome: string
  cor: string
  probabilidade: number
  tipo: EtapaFunil['tipo']
}

export function listFunis(signal?: AbortSignal) {
  return apiClient.get<Funil[]>('/funis', signal)
}

export function listEtapas(funilId: string, signal?: AbortSignal) {
  return apiClient.get<EtapaFunil[]>(`/funis/${funilId}/etapas`, signal)
}

export function createEtapa(funilId: string, data: EtapaInput) {
  return apiClient.post<EtapaFunil>(`/funis/${funilId}/etapas`, data)
}

export function updateEtapa(id: string, data: EtapaInput) {
  return apiClient.patch<EtapaFunil>(`/funis/etapas/${id}`, data)
}

export function deleteEtapa(id: string) {
  return apiClient.delete<{ mensagem: string }>(`/funis/etapas/${id}`)
}

export function reorderEtapas(funilId: string, etapasIds: string[]) {
  return apiClient.patch<{ mensagem: string }>(`/funis/${funilId}/etapas/reordenar`, {
    etapas_ids: etapasIds,
  })
}
