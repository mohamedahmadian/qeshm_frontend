import { Check, Clock3, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  projectProgressProcessingModes,
  type ProjectProgressProcessingMode,
} from '../../../types/app'

export function ProcessingModeField({
  value,
  onChange,
  disabled,
}: {
  value: ProjectProgressProcessingMode
  onChange: (value: ProjectProgressProcessingMode) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const options: {
    value: ProjectProgressProcessingMode
    icon: typeof Zap
  }[] = [
    { value: projectProgressProcessingModes.DEFERRED, icon: Clock3 },
    { value: projectProgressProcessingModes.IMMEDIATE, icon: Zap },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={t('projectProgress.processingMode')}
      className="grid gap-2"
    >
      {options.map((option) => {
        const selected = value === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-2xl border px-3 py-2 text-start transition ${
              selected
                ? 'border-teal-400 bg-teal-50 shadow-[0_0_0_3px_rgba(46,189,182,0.16)]'
                : 'border-teal-200 bg-white hover:border-teal-300 hover:bg-cream-50'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                  selected ? 'bg-teal-500 text-white' : 'bg-cream-50 text-teal-600'
                }`}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-800">
                    {t(`projectProgress.modes.${option.value}`)}
                  </span>
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? 'border-teal-500 bg-teal-500 text-white' : 'border-teal-300 bg-white'
                    }`}
                  >
                    {selected ? <Check className="size-3" aria-hidden /> : null}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-ink-500">
                  {t(`projectProgress.modes.${option.value}Hint`)}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
