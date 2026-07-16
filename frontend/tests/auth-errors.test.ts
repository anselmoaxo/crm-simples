import { describe, expect, it } from 'vitest'

import {
  authCallbackErrorPath,
  callbackErrorMessage,
  friendlyAuthError,
} from '@/lib/api/errors'

describe('erros de autenticação', () => {
  it('traduz credenciais inválidas e e-mail não confirmado', () => {
    expect(friendlyAuthError({ code: 'invalid_credentials' })).toBe('E-mail ou senha incorretos.')
    expect(friendlyAuthError({ code: 'email_not_confirmed' })).toContain('Confirme seu e-mail')
  })

  it('trata link expirado em recuperação sem devolver o usuário ao reset', () => {
    expect(authCallbackErrorPath('/redefinir-senha', { code: 'otp_expired' }))
      .toBe('/esqueci-senha?error=link_expirado')
    expect(callbackErrorMessage('link_expirado')).toContain('expirou')
  })

  it('envia falha de confirmação comum ao login', () => {
    expect(authCallbackErrorPath(null, { code: 'access_denied' }))
      .toBe('/login?error=callback_invalido')
  })

  it('preserva o detalhe de um erro desconhecido do Supabase', () => {
    expect(friendlyAuthError({ code: 'unexpected', message: 'Unexpected provider failure' }))
      .toBe('Não foi possível concluir a autenticação: Unexpected provider failure')
  })

  it('explica falhas de trigger ao salvar um usuário', () => {
    expect(friendlyAuthError({ message: 'Database error saving new user' }))
      .toContain('triggers e funções')
  })
})
