import { Building2, CalendarClock, CalendarRange, FolderKanban, Globe, Handshake, Hash, IdCard, Mail, Phone, ScrollText, Tags, UserRound, Users, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { ProjectContractor } from '../../../types/app'
import { ContractorPaymentListPage } from './ContractorPaymentPages'
import { ContractorTabNav, type ContractorManageTab } from './ContractorTabs'
import { ContractorTeamListPage } from './ContractorTeamPages'
import { contractorPath, contractorsPath } from './contractor-paths'

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

  const [tab, setTab] = useState<ContractorManageTab>('info')
  const contractor = query.data
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.details')}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <EntityNameSubtitle
              name={contractor.project.systemName}
              icon={FolderKanban}
              label={t('contractors.projectLabel')}
              to={`/projects/${projectId}`}
            />
            <EntityNameSubtitle name={contractor.name} icon={Building2} />
          </span>
        }
      />
      <FormCard icon={Building2} title={contractor.name}>
        <ContractorTabNav tab={tab} onChange={setTab} />
        {tab === 'payments' ? (
          <div className="p-5 sm:p-6">
            <ContractorPaymentListPage embedded projectId={projectId} contractorId={contractorId} />
          </div>
        ) : null}
        {tab === 'team' ? (
          <div className="p-5 sm:p-6">
            <ContractorTeamListPage embedded projectId={projectId} contractorId={contractorId} />
          </div>
        ) : null}
        <div className={tab === 'info' ? 'space-y-6 p-5 sm:p-6' : 'hidden'}>
          <FormSectionTitle icon={Handshake}>{t('contractors.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Building2} label={t('contractors.name')} value={contractor.name} tone="teal" />
            <FormFactTile
              icon={Tags}
              label={t('contractors.type')}
              value={contractor.type?.name || '—'}
              tone="mint"
            />
            <FormFactTile
              icon={IdCard}
              label={t('contractors.nationalId')}
              copyValue={contractor.nationalId}
            />
            <FormFactTile
              icon={Hash}
              label={t('contractors.registrationNumber')}
              value={
                contractor.registrationNumber
                  ? localizeDigits(contractor.registrationNumber, locale)
                  : '—'
              }
            />
            <FormFactTile
              icon={Phone}
              label={t('contractors.phone')}
              value={contractor.phone ? localizeDigits(contractor.phone, locale) : '—'}
            />
            <FormFactTile
              icon={Mail}
              label={t('contractors.email')}
              value={contractor.email ? <span dir="ltr">{contractor.email}</span> : '—'}
            />
            <FormFactTile
              icon={Globe}
              label={t('contractors.website')}
              value={contractor.website ? <span dir="ltr">{contractor.website}</span> : '—'}
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
          <FormSectionTitle icon={CalendarRange}>{t('contractors.contractSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.contractStartDate')}
              value={contractor.contractStartDate ? <DateText value={contractor.contractStartDate} /> : '—'}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.contractEndDate')}
              value={contractor.contractEndDate ? <DateText value={contractor.contractEndDate} /> : '—'}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.supportStartDate')}
              value={contractor.supportStartDate ? <DateText value={contractor.supportStartDate} /> : '—'}
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.supportEndDate')}
              value={contractor.supportEndDate ? <DateText value={contractor.supportEndDate} /> : '—'}
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
      />
    </div>
  )
}
