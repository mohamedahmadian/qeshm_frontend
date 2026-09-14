import { Radio } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AuthGuestLayout } from '../../components/auth/AuthGuestLayout'
import { FormCard, FormEmptyHint } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import type { ProjectLiveBoard } from '../../types/app'
import { ProjectLiveBoardMap } from '../projects/ProjectLiveBoardMap'

export function PublicHomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'

  const query = useQuery({
    queryKey: ['public', 'projects', 'live-board'],
    queryFn: async () => {
      const { data } = await api.get<ProjectLiveBoard>('/public/projects/live-board')
      return data
    },
  })

  const items = query.data?.items ?? []
  const located = items.filter(
    (item) => item.showOnLiveBoard !== false && item.latitude != null && item.longitude != null,
  )

  return (
    <AuthGuestLayout fill showHeaderLogin>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-8 sm:py-5">
        <FormCard
          icon={Radio}
          title={t('projectLiveBoard.title')}
          subtitle={located.length ? undefined : t('projectLiveBoard.noLocation')}
          className="flex min-h-[28rem] flex-1 flex-col"
        >
          {query.isLoading ? (
            <div className="flex flex-1 items-center justify-center p-6">
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
              className="relative min-h-[22rem] flex-1 overflow-hidden sm:min-h-[28rem]"
            />
          )}
        </FormCard>
      </div>
    </AuthGuestLayout>
  )
}
