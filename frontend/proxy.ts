import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'
import { getApiUrl } from '@/lib/api/url'
import { isProfileMissingError } from '@/lib/api/errors'
import { safePostLoginPath } from '@/lib/auth/redirect'

const authRoutes = ['/login', '/cadastro']
const onboardingRoute = '/onboarding'

const dashboardPrefixes = [
  '/dashboard', '/clientes', '/oportunidades', '/atividades',
  '/funil-vendas', '/equipe', '/relatorios', '/configuracoes',
]

const adminPrefixes = ['/configuracoes']
const managerPrefixes = ['/equipe', '/relatorios']

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const supabaseResponse = await updateSession(request)

  function responseWithRefreshedCookies(response: NextResponse) {
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  function redirect(path: string) {
    return responseWithRefreshedCookies(NextResponse.redirect(new URL(path, request.url)))
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isOnboardingRoute = pathname.startsWith(onboardingRoute)
  const isDashboardRoute = dashboardPrefixes.some((route) => pathname.startsWith(route))
  const isProtectedRoute = isDashboardRoute || isOnboardingRoute

  if (!user) {
    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', `${pathname}${search}`)
      return responseWithRefreshedCookies(NextResponse.redirect(loginUrl))
    }
    return supabaseResponse
  }

  const apiUrl = getApiUrl()
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const meRes = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      cache: 'no-store',
    })

    if (meRes.status === 401 && isProtectedRoute) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', `${pathname}${search}`)
      return responseWithRefreshedCookies(NextResponse.redirect(loginUrl))
    }

    if (meRes.status === 403) {
      const body = await meRes.json().catch(() => ({}))
      const apiError = body.error ?? {}
      if (isProfileMissingError({
        status: 403,
        code: apiError.code ?? '',
        message: apiError.message ?? '',
      })) {
        if (isDashboardRoute || isAuthRoute) return redirect('/onboarding')
        return supabaseResponse
      }

      if (isProtectedRoute) {
        return responseWithRefreshedCookies(
          NextResponse.json({
            error: {
              code: apiError.code || 'ACESSO_NEGADO',
              message: apiError.message || 'Você não tem permissão para acessar este recurso.',
            },
          }, { status: 403 })
        )
      }
    }

    if (meRes.ok) {
      const me = await meRes.json()
      const hasEmpresa = !!me.empresa_nome || !!me.empresa_id
      const isAdminRoute = adminPrefixes.some((route) => pathname.startsWith(route))
      const isManagerRoute = managerPrefixes.some((route) => pathname.startsWith(route))

      if (isAuthRoute) {
        const requestedPath = safePostLoginPath(request.nextUrl.searchParams.get('redirect'))
        return redirect(hasEmpresa ? (requestedPath ?? '/dashboard') : '/onboarding')
      }

      if (!hasEmpresa && isDashboardRoute && !isOnboardingRoute) {
        return redirect('/onboarding')
      }

      if (hasEmpresa && isOnboardingRoute) {
        return redirect('/dashboard')
      }

      if ((isAdminRoute && me.perfil !== 'ADMIN')
        || (isManagerRoute && !['ADMIN', 'GERENTE'].includes(me.perfil))) {
        return redirect('/dashboard')
      }
    } else if (meRes.status < 500 && isProtectedRoute) {
      return responseWithRefreshedCookies(
        NextResponse.json({ error: 'Não foi possível autorizar esta solicitação.' }, { status: meRes.status })
      )
    }
  } catch {
    // The authenticated layout presents backend availability failures with a retry action.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
