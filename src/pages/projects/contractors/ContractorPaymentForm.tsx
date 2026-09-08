import { CalendarRange, ScrollText, Wallet } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { getApiErrorMessage } from '../../../lib/api'
import { formatDate } from '../../../lib/datetime'
import type { ContractorPayment } from '../../../types/app'

export type PaymentPayload = {
  paidAt: string
  amount: number
  description: string | null
}

export function ContractorPaymentForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<ContractorPayment, 'paidAt' | 'amount' | 'description'>
  onSubmit: (payload: PaymentPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [paidAt, setPaidAt] = useState(initial?.paidAt ?? '')
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!paidAt) {
      toast.error(t('contractorPayments.dateRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        paidAt,
        amount: Number(amount),
        description: emptyToNull(description),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const title = initial
    ? `${formatDate(initial.paidAt, locale)}`
    : t('contractorPayments.create')

  return (
    <FormCard
      icon={Wallet}
      title={title}
      subtitle={initial ? undefined : t('contractorPayments.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarRange} label={t('contractorPayments.paidAt')} htmlFor="paidAt">
          <PersianDateField id="paidAt" value={paidAt} onChange={(value) => setPaidAt(value ?? '')} />
        </FormField>
        <FormField icon={Wallet} label={t('contractorPayments.amount')} htmlFor="amount">
          <input
            id="amount"
            type="number"
            min={1}
            required
            className={fieldClassName}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('contractorPayments.description')} htmlFor="paymentDescription">
          <textarea
            id="paymentDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('contractorPayments.save')}
          cancelLabel={t('contractorPayments.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}
