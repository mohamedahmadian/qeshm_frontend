import { ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  SearchBar,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import type { InspectionActivity, InspectionFeedback } from '../../../types/app'
import { inspectionActivitiesPath, inspectionInboxPath } from '../inspection-paths'
import { InspectionActivityForm } from './InspectionActivityForm'

function useFeedback(id?: string) {
  return useQuery({
    queryKey: ['inspection', 'feedback', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InspectionFeedback>(`/inspection/feedbacks/${id}`)
      return data
    },
  })
}

export function InspectionActivityListPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { confirmDelete } = useConfirmDelete()
  const query = useFeedback(id)
  const [term, setTerm] = useState('')
  const rows = useMemo(() => {
    const items = query.data?.activities ?? []
    const q = term.trim()
    if (!q) return items
    return items.filter((item) => `${item.title} ${item.body ?? ''}`.includes(q))
  }, [query.data?.activities, term])
  if (!query.data || !id) return <LoadingState />

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('inspectionActivities.title')}
        subtitle={<EntityNameSubtitle name={query.data.trackingCode} icon={ClipboardList} />}
        action={
          <Link to={`${inspectionActivitiesPath(id)}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('inspectionActivities.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => undefined}
        label={t('inspectionActivities.search')}
        placeholder={t('inspectionActivities.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={term ? t('inspectionActivities.noResults') : t('inspectionActivities.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <th className="px-4 py-3 text-start">{t('inspectionActivities.occurredAt')}</th>
              <th className="px-4 py-3 text-start">{t('inspectionActivities.titleField')}</th>
              <th className="px-4 py-3 text-start">{t('inspectionActivities.kind')}</th>
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <DateText value={item.occurredAt} />
                </td>
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{t(`inspectionActivities.kinds.${item.kind}`)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={inspectionActivitiesPath(id, item.id)}
                    editTo={`${inspectionActivitiesPath(id, item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('inspectionActivities.confirmDelete'),
                        successMessage: t('inspectionActivities.deleted'),
                        path: `/inspection/feedbacks/${id}/activities/${item.id}`,
                        queryKey: ['inspection', 'feedback', id],
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}

export function InspectionActivityCreatePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useFeedback(id)
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('inspectionActivities.create')}
        subtitle={<EntityNameSubtitle name={query.data.trackingCode} icon={ClipboardList} />}
      />
      <InspectionActivityForm
        onSubmit={async (payload) => {
          await api.post(`/inspection/feedbacks/${id}/activities`, payload)
          toast.success(t('inspectionActivities.created'))
          navigate(inspectionActivitiesPath(id))
        }}
      />
    </div>
  )
}

export function InspectionActivityEditPage() {
  const { t } = useTranslation()
  const { id, activityId } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['inspection', 'activity', id, activityId],
    enabled: Boolean(id && activityId),
    queryFn: async () => {
      const { data } = await api.get<InspectionActivity>(`/inspection/feedbacks/${id}/activities/${activityId}`)
      return data
    },
  })
  if (!query.data || !id || !activityId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('inspectionActivities.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={ClipboardList} />}
      />
      <InspectionActivityForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/inspection/feedbacks/${id}/activities/${activityId}`, payload)
          toast.success(t('inspectionActivities.updated'))
          navigate(inspectionActivitiesPath(id))
        }}
      />
    </div>
  )
}

export function InspectionActivityDetailPage() {
  const { t } = useTranslation()
  const { id, activityId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['inspection', 'activity', id, activityId],
    enabled: Boolean(id && activityId),
    queryFn: async () => {
      const { data } = await api.get<InspectionActivity>(`/inspection/feedbacks/${id}/activities/${activityId}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id || !activityId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('inspectionActivities.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ClipboardList} />}
      />
      <FormCard icon={ClipboardList} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ClipboardList}>{t('inspectionActivities.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={ClipboardList} label={t('inspectionActivities.kind')} value={t(`inspectionActivities.kinds.${item.kind}`)} tone="teal" />
            <FormFactTile icon={ClipboardList} label={t('inspectionActivities.occurredAt')} value={<DateText value={item.occurredAt} />} tone="mint" />
            <FormFactTile icon={ClipboardList} label={t('inspectionActivities.createdBy')} value={item.createdBy.fullName} />
            <FormFactTile icon={ClipboardList} label={t('inspectionActivities.body')} value={item.body || '—'} className="sm:col-span-2" />
          </div>
          <DetailActions
            editTo={`${inspectionActivitiesPath(id, activityId)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('inspectionActivities.confirmDelete'),
                successMessage: t('inspectionActivities.deleted'),
                path: `/inspection/feedbacks/${id}/activities/${activityId}`,
                queryKey: ['inspection', 'feedback', id],
                onDeleted: () => navigate(inspectionInboxPath(id)),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
