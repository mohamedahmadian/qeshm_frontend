import { Eye, Hash, Image, MessageSquare, ScrollText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { getNavIcon } from '../../../lib/icons'
import type { SingardKind } from '../../../types/app'
import { singardKindsPath } from '../singard-paths'

export function SingardKindDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['singard', 'kind', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardKind>(`/singard/kinds/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item) return <LoadingState />
  const Icon = getNavIcon(item.icon)

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessageSquare}
        title={t('singardKinds.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={MessageSquare} />}
      />
      <FormCard icon={MessageSquare} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={MessageSquare}>{t('singardKinds.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('singardKinds.titleField')} value={item.title} tone="teal" />
            <FormFactTile
              icon={Image}
              label={t('singardKinds.icon')}
              value={
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4" aria-hidden />
                  {t(`singardKinds.icons.${item.icon}`, { defaultValue: item.icon })}
                </span>
              }
              tone="mint"
            />
            <FormFactTile icon={Hash} label={t('singardKinds.sortOrder')} value={formatNumber(item.sortOrder, locale)} />
            <FormFactTile
              icon={Eye}
              label={t('singardKinds.visibility')}
              value={item.isActive ? t('singardKinds.visible') : t('singardKinds.hidden')}
            />
            <FormFactTile
              icon={Hash}
              label={t('singardKinds.feedbackCount')}
              value={formatNumber(item._count.feedbacks, locale)}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('singardKinds.description')}
              value={item.description || '—'}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${singardKindsPath(item.id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('singardKinds.confirmDelete'),
                successMessage: t('singardKinds.deleted'),
                path: `/singard/kinds/${item.id}`,
                queryKey: ['singard', 'kinds'],
                onDeleted: () => navigate(singardKindsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
