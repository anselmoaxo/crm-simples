import { apiClient } from './client'

export interface Resumo {
  total_clientes: number
  oportunidades_abertas: number
  oportunidades_ganhas: number
  oportunidades_perdidas: number
  valor_em_negociacao: number
  valor_ganho_periodo: number
  taxa_conversao: number
  atividades_vencidas: number
  atividades_hoje: number
  proximas_atividades: number
}

export interface FunilEtapa {
  etapa_id: string
  etapa_nome: string
  etapa_cor: string | null
  quantidade: number
  valor_total: number
}

export interface VendasPeriodo {
  periodo: string
  quantidade: number
  valor_total: number
}

export interface AtividadePendente {
  id: string
  tipo: string
  titulo: string
  cliente_nome: string | null
  data_prevista: string | null
  hora_prevista: string | null
  responsavel_nome: string | null
  em_atraso: boolean
}

export interface DesempenhoVendedor {
  usuario_id: string
  usuario_nome: string
  oportunidades_abertas: number
  oportunidades_ganhas: number
  valor_ganho: number
  atividades_pendentes: number
}

export interface OrigemCliente {
  origem: string
  quantidade: number
}

export function getResumo(signal?: AbortSignal) {
  return apiClient.get<Resumo>('/dashboard/resumo', signal)
}

export function getFunil(signal?: AbortSignal) {
  return apiClient.get<FunilEtapa[]>('/dashboard/funil', signal)
}

export function getVendasPorPeriodo(dias = 30, signal?: AbortSignal) {
  return apiClient.get<VendasPeriodo[]>(`/dashboard/vendas-por-periodo?dias=${dias}`, signal)
}

export function getAtividadesPendentes(signal?: AbortSignal) {
  return apiClient.get<AtividadePendente[]>('/dashboard/atividades-pendentes', signal)
}

export function getDesempenhoVendedores(signal?: AbortSignal) {
  return apiClient.get<DesempenhoVendedor[]>('/dashboard/desempenho-vendedores', signal)
}

export function getOrigemClientes(signal?: AbortSignal) {
  return apiClient.get<OrigemCliente[]>('/dashboard/origem-clientes', signal)
}
