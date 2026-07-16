export function safeRelativePath(value: string | null | undefined): string | null {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }

  try {
    const base = new URL('https://local.invalid')
    const target = new URL(value, base)
    if (target.origin !== base.origin) return null
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return null
  }
}

export function safePostLoginPath(value: string | null | undefined): string | null {
  const path = safeRelativePath(value)
  if (!path) return null

  const pathname = new URL(path, 'https://local.invalid').pathname
  return ['/login', '/cadastro', '/auth/callback'].includes(pathname) ? null : path
}
