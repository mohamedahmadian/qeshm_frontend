import { FolderTree, Inbox, MessageCircleHeart, Reply } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { api } from '../../../lib/api'
import type { InspectionFeedback } from '../../../types/app'
import { InspectionAttachments } from '../InspectionAttachments'
import { InspectionLocationBlock } from '../InspectionLocation'
import { InspectionKindBadge, InspectionStatusBadge } from '../InspectionBadges'

export function InspectionMineDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['inspection', 'mine', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InspectionFeedback>(`/inspection/mine/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item) return <LoadingState />

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Inbox}
        title={t('inspectionMine.details')}
        subtitle={<EntityNameSubtitle name={item.trackingCode} icon={Inbox} />}
      />
      <FormCard icon={Inbox} title={item.trackingCode}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MessageCircleHeart}>{t('inspection.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={MessageCircleHeart} label={t('inspection.kind')} value={<InspectionKindBadge kind={item.kind} />} tone="teal" />
            <FormFactTile icon={FolderTree} label={t('inspection.category')} value={item.category.name} tone="mint" />
            <FormFactTile icon={Inbox} label={t('inspection.status')} value={<InspectionStatusBadge status={item.status} />} />
            <FormFactTile icon={Inbox} label={t('inspection.createdAt')} value={<DateText value={item.createdAt} withTime />} />
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
          <FormFactTile icon={Reply} label={t('inspection.replyBody')} value={item.replyBody || t('inspection.noReply')} />
        </div>
      </FormCard>
    </div>
  )
}
