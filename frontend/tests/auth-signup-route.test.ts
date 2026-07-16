import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }))

vi.mock('@supabase/ssr', () => ({ createServerClient }))

import { POST } from '@/app/api/auth/signup/route'

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    createServerClient.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
  })

  it('cria conta, preserva PKCE e usa callback da mesma origem', async () => {
    const signUp = vi.fn(async () => ({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    }))
    createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([{
        name: 'sb-code-verifier',
        value: 'verifier',
        options: { httpOnly: true, path: '/' },
      }])
      return { auth: { signUp } }
    })

    const response = await POST(new NextRequest('https://crm.test/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Maria', email: 'maria@example.com', password: 'Senha123' }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ hasSession: false, existingUser: false })
    expect(response.cookies.get('sb-code-verifier')?.value).toBe('verifier')
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ emailRedirectTo: 'https://crm.test/auth/callback' }),
    }))
  })

  it('retorna erro estruturado em vez de objeto vazio', async () => {
    createServerClient.mockReturnValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: null, session: null },
          error: { code: 'provider_failure', message: '{}', status: 500 },
        })),
      },
    })

    const response = await POST(new NextRequest('https://crm.test/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Maria', email: 'maria@example.com', password: 'Senha123' }),
    }))

    expect(response.status).toBe(500)
    expect((await response.json()).error.message).toContain('resposta vazia')
  })
})
