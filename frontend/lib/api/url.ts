export function getApiUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL
  if (!configuredUrl) {
    throw new Error('NEXT_PUBLIC_API_URL não está configurada.')
  }

  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL deve ser uma URL válida.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('NEXT_PUBLIC_API_URL deve usar HTTP ou HTTPS.')
  }
  if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('NEXT_PUBLIC_API_URL não pode apontar para localhost em produção.')
  }

  return configuredUrl.replace(/\/$/, '')
}
