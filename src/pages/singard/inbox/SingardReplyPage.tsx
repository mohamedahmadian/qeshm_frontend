import { Reply } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AppForm, EntityNameSubtitle, FormActions, FormField, LoadingState, PageHeader, fieldClassName, formShellClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../../lib/api'
import type { SingardFeedback } from '../../../types/app'
import { singardInboxPath } from '../singard-paths'

export function SingardReplyPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: ['singard', 'feedback', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SingardFeedback>(`/singard/feedbacks/${id}`)
      return data
    },
  })

  useEffect(() => {
    if (query.data?.replyBody) setBody(query.data.replyBody)
  }, [query.data?.replyBody])

  if (!query.data || !id) return <LoadingState />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.post(`/singard/feedbacks/${id}/reply`, { replyBody: body.trim() })
      toast.success(t('singard.replySaved'))
      navigate(singardInboxPath(id))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Reply}
        title={t('singard.writeReply')}
        subtitle={<EntityNameSubtitle name={query.data.trackingCode} icon={Reply} />}
      />
      <FormCard icon={Reply} title={t('singard.writeReply')} subtitle={t('singard.replySubtitle')}>
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <FormField icon={Reply} label={t('singard.replyBody')} htmlFor="sgReply">
            <textarea
              id="sgReply"
              className={fieldClassName}
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={8}
            />
          </FormField>
          <FormActions
            submitLabel={t('singard.writeReply')}
            cancelLabel={t('common.cancel')}
            submitting={saving}
            onCancel={() => navigate(singardInboxPath(id))}
          />
        </AppForm>
      </FormCard>
    </div>
  )
}
