import type { Perfil } from '@/types'
import { apiClient } from './client'

export interface PerfilUpdate {
  nome?: string
}

export function listPerfis(signal?: AbortSignal) {
  return apiClient.get<Perfil[]>('/perfis', signal)
}

export function updatePerfil(id: string, data: PerfilUpdate) {
  return apiClient.patch<Perfil>(`/perfis/${id}`, data)
}
