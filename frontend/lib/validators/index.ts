import { z } from 'zod'

const msg = {
  required: 'Campo obrigatório',
  email: 'E-mail inválido',
  min: (n: number) => `Mínimo de ${n} caractere(s)`,
  max: (n: number) => `Máximo de ${n} caractere(s)`,
  password: 'A senha deve conter pelo menos 6 caracteres, uma letra maiúscula e um número',
  confirmPassword: 'As senhas não conferem',
  cpfCnpj: 'CPF/CNPJ inválido',
  uf: 'UF deve ter 2 caracteres',
  percent: 'Valor deve estar entre 0 e 100',
  aceite: 'Você precisa aceitar os termos',
}

export const loginSchema = z.object({
  email: z.string().min(1, msg.required).email(msg.email),
  password: z.string().min(1, msg.required).min(6, msg.min(6)),
})

export const cadastroSchema = z
  .object({
    nome: z.string().min(2, msg.min(2)),
    email: z.string().min(1, msg.required).email(msg.email),
    password: z
      .string()
      .min(6, msg.min(6))
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
        msg.password
      ),
    confirmPassword: z.string(),
    aceiteTermos: z.literal(true, { message: msg.aceite }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: msg.confirmPassword,
    path: ['confirmPassword'],
  })

export const onboardingSchema = z.object({
  nome_usuario: z.string().min(2, msg.min(2)),
  nome_empresa: z.string().min(2, msg.min(2)),
})

const cpfSchema = z
  .string()
  .length(11, msg.cpfCnpj)
  .regex(/^\d{11}$/, msg.cpfCnpj)
  .refine(
    (cpf) => {
      const digits = cpf.split('').map(Number)
      const calc = (factor: number) =>
        digits.slice(0, factor - 1).reduce((sum, d, i) => sum + d * (factor - i), 0)
      const rest = (sum: number) => ((sum * 10) % 11) % 10
      return rest(calc(10)) === digits[9] && rest(calc(11)) === digits[10]
    },
    { message: msg.cpfCnpj }
  )

const cnpjSchema = z
  .string()
  .length(14, msg.cpfCnpj)
  .regex(/^\d{14}$/, msg.cpfCnpj)
  .refine(
    (cnpj) => {
      const digits = cnpj.split('').map(Number)
      const calc = (weights: number[]) =>
        weights.reduce((sum, w, i) => sum + digits[i] * w, 0)
      const rest = (sum: number) => {
        const r = sum % 11
        return r < 2 ? 0 : 11 - r
      }
      const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      return rest(calc(w1)) === digits[12] && rest(calc(w2)) === digits[13]
    },
    { message: msg.cpfCnpj }
  )

export const clienteSchema = z
  .object({
    tipo_pessoa: z.enum(['FISICA', 'JURIDICA']),
    nome: z.string().min(2, msg.min(2)),
    cpf_cnpj: z.string().optional().or(z.literal('')),
    email: z.string().optional().or(z.literal('')),
    telefone: z.string().optional().or(z.literal('')),
    whatsapp: z.string().optional().or(z.literal('')),
    cidade: z.string().optional().or(z.literal('')),
    uf: z
      .string()
      .length(2, msg.uf)
      .optional()
      .or(z.literal('')),
    origem: z.string().optional().or(z.literal('')),
    observacoes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const raw = (data.cpf_cnpj ?? '').replace(/\D/g, '')
    if (!raw) return
    if (data.tipo_pessoa === 'FISICA') {
      if (raw.length !== 11) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg.cpfCnpj, path: ['cpf_cnpj'] })
        return
      }
      const result = cpfSchema.safeParse(raw)
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg.cpfCnpj, path: ['cpf_cnpj'] })
      }
    } else {
      if (raw.length !== 14) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg.cpfCnpj, path: ['cpf_cnpj'] })
        return
      }
      const result = cnpjSchema.safeParse(raw)
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg.cpfCnpj, path: ['cpf_cnpj'] })
      }
    }
  })

export const oportunidadeSchema = z.object({
  titulo: z.string().min(2, msg.min(2)),
  cliente_id: z.string().min(1, msg.required),
  contato_id: z.string().optional().or(z.literal('')),
  funil_id: z.string().min(1, msg.required),
  etapa_id: z.string().min(1, msg.required),
  valor: z.coerce.number().min(0, 'Valor não pode ser negativo'),
  previsao_fechamento: z.string().optional().or(z.literal('')),
  observacoes: z.string().optional().or(z.literal('')),
})

export const atividadeSchema = z.object({
  tipo: z.enum(['TAREFA', 'LIGACAO', 'REUNIAO', 'EMAIL', 'WHATSAPP', 'ANOTACAO'], {
    message: 'Selecione um tipo',
  }),
  titulo: z.string().min(2, msg.min(2)),
  descricao: z.string().optional().or(z.literal('')),
  cliente_id: z.string().optional().or(z.literal('')),
  oportunidade_id: z.string().optional().or(z.literal('')),
  data_prevista: z.string().optional().or(z.literal('')),
  hora_prevista: z.string().optional().or(z.literal('')),
})

export const etapaSchema = z.object({
  nome: z.string().min(2, msg.min(2)),
  cor: z.string().min(1, msg.required),
  probabilidade: z.coerce.number().min(0, msg.percent).max(100, msg.percent),
  tipo: z.enum(['INICIAL', 'INTERMEDIARIA', 'FINAL', 'PERDIDA'], {
    message: 'Selecione um tipo',
  }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CadastroInput = z.infer<typeof cadastroSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type ClienteInput = z.infer<typeof clienteSchema>
export type OportunidadeInput = z.infer<typeof oportunidadeSchema>
export type AtividadeInput = z.infer<typeof atividadeSchema>
export type EtapaInput = z.infer<typeof etapaSchema>
