import { useCallback, useEffect, useState } from 'react'

// Loads data on mount (and again on reload()), tracking loading and error state.
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setData(await fn())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, loading, reload }
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}
