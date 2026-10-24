import { FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
import { LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { canChooseBoardRequestKind, canEditBoardRequest } from '../../lib/board-access'
import {
  boardRequestKinds,
  type BoardRequest,
  type BoardRequestKind,
} from '../../types/app'
import { BoardRequestForm } from './BoardRequestForm'
import { BoardRequestHeaderBadges } from './BoardRequestHeaderBadges'
import { BoardRequestKindModal } from './BoardRequestKindModal'
import { BoardStagePipeline } from './BoardStagePipeline'
import { boardPlansPath, boardRequestPath } from './board-paths'

function parseRequestKind(value: string | null): BoardRequestKind | null {
  if (value === boardRequestKinds.NORMAL || value === boardRequestKinds.MANAGEMENT) {
    return value
  }
  return null
}

export function BoardRequestCreatePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canChooseKind = canChooseBoardRequestKind(user)
  const selectedKind = parseRequestKind(searchParams.get('kind'))
  const kind = canChooseKind ? selectedKind : boardRequestKinds.NORMAL
  const showKindModal = canChooseKind && !selectedKind

  return (
    <div className={`${formShellClassName} space-y-5`}>
      <PageHeader
        icon={FileText}
        title={t('boardRequests.create')}
        backTo={false}
      />
      {kind ? (
        <>
          <BoardStagePipeline kind={kind} activeStage="REQUEST" />
          <BoardRequestForm
            kind={kind}
            onSubmit={async (payload) => {
              const { data } = await api.post<BoardRequest>('/board/requests', payload)
              toast.success(t('boardRequests.created'))
              navigate(boardRequestPath(data.id))
            }}
          />
        </>
      ) : null}
      <BoardRequestKindModal
        open={showKindModal}
        onClose={() => navigate(boardPlansPath())}
        onPick={(next) => setSearchParams({ kind: next }, { replace: true })}
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
  if (!canEditBoardRequest(query.data)) {
    return (
      <div className={formShellClassName}>
        <PageHeader
          icon={FileText}
          title={t('boardRequests.edit')}
          chips={
            <BoardRequestHeaderBadges
              trackingNo={query.data.trackingNo}
              unitName={query.data.unit.name}
              subject={query.data.subject}
            />
          }
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
        chips={
          <BoardRequestHeaderBadges
            trackingNo={query.data.trackingNo}
            unitName={query.data.unit.name}
            subject={query.data.subject}
          />
        }
      />
      <BoardStagePipeline
        kind={query.data.kind}
        status={query.data.status}
        rejectedStage={query.data.rejectedStage}
      />
      <BoardRequestForm
        initial={query.data}
        kind={query.data.kind}
        onSubmit={async (payload) => {
          await api.patch(`/board/requests/${id}`, payload)
          toast.success(t('boardRequests.updated'))
          navigate(boardRequestPath(id))
        }}
      />
    </div>
  )
}
