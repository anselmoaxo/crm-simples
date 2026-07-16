'use client'

import { forwardRef, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both'
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    const viewportRef = useRef<HTMLDivElement>(null)
    const [scrollTop, setScrollTop] = useState(0)
    const [scrollHeight, setScrollHeight] = useState(0)
    const [clientHeight, setClientHeight] = useState(0)

    useEffect(() => {
      const el = viewportRef.current
      if (!el) return
      const update = () => {
        setScrollTop(el.scrollTop)
        setScrollHeight(el.scrollHeight)
        setClientHeight(el.clientHeight)
      }
      update()
      el.addEventListener('scroll', update)
      const ro = new ResizeObserver(update)
      ro.observe(el)
      return () => {
        el.removeEventListener('scroll', update)
        ro.disconnect()
      }
    }, [])

    const thumbHeight = clientHeight > 0
      ? Math.max(20, (clientHeight / scrollHeight) * clientHeight)
      : 0
    const thumbTop = scrollHeight > clientHeight
      ? (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight)
      : 0

    return (
      <div className={cn('relative overflow-hidden', className)} ref={ref} {...props}>
        <div
          ref={viewportRef}
          className={cn(
            'h-full w-full overflow-scroll scrollbar-hide',
            orientation === 'vertical' && 'overflow-x-hidden',
            orientation === 'horizontal' && 'overflow-y-hidden',
          )}
          style={{ scrollbarWidth: 'thin' }}
        >
          {children}
        </div>
        {scrollHeight > clientHeight && orientation !== 'horizontal' && (
          <div className="absolute right-0.5 top-0.5 bottom-0.5 w-2">
            <div
              className="relative w-full rounded-full bg-border transition-opacity hover:bg-muted-foreground/50"
              style={{
                height: thumbHeight,
                top: thumbTop,
                opacity: thumbHeight > 0 ? 1 : 0,
              }}
            />
          </div>
        )}
      </div>
    )
  },
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
export type { ScrollAreaProps }
