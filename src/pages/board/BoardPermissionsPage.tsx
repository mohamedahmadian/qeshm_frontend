import { Briefcase, Building2, Gavel, Scale, Shield, Stamp, Wallet, type LucideIcon } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '../../auth/AuthProvider'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { AppForm, FormActions, FormField, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { isAdmin } from '../../lib/roles'
import type { BoardStagePermission, OrganizationPosition, OrganizationUnit } from '../../types/app'

const reviewStages = ['MANAGEMENT', 'LEGAL', 'BUDGET', 'SECRETARY'] as const
type ReviewStage = (typeof reviewStages)[number]

const stageIcons: Record<ReviewStage, LucideIcon> = {
  MANAGEMENT: Stamp,
  LEGAL: Scale,
  BUDGET: Wallet,
  SECRETARY: Gavel,
}

export function BoardPermissionsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const editable = isAdmin(user)
  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const positions = useQuery({
    queryKey: ['organization-positions', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationPosition[]>('/organization/positions')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['board-permissions'],
    queryFn: async () => {
      const { data } = await api.get<BoardStagePermission[]>('/board/permissions')
      return data
    },
  })
  const [selected, setSelected] = useState<Record<string, { unitIds: string[]; positionIds: string[] }>>({})
  const [tab, setTab] = useState<ReviewStage>('MANAGEMENT')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!query.data) return
    const next: Record<string, { unitIds: string[]; positionIds: string[] }> = {}
    for (const row of query.data) {
      next[row.stage] = {
        unitIds: row.units.map((item) => item.id),
        positionIds: row.positions.map((item) => item.id),
      }
    }
    setSelected(next)
  }, [query.data])

  function toggle(stage: string, key: 'unitIds' | 'positionIds', id: string, checked: boolean) {
    setSelected((current) => {
      const row = current[stage] ?? { unitIds: [], positionIds: [] }
      const list = new Set(row[key])
      if (checked) list.add(id)
      else list.delete(id)
      return { ...current, [stage]: { ...row, [key]: [...list] } }
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!editable) return
    setSaving(true)
    try {
      await api.put('/board/permissions', {
        stages: reviewStages.map((stage) => ({
          stage,
          unitIds: selected[stage]?.unitIds ?? [],
          positionIds: selected[stage]?.positionIds ?? [],
        })),
      })
      toast.success(t('boardPermissions.saved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading || units.isLoading || positions.isLoading) return <LoadingState />

  return (
    <div className={formShellClassName}>
      <PageHeader icon={Shield} title={t('menus.boardPermissions')} subtitle={t('boardPermissions.subtitle')} />
      <FormCard icon={Shield} title={t('boardPermissions.title')} subtitle={editable ? undefined : t('boardPermissions.readOnly')}>
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
          {reviewStages.map((stage) => {
            const Icon = stageIcons[stage]
            const active = tab === stage
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setTab(stage)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(`board.stages.${stage}`)}
              </button>
            )
          })}
        </nav>
        <AppForm onSubmit={submit} className={formCardBodyClassName} autoFocusFirst={false}>
          {reviewStages.map((stage) => {
            const row = selected[stage] ?? { unitIds: [], positionIds: [] }
            return (
              <div key={stage} className={`space-y-3 ${tab === stage ? '' : 'hidden'}`}>
                <FormField icon={Building2} label={t('boardPermissions.units')}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(units.data ?? []).length ? (
                      (units.data ?? []).map((unit) => (
                        <CheckboxField
                          key={unit.id}
                          label={unit.pathLabel || unit.name}
                          checked={row.unitIds.includes(unit.id)}
                          onChange={(checked) => toggle(stage, 'unitIds', unit.id, checked)}
                          disabled={!editable}
                        />
                      ))
                    ) : (
                      <FormEmptyHint>{t('boardPermissions.emptyUnits')}</FormEmptyHint>
                    )}
                  </div>
                </FormField>
                <FormField icon={Briefcase} label={t('boardPermissions.positions')}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(positions.data ?? []).length ? (
                      (positions.data ?? []).map((position) => (
                        <CheckboxField
                          key={position.id}
                          label={position.name}
                          checked={row.positionIds.includes(position.id)}
                          onChange={(checked) => toggle(stage, 'positionIds', position.id, checked)}
                          disabled={!editable}
                        />
                      ))
                    ) : (
                      <FormEmptyHint>{t('boardPermissions.emptyPositions')}</FormEmptyHint>
                    )}
                  </div>
                </FormField>
              </div>
            )
          })}
          {editable ? (
            <FormActions submitLabel={t('boardPermissions.save')} submitting={saving} headerIcons={false} />
          ) : null}
        </AppForm>
      </FormCard>
    </div>
  )
}
