import { Briefcase, Hash, ImagePlus, PenLine, Plus, UserRound, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
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
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getImageUrl } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import type { BoardSignatory, Paginated } from '../../types/app'
import { BoardSignatoryForm } from './BoardSignatoryForm'
import {
  boardSignatoriesPath,
  boardSignatoryEditPath,
  boardSignatoryFullName,
  boardSignatoryPath,
} from './board-paths'

export function BoardSignatoryListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['board-signatories', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardSignatory>>('/board/signatories', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = boardSignatoriesPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={PenLine}
        title={t('menus.boardSignatories')}
        subtitle={t('boardSignatories.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('boardSignatories.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardSignatories.search')}
        placeholder={t('boardSignatories.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('boardSignatories.noResults') : t('boardSignatories.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="firstName" label={t('boardSignatories.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="title" label={t('boardSignatories.title')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="user" label={t('boardSignatories.user')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="sortOrder" label={t('boardSignatories.sortOrder')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getImageUrl(item.signatureImageId)}
                      alt=""
                      className="size-10 shrink-0 rounded-xl bg-white object-contain ring-1 ring-teal-100"
                    />
                    <span>{boardSignatoryFullName(item)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.user?.fullName || '—'}</td>
                <td className="px-4 py-3">{formatNumber(item.sortOrder, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={boardSignatoryPath(item.id)}
                    editTo={boardSignatoryEditPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('boardSignatories.confirmDelete'),
                        successMessage: t('boardSignatories.deleted'),
                        path: `/board/signatories/${item.id}`,
                        queryKey: ['board-signatories'],
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

export function BoardSignatoryCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={PenLine} title={t('boardSignatories.create')} subtitle={t('boardSignatories.createSubtitle')} />
      <BoardSignatoryForm
        onSubmit={async (payload) => {
          await api.post('/board/signatories', payload)
          toast.success(t('boardSignatories.created'))
          navigate(boardSignatoriesPath())
        }}
      />
    </div>
  )
}

export function BoardSignatoryEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['board-signatory', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory>(`/board/signatories/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={PenLine}
        title={t('boardSignatories.edit')}
        subtitle={<EntityNameSubtitle name={boardSignatoryFullName(query.data)} icon={PenLine} />}
      />
      <BoardSignatoryForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/board/signatories/${id}`, payload)
          toast.success(t('boardSignatories.updated'))
          navigate(boardSignatoriesPath())
        }}
      />
    </div>
  )
}

export function BoardSignatoryDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['board-signatory', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<BoardSignatory>(`/board/signatories/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const name = boardSignatoryFullName(item)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={PenLine}
        title={t('boardSignatories.details')}
        subtitle={<EntityNameSubtitle name={name} icon={PenLine} />}
      />
      <FormCard icon={PenLine} title={name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={PenLine}>{t('boardSignatories.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={UserRound} label={t('boardSignatories.firstName')} value={item.firstName} tone="teal" />
            <FormFactTile icon={UserRound} label={t('boardSignatories.lastName')} value={item.lastName} tone="mint" />
            <FormFactTile icon={Briefcase} label={t('boardSignatories.title')} value={item.title} />
            <FormFactTile icon={Users} label={t('boardSignatories.user')} value={item.user?.fullName || '—'} />
            <FormFactTile icon={Hash} label={t('boardSignatories.sortOrder')} value={formatNumber(item.sortOrder, locale)} />
            <FormFactTile
              icon={ImagePlus}
              label={t('boardSignatories.signature')}
              value={
                <a href={getImageUrl(item.signatureImageId)} target="_blank" rel="noreferrer">
                  <img
                    src={getImageUrl(item.signatureImageId)}
                    alt=""
                    className="mt-1 h-28 w-full max-w-[12rem] rounded-xl bg-white object-contain ring-1 ring-teal-100"
                  />
                </a>
              }
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={boardSignatoryEditPath(id)}
            editLabel={t('common.edit')}
            deleteLabel={t('boardSignatories.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('boardSignatories.confirmDelete'),
                successMessage: t('boardSignatories.deleted'),
                path: `/board/signatories/${id}`,
                queryKey: ['board-signatories'],
                onDeleted: () => navigate(boardSignatoriesPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
