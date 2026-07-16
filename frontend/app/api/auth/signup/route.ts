import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

function errorPayload(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { code: 'signup_failed', message: String(error || 'Erro desconhecido') }
  }

  const value = error as Record<string, unknown>
  const rawMessage = value.message
  const message = typeof rawMessage === 'string'
    ? rawMessage
    : JSON.stringify(rawMessage ?? value)

  return {
    code: typeof value.code === 'string' ? value.code : 'signup_failed',
    message: message === '{}' ? 'O Supabase retornou uma resposta vazia ao criar a conta.' : message,
    status: typeof value.status === 'number' ? value.status : undefined,
    name: typeof value.name === 'string' ? value.name : undefined,
  }
}

export async function POST(request: NextRequest) {
  const cookiesToSet: CookieToSet[] = []
  const body = await request.json().catch(() => null) as {
    nome?: string
    email?: string
    password?: string
  } | null

  if (!body?.nome || !body.email || !body.password) {
    return NextResponse.json(
      { error: { code: 'invalid_signup_data', message: 'Preencha nome, e-mail e senha.' } },
      { status: 422 },
    )
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(updatedCookies) {
          cookiesToSet.push(...updatedCookies)
        },
      },
    },
  )

  let result
  try {
    result = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
        data: { nome: body.nome },
      },
    })
  } catch (error) {
    console.error('Falha de transporte no cadastro do Supabase', error)
    const response = NextResponse.json(
      { error: errorPayload(error) },
      { status: 502 },
    )
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  if (result.error) {
    console.error('Supabase recusou o cadastro', errorPayload(result.error))
    const response = NextResponse.json(
      { error: errorPayload(result.error) },
      { status: result.error.status || 400 },
    )
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  const response = NextResponse.json({
    hasSession: !!result.data.session,
    existingUser: result.data.user?.identities?.length === 0,
  })
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
