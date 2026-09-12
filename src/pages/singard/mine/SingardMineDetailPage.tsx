import { FolderTree, Inbox, MessageCircleHeart, Reply } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { api } from '../../../lib/api'
import type { SingardFeedback } from '../../../types/app'
import { SingardAttachments } from '../SingardAttachments'
import { SingardLocationBlock } from '../SingardLocation'
import { SingardKindBadge, SingardStatusBadge } from '../SingardBadges'

export function SingardMineDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['singard', 'mine', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardFeedback>(`/singard/mine/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item) return <LoadingState />

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Inbox}
        title={t('singardMine.details')}
        subtitle={<EntityNameSubtitle name={item.trackingCode} icon={Inbox} />}
      />
      <FormCard icon={Inbox} title={item.trackingCode}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MessageCircleHeart}>{t('singard.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={MessageCircleHeart} label={t('singard.kind')} value={<SingardKindBadge kind={item.kind} />} tone="teal" />
            <FormFactTile icon={FolderTree} label={t('singard.category')} value={item.category.name} tone="mint" />
            <FormFactTile icon={Inbox} label={t('singard.status')} value={<SingardStatusBadge status={item.status} />} />
            <FormFactTile icon={Inbox} label={t('singard.createdAt')} value={<DateText value={item.createdAt} withTime />} />
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
          <FormFactTile icon={Reply} label={t('singard.replyBody')} value={item.replyBody || t('singard.noReply')} />
        </div>
      </FormCard>
    </div>
  )
}
