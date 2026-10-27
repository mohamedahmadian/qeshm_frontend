import { MessageSquare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { InspectionKind } from '../../../types/app'
import { inspectionKindsPath } from '../inspection-paths'
import { InspectionKindForm } from './InspectionKindForm'

export function InspectionKindEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['inspection', 'kind', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InspectionKind>(`/inspection/kinds/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessageSquare}
        title={t('inspectionKinds.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={MessageSquare} />}
      />
      <InspectionKindForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/inspection/kinds/${id}`, payload)
          toast.success(t('inspectionKinds.updated'))
          navigate(inspectionKindsPath())
        }}
      />
    </div>
  )
}
