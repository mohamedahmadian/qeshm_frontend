import { MessageSquare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { SingardKind } from '../../../types/app'
import { singardKindsPath } from '../singard-paths'
import { SingardKindForm } from './SingardKindForm'

export function SingardKindEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['singard', 'kind', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardKind>(`/singard/kinds/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessageSquare}
        title={t('singardKinds.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={MessageSquare} />}
      />
      <SingardKindForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/singard/kinds/${id}`, payload)
          toast.success(t('singardKinds.updated'))
          navigate(singardKindsPath())
        }}
      />
    </div>
  )
}
