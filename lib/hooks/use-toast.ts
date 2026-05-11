'use client'

import { useState, useCallback } from 'react'

type ToastVariant = 'default' | 'destructive'

interface Toast {
  id:          string
  title?:      string
  description?: string
  variant?:    ToastVariant
}

// Simple in-memory toast store — replace with a full solution (sonner / radix toast) in Phase 5
const subscribers = new Set<(toasts: Toast[]) => void>()
let toasts: Toast[] = []

function notify() {
  subscribers.forEach(fn => fn([...toasts]))
}

export function toast(opts: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { ...opts, id }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 4000)
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>([])

  useState(() => {
    subscribers.add(setLocalToasts)
    return () => { subscribers.delete(setLocalToasts) }
  })

  return { toasts: localToasts, toast }
}
