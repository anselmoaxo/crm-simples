import { describe, expect, it } from 'vitest'

import { createError } from '@/lib/api/client'

describe('createError', () => {
  it('normaliza o envelope de erro da aplicação', () => {
    expect(createError(403, {
      error: { code: 'ACESSO_NEGADO', message: 'Sem permissão.', details: null },
    })).toMatchObject({
      status: 403,
      code: 'ACESSO_NEGADO',
      message: 'Sem permissão.',
    })
  })

  it('transforma erros de validação do FastAPI em mensagem legível', () => {
    const error = createError(422, {
      detail: [{ loc: ['body', 'nome'], msg: 'Field required', type: 'missing' }],
    })

    expect(error.message).toBe('nome: Field required')
  })
})
