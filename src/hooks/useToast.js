import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const show = useCallback((msg, tipo = 'sucesso') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg, tipo }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  return { toasts, show }
}
