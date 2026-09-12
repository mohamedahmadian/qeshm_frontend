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
import type { SingardFeedback, SingardFeedbackStatus } from '../../../types/app'
import { SingardAttachments } from '../SingardAttachments'
import { SingardLocationBlock } from '../SingardLocation'
import { SingardKindBadge, SingardStatusBadge, SingardStatusSwitch } from '../SingardBadges'
import { singardActivitiesPath, singardInboxPath, singardInboxReplyPath } from '../singard-paths'

export function SingardInboxDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const [savingStatus, setSavingStatus] = useState(false)
  const query = useQuery({
    queryKey: ['singard', 'feedback', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardFeedback>(`/singard/feedbacks/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) return <LoadingState />

  const changeStatus = async (status: SingardFeedbackStatus) => {
    if (status === item.status || savingStatus) return
    setSavingStatus(true)
    try {
      await api.patch(`/singard/feedbacks/${id}/status`, { status })
      toast.success(t('singard.statusUpdated'))
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
        title={t('singard.details')}
        subtitle={<EntityNameSubtitle name={item.trackingCode} icon={MessagesSquare} />}
      />
      <FormCard icon={MessagesSquare} title={item.trackingCode}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MessageCircleHeart}>{t('singard.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={MessagesSquare} label={t('singard.kind')} value={<SingardKindBadge kind={item.kind} />} tone="teal" />
            <FormFactTile
              icon={FolderTree}
              label={t('singard.category')}
              value={item.category.parent ? `${item.category.parent.name} / ${item.category.name}` : item.category.name}
              tone="mint"
            />
            <FormFactTile
              icon={UserRound}
              label={t('singard.submitter')}
              value={item.submitterName || t('singard.anonymous')}
            />
            <FormFactTile icon={Phone} label={t('singard.phone')} copyValue={item.phone ?? undefined} value={item.phone || '—'} />
            <FormFactTile
              icon={MessagesSquare}
              label={t('singard.status')}
              value={<SingardStatusBadge status={item.status} />}
            />
            <FormFactTile
              icon={ClipboardList}
              label={t('singard.createdAt')}
              value={<DateText value={item.createdAt} withTime />}
            />
            <FormFactTile
              icon={MessageCircleHeart}
              label={t('singard.body')}
              value={item.body || '—'}
              className="sm:col-span-2"
            />
          </div>
          <SingardLocationBlock item={item} />
          <FormSectionTitle icon={MessageCircleHeart}>{t('singard.attachments')}</FormSectionTitle>
          <SingardAttachments items={item.attachments} />
          <FormSectionTitle icon={Reply}>{t('singard.reply')}</FormSectionTitle>
          <FormFactTile
            icon={Reply}
            label={t('singard.replyBody')}
            value={item.replyBody || t('singard.noReply')}
            className="sm:col-span-2"
          />
          <FormField icon={MessagesSquare} label={t('singard.updateStatus')}>
            <SingardStatusSwitch
              value={item.status}
              disabled={savingStatus}
              onChange={(status) => void changeStatus(status)}
            />
          </FormField>
          <DetailActions
            editTo={singardInboxReplyPath(item.id)}
            editLabel={t('singard.writeReply')}
            deleteLabel={t('common.delete')}
            extraItems={[
              {
                to: singardActivitiesPath(item.id),
                label: t('singard.manageActivities'),
                icon: ClipboardList,
              },
            ]}
            onDelete={() =>
              confirmDelete({
                message: t('singard.confirmDelete'),
                successMessage: t('singard.deleted'),
                path: `/singard/feedbacks/${item.id}`,
                queryKey: ['singard', 'inbox'],
                onDeleted: () => navigate(singardInboxPath()),
              })
            }
          />
        </div>
      </FormCard>
      {(item.activities ?? []).length ? (
        <div className="mt-4">
          <FormCard icon={ClipboardList} title={t('singardActivities.title')}>
            <div className="space-y-3 p-5 sm:p-6">
              {(item.activities ?? []).map((activity) => (
                <Link
                  key={activity.id}
                  to={singardActivitiesPath(item.id, activity.id)}
                  className="block rounded-2xl border border-teal-100 bg-teal-50/40 p-4 hover:bg-teal-50"
                >
                  <p className="font-semibold text-ink-900">{activity.title}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    <DateText value={activity.occurredAt} /> · {activity.createdBy.fullName}
                  </p>
                </Link>
              ))}
              <Link to={`${singardActivitiesPath(item.id)}/new`}>
                <Button variant="soft">{t('singardActivities.create')}</Button>
              </Link>
            </div>
          </FormCard>
        </div>
      ) : null}
    </div>
  )
}
