import { ArrowRight, Check, type LucideIcon, Pencil, Trash2, X } from 'lucide-react'
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { CopyableDigits } from './CopyableDigits'
import { useNavigationHistory } from '../../lib/navigation-history'

const variants = {
  primary:
    'bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60 shadow-sm',
  soft: 'bg-mint-500 text-white hover:bg-mint-600 disabled:opacity-60 shadow-sm',
  ghost:
    'cursor-pointer bg-white text-ink-700 hover:bg-teal-50 border border-teal-400 shadow-[0_4px_12px_rgba(46,189,182,0.16)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60',
}

export const cardClassName =
  'rounded-[22px] border border-white bg-white shadow-[0_10px_30px_rgba(20,40,40,0.05)]'

export const formShellClassName = 'mx-auto w-full max-w-2xl'
export const userFormShellClassName = 'mx-auto w-full max-w-3xl'
export const listShellClassName = 'mx-auto w-full min-w-0 max-w-6xl'

export function Button({
  variant = 'primary',
  icon,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  icon?: boolean
  children: ReactNode
}) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-medium transition ${
        icon ? 'size-9 p-0' : 'px-[0.9rem] py-2.5'
      } ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function FormField({
  icon: Icon,
  label,
  htmlFor,
  error,
  children,
}: {
  icon: LucideIcon
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-ink-900"
      >
        <Icon className="size-4 text-teal-600" aria-hidden />
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

export const fieldClassName =
  'w-full rounded-2xl border border-line bg-cream-50 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400'

export const fieldErrorClassName =
  '!border-red-300 !bg-red-50/70 focus:!border-red-400 focus:!outline-none focus:!ring-2 focus:!ring-red-200/70'

export function inputClassName(error?: boolean) {
  return error ? `${fieldClassName} ${fieldErrorClassName}` : fieldClassName
}

export function ToggleField({
  id,
  checked,
  onChange,
  onLabel,
  offLabel,
  disabled,
}: {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  onLabel: string
  offLabel: string
  disabled?: boolean
}) {
  const segmentClass = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-teal-500 text-white shadow-sm' : 'text-ink-600 hover:bg-white'
    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`

  return (
    <div
      id={id}
      data-toggle
      role="group"
      className="inline-flex rounded-2xl border border-line bg-cream-50 p-1"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        className={segmentClass(checked)}
        onClick={() => onChange(true)}
      >
        {onLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!checked}
        className={segmentClass(!checked)}
        onClick={() => onChange(false)}
      >
        {offLabel}
      </button>
    </div>
  )
}

const PAGE_BACK_LEAVES = new Set([
  'new',
  'edit',
  'card',
  'sms',
  'password',
  'import',
  'pilgrimage-history',
  'location',
  'history',
])

const PAGE_BACK_NESTED_LISTS = new Set(['items', 'vouchers', 'phones', 'distribute'])

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function looksLikeId(segment: string) {
  return UUID_SEGMENT.test(segment)
}

function joinPath(segments: string[]) {
  return `/${segments.join('/')}`
}

/** مسیر مرحلهٔ قبل یا فهرست والد از روی URL فعلی */
function resolvePageBackTo(pathname: string): string | undefined {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (segments.length === 0 || segments[0] === 'v') return undefined

  const last = segments[segments.length - 1]
  if (PAGE_BACK_LEAVES.has(last)) {
    return segments.length > 1 ? joinPath(segments.slice(0, -1)) : undefined
  }
  if (
    PAGE_BACK_NESTED_LISTS.has(last) &&
    segments.length >= 2 &&
    looksLikeId(segments[segments.length - 2])
  ) {
    return joinPath(segments.slice(0, -1))
  }
  if (looksLikeId(last) && segments.length > 1) {
    return joinPath(segments.slice(0, -1))
  }
  return undefined
}

export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
  className = 'mb-6',
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  /** مسیر بازگشت اگر تاریخچه خالی باشد. `false` آیکون را مخفی می‌کند. */
  backTo?: string | false
  className?: string
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { goBack } = useNavigationHistory()
  const fallback = backTo === false ? undefined : backTo ?? resolvePageBackTo(pathname)
  const showBack = Boolean(fallback)

  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              type="button"
              aria-label={t('common.back')}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 print:hidden"
              onClick={() => goBack(fallback)}
            >
              <ArrowRight className="size-5 ltr:rotate-180" aria-hidden />
            </button>
          ) : null}
          <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
        </div>
        {subtitle ? (
          <div className={`mt-1 max-w-2xl text-sm text-ink-500 ${showBack ? 'ps-11' : ''}`}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** نام موجودیت زیر عنوان در صفحات ویرایش و جزئیات */
export function EntityNameSubtitle({
  name,
  icon: Icon,
  copyValue,
  label,
}: {
  name: string
  icon: LucideIcon
  copyValue?: string | null
  label?: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">
        {label ? <span>{label} : </span> : null}
        {copyValue ? <CopyableDigits value={copyValue} /> : name}
      </span>
    </span>
  )
}

function submitIfValid(form: HTMLFormElement) {
  if (form.noValidate || form.checkValidity()) {
    form.requestSubmit()
    return
  }
  form.querySelector<HTMLElement>(':invalid')?.focus()
}

function isCreateFormPath(pathname: string) {
  return /\/new\/?$/.test(pathname)
}

function isVisibleFocusableField(el: HTMLElement) {
  if (el.closest('[hidden], [aria-hidden="true"]')) return false
  if (el.closest('.hidden')) return false
  if (!el.getClientRects().length) return false

  if (el instanceof HTMLInputElement) {
    if (el.disabled || el.readOnly) return false
    if (el.tabIndex < 0) return false
    if (
      el.type === 'hidden' ||
      el.type === 'submit' ||
      el.type === 'button' ||
      el.type === 'reset' ||
      el.type === 'file' ||
      el.type === 'checkbox' ||
      el.type === 'radio'
    ) {
      return false
    }
    return true
  }

  if (el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly && el.tabIndex >= 0
  }

  if (el instanceof HTMLSelectElement) {
    return !el.disabled && el.tabIndex >= 0
  }

  if (el instanceof HTMLButtonElement) {
    if (el.disabled || el.tabIndex < 0) return false
    if (el.type === 'submit' || el.type === 'reset') return false
    if (el.dataset.formCancel != null || el.closest('[data-form-cancel]')) return false
    if (el.closest('[data-toggle]')) return false
    return true
  }

  return false
}

function focusFirstFormField(form: HTMLFormElement) {
  const candidates = form.querySelectorAll<HTMLElement>('input, textarea, select, button')
  for (const el of candidates) {
    if (!isVisibleFocusableField(el)) continue
    el.focus()
    return
  }
}

const FORM_ENTER_DOUBLE_MS = 500
let pendingEnterTimer: ReturnType<typeof setTimeout> | null = null

export function cancelPendingFormEnter() {
  if (pendingEnterTimer != null) {
    clearTimeout(pendingEnterTimer)
    pendingEnterTimer = null
  }
}

function shouldDelayFormEnter(form: HTMLFormElement) {
  if (form.dataset.enterImmediate != null) return false
  return Boolean(document.querySelector('[data-quick-tools]'))
}

export function handleFormEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('textarea')) return
  if (target.closest('[data-enter-ignore]')) return
  if (target instanceof HTMLSelectElement) return

  const button = target instanceof HTMLButtonElement ? target : target.closest('button')
  if (button instanceof HTMLButtonElement) {
    if (button.type === 'submit') return
    if (button.dataset.formCancel != null || button.closest('[data-form-cancel]')) return
  }

  event.preventDefault()
  const form = event.currentTarget
  if (shouldDelayFormEnter(form) && (form.noValidate || form.checkValidity())) {
    cancelPendingFormEnter()
    pendingEnterTimer = setTimeout(() => {
      pendingEnterTimer = null
      if (!form.isConnected) return
      submitIfValid(form)
    }, FORM_ENTER_DOUBLE_MS)
    return
  }
  submitIfValid(form)
}

export function AppForm({
  onKeyDown,
  onSubmit,
  children,
  autoFocusFirst,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  /** Focus the first field on mount. Defaults to true on `/…/new` create routes. */
  autoFocusFirst?: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const location = useLocation()
  const shouldFocus = autoFocusFirst ?? isCreateFormPath(location.pathname)

  useEffect(() => {
    if (!shouldFocus) return
    const form = formRef.current
    if (!form) return
    const frame = requestAnimationFrame(() => focusFirstFormField(form))
    return () => cancelAnimationFrame(frame)
  }, [shouldFocus, location.pathname])

  return (
    <form
      {...props}
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(event)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        handleFormEnter(event)
      }}
    >
      {children}
    </form>
  )
}

export function FormActions({
  submitLabel,
  cancelLabel,
  submitting,
  onCancel,
  className = '',
}: {
  submitLabel: string
  cancelLabel?: string
  submitting?: boolean
  onCancel?: () => void
  className?: string
}) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`.trim()}>
      <Button type="submit" disabled={submitting}>
        <Check className="size-4" aria-hidden />
        {submitLabel}
      </Button>
      {onCancel && cancelLabel ? (
        <Button type="button" variant="ghost" data-form-cancel="" onClick={onCancel}>
          <X className="size-4" aria-hidden />
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function DetailActions({
  editTo,
  editLabel,
  deleteLabel,
  onDelete,
  extra,
  className = 'mt-6',
}: {
  editTo: string
  editLabel: string
  deleteLabel?: string
  onDelete?: () => void
  extra?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${extra ? 'justify-between' : ''} ${className}`}
    >
      <div className="flex flex-wrap gap-3">
        <Link to={editTo}>
          <Button type="button">
            <Pencil className="size-4" aria-hidden />
            {editLabel}
          </Button>
        </Link>
        {onDelete && deleteLabel ? (
          <Button type="button" variant="danger" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            {deleteLabel}
          </Button>
        ) : null}
      </div>
      {extra ? <div className="flex flex-wrap gap-3">{extra}</div> : null}
    </div>
  )
}

export { LoadingState } from './LoadingState'
