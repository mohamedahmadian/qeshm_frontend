import {
  Building2,
  CalendarClock,
  CalendarRange,
  FolderKanban,
  Globe,
  Hash,
  IdCard,
  Mail,
  Phone,
  ScrollText,
  Tags,
  UserRound,
  Wallet,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { isLikelyEmail } from '../../../lib/identity'
import { isValidIranianLegalNationalId, normalizeLegalNationalId } from '../../../lib/national-id'
import type { ContractorType, Project, ProjectContractor } from '../../../types/app'
import { ContractorPaymentListPage } from './ContractorPaymentPages'
import { ContractorTabNav, type ContractorManageTab } from './ContractorTabs'
import { ContractorPortalUserListPage } from './ContractorPortalUserPages'
import { ContractorTeamListPage } from './ContractorTeamPages'

export type ContractorPayload = {
  projectId?: string
  typeId: string | null
  name: string
  nationalId: string | null
  registrationNumber: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  ceoName: string | null
  timeEstimate: string | null
  costEstimate: number | null
  contractStartDate: string | null
  contractEndDate: string | null
  supportStartDate: string | null
  supportEndDate: string | null
}

export function ContractorForm({
  initial,
  onSubmit,
  requireProject = false,
  manage,
}: {
  initial?: Pick<
    ProjectContractor,
    | 'typeId'
    | 'name'
    | 'nationalId'
    | 'registrationNumber'
    | 'phone'
    | 'email'
    | 'website'
    | 'description'
    | 'ceoName'
    | 'timeEstimate'
    | 'costEstimate'
    | 'contractStartDate'
    | 'contractEndDate'
    | 'supportStartDate'
    | 'supportEndDate'
  >
  onSubmit: (payload: ContractorPayload) => Promise<void>
  requireProject?: boolean
  manage?: { projectId: string; contractorId: string }
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ContractorManageTab>('info')
  const [projectId, setProjectId] = useState('')
  const [typeId, setTypeId] = useState(initial?.typeId ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? '')
  const [registrationNumber, setRegistrationNumber] = useState(initial?.registrationNumber ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [ceoName, setCeoName] = useState(initial?.ceoName ?? '')
  const [timeEstimate, setTimeEstimate] = useState(initial?.timeEstimate ?? '')
  const [costEstimate, setCostEstimate] = useState(
    initial?.costEstimate != null ? String(initial.costEstimate) : '',
  )
  const [contractStartDate, setContractStartDate] = useState(initial?.contractStartDate ?? '')
  const [contractEndDate, setContractEndDate] = useState(initial?.contractEndDate ?? '')
  const [supportStartDate, setSupportStartDate] = useState(initial?.supportStartDate ?? '')
  const [supportEndDate, setSupportEndDate] = useState(initial?.supportEndDate ?? '')
  const [saving, setSaving] = useState(false)

  const projects = useQuery({
    queryKey: ['projects', 'lookup'],
    enabled: requireProject,
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/projects')
      return data
    },
  })

  const types = useQuery({
    queryKey: ['contractor-types', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<ContractorType[]>('/contractor-types')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (requireProject && !projectId) {
      toast.error(t('contractors.projectRequired'))
      return
    }
    if (!typeId) {
      toast.error(t('contractors.typeRequired'))
      return
    }
    const idDigits = normalizeLegalNationalId(nationalId)
    if (idDigits && !isValidIranianLegalNationalId(idDigits)) {
      toast.error(t('contractors.nationalIdInvalid'))
      return
    }
    const emailValue = email.trim()
    if (emailValue && !isLikelyEmail(emailValue)) {
      toast.error(t('contractors.emailInvalid'))
      return
    }
    const websiteValue = website.trim()
    if (websiteValue && !isLikelyWebsite(websiteValue)) {
      toast.error(t('contractors.websiteInvalid'))
      return
    }
    if (contractStartDate && contractEndDate && contractEndDate < contractStartDate) {
      toast.error(t('contractors.contractDateRange'))
      return
    }
    if (supportStartDate && supportEndDate && supportEndDate < supportStartDate) {
      toast.error(t('contractors.supportDateRange'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        ...(requireProject ? { projectId } : {}),
        typeId,
        name: name.trim(),
        nationalId: idDigits || null,
        registrationNumber: digitsOrNull(registrationNumber),
        phone: digitsOrNull(phone),
        email: emailValue ? emailValue.toLowerCase() : null,
        website: websiteValue || null,
        description: emptyToNull(description),
        ceoName: emptyToNull(ceoName),
        timeEstimate: emptyToNull(timeEstimate),
        costEstimate: toOptionalAmount(costEstimate),
        contractStartDate: emptyToNull(contractStartDate),
        contractEndDate: emptyToNull(contractEndDate),
        supportStartDate: emptyToNull(supportStartDate),
        supportEndDate: emptyToNull(supportEndDate),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Building2}
      title={initial ? initial.name || t('contractors.edit') : t('contractors.create')}
      subtitle={initial ? undefined : t('contractors.createSubtitle')}
    >
      {manage ? <ContractorTabNav tab={tab} onChange={setTab} /> : null}
      {manage && tab === 'payments' ? (
        <div className="p-5 sm:p-6">
          <ContractorPaymentListPage
            embedded
            projectId={manage.projectId}
            contractorId={manage.contractorId}
          />
        </div>
      ) : null}
      {manage && tab === 'team' ? (
        <div className="p-5 sm:p-6">
          <ContractorTeamListPage
            embedded
            projectId={manage.projectId}
            contractorId={manage.contractorId}
          />
        </div>
      ) : null}
      {manage && tab === 'users' ? (
        <div className="p-5 sm:p-6">
          <ContractorPortalUserListPage
            embedded
            projectId={manage.projectId}
            contractorId={manage.contractorId}
          />
        </div>
      ) : null}
      <AppForm
        onSubmit={submit}
        className={`${formCardBodyClassName}${manage && tab !== 'info' ? ' hidden' : ''}`}
      >
        {requireProject ? (
          <FormField icon={FolderKanban} label={t('contractors.project')} htmlFor="contractorProject">
            <SearchSelect
              id="contractorProject"
              value={projectId}
              onChange={setProjectId}
              required
              placeholder={t('contractors.selectProject')}
              options={(projects.data ?? []).map((project) => ({
                value: project.id,
                label: project.systemName,
              }))}
            />
          </FormField>
        ) : null}
        <FormField icon={Building2} label={t('contractors.name')} htmlFor="contractorName">
          <input
            id="contractorName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Tags} label={t('contractors.type')} htmlFor="contractorType">
          <SearchSelect
            id="contractorType"
            value={typeId}
            onChange={setTypeId}
            required
            placeholder={t('contractors.selectType')}
            options={(types.data ?? []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </FormField>
        <FormField icon={IdCard} label={t('contractors.nationalId')} htmlFor="contractorNationalId">
          <input
            id="contractorNationalId"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={nationalId}
            onChange={(e) => setNationalId(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
          />
        </FormField>
        <FormField icon={Hash} label={t('contractors.registrationNumber')} htmlFor="registrationNumber">
          <input
            id="registrationNumber"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={registrationNumber}
            onChange={(e) =>
              setRegistrationNumber(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 30))
            }
          />
        </FormField>
        <FormField icon={Phone} label={t('contractors.phone')} htmlFor="contractorPhone">
          <input
            id="contractorPhone"
            inputMode="tel"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(e) => setPhone(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 20))}
          />
        </FormField>
        <FormField icon={Mail} label={t('contractors.email')} htmlFor="contractorEmail">
          <input
            id="contractorEmail"
            type="email"
            dir="ltr"
            className={`${fieldClassName} text-start`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
        </FormField>
        <FormField icon={Globe} label={t('contractors.website')} htmlFor="contractorWebsite">
          <input
            id="contractorWebsite"
            dir="ltr"
            className={`${fieldClassName} text-start`}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={300}
          />
        </FormField>
        <FormField icon={UserRound} label={t('contractors.ceoName')} htmlFor="ceoName">
          <input
            id="ceoName"
            className={fieldClassName}
            value={ceoName}
            onChange={(e) => setCeoName(e.target.value)}
          />
        </FormField>
        <FormField icon={CalendarClock} label={t('contractors.timeEstimate')} htmlFor="timeEstimate">
          <input
            id="timeEstimate"
            className={fieldClassName}
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
          />
        </FormField>
        <FormField icon={Wallet} label={t('contractors.costEstimate')} htmlFor="costEstimate">
          <input
            id="costEstimate"
            type="number"
            min={0}
            className={fieldClassName}
            value={costEstimate}
            onChange={(e) => setCostEstimate(e.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('contractors.description')} htmlFor="contractorDescription">
          <textarea
            id="contractorDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormSectionTitle icon={CalendarRange} className="pt-2">
          {t('contractors.contractSection')}
        </FormSectionTitle>
        <FormField icon={CalendarRange} label={t('contractors.contractStartDate')} htmlFor="contractStart">
          <PersianDateField
            id="contractStart"
            value={contractStartDate}
            maxDate={contractEndDate || undefined}
            onChange={(value) => setContractStartDate(value ?? '')}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('contractors.contractEndDate')} htmlFor="contractEnd">
          <PersianDateField
            id="contractEnd"
            value={contractEndDate}
            minDate={contractStartDate || undefined}
            onChange={(value) => setContractEndDate(value ?? '')}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('contractors.supportStartDate')} htmlFor="supportStart">
          <PersianDateField
            id="supportStart"
            value={supportStartDate}
            maxDate={supportEndDate || undefined}
            onChange={(value) => setSupportStartDate(value ?? '')}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('contractors.supportEndDate')} htmlFor="supportEnd">
          <PersianDateField
            id="supportEnd"
            value={supportEndDate}
            minDate={supportStartDate || undefined}
            onChange={(value) => setSupportEndDate(value ?? '')}
          />
        </FormField>
        <FormActions
          submitLabel={t('contractors.save')}
          cancelLabel={t('contractors.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function digitsOrNull(value: string) {
  const digits = toLatinDigits(value).replace(/\D/g, '')
  return digits.length ? digits : null
}

function toOptionalAmount(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isLikelyWebsite(value: string) {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    return url.hostname.includes('.')
  } catch {
    return false
  }
}
