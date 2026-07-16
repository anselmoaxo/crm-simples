import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDate } from '@/lib/formatters'

describe('formatters', () => {
  it('não desloca uma data sem horário para o dia anterior', () => {
    expect(formatDate('2026-07-14')).toBe('14/07/2026')
  })

  it('formata moeda no padrão brasileiro', () => {
    expect(formatCurrency(1234.56)).toContain('1.234,56')
  })
})
