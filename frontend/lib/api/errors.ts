export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export function isProfileMissingError(error: {
  status?: number
  code?: string
  message?: string
}): boolean {
  if (error.status === 403 && error.code === 'PERFIL_NAO_CADASTRADO') return true
  const message = error.message?.toLocaleLowerCase('pt-BR') ?? ''
  return error.status === 403
    && error.code === 'ACESSO_NEGADO'
    && (message.includes('sem perfil cadastrado') || message.includes('complete o onboarding'))
}

type AuthErrorLike = { code?: string; message?: string } | null | undefined

export function friendlyAuthError(error: AuthErrorLike): string {
  const code = error?.code ?? ''
  const message = error?.message?.toLocaleLowerCase('pt-BR') ?? ''

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Se necessário, solicite um novo link.'
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.'
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'Este e-mail já possui uma conta. Entre com sua senha.'
  }
  if (code === 'otp_expired' || code === 'flow_state_expired' || message.includes('expired')) {
    return 'Este link de e-mail expirou. Solicite um novo link para continuar.'
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
  }
  if (code === 'signup_disabled' || message.includes('signups not allowed')) {
    return 'A criação de novas contas está desabilitada no Supabase.'
  }
  if (message.includes('database error saving new user')) {
    return 'O Supabase não conseguiu salvar o novo usuário. Verifique triggers e funções ligadas à tabela auth.users.'
  }
  if (message.includes('error sending confirmation email')) {
    return 'A conta não pôde enviar o e-mail de confirmação. Verifique o provedor de e-mail do Supabase.'
  }
  if (message.includes('invalid format') || message.includes('invalid email')) {
    return 'Informe um endereço de e-mail válido.'
  }
  if (code === 'weak_password') {
    return 'A senha informada não atende aos requisitos de segurança.'
  }

  return error?.message
    ? `Não foi possível concluir a autenticação: ${error.message}`
    : 'Não foi possível concluir a autenticação. Tente novamente.'
}

export function isExpiredEmailLink(error: AuthErrorLike): boolean {
  const code = error?.code ?? ''
  const message = error?.message?.toLocaleLowerCase('pt-BR') ?? ''
  return ['otp_expired', 'flow_state_expired', 'flow_state_not_found'].includes(code)
    || message.includes('expired')
}

export function authCallbackErrorPath(
  next: string | null,
  error: AuthErrorLike,
): string {
  const isRecovery = next === '/redefinir-senha'
  const destination = isRecovery ? '/esqueci-senha' : '/login'
  const reason = isExpiredEmailLink(error) ? 'link_expirado' : 'callback_invalido'
  return `${destination}?error=${reason}`
}

export function callbackErrorMessage(reason: string | null): string | null {
  if (reason === 'link_expirado') {
    return 'Este link de e-mail expirou. Solicite um novo link para continuar.'
  }
  if (reason === 'callback_invalido') {
    return 'Não foi possível validar o link de e-mail. Solicite um novo link e tente novamente.'
  }
  return null
}
