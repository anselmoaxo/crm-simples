import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0 space-y-0.5">
        <h1 className="break-words text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:mt-0 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {children}
        </div>
      )}
    </div>
  )
}
