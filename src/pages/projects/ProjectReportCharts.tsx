import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { formatDate, formatGroupedNumber } from '../../lib/datetime'
import type { LucideIcon } from 'lucide-react'

export const reportColors = {
  teal: '#2ebdb6',
  mint: '#3fd6be',
  tealDark: '#148f88',
  tealDeep: '#0f766e',
  tealSoft: '#7dd8cc',
  ink: '#94a3b8',
}

export const importanceColors: Record<string, string> = {
  VERY_HIGH: reportColors.tealDeep,
  HIGH: reportColors.teal,
  MEDIUM: reportColors.mint,
  LOW: reportColors.ink,
}

const PIE_COLORS = [
  reportColors.teal,
  reportColors.mint,
  reportColors.tealDark,
  reportColors.tealSoft,
  reportColors.tealDeep,
  reportColors.ink,
]

type Slice = { name: string; value: number; color?: string }
type NamedValue = { name: string; value: number }
type NamedPair = { name: string; estimate: number; paid: number }

function shortenLabel(name: string, max = 22) {
  const text = name.trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function barPlotLayout(count: number) {
  const slot = count >= 12 ? 78 : count >= 7 ? 88 : 104
  return {
    minWidth: Math.max(count * slot, 280),
    barCategoryGap: count >= 8 ? '36%' : '28%',
  }
}

function BarCategoryTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
}) {
  const label = shortenLabel(String(payload?.value ?? ''))
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{payload?.value ?? ''}</title>
      <text
        x={0}
        y={8}
        dy={6}
        textAnchor="end"
        transform="rotate(-40)"
        fill="#334155"
        fontSize={11}
      >
        {label}
      </text>
    </g>
  )
}

function BarPlotFrame({
  count,
  children,
}: {
  count: number
  children: ReactNode
}) {
  const { minWidth } = barPlotLayout(count)
  return (
    <div className="overflow-x-auto">
      <div className="h-[26rem]" style={{ minWidth }} dir="ltr">
        {children}
      </div>
    </div>
  )
}

function tooltipStyle() {
  return {
    borderRadius: 12,
    border: '1px solid #b7ebe4',
    background: '#ffffff',
    boxShadow: '0 10px 24px rgba(20, 40, 40, 0.08)',
    fontSize: 12,
  }
}

export function formatYearMonth(isoMonth: string, locale: string) {
  const formatted = formatDate(`${isoMonth}-01`, locale)
  const parts = formatted.split('/')
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : formatted
}

export function ChartPanel({
  icon: Icon,
  title,
  children,
  empty,
  emptyLabel,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  empty?: boolean
  emptyLabel?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-white to-cream-50/40 p-4">
      <FormSectionTitle icon={Icon}>{title}</FormSectionTitle>
      {empty ? <FormEmptyHint>{emptyLabel ?? t('projectReports.empty')}</FormEmptyHint> : children}
    </div>
  )
}

function ChartTooltip({
  locale,
  label,
}: {
  locale: string
  label?: string
}) {
  return (
    <Tooltip
      formatter={(value) => formatGroupedNumber(Number(value ?? 0), locale)}
      labelFormatter={(next) => label ?? String(next ?? '')}
      contentStyle={tooltipStyle()}
    />
  )
}

export function ReportDonut({
  data,
  locale,
  compact = false,
}: {
  data: Slice[]
  locale: string
  compact?: boolean
}) {
  const rows = data.filter((item) => item.value > 0)
  const total = rows.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className={compact ? 'relative h-52' : 'relative h-64'}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={compact ? 42 : 58}
            outerRadius={compact ? 64 : 86}
            paddingAngle={3}
            stroke="#fff"
            strokeWidth={2}
          >
            {rows.map((item, index) => (
              <Cell
                key={item.name}
                fill={item.color ?? PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatGroupedNumber(Number(value ?? 0), locale)}
            contentStyle={tooltipStyle()}
          />
          <Legend
            verticalAlign="bottom"
            formatter={(value) => {
              const row = rows.find((item) => item.name === value)
              const count = formatGroupedNumber(row?.value ?? 0, locale)
              return `${value} (${count})`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[34%] text-center text-lg font-semibold text-ink-900">
        {formatGroupedNumber(total, locale)}
      </div>
    </div>
  )
}

function formatBarValue(value: unknown, locale: string) {
  return formatGroupedNumber(Number(value ?? 0), locale)
}

export function ReportBar({
  data,
  locale,
}: {
  data: NamedValue[]
  locale: string
}) {
  const rows = data.map((item) => ({
    ...item,
    label: item.name,
  }))
  const { barCategoryGap } = barPlotLayout(rows.length)
  return (
    <BarPlotFrame count={rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          barCategoryGap={barCategoryGap}
          margin={{ top: 28, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={88}
            tick={<BarCategoryTick />}
            axisLine={{ stroke: '#d7e8e5' }}
            tickLine={false}
          />
          <YAxis
            orientation="left"
            tickFormatter={(value) => formatBarValue(value, locale)}
            tick={{ fill: '#5b6b6a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <ChartTooltip locale={locale} />
          <Bar dataKey="value" fill={reportColors.teal} radius={[8, 8, 0, 0]} maxBarSize={40}>
            <LabelList
              dataKey="value"
              position="top"
              fill="#0f766e"
              fontSize={11}
              formatter={(value) => formatBarValue(value, locale)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </BarPlotFrame>
  )
}

export function ReportGroupedBar({
  data,
  locale,
  estimateLabel,
  paidLabel,
}: {
  data: NamedPair[]
  locale: string
  estimateLabel: string
  paidLabel: string
}) {
  const rows = data.map((item) => ({ ...item, label: item.name }))
  const { barCategoryGap } = barPlotLayout(rows.length)
  return (
    <BarPlotFrame count={rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          barCategoryGap={barCategoryGap}
          margin={{ top: 36, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={88}
            tick={<BarCategoryTick />}
            axisLine={{ stroke: '#d7e8e5' }}
            tickLine={false}
          />
          <YAxis
            orientation="left"
            tickFormatter={(value) => formatBarValue(value, locale)}
            tick={{ fill: '#5b6b6a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [formatBarValue(value, locale), String(name)]}
            contentStyle={tooltipStyle()}
          />
          <Legend verticalAlign="top" height={28} />
          <Bar dataKey="estimate" name={estimateLabel} fill={reportColors.tealDark} radius={[8, 8, 0, 0]} maxBarSize={28}>
            <LabelList
              dataKey="estimate"
              position="top"
              fill="#0f766e"
              fontSize={10}
              formatter={(value) => formatBarValue(value, locale)}
            />
          </Bar>
          <Bar dataKey="paid" name={paidLabel} fill={reportColors.mint} radius={[8, 8, 0, 0]} maxBarSize={28}>
            <LabelList
              dataKey="paid"
              position="top"
              fill="#148f88"
              fontSize={10}
              formatter={(value) => formatBarValue(value, locale)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </BarPlotFrame>
  )
}

type TwinRow = { name: string; left: number; right: number }

export function ReportTwinBar({
  data,
  locale,
  leftLabel,
  rightLabel,
}: {
  data: TwinRow[]
  locale: string
  leftLabel: string
  rightLabel: string
}) {
  const rows = data.map((item) => ({ ...item, label: item.name }))
  const { barCategoryGap } = barPlotLayout(rows.length)
  return (
    <BarPlotFrame count={rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          barCategoryGap={barCategoryGap}
          margin={{ top: 36, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={88}
            tick={<BarCategoryTick />}
            axisLine={{ stroke: '#d7e8e5' }}
            tickLine={false}
          />
          <YAxis
            orientation="left"
            tickFormatter={(value) => formatBarValue(value, locale)}
            tick={{ fill: '#5b6b6a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [formatBarValue(value, locale), String(name)]}
            contentStyle={tooltipStyle()}
          />
          <Legend verticalAlign="top" height={28} />
          <Bar dataKey="left" name={leftLabel} fill={reportColors.teal} radius={[8, 8, 0, 0]} maxBarSize={28}>
            <LabelList
              dataKey="left"
              position="top"
              fill="#0f766e"
              fontSize={10}
              formatter={(value) => formatBarValue(value, locale)}
            />
          </Bar>
          <Bar dataKey="right" name={rightLabel} fill={reportColors.mint} radius={[8, 8, 0, 0]} maxBarSize={28}>
            <LabelList
              dataKey="right"
              position="top"
              fill="#148f88"
              fontSize={10}
              formatter={(value) => formatBarValue(value, locale)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </BarPlotFrame>
  )
}

export function ReportHorizontalBar({
  data,
  locale,
}: {
  data: NamedValue[]
  locale: string
}) {
  const rows = data.map((item) => ({ ...item, label: shortenLabel(item.name, 18) }))
  const height = Math.max(240, rows.length * 42)
  return (
    <div className="overflow-x-auto">
      <div style={{ height }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 36, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatBarValue(value, locale)}
              tick={{ fill: '#5b6b6a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={108}
              tick={{ fill: '#334155', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip locale={locale} />
            <Bar dataKey="value" fill={reportColors.teal} radius={[0, 8, 8, 0]} maxBarSize={22}>
              <LabelList
                dataKey="value"
                position="right"
                fill="#0f766e"
                fontSize={11}
                formatter={(value) => formatBarValue(value, locale)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

type StackedRow = { name: string; overdue: number; onTrack: number; noDue: number }

export function ReportStackedBar({
  data,
  locale,
  overdueLabel,
  onTrackLabel,
  noDueLabel,
}: {
  data: StackedRow[]
  locale: string
  overdueLabel: string
  onTrackLabel: string
  noDueLabel: string
}) {
  const rows = data.map((item) => ({ ...item, label: item.name }))
  const { barCategoryGap } = barPlotLayout(rows.length)
  return (
    <BarPlotFrame count={rows.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          barCategoryGap={barCategoryGap}
          margin={{ top: 28, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={88}
            tick={<BarCategoryTick />}
            axisLine={{ stroke: '#d7e8e5' }}
            tickLine={false}
          />
          <YAxis
            orientation="left"
            tickFormatter={(value) => formatBarValue(value, locale)}
            tick={{ fill: '#5b6b6a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [formatBarValue(value, locale), String(name)]}
            contentStyle={tooltipStyle()}
          />
          <Legend verticalAlign="top" height={28} />
          <Bar dataKey="overdue" name={overdueLabel} stackId="due" fill={reportColors.tealDeep} maxBarSize={36} />
          <Bar dataKey="onTrack" name={onTrackLabel} stackId="due" fill={reportColors.mint} maxBarSize={36} />
          <Bar
            dataKey="noDue"
            name={noDueLabel}
            stackId="due"
            fill={reportColors.ink}
            radius={[8, 8, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </BarPlotFrame>
  )
}

export function ReportRadialScore({
  value,
  locale,
  label,
}: {
  value: number
  locale: string
  label: string
}) {
  const score = Math.max(0, Math.min(100, value))
  const rows = [{ name: label, value: score, fill: reportColors.teal }]
  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={rows}
          innerRadius="62%"
          outerRadius="90%"
          startAngle={210}
          endAngle={-30}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background />
          <Tooltip
            formatter={(next) => [`${formatBarValue(next, locale)}٪`, label]}
            contentStyle={tooltipStyle()}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-ink-900">
          {formatGroupedNumber(Math.round(score), locale)}٪
        </div>
        <div className="text-xs text-ink-500">{label}</div>
      </div>
    </div>
  )
}
