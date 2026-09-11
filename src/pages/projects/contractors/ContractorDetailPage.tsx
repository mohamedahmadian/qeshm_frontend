import { Building2, CalendarClock, Handshake, IdCard, Layers, ScrollText, UserRound, Users, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { ProjectContractor } from '../../../types/app'
import {
  contractorPath,
  contractorPaymentsPath,
  contractorPhasesPath,
  contractorTeamPath,
  contractorsPath,
} from './contractor-paths'

export function ContractorDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id: projectId, contractorId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor', projectId, contractorId],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(
        `/projects/${projectId}/contractors/${contractorId}`,
      )
      return data
    },
  })

  const contractor = query.data
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.details')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Building2} />}
      />
      <FormCard icon={Building2} title={contractor.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Handshake}>{t('contractors.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Building2} label={t('contractors.name')} value={contractor.name} tone="teal" />
            <FormFactTile
              icon={IdCard}
              label={t('contractors.nationalId')}
              copyValue={contractor.nationalId}
              tone="mint"
            />
            <FormFactTile icon={UserRound} label={t('contractors.ceoName')} value={contractor.ceoName || '—'} />
            <FormFactTile
              icon={CalendarClock}
              label={t('contractors.timeEstimate')}
              value={contractor.timeEstimate || '—'}
            />
            <FormFactTile
              icon={Wallet}
              label={t('contractors.costEstimate')}
              value={
                contractor.costEstimate != null
                  ? formatNumber(contractor.costEstimate, locale)
                  : '—'
              }
            />
            <FormFactTile
              icon={Users}
              label={t('contractors.memberCount')}
              value={formatNumber(contractor._count?.members ?? 0, locale)}
            />
            <FormFactTile
              icon={Layers}
              label={t('contractors.phaseCount')}
              value={formatNumber(contractor._count?.phases ?? 0, locale)}
            />
            <FormFactTile
              icon={Wallet}
              label={t('contractors.paymentCount')}
              value={formatNumber(contractor._count?.payments ?? 0, locale)}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('contractors.description')}
              value={contractor.description || '—'}
            />
          </div>
        </div>
      </FormCard>
      <DetailActions
        editTo={`${contractorPath(projectId, contractorId)}/edit`}
        editLabel={t('common.edit')}
        deleteLabel={t('contractors.delete')}
        onDelete={() =>
          confirmDelete({
            message: t('contractors.confirmDelete'),
            successMessage: t('contractors.deleted'),
            path: `/projects/${projectId}/contractors/${contractorId}`,
            queryKey: ['contractors'],
            onDeleted: () => navigate(contractorsPath(projectId)),
          })
        }
        extraItems={[
          {
            to: contractorTeamPath(projectId, contractorId),
            icon: Users,
            label: t('contractorTeam.manage'),
          },
          {
            to: contractorPhasesPath(projectId, contractorId),
            icon: Layers,
            label: t('contractorPhases.manage'),
          },
          {
            to: contractorPaymentsPath(projectId, contractorId),
            icon: Wallet,
            label: t('contractorPayments.manage'),
          },
        ]}
      />
    </div>
  )
}
