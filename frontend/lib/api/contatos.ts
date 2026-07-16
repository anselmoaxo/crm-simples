import type { Contato } from '@/types'
import { apiClient } from './client'

export interface ContatoInput {
  nome: string
  cargo: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
}

export function listContatos(clienteId: string, signal?: AbortSignal) {
  return apiClient.get<Contato[]>(`/clientes/${clienteId}/contatos`, signal)
}

export function createContato(clienteId: string, data: ContatoInput) {
  return apiClient.post<Contato>(`/clientes/${clienteId}/contatos`, data)
}

export function updateContato(id: string, data: ContatoInput) {
  return apiClient.patch<Contato>(`/contatos/${id}`, data)
}

export function deleteContato(id: string) {
  return apiClient.delete<{ mensagem: string }>(`/contatos/${id}`)
}
