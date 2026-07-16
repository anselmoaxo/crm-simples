import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getApiUrl } from '@/lib/api/url'
import { safeRelativePath } from '@/lib/auth/redirect'
import { authCallbackErrorPath, isProfileMissingError } from '@/lib/api/errors'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRelativePath(searchParams.get('next'))
  const callbackError = searchParams.get('error_code') ?? searchParams.get('error')
  const callbackDescription = searchParams.get('error_description')
  const cookiesToSet: CookieToSet[] = []

  function redirect(path: string) {
    const response = NextResponse.redirect(new URL(path, origin))
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
           setAll(updatedCookies) {
             updatedCookies.forEach(({ name, value, options }) => {
               request.cookies.set(name, value)
               cookiesToSet.push({ name, value, options })
             })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (next) return redirect(next)

      const user = data.user
      const accessToken = data.session?.access_token

      if (user && accessToken) {
        try {
          const apiUrl = getApiUrl()
          const meRes = await fetch(`${apiUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
          })

          if (meRes.ok) {
            const me = await meRes.json()
            if (me.empresa_id) {
              return redirect('/dashboard')
            }
          } else {
            const body = await meRes.json().catch(() => ({}))
            const apiError = body.error ?? body.detail?.error ?? {}
            if (!isProfileMissingError({
              status: meRes.status,
              code: apiError.code,
              message: apiError.message,
            })) {
              return redirect(meRes.status >= 500
                ? '/dashboard'
                : '/login?error=callback_invalido')
            }
          }
        } catch {
          return redirect('/dashboard')
        }
      }

      return redirect(user ? '/onboarding' : '/login?error=callback_invalido')
    }

    return redirect(authCallbackErrorPath(next, error))
  }

  if (callbackError || callbackDescription) {
    return redirect(authCallbackErrorPath(next, {
      code: callbackError ?? undefined,
      message: callbackDescription ?? undefined,
    }))
  }

  return redirect(authCallbackErrorPath(next, undefined))
}
