'use client'

import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/cn'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex w-80 items-start gap-3 rounded-lg border bg-white p-4 shadow-card-lg animate-fade-in',
            toast.variant === 'destructive' && 'border-destructive bg-destructive/5',
          )}
          role="alert"
        >
          <div className="flex-1">
            {toast.title && (
              <p className="text-sm font-semibold">{toast.title}</p>
            )}
            {toast.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{toast.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
