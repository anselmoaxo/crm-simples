export interface Empresa {
  id: string
  nome: string
  criado_em: string
}

export interface Perfil {
  id: string
  empresa_id: string
  nome: string
  email?: string | null
  perfil: "ADMIN" | "GERENTE" | "VENDEDOR"
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface UsuarioLogado {
  usuario_id: string
  email: string
  perfil_id: string
  empresa_id: string
  perfil: "ADMIN" | "GERENTE" | "VENDEDOR"
  nome: string
}

export interface MeResponse {
  id: string
  email: string
  nome: string
  perfil: "ADMIN" | "GERENTE" | "VENDEDOR"
  empresa_id: string
  empresa_nome: string
  ativo: boolean
}

export interface Cliente {
  id: string
  empresa_id: string
  tipo_pessoa: "FISICA" | "JURIDICA"
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

export interface ClienteListResponse {
  data: Cliente[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export interface Contato {
  id: string
  cliente_id: string
  nome: string
  cargo: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export interface Funil {
  id: string
  empresa_id: string
  nome: string
  ativo: boolean
  criado_em: string | null
  atualizado_em: string | null
}

export interface EtapaFunil {
  id: string
  funil_id: string
  empresa_id: string
  nome: string
  ordem: number
  cor: string | null
  tipo: "ABERTA" | "GANHA" | "PERDIDA"
  probabilidade: number
  criado_em: string | null
  atualizado_em: string | null
}

export interface Oportunidade {
  id: string
  empresa_id: string
  cliente_id: string
  cliente_nome: string | null
  contato_id: string | null
  contato_nome: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  funil_id: string
  funil_nome: string | null
  etapa_id: string
  etapa_nome: string | null
  etapa_cor: string | null
  etapa_tipo: string | null
  titulo: string
  valor: number
  previsao_fechamento: string | null
  motivo_perda: string | null
  ganho_em: string | null
  perdido_em: string | null
  observacoes: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export interface OportunidadeListResponse {
  data: Oportunidade[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export interface Atividade {
  id: string
  empresa_id: string
  cliente_id: string | null
  cliente_nome: string | null
  oportunidade_id: string | null
  oportunidade_titulo: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  tipo: "TAREFA" | "LIGACAO" | "REUNIAO" | "EMAIL" | "WHATSAPP" | "ANOTACAO"
  titulo: string
  descricao: string | null
  data_prevista: string | null
  hora_prevista: string | null
  concluida: boolean
  concluida_em: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export interface AtividadeListResponse {
  data: Atividade[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details: string | null
  }
}

export type PerfilTipo = "ADMIN" | "GERENTE" | "VENDEDOR"
