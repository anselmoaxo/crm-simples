import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }))

vi.mock('@supabase/ssr', () => ({ createServerClient }))

import { GET } from '@/app/auth/callback/route'

function authClient(result: {
  data: { user: { id: string } | null; session: { access_token: string } | null }
  error: { code?: string; message?: string } | null
}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => result),
    },
  }
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    createServerClient.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test/api/v1'
  })

  it('persiste os cookies trocados e redireciona perfil completo', async () => {
    const client = authClient({
      data: { user: { id: 'user-123' }, session: { access_token: 'token-123' } },
      error: null,
    })
    createServerClient.mockImplementation((_url, _key, options) => {
      client.auth.exchangeCodeForSession.mockImplementationOnce(async () => {
        options.cookies.setAll([{
          name: 'sb-session',
          value: 'cookie-value',
          options: { httpOnly: true, path: '/' },
        }])
        return {
          data: { user: { id: 'user-123' }, session: { access_token: 'token-123' } },
          error: null,
        }
      })
      return client
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ empresa_id: 'empresa-123' }),
      { status: 200 },
    )))

    const response = await GET(new NextRequest('https://crm.test/auth/callback?code=valid'))

    expect(response.headers.get('location')).toBe('https://crm.test/dashboard')
    expect(response.cookies.get('sb-session')?.value).toBe('cookie-value')
  })

  it('direciona usuário autenticado sem perfil ao onboarding', async () => {
    createServerClient.mockReturnValue(authClient({
      data: { user: { id: 'user-123' }, session: { access_token: 'token-123' } },
      error: null,
    }))
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      detail: { error: { code: 'PERFIL_NAO_CADASTRADO', message: 'Complete o onboarding.' } },
    }), { status: 403 })))

    const response = await GET(new NextRequest('https://crm.test/auth/callback?code=valid'))

    expect(response.headers.get('location')).toBe('https://crm.test/onboarding')
  })

  it('preserva redirecionamento interno e não consulta a API novamente', async () => {
    createServerClient.mockReturnValue(authClient({
      data: { user: { id: 'user-123' }, session: { access_token: 'token-123' } },
      error: null,
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(new NextRequest(
      'https://crm.test/auth/callback?code=valid&next=%2Fredefinir-senha',
    ))

    expect(response.headers.get('location')).toBe('https://crm.test/redefinir-senha')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mantém a sessão útil quando a API está indisponível', async () => {
    createServerClient.mockReturnValue(authClient({
      data: { user: { id: 'user-123' }, session: { access_token: 'token-123' } },
      error: null,
    }))
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))

    const response = await GET(new NextRequest('https://crm.test/auth/callback?code=valid'))

    expect(response.headers.get('location')).toBe('https://crm.test/dashboard')
  })

  it('explica link de recuperação expirado sem criar sessão', async () => {
    const response = await GET(new NextRequest(
      'https://crm.test/auth/callback?next=%2Fredefinir-senha&error_code=otp_expired',
    ))

    expect(response.headers.get('location'))
      .toBe('https://crm.test/esqueci-senha?error=link_expirado')
    expect(createServerClient).not.toHaveBeenCalled()
  })
})
