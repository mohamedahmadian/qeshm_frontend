import { Hash, KeyRound, ListOrdered, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormCard, FormSectionTitle } from '../../components/ui/FormLayout'
import { apiBaseUrl } from '../../lib/api'

const sampleClassName =
  'overflow-x-auto rounded-2xl bg-cream-50 px-4 py-3 text-left font-mono text-xs leading-6 text-ink-800 ring-1 ring-line'

function Sample({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <pre dir="ltr" className={sampleClassName}>
        {value}
      </pre>
    </div>
  )
}

function MethodLine({ method, path }: { method: 'GET' | 'POST'; path: string }) {
  return (
    <p dir="ltr" className="flex flex-wrap items-center gap-2 text-left font-mono text-sm text-ink-800">
      <span
        className={`rounded-lg px-2 py-0.5 text-xs font-semibold text-white ${
          method === 'POST' ? 'bg-teal-500' : 'bg-mint-500'
        }`}
      >
        {method}
      </span>
      <span>{path}</span>
    </p>
  )
}

export function QeshmondiSyncServicesTab() {
  const { t } = useTranslation()
  const base = apiBaseUrl.replace(/\/+$/, '')
  const steps = ['stepToken', 'stepFull', 'stepSave', 'stepChanges', 'stepIdle'] as const

  return (
    <FormCard
      icon={RefreshCw}
      title={t('qeshmondiInquiry.services.title')}
      subtitle={t('qeshmondiInquiry.services.subtitle')}
      onDoubleClick={() => undefined}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <p className="text-sm leading-7 text-ink-700">{t('qeshmondiInquiry.services.intro')}</p>

        <section className="space-y-3">
          <FormSectionTitle icon={KeyRound}>{t('qeshmondiInquiry.services.authTitle')}</FormSectionTitle>
          <p className="text-sm leading-7 text-ink-600">{t('qeshmondiInquiry.services.authBody')}</p>
          <MethodLine method="POST" path={`${base}/cooperative/auth/token`} />
          <Sample
            label={t('qeshmondiInquiry.services.request')}
            value={`{
  "username": "taavoni-user",
  "password": "password"
}`}
          />
          <Sample
            label={t('qeshmondiInquiry.services.response')}
            value={`{
  "tokenType": "Bearer",
  "token": "<jwt>",
  "expiresIn": 86400,
  "port": {
    "id": "<port-id>",
    "name": "بندر",
    "cooperativeName": "تعاونی"
  }
}`}
          />
          <FormSectionTitle icon={KeyRound} className="mb-2 mt-4">
            {t('qeshmondiInquiry.services.securityTitle')}
          </FormSectionTitle>
          <p className="text-sm leading-7 text-ink-600">{t('qeshmondiInquiry.services.securityBody')}</p>
          <Sample
            label={t('qeshmondiInquiry.services.request')}
            value={`Authorization: Bearer <jwt>
X-Port-Security-Token: <port-security-token>`}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle icon={Hash}>{t('qeshmondiInquiry.services.statusTitle')}</FormSectionTitle>
          <p className="text-sm leading-7 text-ink-600">{t('qeshmondiInquiry.services.statusBody')}</p>
          <MethodLine method="GET" path={`${base}/cooperative/qeshmondi/sync/status`} />
          <Sample
            label={t('qeshmondiInquiry.services.response')}
            value={`{ "latest": 15230 }`}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle icon={RefreshCw}>{t('qeshmondiInquiry.services.fullTitle')}</FormSectionTitle>
          <p className="text-sm leading-7 text-ink-600">{t('qeshmondiInquiry.services.fullBody')}</p>
          <MethodLine method="GET" path={`${base}/cooperative/qeshmondi/sync/full?limit=500&afterId=`} />
          <Sample
            label={t('qeshmondiInquiry.services.response')}
            value={`{
  "items": [
    {
      "id": "<user-id>",
      "nationalId": "0012345678",
      "firstName": "علی",
      "lastName": "محمدی",
      "qeshmondiEndDate": "2027-03-20"
    }
  ],
  "nextAfterId": "<user-id>",
  "hasMore": true
}`}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle icon={RefreshCw}>{t('qeshmondiInquiry.services.changesTitle')}</FormSectionTitle>
          <p className="text-sm leading-7 text-ink-600">{t('qeshmondiInquiry.services.changesBody')}</p>
          <MethodLine method="GET" path={`${base}/cooperative/qeshmondi/sync/changes?from=1&to=20`} />
          <Sample
            label={t('qeshmondiInquiry.services.response')}
            value={`{
  "from": 1,
  "to": 20,
  "latest": 15230,
  "items": [
    {
      "seq": 1,
      "id": "<user-id>",
      "nationalId": "0012345678",
      "firstName": "علی",
      "lastName": "محمدی",
      "qeshmondiEndDate": "2027-03-20"
    }
  ]
}`}
          />
        </section>

        <section className="space-y-3">
          <FormSectionTitle icon={ListOrdered}>{t('qeshmondiInquiry.services.fieldsTitle')}</FormSectionTitle>
          <p className="text-sm leading-7 text-ink-600">{t('qeshmondiInquiry.services.fields')}</p>
        </section>

        <section className="space-y-3">
          <FormSectionTitle icon={ListOrdered}>{t('qeshmondiInquiry.services.orderTitle')}</FormSectionTitle>
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-7 text-ink-700">
            {steps.map((key) => (
              <li key={key}>{t(`qeshmondiInquiry.services.${key}`)}</li>
            ))}
          </ol>
        </section>
      </div>
    </FormCard>
  )
}
