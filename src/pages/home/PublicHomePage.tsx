import { Eye, Radio } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AuthGuestLayout } from '../../components/auth/AuthGuestLayout'
import { Button } from '../../components/ui/Form'
import { FormCard, FormEmptyHint } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { projectHasMapLocation } from '../../lib/geo'
import { type ProjectLiveBoard, type ProjectLiveBoardItem } from '../../types/app'
import {
  LiveBoardHeaderStats,
  ProjectLiveBoardMap,
  ProjectSystemNameBanner,
} from '../projects/ProjectLiveBoardMap'

export function PublicHomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [selected, setSelected] = useState<ProjectLiveBoardItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const query = useQuery({
    queryKey: ['public', 'projects', 'live-board'],
    queryFn: async () => {
      const { data } = await api.get<ProjectLiveBoard>('/public/projects/live-board')
      return data
    },
  })

  const items = query.data?.items ?? []
  const located = items.filter(projectHasMapLocation)

  return (
    <AuthGuestLayout fill showHeaderLogin>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-8 sm:py-5">
        <FormCard
          icon={Radio}
          title={t('projectLiveBoard.title')}
          subtitle={
            selected ? (
              <span className="mt-2.5 hidden sm:block">
                <ProjectSystemNameBanner
                  name={selected.systemName}
                  color={selected.color}
                  compact
                />
              </span>
            ) : located.length ? undefined : (
              t('projectLiveBoard.noLocation')
            )
          }
          action={
            selected ? (
              <div className="hidden items-center gap-2 sm:flex">
                <LiveBoardHeaderStats project={selected} locale={locale} size="sm" />
                <Button
                  type="button"
                  variant="ghost"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setDetailsOpen(true)}
                >
                  <Eye className="size-4" aria-hidden />
                  {t('projectLiveBoard.viewDetails')}
                </Button>
              </div>
            ) : undefined
          }
          headerClassName={selected ? 'sm:py-4' : undefined}
          className="flex min-h-[28rem] flex-1 flex-col"
        >
          {selected ? (
            <div className="px-5 pb-3 pt-1 sm:hidden">
              <ProjectSystemNameBanner name={selected.systemName} color={selected.color} />
            </div>
          ) : null}
          {query.isLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <LoadingState />
            </div>
          ) : query.isError ? (
            <div className="p-5 sm:p-6">
              <FormEmptyHint>{t('projectLiveBoard.loadError')}</FormEmptyHint>
            </div>
          ) : located.length === 0 ? (
            <div className="p-5 sm:p-6">
              <FormEmptyHint>
                {items.length ? t('projectLiveBoard.noLocation') : t('projectLiveBoard.empty')}
              </FormEmptyHint>
            </div>
          ) : (
            <ProjectLiveBoardMap
              items={items}
              locale={locale}
              canManage={false}
              openSheetOnSelect="mobile"
              detailsOpen={detailsOpen}
              onDetailsOpenChange={setDetailsOpen}
              onSelectedChange={(project) => {
                setSelected(project)
                if (!project) setDetailsOpen(false)
              }}
              className="relative min-h-[22rem] flex-1 overflow-hidden sm:min-h-[28rem]"
            />
          )}
        </FormCard>
      </div>
    </AuthGuestLayout>
  )
}
