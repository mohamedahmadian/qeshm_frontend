import { Anchor, Building2, Handshake, MapPin, Phone, Plus, Ticket, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
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
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { geoName } from '../../lib/geo'
import { canManagePorts } from '../../lib/roles'
import type { Paginated, Port } from '../../types/app'
import { PortForm } from './PortForm'
import { portPath, portsPath } from './port-paths'

export function PortListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const canManage = canManagePorts(user)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['ports', q, page, sortBy, sortDir],
    enabled: canManage,
    queryFn: async () => {
      const { data } = await api.get<Paginated<Port>>('/ports', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  if (!canManage) return <Navigate to="/" replace />
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Anchor}
        title={t('ports.title')}
        subtitle={t('ports.subtitle')}
        action={
          <Link to={`${portsPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('ports.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('ports.search')}
        placeholder={t('ports.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('ports.noResults') : t('ports.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('ports.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="city" label={t('ports.city')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="cooperativeName"
                label={t('ports.cooperative')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="kind" label={t('ports.kind')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="managerName"
                label={t('ports.manager')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="phone" label={t('ports.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{geoName(item.city, locale)}</td>
                <td className="px-4 py-3">{item.cooperativeName}</td>
                <td className="px-4 py-3">{t(`ports.kindLabel.${item.kind}`)}</td>
                <td className="px-4 py-3">{item.managerName}</td>
                <td className="px-4 py-3 digit-field">{localizeDigits(item.phone, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={portPath(item.id)}
                    editTo={`${portPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('ports.confirmDelete'),
                        successMessage: t('ports.deleted'),
                        path: `/ports/${item.id}`,
                        queryKey: ['ports'],
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

export function PortCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  if (!canManagePorts(user)) return <Navigate to="/" replace />
  return (
    <div className={formShellClassName}>
      <PageHeader icon={Anchor} title={t('ports.create')} subtitle={t('ports.createSubtitle')} />
      <PortForm
        onSubmit={async (payload) => {
          await api.post('/ports', payload)
          toast.success(t('ports.created'))
          navigate(portsPath())
        }}
      />
    </div>
  )
}

export function PortEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = canManagePorts(user)
  const query = useQuery({
    queryKey: ['port', id],
    enabled: Boolean(id) && canManage,
    queryFn: async () => {
      const { data } = await api.get<Port>(`/ports/${id}`)
      return data
    },
  })
  if (!canManage) return <Navigate to="/" replace />
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Anchor}
        title={t('ports.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Anchor} />}
      />
      <PortForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/ports/${id}`, payload)
          toast.success(t('ports.updated'))
          navigate(portsPath())
        }}
      />
    </div>
  )
}

export function PortDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = canManagePorts(user)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['port', id],
    enabled: Boolean(id) && canManage,
    queryFn: async () => {
      const { data } = await api.get<Port>(`/ports/${id}`)
      return data
    },
  })
  if (!canManage) return <Navigate to="/" replace />
  const item = query.data
  if (!item || !id) return <LoadingState />
  const coords =
    item.latitude != null && item.longitude != null
      ? `${item.latitude}, ${item.longitude}`
      : null
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Anchor}
        title={t('ports.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Anchor} />}
      />
      <FormCard icon={Anchor} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Anchor}>{t('ports.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Anchor} label={t('ports.name')} value={item.name} tone="teal" />
            <FormFactTile icon={Building2} label={t('ports.city')} value={geoName(item.city, locale)} tone="teal" />
            <FormFactTile icon={Handshake} label={t('ports.cooperative')} value={item.cooperativeName} tone="mint" />
            <FormFactTile icon={Ticket} label={t('ports.kind')} value={t(`ports.kindLabel.${item.kind}`)} tone="mint" />
            <FormFactTile icon={UserRound} label={t('ports.manager')} value={item.managerName} tone="teal" />
            <FormFactTile icon={Phone} label={t('ports.phone')} copyValue={item.phone} tone="teal" />
            <FormFactTile
              icon={MapPin}
              label={t('ports.address')}
              value={item.address}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={MapPin}>{t('ports.locationSection')}</FormSectionTitle>
          <FormFactTile icon={MapPin} label={t('ports.coordinates')} value={coords} />
          {item.latitude != null && item.longitude != null ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-teal-100">
              <OsmMapPicker
                variant="always"
                readOnly
                latitude={String(item.latitude)}
                longitude={String(item.longitude)}
                onChange={() => undefined}
                heightClass="h-56"
              />
            </div>
          ) : null}
        </div>
      </FormCard>
      <DetailActions
        editTo={`${portPath(id)}/edit`}
        editLabel={t('common.edit')}
        deleteLabel={t('ports.delete')}
        onDelete={() =>
          confirmDelete({
            message: t('ports.confirmDelete'),
            successMessage: t('ports.deleted'),
            path: `/ports/${id}`,
            queryKey: ['ports'],
            onDeleted: () => navigate(portsPath()),
          })
        }
      />
    </div>
  )
}
