import { Download, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Form'
import { canPreviewProjectDocument, getProjectDocumentUrl } from '../../../lib/api'

export function ProjectDocumentFileActions({
  projectId,
  documentId,
  mimeType,
  compact = false,
  chip = false,
}: {
  projectId: string
  documentId: string
  mimeType: string
  compact?: boolean
  chip?: boolean
}) {
  const { t } = useTranslation()
  const downloadUrl = getProjectDocumentUrl(projectId, documentId)
  const canPreview = canPreviewProjectDocument(mimeType)
  const viewUrl = getProjectDocumentUrl(projectId, documentId, { view: true })
  const buttonClass = compact ? 'h-8 px-3 py-0 text-xs' : undefined

  if (chip) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        {canPreview ? (
          <a
            className="live-board-attachment-view"
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('projectDocuments.viewFile')}
            title={t('projectDocuments.viewFile')}
          >
            <ExternalLink aria-hidden />
          </a>
        ) : null}
        <a className="live-board-attachment-download" href={downloadUrl}>
          <Download aria-hidden />
          {t('projectDocuments.download')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {canPreview ? (
        <a href={viewUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="ghost" className={buttonClass}>
            <ExternalLink className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
            {t('projectDocuments.viewFile')}
          </Button>
        </a>
      ) : null}
      <a href={downloadUrl}>
        <Button type="button" variant="soft" className={buttonClass}>
          <Download className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
          {t('projectDocuments.download')}
        </Button>
      </a>
    </div>
  )
}
