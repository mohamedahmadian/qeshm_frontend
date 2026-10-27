import { Eye, Hash, Image, MessageSquare, ScrollText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../../lib/api'
import { getNavIcon, inspectionKindIconKeys } from '../../../lib/icons'
import type { InspectionKind } from '../../../types/app'

export type InspectionKindPayload = {
  title: string
  description: string | null
  icon: string
  sortOrder: number
  isActive: boolean
}

export function InspectionKindForm({
  initial,
  onSubmit,
}: {
  initial?: InspectionKind
  onSubmit: (payload: InspectionKindPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'lightbulb')
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const Icon = getNavIcon(icon)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        icon,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={MessageSquare}
      title={initial ? initial.title : t('inspectionKinds.create')}
      subtitle={initial ? undefined : t('inspectionKinds.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('inspectionKinds.titleField')} htmlFor="inKindTitle">
          <input
            id="inKindTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('inspectionKinds.description')} htmlFor="inKindDesc">
          <textarea
            id="inKindDesc"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormField icon={Image} label={t('inspectionKinds.icon')} htmlFor="inKindIcon">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-mint-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.22)]">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <SearchSelect
                id="inKindIcon"
                value={icon}
                onChange={setIcon}
                placeholder={t('inspectionKinds.iconPlaceholder')}
                options={inspectionKindIconKeys.map((value) => ({
                  value,
                  label: t(`inspectionKinds.icons.${value}`),
                }))}
              />
            </div>
          </div>
        </FormField>
        <FormField icon={Hash} label={t('inspectionKinds.sortOrder')} htmlFor="inKindOrder">
          <input
            id="inKindOrder"
            type="number"
            className={`${fieldClassName} digit-field`}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
          />
        </FormField>
        <FormField icon={Eye} label={t('inspectionKinds.visibility')}>
          <ToggleField
            checked={isActive}
            onChange={setIsActive}
            onLabel={t('inspectionKinds.visible')}
            offLabel={t('inspectionKinds.hidden')}
          />
        </FormField>
        <FormActions
          submitLabel={t('inspectionKinds.save')}
          cancelLabel={t('inspectionKinds.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
