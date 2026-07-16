'use client'

import { createContext, useContext, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

function useTooltip() {
  const ctx = useContext(TooltipContext)
  if (!ctx) throw new Error('Tooltip components must be used within a Tooltip')
  return ctx
}

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({ children, asChild, ...props }: {
  children: React.ReactNode
  asChild?: boolean
} & React.HTMLAttributes<HTMLSpanElement>) {
  const { setOpen } = useTooltip()

  const handleMouseEnter = () => setOpen(true)
  const handleMouseLeave = () => setOpen(false)

  if (asChild) {
    return (
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-block"
      >
        {children}
      </span>
    )
  }

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className="inline-block cursor-pointer"
      {...props}
    >
      {children}
    </span>
  )
}

function TooltipContent({ className, side = 'top', ...props }: {
  side?: 'top' | 'bottom' | 'left' | 'right'
} & React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useTooltip()
  const triggerRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  const sideStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      ref={triggerRef}
      className={cn(
        'absolute z-50 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 shadow-md',
        sideStyles[side],
        className,
      )}
      {...props}
    >
      {props.children}
      <div
        className={cn(
          'absolute h-2 w-2 rotate-45 bg-primary',
          side === 'top' && 'top-full -translate-y-1/2 left-1/2 -translate-x-1/2',
          side === 'bottom' && 'bottom-full translate-y-1/2 left-1/2 -translate-x-1/2',
          side === 'left' && 'left-full -translate-x-1/2 top-1/2 -translate-y-1/2',
          side === 'right' && 'right-full translate-x-1/2 top-1/2 -translate-y-1/2',
        )}
      />
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent }
