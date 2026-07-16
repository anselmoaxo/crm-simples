import { describe, expect, it } from 'vitest'

import { safePostLoginPath, safeRelativePath } from '@/lib/auth/redirect'

describe('safeRelativePath', () => {
  it('preserva caminhos internos com query e hash', () => {
    expect(safeRelativePath('/clientes?pagina=2#lista')).toBe('/clientes?pagina=2#lista')
  })

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'dashboard'])(
    'rejeita redirecionamento inseguro: %s',
    (value) => expect(safeRelativePath(value)).toBeNull(),
  )
})

describe('safePostLoginPath', () => {
  it('rejeita retorno para páginas de autenticação', () => {
    expect(safePostLoginPath('/login')).toBeNull()
    expect(safePostLoginPath('/cadastro')).toBeNull()
    expect(safePostLoginPath('/auth/callback?code=abc')).toBeNull()
  })

  it('aceita retorno para uma página protegida', () => {
    expect(safePostLoginPath('/oportunidades?funil=123')).toBe('/oportunidades?funil=123')
  })
})
