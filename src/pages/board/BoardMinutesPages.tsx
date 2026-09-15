import {
  FileText,
  Inbox,
  Link2,
  Plus,
  ScrollText,
  Stamp,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FileAudio } from '../../components/ui/FileMedia'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
} from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getImageUrl } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import {
  boardMinutesAttendances,
  type BoardMinutes,
  type BoardMinutesStats,
  type BoardRequest,
  type Paginated,
} from '../../types/app'
import { BoardMinutesForm } from './BoardMinutesForm'
import {
  boardMinuteEditPath,
  boardMinutePath,
  boardMinuteResolutionsPath,
  boardMinutesCreatePath,
  boardMinutesListPath,
  boardRequestPath,
} from './board-paths'

function useMinutesScope() {
  const { requestId, minutesId } = useParams()
  return { requestId, minutesId }
}

export function BoardMinutesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { requestId } = useMinutesScope()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const kind = searchParams.get('kind') ?? ''
  const filtersActive = Boolean(kind)
  const { confirmDelete } = useConfirmDelete()
  const requestQuery = useQuery({
    queryKey: ['board-request', requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data } = await api.get<BoardRequest>(`/board/requests/${requestId}`)
      return data
    },
  })
  const stats = useQuery({
    queryKey: ['board-minutes-stats'],
    enabled: !requestId,
    queryFn: async () => {
      const { data } = await api.get<BoardMinutesStats>('/board/minutes/stats')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['board-minutes', requestId, q, page, sortBy, sortDir, kind],
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardMinutes>>('/board/minutes', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(requestId ? { requestId } : {}),
          ...(kind ? { kind } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  if (requestId && !requestQuery.data) return <LoadingState />

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.title')}
        subtitle={
          requestQuery.data ? (
            <EntityNameSubtitle name={requestQuery.data.subject} icon={ScrollText} />
          ) : (
            t('boardMinutes.subtitle')
          )
        }
        backTo={requestId ? boardRequestPath(requestId) : undefined}
        action={
          !requestId || requestQuery.data?.status === 'APPROVED' ? (
            <Link to={boardMinutesCreatePath(requestId)}>
              <Button>
                <Plus className="size-4" aria-hidden />
                {t('boardMinutes.create')}
              </Button>
            </Link>
          ) : undefined
        }
      />
      {!requestId && stats.data ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FormFactTile icon={Inbox} label={t('boardMinutes.total')} value={formatNumber(stats.data.total, locale)} tone="teal" />
          <FormFactTile icon={Stamp} label={t('boardMinutes.regular')} value={formatNumber(stats.data.regular, locale)} tone="mint" />
          <FormFactTile icon={Link2} label={t('boardMinutes.linked')} value={formatNumber(stats.data.linked, locale)} />
          <FormFactTile
            icon={FileText}
            label={t('boardMinutes.resolutionCount')}
            value={formatNumber(stats.data.resolutionCount, locale)}
            tone="teal"
          />
        </div>
      ) : null}
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardMinutes.search')}
        placeholder={t('boardMinutes.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          requestId ? undefined : (
            <FormField icon={Stamp} label={t('boardMinutes.filterKind')}>
              <SearchSelect
                value={kind}
                onChange={(next) => setParams({ kind: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('common.all') },
                  { value: 'regular', label: t('boardMinutes.regular') },
                  { value: 'linked', label: t('boardMinutes.linked') },
                ]}
                placeholder={t('boardMinutes.filterKind')}
              />
            </FormField>
          )
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('boardMinutes.noResults') : t('boardMinutes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="heldAt" label={t('boardMinutes.heldAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="subject" label={t('boardMinutes.subject')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              {requestId ? null : (
                <SortableTh column="request" label={t('boardMinutes.request')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              )}
              <SortableTh column="memberCount" label={t('boardMinutes.memberCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="resolutionCount"
                label={t('boardMinutes.resolutionCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <DateText value={item.heldAt} />
                </td>
                <td className="px-4 py-3">{item.subject}</td>
                {requestId ? null : (
                  <td className="px-4 py-3">{item.request?.subject || t('boardMinutes.regular')}</td>
                )}
                <td className="px-4 py-3">{formatNumber(item._count?.members ?? item.members.length, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.resolutions ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={boardMinutePath(item.id, requestId)}
                    showView={false}
                    extra={
                      <Link to={boardMinuteResolutionsPath(item.id, requestId)}>
                        <Button type="button" variant="soft">
                          <FileText className="size-4" aria-hidden />
                          {t('boardResolutions.title')}
                        </Button>
                      </Link>
                    }
                    editTo={boardMinuteEditPath(item.id, requestId)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('boardMinutes.confirmDelete'),
                        successMessage: t('boardMinutes.deleted'),
                        path: `/board/minutes/${item.id}`,
                        queryKey: ['board-minutes'],
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}

export function BoardMinutesCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestId } = useMinutesScope()
  const requestQuery = useQuery({
    queryKey: ['board-request', requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data } = await api.get<BoardRequest>(`/board/requests/${requestId}`)
      return data
    },
  })
  if (requestId && !requestQuery.data) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.create')}
        subtitle={
          requestQuery.data ? (
            <EntityNameSubtitle name={requestQuery.data.subject} icon={ScrollText} />
          ) : (
            t('boardMinutes.createSubtitle')
          )
        }
      />
      <BoardMinutesForm
        lockedRequestId={requestId}
        onCancel={() => navigate(boardMinutesListPath(requestId))}
        onSubmit={async (payload) => {
          await api.post('/board/minutes', payload)
          toast.success(t('boardMinutes.created'))
          navigate(boardMinutesListPath(requestId))
        }}
      />
    </div>
  )
}

export function BoardMinutesEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestId, minutesId } = useMinutesScope()
  const query = useQuery({
    queryKey: ['board-minutes-item', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutes>(`/board/minutes/${minutesId}`)
      return data
    },
  })
  if (!query.data || !minutesId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.edit')}
        subtitle={<EntityNameSubtitle name={query.data.subject} icon={ScrollText} />}
      />
      <BoardMinutesForm
        initial={query.data}
        lockedRequestId={requestId}
        onCancel={() => navigate(boardMinutesListPath(requestId))}
        onSubmit={async (payload) => {
          await api.patch(`/board/minutes/${minutesId}`, payload)
          toast.success(t('boardMinutes.updated'))
          navigate(boardMinutesListPath(requestId))
        }}
      />
    </div>
  )
}

export function BoardMinutesDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const { requestId, minutesId } = useMinutesScope()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['board-minutes-item', minutesId],
    enabled: Boolean(minutesId),
    queryFn: async () => {
      const { data } = await api.get<BoardMinutes>(`/board/minutes/${minutesId}`)
      return data
    },
  })
  const item = query.data
  if (!item || !minutesId) return <LoadingState />
  const images = item.attachments.filter((row) => row.kind === 'IMAGE' && row.imageId)
  const audios = item.attachments.filter((row) => row.kind === 'AUDIO' && row.fileId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('boardMinutes.details')}
        subtitle={<EntityNameSubtitle name={item.subject} icon={ScrollText} />}
      />
      <FormCard icon={ScrollText} title={item.subject}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ScrollText}>{t('boardMinutes.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Stamp} label={t('boardMinutes.heldAt')} value={<DateText value={item.heldAt} />} tone="teal" />
            <FormFactTile
              icon={FileText}
              label={t('boardMinutes.request')}
              value={item.request?.subject || t('boardMinutes.regular')}
              tone="mint"
            />
            <FormFactTile icon={Users} label={t('boardMinutes.createdBy')} value={item.createdBy.fullName} />
            <FormFactTile
              icon={FileText}
              label={t('boardMinutes.resolutionCount')}
              value={formatNumber(item._count?.resolutions ?? 0, locale)}
              tone="teal"
            />
          </div>
          {item.body ? (
            <p className="whitespace-pre-wrap rounded-2xl border border-line bg-cream-50/80 p-4 text-sm leading-7 text-ink-800">
              {item.body}
            </p>
          ) : (
            <FormEmptyHint>{t('boardMinutes.bodyPlaceholder')}</FormEmptyHint>
          )}
          <FormSectionTitle icon={Users}>{t('boardMinutes.members')}</FormSectionTitle>
          {item.members.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {item.members.map((row) => (
                <FormFactTile
                  key={row.id}
                  icon={Users}
                  label={row.user.fullName}
                  value={
                    row.attendance === boardMinutesAttendances.PRESENT
                      ? t('boardMinutes.present')
                      : t('boardMinutes.absent')
                  }
                  tone={row.attendance === boardMinutesAttendances.PRESENT ? 'teal' : undefined}
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardMinutes.noMembers')}</FormEmptyHint>
          )}
          <FormSectionTitle icon={FileText}>{t('boardMinutes.attachments')}</FormSectionTitle>
          {images.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((row) => (
                <img
                  key={row.id}
                  src={getImageUrl(row.imageId!)}
                  alt={row.originalName || ''}
                  className="h-28 w-full rounded-2xl object-cover ring-1 ring-teal-100"
                />
              ))}
            </div>
          ) : (
            <FormEmptyHint>{t('boardMinutes.noImages')}</FormEmptyHint>
          )}
          {audios.length ? (
            <ul className="space-y-2">
              {audios.map((row) => (
                <li key={row.id} className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-sm text-ink-700">{row.originalName}</p>
                  <FileAudio fileId={row.fileId!} className="w-full" />
                </li>
              ))}
            </ul>
          ) : (
            <FormEmptyHint>{t('boardMinutes.noAudio')}</FormEmptyHint>
          )}
          <DetailActions
            editTo={boardMinuteEditPath(minutesId, requestId)}
            editLabel={t('common.edit')}
            deleteLabel={t('boardMinutes.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('boardMinutes.confirmDelete'),
                successMessage: t('boardMinutes.deleted'),
                path: `/board/minutes/${minutesId}`,
                queryKey: ['board-minutes'],
                onDeleted: () => navigate(boardMinutesListPath(requestId)),
              })
            }
            extraItems={[
              {
                to: boardMinuteResolutionsPath(minutesId, requestId),
                icon: FileText,
                label: t('boardResolutions.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
