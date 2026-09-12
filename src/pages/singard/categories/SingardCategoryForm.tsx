import { FolderTree, Hash, Network, ScrollText, Type } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import type { SingardCategory } from '../../../types/app'

export type SingardCategoryPayload = {
  name: string
  description: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
}

function collectIds(node: SingardCategory, acc: Set<string>) {
  acc.add(node.id)
  node.children?.forEach((child) => collectIds(child, acc))
  return acc
}

export function SingardCategoryForm({
  initial,
  onSubmit,
}: {
  initial?: SingardCategory
  onSubmit: (payload: SingardCategoryPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [parentId, setParentId] = useState(initial?.parentId ?? '')
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [saving, setSaving] = useState(false)

  const lookup = useQuery({
    queryKey: ['singard', 'categories', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<SingardCategory[]>('/singard/categories')
      return data
    },
  })

  const blocked = useMemo(() => {
    if (!initial) return new Set<string>()
    return collectIds(initial, new Set())
  }, [initial])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        parentId: parentId || null,
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
      icon={FolderTree}
      title={initial ? initial.name : t('singardCategories.create')}
      subtitle={initial ? undefined : t('singardCategories.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('singardCategories.name')} htmlFor="sgCatName">
          <input
            id="sgCatName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('singardCategories.description')} htmlFor="sgCatDesc">
          <textarea
            id="sgCatDesc"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormField icon={Network} label={t('singardCategories.parent')} htmlFor="sgCatParent">
          <SearchSelect
            id="sgCatParent"
            value={parentId}
            onChange={setParentId}
            placeholder={t('singardCategories.parentPlaceholder')}
            options={[
              { value: '', label: t('singardCategories.noParent') },
              ...(lookup.data ?? [])
                .filter((item) => !blocked.has(item.id))
                .map((item) => ({ value: item.id, label: item.path || item.name })),
            ]}
          />
        </FormField>
        <FormField icon={Hash} label={t('singardCategories.sortOrder')} htmlFor="sgCatOrder">
          <input
            id="sgCatOrder"
            type="number"
            className={`${fieldClassName} digit-field`}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
          />
        </FormField>
        <FormField icon={FolderTree} label={t('geo.isActive')}>
          <ToggleField
            checked={isActive}
            onChange={setIsActive}
            onLabel={t('geo.active')}
            offLabel={t('geo.inactive')}
          />
        </FormField>
        <FormActions
          submitLabel={t('singardCategories.save')}
          cancelLabel={t('singardCategories.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
