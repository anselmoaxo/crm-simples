'use client'

import { Phone, MessageCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPhone } from '@/lib/formatters'

interface ClienteActionsProps {
  telefone: string | null
  whatsapp: string | null
  email: string | null
}

export function ClienteActions({ telefone, whatsapp, email }: ClienteActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {telefone && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 sm:h-8 sm:w-8"
              aria-label={`Ligar para ${formatPhone(telefone)}`}
              onClick={() => { window.location.href = `tel:${telefone.replace(/\D/g, '')}` }}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{formatPhone(telefone)}</p>
          </TooltipContent>
        </Tooltip>
      )}
      {whatsapp && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-emerald-600 sm:h-8 sm:w-8"
              aria-label={`Abrir WhatsApp de ${formatPhone(whatsapp)}`}
              onClick={() => { window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}`, '_blank') }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>WhatsApp: {formatPhone(whatsapp)}</p>
          </TooltipContent>
        </Tooltip>
      )}
      {email && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 sm:h-8 sm:w-8"
              aria-label={`Enviar e-mail para ${email}`}
              onClick={() => { window.location.href = `mailto:${email}` }}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{email}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
