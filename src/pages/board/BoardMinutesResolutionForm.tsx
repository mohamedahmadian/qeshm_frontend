import { Building2, CalendarRange, FileText, ScrollText } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import type { BoardMinutesResolution, OrganizationUnit } from '../../types/app'

export type BoardResolutionPayload = {
  title: string
  description: string | null
  unitId: string
  dueDate: string | null
  notes: string | null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function BoardMinutesResolutionForm({
  initial,
  minutesTitle,
  onSubmit,
  onCancel,
}: {
  initial?: BoardMinutesResolution
  minutesTitle: string
  onSubmit: (payload: BoardResolutionPayload) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [unitId, setUnitId] = useState(initial?.unitId ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title,
        description: emptyToNull(description),
        unitId,
        dueDate: dueDate || null,
        notes: emptyToNull(notes),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={FileText}
      title={initial ? initial.title : t('boardResolutions.create')}
      subtitle={initial ? minutesTitle : t('boardResolutions.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={FileText} label={t('boardResolutions.titleField')} htmlFor="resolutionTitle">
          <input
            id="resolutionTitle"
            required
            className={fieldClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('boardResolutions.description')} htmlFor="resolutionDescription">
          <textarea
            id="resolutionDescription"
            className={`${fieldClassName} min-h-24`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
        <FormField icon={Building2} label={t('boardResolutions.unit')}>
          <SearchSelect
            value={unitId}
            onChange={setUnitId}
            required
            placeholder={t('boardResolutions.selectUnit')}
            options={(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))}
          />
        </FormField>
        <FormField icon={CalendarRange} label={t('boardResolutions.dueDate')}>
          <PersianDateField value={dueDate} onChange={(value) => setDueDate(value ?? '')} />
        </FormField>
        <FormField icon={ScrollText} label={t('boardResolutions.notes')} htmlFor="resolutionNotes">
          <textarea
            id="resolutionNotes"
            className={fieldClassName}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={initial ? t('boardResolutions.save') : t('boardResolutions.create')}
          cancelLabel={t('common.cancel')}
          onCancel={onCancel}
          submitting={saving}
        />
      </AppForm>
    </FormCard>
  )
}
