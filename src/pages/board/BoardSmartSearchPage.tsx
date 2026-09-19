import { Building2, CalendarDays, FileCheck, FileText, ScanSearch, ScrollText } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormEmptyHint, FormFactTile } from '../../components/ui/FormLayout'
import { PaginationBar, SearchBar } from '../../components/ui/ListControls'
import { LoadingState } from '../../components/ui/LoadingState'
import { useListParams } from '../../hooks/useListParams'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import type {
  BoardReportsOverview,
  BoardSmartSearchHit,
  BoardSmartSearchMatchKind,
  BoardSmartSearchMinutesHit,
  BoardSmartSearchRequestHit,
  BoardSmartSearchResult,
} from '../../types/app'
import { BoardMinutesDossierModal } from './BoardMinutesDossierModal'
import { BoardReportsOverviewCard } from './BoardReportsOverviewCard'
import { BoardStatusBadge } from './BoardStatusBadge'
import { boardRequestPath } from './board-paths'

const matchLabelKey: Record<BoardSmartSearchMatchKind, string> = {
  minutes: 'boardSmartSearch.matchMinutes',
  request: 'boardSmartSearch.matchRequest',
  resolution: 'boardSmartSearch.matchResolution',
}

function HighlightText({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const index = text.toLowerCase().indexOf(q.toLowerCase())
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-mint-100 px-0.5 text-teal-800">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  )
}

function MatchChips({ kinds }: { kinds: BoardSmartSearchMatchKind[] }) {
  const { t } = useTranslation()
  if (!kinds.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {kinds.map((kind) => (
        <span
          key={kind}
          className="rounded-full bg-mint-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-mint-100"
        >
          {t(matchLabelKey[kind])}
        </span>
      ))}
    </div>
  )
}

function RequestHitCard({
  item,
  q,
  locale,
  onOpen,
}: {
  item: BoardSmartSearchRequestHit
  q: string
  locale: string
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <article className="rounded-[22px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] sm:p-5">
      <button type="button" onClick={onOpen} className="w-full cursor-pointer text-start">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">
              <HighlightText text={item.subject} q={q} />
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-500">
              <CalendarDays className="size-3.5 text-teal-600" aria-hidden />
              <DateText value={item.requestedAt} />
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <BoardStatusBadge value={item.status} />
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800">
              <ScrollText className="size-3" aria-hidden />
              {t('boardSmartSearch.linkedMinutes')} {formatNumber(item.minutesCount, locale)}
            </span>
          </div>
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-teal-700">
          <Building2 className="size-3.5" aria-hidden />
          <HighlightText text={item.unit.name} q={q} />
        </p>
        {item.snippet ? (
          <p className="mt-3 rounded-2xl bg-cream-50 px-3 py-2 text-sm leading-6 text-ink-700">
            <HighlightText text={item.snippet} q={q} />
          </p>
        ) : null}
        <MatchChips kinds={item.matchIn} />
      </button>
    </article>
  )
}

function MinutesHitCard({
  item,
  q,
  locale,
  onOpen,
  onOpenResolution,
}: {
  item: BoardSmartSearchMinutesHit
  q: string
  locale: string
  onOpen: () => void
  onOpenResolution: (resolutionId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <article className="rounded-[22px] border border-white bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] sm:p-5">
      <button type="button" onClick={onOpen} className="w-full cursor-pointer text-start">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">
              <HighlightText text={item.subject} q={q} />
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-500">
              <CalendarDays className="size-3.5 text-teal-600" aria-hidden />
              <DateText value={item.heldAt} />
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800">
            <ScrollText className="size-3" aria-hidden />
            {t('boardMinutes.resolutionCount')} {formatNumber(item.resolutionCount, locale)}
          </span>
        </div>
        {item.request ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-teal-700">
            <FileText className="size-3.5" aria-hidden />
            <HighlightText text={item.request.subject} q={q} />
          </p>
        ) : null}
        {item.snippet ? (
          <p className="mt-3 rounded-2xl bg-cream-50 px-3 py-2 text-sm leading-6 text-ink-700">
            <HighlightText text={item.snippet} q={q} />
          </p>
        ) : null}
        <MatchChips kinds={item.matchIn} />
      </button>
      {item.matchedResolutions.length ? (
        <div className="mt-3 border-t border-teal-50 pt-3">
          <p className="mb-2 text-[11px] font-semibold text-ink-500">
            {t('boardSmartSearch.matchedResolutions')}
          </p>
          <div className="flex flex-wrap gap-2">
            {item.matchedResolutions.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onOpenResolution(row.id)}
                className="cursor-pointer rounded-2xl bg-white px-3 py-1.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200 hover:bg-teal-50"
              >
                <HighlightText text={row.title} q={q} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

export function BoardSmartSearchPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const { q, page, term, setTerm, applySearch, setPage } = useListParams()
  const [selected, setSelected] = useState<{ minutesId: string; resolutionId?: string } | null>(null)
  const query = useQuery({
    queryKey: ['board-smart-search', q, page],
    enabled: Boolean(q),
    queryFn: async () => {
      const { data } = await api.get<BoardSmartSearchResult>('/board/search', {
        params: { page, q },
      })
      return data
    },
  })
  const overview = useQuery({
    queryKey: ['board', 'reports'],
    queryFn: async () => {
      const { data } = await api.get<BoardReportsOverview>('/board/reports')
      return data
    },
  })
  const rows = query.data?.items ?? []

  let results: ReactNode
  if (!q) {
    results = <FormEmptyHint>{t('boardSmartSearch.empty')}</FormEmptyHint>
  } else if (query.isLoading) {
    results = <LoadingState />
  } else if (!rows.length) {
    results = <FormEmptyHint>{t('boardSmartSearch.noResults')}</FormEmptyHint>
  } else {
    results = (
      <ul className="space-y-3">
        {rows.map((item: BoardSmartSearchHit) => (
          <li key={`${item.kind}-${item.id}`}>
            {item.kind === 'request' ? (
              <RequestHitCard
                item={item}
                q={q}
                locale={locale}
                onOpen={() => navigate(boardRequestPath(item.id))}
              />
            ) : (
              <MinutesHitCard
                item={item}
                q={q}
                locale={locale}
                onOpen={() => setSelected({ minutesId: item.id })}
                onOpenResolution={(resolutionId) => setSelected({ minutesId: item.id, resolutionId })}
              />
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={ScanSearch}
        title={t('boardSmartSearch.title')}
        subtitle={t('boardSmartSearch.subtitle')}
      />
      {overview.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('common.error')}
        </p>
      ) : overview.isLoading || !overview.data?.kpis ? (
        <LoadingState />
      ) : (
        <BoardReportsOverviewCard kpis={overview.data.kpis} />
      )}
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardSmartSearch.search')}
        placeholder={t('boardSmartSearch.searchPlaceholder')}
      />
      {q && query.data ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <FormFactTile
            icon={FileText}
            label={t('boardSmartSearch.foundRequests')}
            value={formatNumber(query.data.requestCount, locale)}
            tone="teal"
          />
          <FormFactTile
            icon={ScrollText}
            label={t('boardSmartSearch.foundMinutes')}
            value={formatNumber(query.data.minutesCount, locale)}
            tone="mint"
          />
          <FormFactTile
            icon={FileCheck}
            label={t('boardSmartSearch.foundResolutions')}
            value={formatNumber(query.data.resolutionCount, locale)}
          />
        </div>
      ) : null}
      {results}
      {q && query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
      <BoardMinutesDossierModal
        minutesId={selected?.minutesId ?? null}
        focusResolutionId={selected?.resolutionId}
        locale={locale}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
