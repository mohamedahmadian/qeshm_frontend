import { FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import { api } from '../../lib/api'
import { boardRequestStatuses, type BoardRequest } from '../../types/app'
import { BoardRequestForm } from './BoardRequestForm'
import { BoardStagePipeline } from './BoardStagePipeline'
import { boardRequestPath } from './board-paths'

export function BoardRequestCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={FileText}
        title={t('boardRequests.create')}
        subtitle={t('boardRequests.createSubtitle')}
        backTo={false}
      />
      <BoardStagePipeline activeStage="REQUEST" />
      <BoardRequestForm
        onSubmit={async (payload) => {
          const { data } = await api.post<BoardRequest>('/board/requests', payload)
          toast.success(t('boardRequests.created'))
          navigate(boardRequestPath(data.id))
        }}
      />
    </div>
  )
}

export function BoardRequestEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['board-request', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<BoardRequest>(`/board/requests/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  if (query.data.status !== boardRequestStatuses.PENDING_REVIEW) {
    return (
      <div className={formShellClassName}>
        <PageHeader
          icon={FileText}
          title={t('boardRequests.edit')}
          subtitle={<EntityNameSubtitle name={query.data.subject} icon={FileText} />}
        />
        <p className="text-sm text-ink-600">{t('boardRequests.locked')}</p>
      </div>
    )
  }
  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={FileText}
        title={t('boardRequests.edit')}
        subtitle={<EntityNameSubtitle name={query.data.subject} icon={FileText} />}
      />
      <BoardStagePipeline status={query.data.status} rejectedStage={query.data.rejectedStage} />
      <BoardRequestForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/board/requests/${id}`, payload)
          toast.success(t('boardRequests.updated'))
          navigate(boardRequestPath(id))
        }}
      />
    </div>
  )
}
