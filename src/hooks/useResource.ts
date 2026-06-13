// ============================================================================
// useResource — the single data hook every module uses.
//   const { data, loading, error, refetch, create, update, remove } =
//     useResource<Employee>('employees', { company_id })
// List GET hits /api/<resource>?<params>. Mutations refetch automatically.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api'

export interface UseResourceResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => void
  create: (body: Partial<T>) => Promise<T>
  update: (id: string, body: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

export function useResource<T = Record<string, unknown>>(
  resource: string,
  params?: Record<string, unknown>,
): UseResourceResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // serialize params so the effect only re-runs on real changes
  const paramKey = JSON.stringify(params ?? {})
  const paramRef = useRef(params)
  paramRef.current = params

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    apiGet<T[]>(`/${resource}`, paramRef.current)
      .then((rows) => setData(Array.isArray(rows) ? rows : []))
      .catch((e) => setError(e?.message ?? 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, paramKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const create = useCallback(
    async (body: Partial<T>) => {
      const created = await apiPost<T>(`/${resource}`, body)
      fetchData()
      return created
    },
    [resource, fetchData],
  )

  const update = useCallback(
    async (id: string, body: Partial<T>) => {
      const updated = await apiPut<T>(`/${resource}/${id}`, body)
      fetchData()
      return updated
    },
    [resource, fetchData],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiDelete<void>(`/${resource}/${id}`)
      fetchData()
    },
    [resource, fetchData],
  )

  return { data, loading, error, refetch: fetchData, create, update, remove }
}

/** Fetch a single record by id. */
export function useRecord<T = Record<string, unknown>>(resource: string, id: string | undefined) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    apiGet<T>(`/${resource}/${id}`)
      .then(setData)
      .catch((e) => setError(e?.message ?? 'error'))
      .finally(() => setLoading(false))
  }, [resource, id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

/** Generic GET for special endpoints (reports, dashboard, etc.). */
export function useApi<T>(path: string | null, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const paramKey = JSON.stringify(params ?? {})
  const paramRef = useRef(params)
  paramRef.current = params

  const refetch = useCallback(() => {
    if (!path) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    apiGet<T>(path, paramRef.current)
      .then(setData)
      .catch((e) => setError(e?.message ?? 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramKey])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
