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
import type { SingardActivity, SingardFeedback } from '../../../types/app'
import { singardActivitiesPath, singardInboxPath } from '../singard-paths'
import { SingardActivityForm } from './SingardActivityForm'

function useFeedback(id?: string) {
  return useQuery({
    queryKey: ['singard', 'feedback', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardFeedback>(`/singard/feedbacks/${id}`)
      return data
    },
  })
}

export function SingardActivityListPage() {
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
        title={t('singardActivities.title')}
        subtitle={<EntityNameSubtitle name={query.data.trackingCode} icon={ClipboardList} />}
        action={
          <Link to={`${singardActivitiesPath(id)}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('singardActivities.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => undefined}
        label={t('singardActivities.search')}
        placeholder={t('singardActivities.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={term ? t('singardActivities.noResults') : t('singardActivities.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <th className="px-4 py-3 text-start">{t('singardActivities.occurredAt')}</th>
              <th className="px-4 py-3 text-start">{t('singardActivities.titleField')}</th>
              <th className="px-4 py-3 text-start">{t('singardActivities.kind')}</th>
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
                <td className="px-4 py-3">{t(`singardActivities.kinds.${item.kind}`)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={singardActivitiesPath(id, item.id)}
                    editTo={`${singardActivitiesPath(id, item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('singardActivities.confirmDelete'),
                        successMessage: t('singardActivities.deleted'),
                        path: `/singard/feedbacks/${id}/activities/${item.id}`,
                        queryKey: ['singard', 'feedback', id],
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

export function SingardActivityCreatePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useFeedback(id)
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('singardActivities.create')}
        subtitle={<EntityNameSubtitle name={query.data.trackingCode} icon={ClipboardList} />}
      />
      <SingardActivityForm
        onSubmit={async (payload) => {
          const { data } = await api.post<SingardActivity>(`/singard/feedbacks/${id}/activities`, payload)
          toast.success(t('singardActivities.created'))
          navigate(singardActivitiesPath(id, data.id))
        }}
      />
    </div>
  )
}

export function SingardActivityEditPage() {
  const { t } = useTranslation()
  const { id, activityId } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['singard', 'activity', id, activityId],
    enabled: Boolean(id && activityId),
    queryFn: async () => {
      const { data } = await api.get<SingardActivity>(`/singard/feedbacks/${id}/activities/${activityId}`)
      return data
    },
  })
  if (!query.data || !id || !activityId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('singardActivities.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={ClipboardList} />}
      />
      <SingardActivityForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/singard/feedbacks/${id}/activities/${activityId}`, payload)
          toast.success(t('singardActivities.updated'))
          navigate(singardActivitiesPath(id, activityId))
        }}
      />
    </div>
  )
}

export function SingardActivityDetailPage() {
  const { t } = useTranslation()
  const { id, activityId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['singard', 'activity', id, activityId],
    enabled: Boolean(id && activityId),
    queryFn: async () => {
      const { data } = await api.get<SingardActivity>(`/singard/feedbacks/${id}/activities/${activityId}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id || !activityId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('singardActivities.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ClipboardList} />}
      />
      <FormCard icon={ClipboardList} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ClipboardList}>{t('singardActivities.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={ClipboardList} label={t('singardActivities.kind')} value={t(`singardActivities.kinds.${item.kind}`)} tone="teal" />
            <FormFactTile icon={ClipboardList} label={t('singardActivities.occurredAt')} value={<DateText value={item.occurredAt} />} tone="mint" />
            <FormFactTile icon={ClipboardList} label={t('singardActivities.createdBy')} value={item.createdBy.fullName} />
            <FormFactTile icon={ClipboardList} label={t('singardActivities.body')} value={item.body || '—'} className="sm:col-span-2" />
          </div>
          <DetailActions
            editTo={`${singardActivitiesPath(id, activityId)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('singardActivities.confirmDelete'),
                successMessage: t('singardActivities.deleted'),
                path: `/singard/feedbacks/${id}/activities/${activityId}`,
                queryKey: ['singard', 'feedback', id],
                onDeleted: () => navigate(singardInboxPath(id)),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
