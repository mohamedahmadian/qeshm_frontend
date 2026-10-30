import {
  Building2,
  CalendarDays,
  Eye,
  FileBadge2,
  FileCheck,
  FileText,
  Handshake,
  Hash,
  ScanSearch,
  ScanText,
  ScrollText,
  Stamp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { Button, PageHeader, listShellClassName } from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
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
import { BoardMinutesStatusBadge, BoardStatusBadge } from './BoardStatusBadge'
import { boardRequestPath } from './board-paths'

const matchLabelKey: Record<BoardSmartSearchMatchKind, string> = {
  minutes: 'boardSmartSearch.matchMinutes',
  request: 'boardSmartSearch.matchRequest',
  resolution: 'boardSmartSearch.matchResolution',
  contract: 'boardSmartSearch.matchContract',
}

const matchIcon: Record<BoardSmartSearchMatchKind, LucideIcon> = {
  minutes: ScrollText,
  request: FileText,
  resolution: FileCheck,
  contract: FileBadge2,
}

function stopCardClick(event: MouseEvent) {
  event.stopPropagation()
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
    <>
      {kinds.map((kind) => {
        const Icon = matchIcon[kind]
        return (
          <span
            key={kind}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-teal-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100"
          >
            <Icon className="size-3 text-teal-600" aria-hidden />
            {t(matchLabelKey[kind])}
          </span>
        )
      })}
    </>
  )
}

function SearchFactGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">{children}</div>
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
    <div className="cursor-pointer" onClick={onOpen}>
      <FormCard
        icon={FileText}
        title={<HighlightText text={item.subject} q={q} />}
        subtitle={t('boardSmartSearch.matchRequest')}
        chips={<MatchChips kinds={item.matchIn} />}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2" onClick={stopCardClick}>
            <BoardStatusBadge value={item.status} />
            <Button type="button" variant="ghost" onClick={onOpen}>
              <Eye className="size-4" aria-hidden />
              {t('common.view')}
            </Button>
          </div>
        }
        onDoubleClick={onOpen}
      >
        <div className={formCardBodyClassName}>
          <SearchFactGrid>
            <FormFactTile
              icon={FileText}
              label={t('boardRequests.subject')}
              value={<HighlightText text={item.subject} q={q} />}
              tone="teal"
            />
            {item.trackingNo ? (
              <FormFactTile
                icon={Hash}
                label={t('boardRequests.trackingNo')}
                value={<HighlightText text={item.trackingNo} q={q} />}
                tone="mint"
              />
            ) : null}
            <FormFactTile
              icon={CalendarDays}
              label={t('boardRequests.requestedAt')}
              value={<DateText value={item.requestedAt} />}
              tone="mint"
            />
            <FormFactTile
              icon={Stamp}
              label={t('boardRequests.status')}
              value={<BoardStatusBadge value={item.status} />}
            />
            <FormFactTile
              icon={Building2}
              label={t('boardRequests.unit')}
              value={<HighlightText text={item.unit.name} q={q} />}
              tone="teal"
            />
            {item.createdBy ? (
              <FormFactTile
                icon={Users}
                label={t('boardRequests.createdBy')}
                value={<HighlightText text={item.createdBy.fullName} q={q} />}
              />
            ) : null}
            <FormFactTile
              icon={ScrollText}
              label={t('boardSmartSearch.linkedMinutes')}
              value={formatNumber(item.minutesCount, locale)}
              tone="mint"
            />
          </SearchFactGrid>
          {item.snippet ? (
            <FormFactTile
              icon={ScanText}
              label={t('boardSmartSearch.snippet')}
              value={<HighlightText text={item.snippet} q={q} />}
              tone="teal"
            />
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}

function MinutesHitCard({
  item,
  q,
  locale,
  onOpen,
  onOpenResolution,
  onOpenContracts,
}: {
  item: BoardSmartSearchMinutesHit
  q: string
  locale: string
  onOpen: () => void
  onOpenResolution: (resolutionId: string) => void
  onOpenContracts: () => void
}) {
  const { t } = useTranslation()
  const linkedRequests = item.requests?.length ? item.requests : item.request ? [item.request] : []
  return (
    <div className="cursor-pointer" onClick={onOpen}>
      <FormCard
        icon={ScrollText}
        title={<HighlightText text={item.subject} q={q} />}
        subtitle={t('boardSmartSearch.matchMinutes')}
        chips={<MatchChips kinds={item.matchIn} />}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2" onClick={stopCardClick}>
            {item.status ? <BoardMinutesStatusBadge value={item.status} /> : null}
            <Button type="button" variant="ghost" onClick={onOpen}>
              <Eye className="size-4" aria-hidden />
              {t('common.view')}
            </Button>
          </div>
        }
        onDoubleClick={onOpen}
      >
        <div className={formCardBodyClassName}>
          <SearchFactGrid>
            <FormFactTile
              icon={FileText}
              label={t('boardMinutes.subject')}
              value={<HighlightText text={item.subject} q={q} />}
              tone="teal"
            />
            {item.minutesNo ? (
              <FormFactTile
                icon={Hash}
                label={t('boardMinutes.number')}
                value={<HighlightText text={item.minutesNo} q={q} />}
                tone="mint"
              />
            ) : null}
            <FormFactTile
              icon={CalendarDays}
              label={t('boardMinutes.heldAt')}
              value={<DateText value={item.heldAt} />}
              tone="mint"
            />
            {item.status ? (
              <FormFactTile
                icon={Stamp}
                label={t('boardMinutes.status')}
                value={<BoardMinutesStatusBadge value={item.status} />}
              />
            ) : null}
            <FormFactTile
              icon={FileCheck}
              label={t('boardMinutes.resolutionCount')}
              value={formatNumber(item.resolutionCount, locale)}
              tone="teal"
            />
            {item.createdBy ? (
              <FormFactTile
                icon={Users}
                label={t('boardMinutes.createdBy')}
                value={<HighlightText text={item.createdBy.fullName} q={q} />}
              />
            ) : null}
          </SearchFactGrid>
          {item.snippet ? (
            <FormFactTile
              icon={ScanText}
              label={t('boardSmartSearch.snippet')}
              value={<HighlightText text={item.snippet} q={q} />}
              tone="teal"
            />
          ) : null}
          {linkedRequests.length ? (
            <div className="space-y-2.5">
              <FormSectionTitle icon={FileText}>{t('boardMinutes.requests')}</FormSectionTitle>
              <SearchFactGrid>
                {linkedRequests.map((row) => (
                  <FormFactTile
                    key={row.id}
                    icon={FileText}
                    label={row.trackingNo || t('boardMinutes.request')}
                    value={<HighlightText text={row.subject} q={q} />}
                    extra={row.status ? <div className="mt-1.5"><BoardStatusBadge value={row.status} /></div> : undefined}
                    tone="mint"
                  />
                ))}
              </SearchFactGrid>
            </div>
          ) : null}
          {item.matchedResolutions.length ? (
            <div className="space-y-2.5">
              <FormSectionTitle icon={FileCheck}>{t('boardSmartSearch.matchedResolutions')}</FormSectionTitle>
              <SearchFactGrid>
                {item.matchedResolutions.map((row) => (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      stopCardClick(event)
                      onOpenResolution(row.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.stopPropagation()
                        onOpenResolution(row.id)
                      }
                    }}
                    className="cursor-pointer text-start"
                  >
                    <FormFactTile
                      icon={FileCheck}
                      label={t('boardResolutions.titleField')}
                      value={<HighlightText text={row.title} q={q} />}
                      tone="mint"
                    />
                  </div>
                ))}
              </SearchFactGrid>
            </div>
          ) : null}
          {item.matchedContracts?.length ? (
            <div className="space-y-2.5">
              <FormSectionTitle icon={FileBadge2}>{t('boardSmartSearch.matchedContracts')}</FormSectionTitle>
              <div className="space-y-2">
                {item.matchedContracts.map((row) => (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      stopCardClick(event)
                      onOpenContracts()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.stopPropagation()
                        onOpenContracts()
                      }
                    }}
                    className="w-full cursor-pointer text-start"
                  >
                    <div className="grid gap-2 rounded-2xl border border-teal-50 bg-gradient-to-b from-mint-50/40 to-white p-2 sm:grid-cols-3 sm:gap-3 sm:p-2.5">
                      <FormFactTile
                        icon={FileBadge2}
                        label={t('boardResolutions.contractTitleField')}
                        value={<HighlightText text={row.title} q={q} />}
                        tone="teal"
                      />
                      {row.contractNo ? (
                        <FormFactTile
                          icon={Hash}
                          label={t('boardResolutions.contractNo')}
                          value={<HighlightText text={row.contractNo} q={q} />}
                          tone="mint"
                        />
                      ) : null}
                      {row.contractorName ? (
                        <FormFactTile
                          icon={Handshake}
                          label={t('boardResolutions.contractContractor')}
                          value={<HighlightText text={row.contractorName} q={q} />}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}

export function BoardSmartSearchPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const { q, page, term, setTerm, applySearch, setPage } = useListParams()
  const [selected, setSelected] = useState<{
    minutesId: string
    resolutionId?: string
    tab?: 'resolutions' | 'contracts' | 'progress'
  } | null>(null)
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
      <ul className="space-y-4">
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
                onOpenContracts={() => setSelected({ minutesId: item.id, tab: 'contracts' })}
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
          <FormFactTile
            icon={FileBadge2}
            label={t('boardSmartSearch.foundContracts')}
            value={formatNumber(query.data.contractCount ?? 0, locale)}
            tone="teal"
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
        initialTab={selected?.tab}
        locale={locale}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
