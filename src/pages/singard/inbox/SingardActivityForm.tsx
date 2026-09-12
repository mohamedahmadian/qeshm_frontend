import { ClipboardList, ScrollText, Tags, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../lib/api'
import { singardActivityKinds, type SingardActivity, type SingardActivityKind } from '../../../types/app'

export type SingardActivityPayload = {
  kind: SingardActivityKind
  occurredAt: string
  title: string
  body: string | null
}

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function SingardActivityForm({
  initial,
  onSubmit,
}: {
  initial?: SingardActivity
  onSubmit: (payload: SingardActivityPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<SingardActivityKind>(initial?.kind ?? 'NOTE')
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt?.slice(0, 10) ?? todayIso())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        kind,
        occurredAt,
        title: title.trim(),
        body: body.trim() || null,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={ClipboardList}
      title={initial ? initial.title : t('singardActivities.create')}
      subtitle={initial ? undefined : t('singardActivities.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Tags} label={t('singardActivities.kind')}>
          <SearchSelect
            value={kind}
            onChange={(value) => setKind(value as SingardActivityKind)}
            options={Object.values(singardActivityKinds).map((value) => ({
              value,
              label: t(`singardActivities.kinds.${value}`),
            }))}
          />
        </FormField>
        <FormField icon={ClipboardList} label={t('singardActivities.occurredAt')}>
          <PersianDateField value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
        </FormField>
        <FormField icon={Type} label={t('singardActivities.titleField')} htmlFor="sgActTitle">
          <input
            id="sgActTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('singardActivities.body')} htmlFor="sgActBody">
          <textarea
            id="sgActBody"
            className={fieldClassName}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('singardActivities.save')}
          cancelLabel={t('singardActivities.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
