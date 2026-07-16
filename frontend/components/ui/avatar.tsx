'use client'

import Image from 'next/image'

import { cn } from '@/lib/utils'

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

function AvatarImage({ className, src, alt }: { className?: string; src?: string; alt?: string }) {
  if (!src) return null
  return (
    <Image
      src={src}
      alt={alt ?? ''}
      fill
      sizes="40px"
      unoptimized
      className={cn('object-cover', className)}
    />
  )
}

function AvatarFallback({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const initials = typeof children === 'string'
    ? children.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : children

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
