import { Layers, Palette, ScrollText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import { DEFAULT_PROJECT_COLOR, PROJECT_COLOR_SWATCHES, projectColor } from '../../../lib/project-color'
import type { ProjectGroup } from '../../../types/app'

export type ProjectGroupPayload = {
  name: string
  description: string | null
  color: string
}

export function ProjectGroupForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<ProjectGroup, 'name' | 'description' | 'color'>
  onSubmit: (payload: ProjectGroupPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(projectColor(initial?.color ?? DEFAULT_PROJECT_COLOR))
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        color,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Layers}
      title={initial ? initial.name || t('projectGroups.edit') : t('projectGroups.create')}
      subtitle={initial ? undefined : t('projectGroups.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('projectGroups.name')} htmlFor="projectGroupName">
          <input
            id="projectGroupName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('projectGroups.description')} htmlFor="projectGroupDescription">
          <textarea
            id="projectGroupDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormField icon={Palette} label={t('projectGroups.color')} htmlFor="projectGroupColor">
          <p className="mb-2 text-xs leading-6 text-ink-500">{t('projectGroups.colorHint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {PROJECT_COLOR_SWATCHES.map((swatch) => {
              const selected = color === swatch
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-pressed={selected}
                  aria-label={swatch}
                  className={`size-8 cursor-pointer rounded-full border-2 transition ${
                    selected
                      ? 'border-ink-800 shadow-[0_0_0_3px_rgba(46,189,182,0.28)]'
                      : 'border-white shadow-[0_2px_8px_rgba(20,40,40,0.12)] hover:scale-105'
                  }`}
                  style={{ background: swatch }}
                  onClick={() => setColor(swatch)}
                />
              )
            })}
            <label
              className="relative inline-flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-teal-400 bg-white text-[10px] font-bold text-teal-700 shadow-[0_2px_8px_rgba(46,189,182,0.16)]"
              title={t('projectGroups.pickColor')}
            >
              <span aria-hidden>+</span>
              <input
                id="projectGroupColor"
                type="color"
                value={color}
                aria-label={t('projectGroups.pickColor')}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => setColor(projectColor(e.target.value))}
              />
            </label>
          </div>
        </FormField>
        <FormActions
          submitLabel={t('projectGroups.save')}
          cancelLabel={t('projectGroups.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
