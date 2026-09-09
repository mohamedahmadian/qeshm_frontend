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

function wrapLabel(name: string, maxChars = 10, maxLines = 2) {
  const text = name.trim()
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= 1) {
    if (text.length <= maxChars) return [text]
    const lines: string[] = []
    for (let index = 0; index < maxLines; index += 1) {
      const start = index * maxChars
      if (start >= text.length) break
      const chunk = text.slice(start, start + maxChars)
      const hasMore = text.length > (index + 1) * maxChars
      lines.push(index === maxLines - 1 && hasMore ? `${chunk.slice(0, -1)}…` : chunk)
    }
    return lines
  }
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const visible = lines.slice(0, maxLines)
  const last = visible[maxLines - 1] ?? ''
  visible[maxLines - 1] = last.length > maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`
  return visible
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
  const lines = wrapLabel(String(payload?.value ?? ''))
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={0}
          y={14 + index * 13}
          textAnchor="middle"
          fill="#334155"
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
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
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  empty?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-white to-cream-50/40 p-4">
      <FormSectionTitle icon={Icon}>{title}</FormSectionTitle>
      {empty ? <FormEmptyHint>{t('projectReports.empty')}</FormEmptyHint> : children}
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
}: {
  data: Slice[]
  locale: string
}) {
  const rows = data.filter((item) => item.value > 0)
  const total = rows.reduce((sum, item) => sum + item.value, 0)
  return (
    <div className="relative h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={86}
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
  return (
    <div className="h-96" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 28, right: 8, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={48}
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
          <Bar dataKey="value" fill={reportColors.teal} radius={[8, 8, 0, 0]} maxBarSize={42}>
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
    </div>
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
  return (
    <div className="h-96" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 36, right: 8, left: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2eeec" vertical={false} />
          <XAxis
            dataKey="label"
            interval={0}
            height={48}
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
    </div>
  )
}
