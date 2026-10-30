import { FolderKanban, Handshake, Phone, Tags, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AppForm,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import type { ContractorType, Project, ProjectContractor } from '../../types/app'

export function ContractorQuickCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (contractor: { id: string; name: string }) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const projects = useQuery({
    queryKey: ['projects', 'lookup'],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<Project[] | { items: Project[] }>('/projects')
      return Array.isArray(data) ? data : data.items
    },
  })
  const types = useQuery({
    queryKey: ['contractor-types', 'lookup'],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<ContractorType[] | { items: ContractorType[] }>('/contractor-types')
      return Array.isArray(data) ? data : data.items
    },
  })

  useEffect(() => {
    if (!open) return
    setName('')
    setTypeId('')
    setProjectId('')
    setPhone('')
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, open])

  async function submit() {
    if (name.trim().length < 2) {
      toast.error(t('boardResolutions.contractorNameRequired'))
      return
    }
    if (!typeId) {
      toast.error(t('contractors.typeRequired'))
      return
    }
    if (!projectId) {
      toast.error(t('contractors.projectRequired'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<ProjectContractor>('/contractors', {
        name: name.trim(),
        typeId,
        projectId,
        phone: phone.trim() || null,
      })
      toast.success(t('contractors.created'))
      onCreated({ id: data.id, name: data.name })
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="contractor-quick-create-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Handshake className="size-5" aria-hidden />
              </span>
              <h2 id="contractor-quick-create-title" className="text-sm font-semibold text-ink-900">
                {t('boardResolutions.contractorModalTitle')}
              </h2>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>
          </div>
        </header>
        <AppForm onSubmit={() => void submit()} className="space-y-4 p-5 sm:p-6">
          <FormField icon={Handshake} label={t('contractors.name')} htmlFor="quick-contractor-name">
            <input
              id="quick-contractor-name"
              required
              minLength={2}
              className={fieldClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField icon={Tags} label={t('contractors.type')} htmlFor="quick-contractor-type">
            <SearchSelect
              id="quick-contractor-type"
              value={typeId}
              onChange={setTypeId}
              required
              placeholder={t('contractors.selectType')}
              options={(types.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
          </FormField>
          <FormField icon={FolderKanban} label={t('contractors.project')} htmlFor="quick-contractor-project">
            <SearchSelect
              id="quick-contractor-project"
              value={projectId}
              onChange={setProjectId}
              required
              placeholder={t('contractors.selectProject')}
              options={(projects.data ?? []).map((item) => ({ value: item.id, label: item.systemName }))}
            />
          </FormField>
          <FormField icon={Phone} label={t('contractors.phone')} htmlFor="quick-contractor-phone">
            <input
              id="quick-contractor-phone"
              className={`${fieldClassName} digit-field`}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
            />
          </FormField>
          <FormActions
            submitLabel={t('contractors.create')}
            cancelLabel={t('common.cancel')}
            onCancel={onClose}
            submitting={saving}
            headerIcons={false}
          />
        </AppForm>
      </section>
    </div>,
    document.body,
  )
}
