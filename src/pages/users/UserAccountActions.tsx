import { KeyRound, MessageSquare, Phone, X } from 'lucide-react'
import { type FormEvent, useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  fieldClassName,
  type DetailActionExtraItem,
} from '../../components/ui/Form'
import { formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'

const MAX_USER_SMS_LENGTH = 700

type SmsSendResult = {
  skipped?: boolean
  message?: string
}

type PasswordChangeResult = {
  ok: true
  sms?: SmsSendResult
}

type SendSmsResult = {
  ok: true
  sms?: SmsSendResult
}

export type UserAccountTarget = {
  id: string
  phone?: string | null
}

function toastSmsResult(sms: SmsSendResult | undefined, pendingLabel: string) {
  if (sms?.skipped) {
    toast.info(sms.message || pendingLabel)
  }
}

function UserActionModal({
  open,
  title,
  icon: Icon,
  children,
  onClose,
}: {
  open: boolean
  title: string
  icon: typeof KeyRound
  children: ReactNode
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[10vh]"
      data-nested-dialog
      data-enter-ignore
      role="presentation"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(88vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="pointer-events-none absolute -start-8 -top-10 size-32 rounded-full bg-teal-200/30" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 id={titleId} className="text-sm font-semibold text-ink-900">
                {title}
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
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

export function UserChangePasswordModal({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: UserAccountTarget
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [sendSms, setSendSms] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasPhone = Boolean(user.phone?.trim())

  useEffect(() => {
    if (!open) return
    setPassword('')
    setSendSms(false)
    setSaving(false)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) {
      toast.error(t('users.passwordMin'))
      return
    }
    if (sendSms && !hasPhone) {
      toast.error(t('users.smsNoPhone'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<PasswordChangeResult>(`/users/${user.id}/password`, {
        password,
        sendSms,
      })
      if (sendSms && !data.sms?.skipped) {
        toast.success(t('users.passwordUpdatedAndSms'))
      } else {
        toast.success(t('auth.passwordUpdated'))
        toastSmsResult(data.sms, t('users.smsProviderPending'))
      }
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <UserActionModal open={open} title={t('users.changePassword')} icon={KeyRound} onClose={onClose}>
      <AppForm onSubmit={onSubmit} className={formCardBodyClassName}>
        <FormField icon={KeyRound} label={t('auth.newPassword')} htmlFor="user-new-password">
          <input
            id="user-new-password"
            type="password"
            className={fieldClassName}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>
        <CheckboxField
          id="user-send-password-sms"
          checked={sendSms}
          disabled={!hasPhone}
          label={
            hasPhone
              ? t('users.sendPasswordSms')
              : `${t('users.sendPasswordSms')} — ${t('users.smsNoPhone')}`
          }
          onChange={setSendSms}
        />
        {hasPhone ? <p className="text-xs text-ink-500">{t('users.smsPhoneHint')}</p> : null}
        <FormActions
          submitLabel={t('users.changePassword')}
          cancelLabel={t('common.cancel')}
          submitting={saving}
          onCancel={onClose}
          headerIcons={false}
        />
      </AppForm>
    </UserActionModal>
  )
}

export function UserSendSmsModal({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: UserAccountTarget
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const hasPhone = Boolean(user.phone?.trim())

  useEffect(() => {
    if (!open) return
    setBody('')
    setSaving(false)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hasPhone) {
      toast.error(t('users.smsNoPhone'))
      return
    }
    if (!body.trim()) {
      toast.error(t('users.smsBody'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<SendSmsResult>(`/users/${user.id}/sms`, { body: body.trim() })
      if (data.sms?.skipped) {
        toastSmsResult(data.sms, t('users.smsProviderPending'))
      } else {
        toast.success(t('users.smsSent'))
      }
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <UserActionModal open={open} title={t('users.sendSms')} icon={MessageSquare} onClose={onClose}>
      <AppForm onSubmit={onSubmit} className={formCardBodyClassName}>
        <FormField icon={Phone} label={t('users.phone')} htmlFor="user-sms-phone">
          <div id="user-sms-phone" className={`${fieldClassName} flex items-center`}>
            {hasPhone ? <CopyableDigits value={user.phone} /> : t('users.smsNoPhone')}
          </div>
        </FormField>
        <FormField icon={MessageSquare} label={t('users.smsBody')} htmlFor="user-sms-body">
          <textarea
            id="user-sms-body"
            className={fieldClassName}
            rows={5}
            value={body}
            maxLength={MAX_USER_SMS_LENGTH}
            placeholder={t('users.smsBodyPlaceholder')}
            required
            disabled={!hasPhone}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-xs text-ink-500">
            {t('users.smsCharCount', { count: formatNumber(body.length, locale) })}
          </p>
        </FormField>
        <FormActions
          submitLabel={t('users.smsSend')}
          cancelLabel={t('common.cancel')}
          submitting={saving || !hasPhone}
          onCancel={onClose}
          headerIcons={false}
        />
      </AppForm>
    </UserActionModal>
  )
}

export function useUserAccountActions(user: UserAccountTarget | null) {
  const { t } = useTranslation()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [smsOpen, setSmsOpen] = useState(false)

  const extraItems: DetailActionExtraItem[] = user
    ? [
        {
          icon: KeyRound,
          label: t('users.changePassword'),
          onClick: () => setPasswordOpen(true),
        },
        {
          icon: MessageSquare,
          label: t('users.sendSms'),
          onClick: () => setSmsOpen(true),
        },
      ]
    : []

  const buttons = user ? (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="soft" onClick={() => setPasswordOpen(true)}>
        <KeyRound className="size-4" aria-hidden />
        {t('users.changePassword')}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setSmsOpen(true)}>
        <MessageSquare className="size-4" aria-hidden />
        {t('users.sendSms')}
      </Button>
    </div>
  ) : null

  const dialogs = user ? (
    <>
      <UserChangePasswordModal open={passwordOpen} user={user} onClose={() => setPasswordOpen(false)} />
      <UserSendSmsModal open={smsOpen} user={user} onClose={() => setSmsOpen(false)} />
    </>
  ) : null

  return { extraItems, buttons, dialogs }
}
