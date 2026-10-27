import { Briefcase, Hash, ImagePlus, PenLine, UserRound, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { BoardSignatory, ManagedUser } from '../../types/app'
import { boardSignatoryFullName } from './board-paths'

export type BoardSignatoryPayload = {
  firstName: string
  lastName: string
  title: string
  signatureImageId: string
  userId: string | null
  sortOrder: number
}

export function BoardSignatoryForm({
  initial,
  onSubmit,
}: {
  initial?: BoardSignatory
  onSubmit: (payload: BoardSignatoryPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [signatureImageId, setSignatureImageId] = useState(initial?.signatureImageId ?? '')
  const [userId, setUserId] = useState(initial?.userId ?? '')
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const users = useQuery({
    queryKey: ['users', 'employees', 'lookup', 'board-signatories'],
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', {
        params: { status: 'ACTIVE', employeesOnly: true },
      })
      return data
    },
  })

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const optimized = await optimizeImageFile(file)
      const body = new FormData()
      body.append('file', optimized)
      const { data } = await api.post<{ id: string }>('/images', body)
      setSignatureImageId(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  function pickUser(next: string) {
    setUserId(next)
    const user = (users.data ?? []).find((item) => item.id === next)
    if (!user) return
    if (!firstName.trim()) setFirstName(user.firstName)
    if (!lastName.trim()) setLastName(user.lastName)
    if (!title.trim() && user.position?.name) setTitle(user.position.name)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!signatureImageId) {
      toast.error(t('boardSignatories.signatureRequired'))
      return
    }
    const order = Number(toLatinDigits(sortOrder).replace(/[^\d-]/g, ''))
    setSaving(true)
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim(),
        signatureImageId,
        userId: userId || null,
        sortOrder: Number.isInteger(order) && order >= 0 ? order : 0,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={PenLine}
      title={initial ? boardSignatoryFullName(initial) : t('boardSignatories.create')}
      subtitle={initial ? undefined : t('boardSignatories.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={UserRound} label={t('boardSignatories.firstName')} htmlFor="signatoryFirstName">
            <input
              id="signatoryFirstName"
              className={fieldClassName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </FormField>
          <FormField icon={UserRound} label={t('boardSignatories.lastName')} htmlFor="signatoryLastName">
            <input
              id="signatoryLastName"
              className={fieldClassName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </FormField>
        </div>
        <FormField icon={Briefcase} label={t('boardSignatories.title')} htmlFor="signatoryTitle">
          <input
            id="signatoryTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Users} label={t('boardSignatories.user')} htmlFor="signatoryUser">
          <SearchSelect
            id="signatoryUser"
            value={userId}
            onChange={pickUser}
            placeholder={t('boardSignatories.selectUser')}
            options={[
              { value: '', label: t('boardSignatories.noUser') },
              ...(users.data ?? []).map((user) => ({
                value: user.id,
                label: user.fullName,
                keywords: [user.username, user.nationalId, user.phone].filter(Boolean).join(' '),
              })),
            ]}
          />
        </FormField>
        <FormField icon={Hash} label={t('boardSignatories.sortOrder')} htmlFor="signatorySortOrder">
          <input
            id="signatorySortOrder"
            type="number"
            min={0}
            max={9999}
            className={`${fieldClassName} digit-field`}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            dir="ltr"
          />
          <p className="text-xs text-ink-500">{t('boardSignatories.sortOrderHint')}</p>
        </FormField>
        <FormField icon={ImagePlus} label={t('boardSignatories.signature')} htmlFor="signatorySignature">
          <FileDropField
            id="signatorySignature"
            accept="image/*"
            capture="environment"
            previewUrl={signatureImageId ? getImageUrl(signatureImageId) : undefined}
            uploading={uploading}
            onFile={(file) => void uploadImage(file)}
            onClear={() => setSignatureImageId('')}
          />
        </FormField>
        <FormActions
          submitLabel={t('boardSignatories.save')}
          cancelLabel={t('boardSignatories.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
