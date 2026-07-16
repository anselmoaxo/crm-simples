import { afterEach, describe, expect, it, vi } from 'vitest'

import { getApiUrl } from '@/lib/api/url'

afterEach(() => vi.unstubAllEnvs())

describe('getApiUrl', () => {
  it('remove a barra final', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000/api/v1/')
    expect(getApiUrl()).toBe('http://localhost:8000/api/v1')
  })

  it('rejeita configuração ausente', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '')
    expect(() => getApiUrl()).toThrow('NEXT_PUBLIC_API_URL não está configurada')
  })

  it('rejeita localhost em produção', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000/api/v1')
    expect(() => getApiUrl()).toThrow('não pode apontar para localhost em produção')
  })
})
