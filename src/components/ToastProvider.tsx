'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ToastState {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastState>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setMsg(message)
    window.setTimeout(() => setMsg(null), 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] pointer-events-none">
          <div className="bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg animate-fade-in-up">
            {msg}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
