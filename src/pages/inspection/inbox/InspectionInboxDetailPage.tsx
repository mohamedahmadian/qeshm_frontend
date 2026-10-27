import {
  ClipboardList,
  FolderTree,
  MessageCircleHeart,
  MessagesSquare,
  Phone,
  Reply,
  UserRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../../lib/api'
import type { InspectionFeedback, InspectionFeedbackStatus } from '../../../types/app'
import { InspectionAttachments } from '../InspectionAttachments'
import { InspectionLocationBlock } from '../InspectionLocation'
import { InspectionKindBadge, InspectionStatusBadge, InspectionStatusSwitch } from '../InspectionBadges'
import { inspectionActivitiesPath, inspectionInboxPath, inspectionInboxReplyPath } from '../inspection-paths'

export function InspectionInboxDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const [savingStatus, setSavingStatus] = useState(false)
  const query = useQuery({
    queryKey: ['inspection', 'feedback', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InspectionFeedback>(`/inspection/feedbacks/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) return <LoadingState />

  const changeStatus = async (status: InspectionFeedbackStatus) => {
    if (status === item.status || savingStatus) return
    setSavingStatus(true)
    try {
      await api.patch(`/inspection/feedbacks/${id}/status`, { status })
      toast.success(t('inspection.statusUpdated'))
      await query.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessagesSquare}
        title={t('inspection.details')}
        subtitle={<EntityNameSubtitle name={item.trackingCode} icon={MessagesSquare} />}
      />
      <FormCard icon={MessagesSquare} title={item.trackingCode}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MessageCircleHeart}>{t('inspection.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={MessagesSquare} label={t('inspection.kind')} value={<InspectionKindBadge kind={item.kind} />} tone="teal" />
            <FormFactTile
              icon={FolderTree}
              label={t('inspection.category')}
              value={item.category.parent ? `${item.category.parent.name} / ${item.category.name}` : item.category.name}
              tone="mint"
            />
            <FormFactTile
              icon={UserRound}
              label={t('inspection.submitter')}
              value={item.submitterName || t('inspection.anonymous')}
            />
            <FormFactTile icon={Phone} label={t('inspection.phone')} copyValue={item.phone ?? undefined} value={item.phone || '—'} />
            <FormFactTile
              icon={MessagesSquare}
              label={t('inspection.status')}
              value={<InspectionStatusBadge status={item.status} />}
            />
            <FormFactTile
              icon={ClipboardList}
              label={t('inspection.createdAt')}
              value={<DateText value={item.createdAt} withTime />}
            />
            <FormFactTile
              icon={MessageCircleHeart}
              label={t('inspection.body')}
              value={item.body || '—'}
              className="sm:col-span-2"
            />
          </div>
          <InspectionLocationBlock item={item} />
          <FormSectionTitle icon={MessageCircleHeart}>{t('inspection.attachments')}</FormSectionTitle>
          <InspectionAttachments items={item.attachments} />
          <FormSectionTitle icon={Reply}>{t('inspection.reply')}</FormSectionTitle>
          <FormFactTile
            icon={Reply}
            label={t('inspection.replyBody')}
            value={item.replyBody || t('inspection.noReply')}
            className="sm:col-span-2"
          />
          <FormField icon={MessagesSquare} label={t('inspection.updateStatus')}>
            <InspectionStatusSwitch
              value={item.status}
              disabled={savingStatus}
              onChange={(status) => void changeStatus(status)}
            />
          </FormField>
          <DetailActions
            editTo={inspectionInboxReplyPath(item.id)}
            editLabel={t('inspection.writeReply')}
            deleteLabel={t('common.delete')}
            extraItems={[
              {
                to: inspectionActivitiesPath(item.id),
                label: t('inspection.manageActivities'),
                icon: ClipboardList,
              },
            ]}
            onDelete={() =>
              confirmDelete({
                message: t('inspection.confirmDelete'),
                successMessage: t('inspection.deleted'),
                path: `/inspection/feedbacks/${item.id}`,
                queryKey: ['inspection', 'inbox'],
                onDeleted: () => navigate(inspectionInboxPath()),
              })
            }
          />
        </div>
      </FormCard>
      {(item.activities ?? []).length ? (
        <div className="mt-4">
          <FormCard icon={ClipboardList} title={t('inspectionActivities.title')}>
            <div className="space-y-3 p-5 sm:p-6">
              {(item.activities ?? []).map((activity) => (
                <Link
                  key={activity.id}
                  to={inspectionActivitiesPath(item.id, activity.id)}
                  className="block rounded-2xl border border-teal-100 bg-teal-50/40 p-4 hover:bg-teal-50"
                >
                  <p className="font-semibold text-ink-900">{activity.title}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    <DateText value={activity.occurredAt} /> · {activity.createdBy.fullName}
                  </p>
                </Link>
              ))}
              <Link to={`${inspectionActivitiesPath(item.id)}/new`}>
                <Button variant="soft">{t('inspectionActivities.create')}</Button>
              </Link>
            </div>
          </FormCard>
        </div>
      ) : null}
    </div>
  )
}
