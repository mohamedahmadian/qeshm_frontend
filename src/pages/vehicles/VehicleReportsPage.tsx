import {
  Building2,
  Car,
  ChartColumn,
  Handshake,
  Settings2,
  Tags,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FormField, LoadingState, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchBar, TableCard } from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import {
  ChartPanel,
  ReportBar,
  ReportDonut,
  reportColors,
} from '../projects/ProjectReportCharts'
import type { OrganizationUnit, VehicleBrand, VehicleReportsOverview } from '../../types/app'
import { vehicleStatusOrder, vehicleTypeOrder } from '../../types/app'

const typeColors: Record<string, string> = {
  SEDAN: reportColors.teal,
  PICKUP: reportColors.mint,
  TRUCK: reportColors.tealDark,
  MINIBUS: reportColors.tealSoft,
  MOTORCYCLE: reportColors.tealDeep,
  OTHER: reportColors.ink,
}

const statusColors: Record<string, string> = {
  ACTIVE: reportColors.teal,
  IN_REPAIR: reportColors.mint,
  SCRAPPED: reportColors.ink,
  TRANSFERRED: reportColors.tealDark,
  MISSING: reportColors.tealDeep,
}

function count(value: number, locale: string) {
  return formatNumber(value, locale)
}

export function VehicleReportsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, term, setTerm, applySearch, searchParams, setParams } = useListParams()
  const type = searchParams.get('type') ?? ''
  const status = searchParams.get('status') ?? ''
  const organizationUnitId = searchParams.get('organizationUnitId') ?? ''
  const brandId = searchParams.get('brandId') ?? ''
  const filtersActive = Boolean(type || status || organizationUnitId || brandId)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const brands = useQuery({
    queryKey: ['vehicle-brands', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<VehicleBrand[]>('/vehicle-brands')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['vehicles', 'reports', q, type, status, organizationUnitId, brandId],
    queryFn: async () => {
      const { data } = await api.get<VehicleReportsOverview>('/vehicles/reports', {
        params: {
          ...(q ? { q } : {}),
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
          ...(organizationUnitId ? { organizationUnitId } : {}),
          ...(brandId ? { brandId } : {}),
        },
      })
      return data
    },
  })

  const report = query.data
  const kpis = report?.kpis
  const typeSlices = (report?.byType ?? []).map((item) => ({
    name: t(`vehicles.types.${item.key}`),
    value: item.count,
    color: typeColors[item.key] ?? reportColors.teal,
  }))
  const statusSlices = (report?.byStatus ?? []).map((item) => ({
    name: t(`vehicles.statuses.${item.key}`),
    value: item.count,
    color: statusColors[item.key] ?? reportColors.ink,
  }))
  const assignmentSlices = (report?.byAssignment ?? []).map((item) => ({
    name:
      item.key === 'assigned'
        ? t('vehicleReports.assigned')
        : t('vehicleReports.unassigned'),
    value: item.count,
    color: item.key === 'assigned' ? reportColors.teal : reportColors.ink,
  }))
  const assignmentTypeSlices = (report?.byAssignmentType ?? []).map((item) => ({
    name: t(`vehicleAssignments.types.${item.key}`),
    value: item.count,
    color: item.key === 'UNIT' ? reportColors.teal : reportColors.mint,
  }))

  return (
    <div className={listShellClassName}>
      <PageHeader icon={ChartColumn} title={t('menus.vehicleReports')} subtitle={t('vehicleReports.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('vehicleReports.search')}
        placeholder={t('vehicleReports.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-4"
        extra={
          <>
            <FormField icon={Tags} label={t('vehicles.brand')} htmlFor="reportVehicleBrand">
              <SearchSelect
                id="reportVehicleBrand"
                value={brandId}
                onChange={(next) => setParams({ brandId: next || undefined }, { resetPage: true })}
                placeholder={t('vehicles.filterBrand')}
                options={[
                  { value: '', label: t('vehicles.allBrands') },
                  ...(brands.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField icon={Car} label={t('vehicles.type')} htmlFor="reportVehicleType">
              <SearchSelect
                id="reportVehicleType"
                value={type}
                onChange={(next) => setParams({ type: next || undefined }, { resetPage: true })}
                placeholder={t('vehicles.filterType')}
                options={[
                  { value: '', label: t('vehicles.allTypes') },
                  ...vehicleTypeOrder.map((value) => ({
                    value,
                    label: t(`vehicles.types.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Settings2} label={t('vehicles.status')} htmlFor="reportVehicleStatus">
              <SearchSelect
                id="reportVehicleStatus"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('vehicles.filterStatus')}
                options={[
                  { value: '', label: t('vehicles.allStatuses') },
                  ...vehicleStatusOrder.map((value) => ({
                    value,
                    label: t(`vehicles.statuses.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Building2} label={t('vehicles.currentUnit')} htmlFor="reportVehicleUnit">
              <SearchSelect
                id="reportVehicleUnit"
                value={organizationUnitId}
                onChange={(next) =>
                  setParams({ organizationUnitId: next || undefined }, { resetPage: true })
                }
                placeholder={t('vehicles.filterUnit')}
                options={[
                  { value: '', label: t('vehicles.allUnits') },
                  ...(units.data ?? []).map((unit) => ({
                    value: unit.id,
                    label: unit.pathLabel || unit.name,
                  })),
                ]}
              />
            </FormField>
          </>
        }
      />

      {query.isError ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
          {t('common.error')}
        </p>
      ) : query.isLoading || !report || !kpis ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <FormCard icon={Car} title={t('vehicleReports.overview')}>
            <div className={`${formCardBodyClassName} space-y-5`}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-3">
                <FormFactTile
                  icon={Car}
                  label={t('vehicleReports.totalVehicles')}
                  value={count(kpis.totalVehicles, locale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Settings2}
                  label={t('vehicleReports.activeVehicles')}
                  value={count(kpis.activeVehicles, locale)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Wrench}
                  label={t('vehicleReports.inRepair')}
                  value={count(kpis.inRepair, locale)}
                />
                <FormFactTile
                  icon={Handshake}
                  label={t('vehicleReports.assigned')}
                  value={count(kpis.assigned, locale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Car}
                  label={t('vehicleReports.topType')}
                  value={
                    kpis.topType
                      ? `${t(`vehicles.types.${kpis.topType}`)} (${count(kpis.topTypeCount, locale)})`
                      : '—'
                  }
                  empty={!kpis.topType}
                  tone="mint"
                />
                <FormFactTile
                  icon={Car}
                  label={t('vehicleReports.topModel')}
                  value={
                    kpis.topModel
                      ? `${kpis.topModel} (${count(kpis.topModelCount, locale)})`
                      : '—'
                  }
                  empty={!kpis.topModel}
                />
                <FormFactTile
                  icon={UserRound}
                  label={t('vehicleReports.topCustodian')}
                  value={
                    kpis.topCustodian
                      ? `${kpis.topCustodian} (${count(kpis.topCustodianCount, locale)})`
                      : '—'
                  }
                  empty={!kpis.topCustodian}
                  tone="teal"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('vehicleReports.topUnit')}
                  value={
                    kpis.topUnit
                      ? `${kpis.topUnit} (${count(kpis.topUnitCount, locale)})`
                      : '—'
                  }
                  empty={!kpis.topUnit}
                  tone="mint"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
                <FormFactTile
                  icon={Handshake}
                  label={t('vehicleReports.unassigned')}
                  value={count(kpis.unassigned, locale)}
                  compact
                  tone="ink"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('vehicleReports.unitAssignments')}
                  value={count(kpis.unitAssignments, locale)}
                  compact
                />
                <FormFactTile
                  icon={UserRound}
                  label={t('vehicleReports.personAssignments')}
                  value={count(kpis.personAssignments, locale)}
                  compact
                  tone="mint"
                />
                <FormFactTile
                  icon={Settings2}
                  label={t('vehicles.statuses.MISSING')}
                  value={count(kpis.missing, locale)}
                  compact
                  tone={kpis.missing > 0 ? 'ink' : 'teal'}
                />
                <FormFactTile
                  icon={Settings2}
                  label={t('vehicles.statuses.SCRAPPED')}
                  value={count(kpis.scrapped, locale)}
                  compact
                />
                <FormFactTile
                  icon={Settings2}
                  label={t('vehicles.statuses.TRANSFERRED')}
                  value={count(kpis.transferred, locale)}
                  compact
                  tone="mint"
                />
              </div>
            </div>
          </FormCard>

          <FormCard icon={ChartColumn} title={t('vehicleReports.distributions')}>
            <div className={`${formCardBodyClassName} grid gap-4 lg:grid-cols-2`}>
              <ChartPanel
                icon={Car}
                title={t('vehicleReports.byType')}
                empty={typeSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={typeSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={Settings2}
                title={t('vehicleReports.byStatus')}
                empty={statusSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={statusSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={Handshake}
                title={t('vehicleReports.byAssignment')}
                empty={assignmentSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={assignmentSlices} locale={locale} />
              </ChartPanel>
              <ChartPanel
                icon={UserRound}
                title={t('vehicleReports.byAssignmentType')}
                empty={assignmentTypeSlices.every((item) => item.value === 0)}
              >
                <ReportDonut data={assignmentTypeSlices} locale={locale} />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={ChartColumn} title={t('vehicleReports.bars')}>
            <div className={`${formCardBodyClassName} grid gap-4 xl:grid-cols-2`}>
              <ChartPanel
                icon={Car}
                title={t('vehicleReports.byTypeBar')}
                empty={typeSlices.every((item) => item.value === 0)}
              >
                <ReportBar
                  locale={locale}
                  data={typeSlices.map((item) => ({ name: item.name, value: item.value }))}
                />
              </ChartPanel>
              <ChartPanel
                icon={Building2}
                title={t('vehicleReports.byUnit')}
                empty={report.byUnit.every((item) => item.count === 0)}
              >
                <ReportBar
                  locale={locale}
                  data={report.byUnit.map((item) => ({ name: item.name, value: item.count }))}
                />
              </ChartPanel>
              <ChartPanel
                icon={UserRound}
                title={t('vehicleReports.byPerson')}
                empty={report.byPerson.length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={report.byPerson.map((item) => ({ name: item.name, value: item.count }))}
                />
              </ChartPanel>
              <ChartPanel
                icon={Car}
                title={t('vehicleReports.byBrand')}
                empty={report.byBrand.length === 0}
              >
                <ReportBar
                  locale={locale}
                  data={report.byBrand.map((item) => ({ name: item.name, value: item.count }))}
                />
              </ChartPanel>
            </div>
          </FormCard>

          <FormCard icon={Building2} title={t('vehicleReports.unitTable')}>
            <div className={formCardBodyClassName}>
              <FormSectionTitle icon={Building2}>{t('vehicleReports.byUnit')}</FormSectionTitle>
              <TableCard
                loading={false}
                empty={t('vehicleReports.emptyUnits')}
                hasRows={report.byUnit.some((item) => item.count > 0)}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('vehicleReports.unitName')}</th>
                      <th className="px-4 py-3 text-start">{t('vehicleReports.vehicleCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byUnit.map((item) => (
                      <tr key={item.id ?? item.name} className="border-t border-line">
                        <td className="px-4 py-3">{item.name}</td>
                        <td className="px-4 py-3">{count(item.count, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}
