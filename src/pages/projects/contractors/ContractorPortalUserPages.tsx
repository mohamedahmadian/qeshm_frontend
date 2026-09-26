import { KeyRound, Phone, Plus, ToggleRight, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import {
  AppForm,
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  ToggleField,
  fieldClassName,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useCrudListState } from '../../../hooks/useCrudListState'
import { api, getApiErrorMessage } from '../../../lib/api'
import { localizeDigits, toLatinDigits } from '../../../lib/datetime'
import { isPhoneReady, preferEnglishKeyboard, sanitizeUsername, USERNAME_ENGLISH_PATTERN } from '../../../lib/identity'
import { userStatuses, type Paginated, type ProjectContractor, type UserStatus } from '../../../types/app'
import { contractorUsersPath } from './contractor-paths'

type PortalUser = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  username: string
  phone: string | null
  status: UserStatus
}

function useContractorContext() {
  const { id: projectId, contractorId } = useParams()
  const query = useQuery({
    queryKey: ['contractor', projectId, contractorId],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(`/projects/${projectId}/contractors/${contractorId}`)
      return data
    },
  })
  return { projectId, contractorId, contractor: query.data }
}

export function ContractorPortalUserListPage({
  embedded = false,
  projectId: projectIdProp,
  contractorId: contractorIdProp,
}: {
  embedded?: boolean
  projectId?: string
  contractorId?: string
} = {}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const params = useParams()
  const projectId = projectIdProp ?? params.id
  const contractorId = contractorIdProp ?? params.contractorId
  const contractorQuery = useQuery({
    queryKey: ['contractor', projectId, contractorId],
    enabled: Boolean(projectId && contractorId) && !embedded,
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(`/projects/${projectId}/contractors/${contractorId}`)
      return data
    },
  })
  const { q, page, term, setTerm, applySearch, setPage, sortBy, sortDir, sortParams, onSort } = useCrudListState(embedded)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor-users', projectId, contractorId, q, page, sortBy, sortDir],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<PortalUser>>(
        `/projects/${projectId}/contractors/${contractorId}/users`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!projectId || !contractorId || (!embedded && !contractorQuery.data)) return <LoadingState />
  const rows = query.data?.items ?? []
  const base = contractorUsersPath(projectId, contractorId)
  const createAction = (
    <Link to={`${base}/new`}>
      <Button>
        <Plus className="size-4" />
        {t('contractorUsers.create')}
      </Button>
    </Link>
  )
  const list = (
    <>
      <SearchBar
        {...(embedded ? { autoFocus: false } : {})}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractorUsers.search')}
        placeholder={t('contractorUsers.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractorUsers.noResults') : t('contractorUsers.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="fullName" label={t('contractorUsers.firstName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="username" label={t('contractorUsers.username')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('contractorUsers.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('contractorUsers.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.fullName}</td>
                <td className="px-4 py-3" dir="ltr">{item.username}</td>
                <td className="px-4 py-3">{item.phone ? localizeDigits(item.phone, locale) : '—'}</td>
                <td className="px-4 py-3">{t(`userStatuses.${item.status}`)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractorUsers.confirmDelete'),
                        successMessage: t('contractorUsers.deleted'),
                        path: `/projects/${projectId}/contractors/${contractorId}/users/${item.id}`,
                        queryKey: ['contractor-users'],
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
      ) : null}
    </>
  )
  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{createAction}</div>
        {list}
      </div>
    )
  }
  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={KeyRound}
        title={t('contractorUsers.title')}
        subtitle={<EntityNameSubtitle name={contractorQuery.data?.name ?? ''} icon={KeyRound} />}
        action={createAction}
      />
      {list}
    </div>
  )
}

function PortalUserForm({
  initial,
  onSubmit,
}: {
  initial?: PortalUser
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? userStatuses.ACTIVE)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { id: projectId, contractorId } = useParams()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalizedUser = sanitizeUsername(username)
    if (normalizedUser.length < 3) {
      toast.error(t('contractorUsers.usernameMin'))
      return
    }
    if (!USERNAME_ENGLISH_PATTERN.test(normalizedUser)) {
      toast.error(t('contractorUsers.usernameEnglish'))
      return
    }
    if (!initial && password.length < 8) {
      toast.error(t('contractorUsers.passwordMin'))
      return
    }
    if (initial && password && password.length < 8) {
      toast.error(t('contractorUsers.passwordMin'))
      return
    }
    const digits = toLatinDigits(phone).replace(/\D/g, '')
    const normalizedPhone = digits.length === 10 && digits.startsWith('9') ? `0${digits}` : digits
    if (normalizedPhone && !isPhoneReady(normalizedPhone, true)) {
      toast.error(t('contractorUsers.phoneInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: normalizedUser,
        phone: normalizedPhone || null,
        ...(password ? { password } : {}),
        ...(initial ? { status } : {}),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={KeyRound}
      title={initial ? initial.fullName : t('contractorUsers.create')}
      subtitle={initial ? undefined : t('contractorUsers.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={UserRound} label={t('contractorUsers.firstName')} htmlFor="portal-first-name">
            <input id="portal-first-name" className={fieldClassName} required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </FormField>
          <FormField icon={UserRound} label={t('contractorUsers.lastName')} htmlFor="portal-last-name">
            <input id="portal-last-name" className={fieldClassName} required value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </FormField>
        </div>
        <FormField icon={KeyRound} label={t('contractorUsers.username')} htmlFor="portal-username">
          <input
            id="portal-username"
            className={`${fieldClassName} digit-field`}
            required
            value={username}
            autoComplete="off"
            onFocus={(event) => preferEnglishKeyboard(event.currentTarget)}
            onChange={(event) => setUsername(sanitizeUsername(event.target.value))}
          />
        </FormField>
        <FormField icon={KeyRound} label={t('contractorUsers.password')} htmlFor="portal-password">
          <input
            id="portal-password"
            type="password"
            className={fieldClassName}
            required={!initial}
            minLength={initial ? undefined : 8}
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {initial ? <p className="text-xs text-ink-500">{t('contractorUsers.passwordOptional')}</p> : null}
        </FormField>
        <FormField icon={Phone} label={t('contractorUsers.phone')} htmlFor="portal-phone">
          <input
            id="portal-phone"
            className={`${fieldClassName} digit-field`}
            inputMode="numeric"
            value={phone}
            onChange={(event) => setPhone(toLatinDigits(event.target.value))}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('contractorUsers.status')} htmlFor="portal-status">
            <ToggleField
              id="portal-status"
              checked={status === userStatuses.ACTIVE}
              onChange={(active) => setStatus(active ? userStatuses.ACTIVE : userStatuses.INACTIVE)}
              onLabel={t('userStatuses.ACTIVE')}
              offLabel={t('userStatuses.INACTIVE')}
            />
          </FormField>
        ) : null}
        <FormActions
          submitLabel={t('contractorUsers.save')}
          cancelLabel={t('common.cancel')}
          submitting={saving}
          onCancel={() => {
            if (projectId && contractorId) navigate(contractorUsersPath(projectId, contractorId))
          }}
        />
      </AppForm>
    </FormCard>
  )
}

export function ContractorPortalUserCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, contractorId, contractor } = useContractorContext()
  if (!contractor || !projectId || !contractorId) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={KeyRound}
        title={t('contractorUsers.create')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={KeyRound} />}
      />
      <PortalUserForm
        onSubmit={async (payload) => {
          await api.post(`/projects/${projectId}/contractors/${contractorId}/users`, payload)
          toast.success(t('contractorUsers.created'))
          navigate(contractorUsersPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorPortalUserEditPage() {
  const { t } = useTranslation()
  const { userId } = useParams()
  const navigate = useNavigate()
  const { projectId, contractorId, contractor } = useContractorContext()
  const query = useQuery({
    queryKey: ['contractor-user', projectId, contractorId, userId],
    enabled: Boolean(projectId && contractorId && userId),
    queryFn: async () => {
      const { data } = await api.get<PortalUser>(`/projects/${projectId}/contractors/${contractorId}/users/${userId}`)
      return data
    },
  })
  if (!query.data || !projectId || !contractorId || !contractor) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={KeyRound}
        title={t('contractorUsers.edit')}
        subtitle={<EntityNameSubtitle name={query.data.fullName} icon={UserRound} />}
      />
      <PortalUserForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/projects/${projectId}/contractors/${contractorId}/users/${userId}`, payload)
          toast.success(t('contractorUsers.updated'))
          navigate(contractorUsersPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorPortalUserDetailPage() {
  const { t } = useTranslation()
  const { userId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId, contractorId, contractor } = useContractorContext()
  const query = useQuery({
    queryKey: ['contractor-user', projectId, contractorId, userId],
    enabled: Boolean(projectId && contractorId && userId),
    queryFn: async () => {
      const { data } = await api.get<PortalUser>(`/projects/${projectId}/contractors/${contractorId}/users/${userId}`)
      return data
    },
  })
  if (!query.data || !projectId || !contractorId || !contractor || !userId) return <LoadingState />
  const user = query.data
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={KeyRound}
        title={t('contractorUsers.details')}
        subtitle={<EntityNameSubtitle name={user.fullName} icon={UserRound} />}
      />
      <FormCard icon={KeyRound} title={user.fullName}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={KeyRound}>{t('contractorUsers.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={UserRound} label={t('contractorUsers.firstName')} value={user.firstName} tone="teal" />
            <FormFactTile icon={UserRound} label={t('contractorUsers.lastName')} value={user.lastName} tone="mint" />
            <FormFactTile icon={KeyRound} label={t('contractorUsers.username')} value={user.username} tone="ink" />
            <FormFactTile icon={Phone} label={t('contractorUsers.phone')} copyValue={user.phone} />
            <FormFactTile icon={ToggleRight} label={t('contractorUsers.status')} value={t(`userStatuses.${user.status}`)} tone="mint" />
          </div>
          <DetailActions
            editTo={`${contractorUsersPath(projectId, contractorId)}/${userId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('contractorUsers.confirmDelete'),
                successMessage: t('contractorUsers.deleted'),
                path: `/projects/${projectId}/contractors/${contractorId}/users/${userId}`,
                queryKey: ['contractor-users'],
                onDeleted: () => navigate(contractorUsersPath(projectId, contractorId)),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
