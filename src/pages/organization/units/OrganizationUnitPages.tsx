import {
  Building2,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  Filter,
  MapPin,
  MessageCircle,
  Network,
  Phone,
  Plus,
  Send,
  Share2,
  Store,
  Table2,
  Tags,
  Type,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
} from '../../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  ToggleField,
  listShellClassName,
  userFormShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { OsmMapPicker } from '../../../components/ui/OsmMapPicker'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { OrganizationUnit, OrganizationUnitKind, Paginated } from '../../../types/app'
import {
  buildOrganizationUnitForest,
  findOrganizationUnitSubtree,
  flattenOrganizationUnitForest,
  organizationUnitMatches,
  organizationUnitPathLabel,
  pruneOrganizationUnitForest,
} from '../organization-unit-label'
import {
  organizationEmployeesPath,
  organizationUnitKindsPath,
  organizationUnitPath,
  organizationUnitRestaurantsPath,
  organizationUnitsPath,
} from '../organization-paths'
import { OrganizationUnitForm } from './OrganizationUnitForm'

const unitDetailTabs = [
  { id: 'unit', icon: Building2, labelKey: 'organizationUnits.section' },
  { id: 'social', icon: Share2, labelKey: 'organizationUnits.socialSection' },
] as const

type UnitDetailTab = (typeof unitDetailTabs)[number]['id']

function treeRowClassName(depth: number) {
  if (depth === 0) return 'border-t border-line bg-white'
  if (depth % 2 === 1) {
    return 'border-t border-line !bg-teal-50/90 hover:!bg-teal-100/80 focus:!bg-teal-100/80 focus-visible:!bg-teal-100/80'
  }
  return 'border-t border-line !bg-mint-50/85 hover:!bg-mint-100/75 focus:!bg-mint-100/75 focus-visible:!bg-mint-100/75'
}

function UnitRowActions({
  item,
  onDelete,
}: {
  item: OrganizationUnit
  onDelete: (item: OrganizationUnit) => void
}) {
  const { t } = useTranslation()
  return (
    <EntityRowActions
      viewTo={organizationUnitPath(item.id)}
      showView={false}
      extra={
        <Link to={`${organizationEmployeesPath()}?orgUnitId=${item.id}`}>
          <Button type="button" variant="soft">
            <Users className="size-4" aria-hidden />
            {t('employees.manage')}
          </Button>
        </Link>
      }
      editTo={`${organizationUnitPath(item.id)}/edit`}
      onDelete={() => onDelete(item)}
    />
  )
}

export function OrganizationUnitListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const kind = searchParams.get('kind') ?? ''
  const parentId = searchParams.get('parentId') ?? ''
  const treeView = searchParams.get('view') === 'tree'
  const filtersActive = Boolean(kind || parentId)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const lookups = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const kinds = useQuery({
    queryKey: ['organization-unit-kinds', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitKind[]>('/organization/unit-kinds')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['organization-units', q, page, kind, parentId, sortBy, sortDir],
    enabled: !treeView,
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrganizationUnit>>('/organization/units', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(kind ? { kindId: kind } : {}),
          ...(parentId ? { parentId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const forest = useMemo(() => {
    const tree = buildOrganizationUnitForest(lookups.data ?? [], locale)
    const rooted = parentId
      ? (() => {
          const subtree = findOrganizationUnitSubtree(tree, parentId)
          return subtree ? [subtree] : []
        })()
      : tree
    if (!q && !kind) return rooted
    return pruneOrganizationUnitForest(rooted, (unit) => organizationUnitMatches(unit, q, kind), Boolean(q))
  }, [kind, locale, lookups.data, parentId, q])
  const treeRows = useMemo(
    () => flattenOrganizationUnitForest(forest, collapsed),
    [collapsed, forest],
  )

  useEffect(() => {
    setCollapsed(new Set())
  }, [kind, parentId, q])

  const rows = query.data?.items ?? []
  const base = organizationUnitsPath()
  const emptyMessage = q || filtersActive ? t('organizationUnits.noResults') : t('organizationUnits.empty')

  function deleteUnit(item: OrganizationUnit) {
    confirmDelete({
      message: t('organizationUnits.confirmDelete'),
      successMessage: t('organizationUnits.deleted'),
      path: `/organization/units/${item.id}`,
      queryKey: ['organization-units'],
    })
  }

  function toggleCollapsed(id: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('menus.organizationUnits')}
        subtitle={t('organizationUnits.subtitle')}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link to={organizationUnitKindsPath()}>
              <Button type="button" variant="soft">
                <Tags className="size-4" aria-hidden />
                {t('organizationUnitKinds.manage')}
              </Button>
            </Link>
            <Link to={`${base}/new`}>
              <Button>
                <Plus className="size-4" />
                {t('organizationUnits.create')}
              </Button>
            </Link>
          </div>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('organizationUnits.search')}
        placeholder={t('organizationUnits.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2"
        endExtra={
          <ToggleField
            checked={!treeView}
            onChange={(table) => setParams({ view: table ? undefined : 'tree' })}
            onLabel={
              <>
                <Table2 className="size-4" aria-hidden />
                {t('organizationUnits.tableView')}
              </>
            }
            offLabel={
              <>
                <Network className="size-4" aria-hidden />
                {t('organizationUnits.treeView')}
              </>
            }
          />
        }
        extra={
          <>
            <FormField icon={Filter} label={t('organizationUnits.kind')} htmlFor="unit-kind">
              <SearchSelect
                id="unit-kind"
                value={kind}
                onChange={(next) => setParams({ kind: next || undefined }, { resetPage: true })}
                placeholder={t('organizationUnits.allKinds')}
                options={[
                  { value: '', label: t('organizationUnits.allKinds') },
                  ...(kinds.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('organizationUnits.parent')} htmlFor="unit-parent">
              <SearchSelect
                id="unit-parent"
                value={parentId}
                onChange={(next) => setParams({ parentId: next || undefined }, { resetPage: true })}
                placeholder={t('organizationUnits.allParents')}
                options={[
                  { value: '', label: t('organizationUnits.allParents') },
                  ...(lookups.data ?? []).map((unit) => ({
                    value: unit.id,
                    label: organizationUnitPathLabel(unit),
                  })),
                ]}
              />
            </FormField>
          </>
        }
      />
      {treeView ? (
        <TableCard loading={lookups.isLoading} empty={emptyMessage} hasRows={treeRows.length > 0}>
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-ink-700">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('organizationUnits.name')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('organizationUnits.kind')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('organizationUnits.phone')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('organizationUnits.employeeCount')}</th>
                <ActionsTh />
              </tr>
            </thead>
            <tbody>
              {treeRows.map(({ unit: item, depth }) => {
                const expanded = !collapsed.has(item.id)
                const isChild = depth > 0
                return (
                  <tr key={item.id} className={treeRowClassName(depth)}>
                    <td className="relative px-4 py-3">
                      {isChild ? (
                        <span
                          aria-hidden
                          className={`absolute inset-y-1.5 w-1 rounded-full ${
                            depth % 2 === 1 ? 'bg-teal-400' : 'bg-mint-400'
                          }`}
                          style={{ insetInlineStart: `${0.7 + (depth - 1) * 1.35}rem` }}
                        />
                      ) : null}
                      <div
                        className="flex items-center gap-1.5"
                        style={{ paddingInlineStart: `${depth * 1.35}rem` }}
                      >
                        {item.children.length ? (
                          <button
                            type="button"
                            className={`inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-xl ${
                              isChild
                                ? 'text-teal-700 hover:bg-white/80'
                                : 'text-teal-700 hover:bg-teal-50'
                            }`}
                            aria-expanded={expanded}
                            aria-label={
                              expanded
                                ? t('organizationUnits.collapseUnit')
                                : t('organizationUnits.expandUnit')
                            }
                            onClick={() => toggleCollapsed(item.id)}
                          >
                            {expanded ? (
                              <ChevronDown className="size-4" aria-hidden />
                            ) : (
                              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block size-7 shrink-0" aria-hidden />
                        )}
                        {isChild ? (
                          <>
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 ring-1 ring-teal-200">
                              <CornerDownLeft className="size-3.5 rtl:-scale-x-100" aria-hidden />
                            </span>
                            <span className="rounded-xl bg-white px-2.5 py-1 font-medium text-ink-800 ring-1 ring-teal-100">
                              {item.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                              <Building2 className="size-3.5" aria-hidden />
                            </span>
                            <span className="font-semibold text-ink-900">{item.name}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.kind.name}</td>
                    <td className="px-4 py-3">
                      {item.phone ? (
                        <span className="digit-field" dir="ltr">
                          {localizeDigits(item.phone, locale)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{formatNumber(item._count?.employees ?? 0, locale)}</td>
                    <td className={actionsColClassName}>
                      <UnitRowActions item={item} onDelete={deleteUnit} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableCard>
      ) : (
        <>
          <TableCard loading={query.isLoading} empty={emptyMessage} hasRows={rows.length > 0}>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <SortableTh column="name" label={t('organizationUnits.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="kind" label={t('organizationUnits.kind')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="parent" label={t('organizationUnits.parent')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="phone" label={t('organizationUnits.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh
                    column="employeeCount"
                    label={t('organizationUnits.employeeCount')}
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
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">{item.kind.name}</td>
                    <td className="px-4 py-3">{item.parent?.name || '—'}</td>
                    <td className="px-4 py-3">
                      {item.phone ? (
                        <span className="digit-field" dir="ltr">
                          {localizeDigits(item.phone, locale)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{formatNumber(item._count?.employees ?? 0, locale)}</td>
                    <td className={actionsColClassName}>
                      <UnitRowActions item={item} onDelete={deleteUnit} />
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
        </>
      )}
    </div>
  )
}

export function OrganizationUnitCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={userFormShellClassName}>
      <PageHeader icon={Building2} title={t('organizationUnits.create')} subtitle={t('organizationUnits.createSubtitle')} />
      <OrganizationUnitForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/organization/units', payload)
          toast.success(t('organizationUnits.created'))
          navigate(organizationUnitPath(data.id))
        }}
      />
    </div>
  )
}

export function OrganizationUnitEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['organization-unit', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit>(`/organization/units/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('organizationUnits.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Building2} />}
      />
      <OrganizationUnitForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/organization/units/${id}`, payload)
          toast.success(t('organizationUnits.updated'))
          navigate(organizationUnitPath(id))
        }}
      />
    </div>
  )
}

export function OrganizationUnitDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-unit', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit>(`/organization/units/${id}`)
      return data
    },
  })
  const [tab, setTab] = useState<UnitDetailTab>('unit')
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const empty = '—'
  const coords =
    item.latitude != null && item.longitude != null
      ? localizeDigits(`${item.latitude}, ${item.longitude}`, locale)
      : empty

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('organizationUnits.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Building2} />}
      />
      <FormCard icon={Building2} title={item.name}>
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
          {unitDetailTabs.map((itemTab) => {
            const Icon = itemTab.icon
            const active = tab === itemTab.id
            return (
              <button
                key={itemTab.id}
                type="button"
                onClick={() => setTab(itemTab.id)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(itemTab.labelKey)}
              </button>
            )
          })}
        </nav>
        <div className="space-y-6 p-5 sm:p-6">
          {tab === 'unit' ? (
            <section className="space-y-6">
              <FormSectionTitle icon={Building2}>{t('organizationUnits.section')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Type} label={t('organizationUnits.name')} value={item.name} tone="teal" />
                <FormFactTile
                  icon={Tags}
                  label={t('organizationUnits.kind')}
                  value={item.kind.name}
                  tone="mint"
                />
                <FormFactTile
                  icon={Network}
                  label={t('organizationUnits.parent')}
                  value={item.parent?.name || empty}
                  empty={!item.parent}
                />
                <FormFactTile
                  icon={Building2}
                  label={t('organizationUnits.childCount')}
                  value={formatNumber(item._count?.children ?? 0, locale)}
                  tone="teal"
                />
                <FormFactTile icon={Phone} label={t('organizationUnits.phone')} copyValue={item.phone} tone="mint" />
                <FormFactTile
                  icon={UtensilsCrossed}
                  label={t('organizationUnits.nutritionRep')}
                  value={item.nutritionRep?.fullName || empty}
                  empty={!item.nutritionRep}
                />
                <FormFactTile
                  icon={Users}
                  label={t('organizationUnits.employeeCount')}
                  value={formatNumber(item._count?.employees ?? 0, locale)}
                />
                <FormFactTile
                  icon={Store}
                  label={t('organizationUnits.restaurantCount')}
                  value={formatNumber(item._count?.restaurants ?? 0, locale)}
                  tone="mint"
                />
                <FormFactTile
                  icon={MapPin}
                  label={t('organizationUnits.address')}
                  value={item.address || empty}
                  empty={!item.address}
                  className="sm:col-span-2"
                />
              </div>
              <FormSectionTitle icon={MapPin}>{t('organizationUnits.locationSection')}</FormSectionTitle>
              <FormFactTile
                icon={MapPin}
                label={t('organizationUnits.coordinates')}
                value={coords}
                empty={item.latitude == null || item.longitude == null}
              />
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
            </section>
          ) : (
            <section className="space-y-6">
              <FormSectionTitle icon={Share2}>{t('organizationUnits.socialSection')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={MessageCircle} label={t('organizationUnits.eitaa')} value={item.eitaa || empty} empty={!item.eitaa} tone="teal" />
                <FormFactTile icon={MessageCircle} label={t('organizationUnits.bale')} value={item.bale || empty} empty={!item.bale} tone="mint" />
                <FormFactTile icon={MessageCircle} label={t('organizationUnits.rubika')} value={item.rubika || empty} empty={!item.rubika} />
                <FormFactTile icon={Share2} label={t('organizationUnits.instagram')} value={item.instagram || empty} empty={!item.instagram} tone="teal" />
                <FormFactTile icon={Send} label={t('organizationUnits.telegram')} value={item.telegram || empty} empty={!item.telegram} tone="mint" />
                <FormFactTile icon={Phone} label={t('organizationUnits.whatsapp')} value={item.whatsapp || empty} empty={!item.whatsapp} />
              </div>
            </section>
          )}
          <DetailActions
            editTo={`${organizationUnitPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('organizationUnits.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('organizationUnits.confirmDelete'),
                successMessage: t('organizationUnits.deleted'),
                path: `/organization/units/${id}`,
                queryKey: ['organization-units'],
                onDeleted: () => navigate(organizationUnitsPath()),
              })
            }
            extraItems={[
              {
                to: organizationUnitRestaurantsPath(id),
                icon: Store,
                label: t('organizationUnitRestaurants.manage'),
              },
              {
                to: `${organizationEmployeesPath()}?orgUnitId=${id}`,
                icon: Users,
                label: t('employees.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
