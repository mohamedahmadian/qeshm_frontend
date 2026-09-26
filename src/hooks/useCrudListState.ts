import { useState } from 'react'
import { nextSortState, type SortDir } from '../components/ui/ListControls'
import { useListParams } from './useListParams'
import { useListSort } from './useListSort'

function useLocalListControls() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState<SortDir | ''>('')
  const [filters, setFilters] = useState<Record<string, string>>({})

  function setParams(
    updates: Record<string, string | undefined>,
    options?: { resetPage?: boolean },
  ) {
    if ('q' in updates) setQ(updates.q ?? '')
    if (updates.page) setPage(Math.max(1, Number(updates.page) || 1))
    if ('sortBy' in updates) setSortBy(updates.sortBy ?? '')
    if ('sortDir' in updates) setSortDir((updates.sortDir ?? '') as SortDir | '')
    const rest = { ...updates }
    delete rest.q
    delete rest.page
    delete rest.sortBy
    delete rest.sortDir
    if (Object.keys(rest).length) {
      setFilters((current) => {
        const next = { ...current }
        for (const [key, value] of Object.entries(rest)) {
          if (value) next[key] = value
          else delete next[key]
        }
        return next
      })
    }
    if (options?.resetPage) setPage(1)
  }

  function applySearch(nextTerm = term) {
    const trimmed = nextTerm.trim()
    setTerm(trimmed)
    setQ(trimmed)
    setPage(1)
  }

  function onSort(column: string) {
    const next = nextSortState(column, sortBy, sortDir)
    setSortBy(next.sortBy ?? '')
    setSortDir(next.sortDir ?? '')
    setPage(1)
  }

  const sortParams =
    sortBy && (sortDir === 'asc' || sortDir === 'desc') ? { sortBy, sortDir } : {}

  const searchParams = new URLSearchParams()
  if (q) searchParams.set('q', q)
  for (const [key, value] of Object.entries(filters)) searchParams.set(key, value)

  return {
    q,
    page,
    term,
    setTerm,
    applySearch,
    setPage,
    searchParams,
    setParams,
    sortBy,
    sortDir,
    sortParams,
    onSort,
  }
}

/** فهرست داخل تب از وضعیت محلی استفاده می‌کند تا با آدرس صفحهٔ ویرایش قاطی نشود. */
export function useCrudListState(embedded: boolean) {
  const urlList = useListParams()
  const urlSort = useListSort(urlList.searchParams, urlList.setParams)
  const local = useLocalListControls()
  if (embedded) return local
  return {
    ...urlList,
    sortBy: urlSort.sortBy,
    sortDir: urlSort.sortDir,
    sortParams: urlSort.sortParams,
    onSort: urlSort.onSort,
  }
}
