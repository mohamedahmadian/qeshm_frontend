import { Copy, FileText, Printer, ScanLine, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  listScanDevices,
  readScanSettings,
  ScanAgentError,
  scanFromAgent,
  writeScanSettings,
  type ScanDevice,
  type ScanPageSize,
} from '../../lib/scan-agent'
import { AppForm, Button, FormField, ToggleField } from './Form'
import { FormCard, formCardBodyClassName } from './FormLayout'
import { SearchSelect } from './SearchSelect'

export function ScanSettingsModal({
  onClose,
  onFile,
}: {
  onClose: () => void
  onFile: (file: File) => void
}) {
  const { t } = useTranslation()
  const generatedId = useId()
  const submitId = `scan-now-${generatedId.replace(/:/g, '')}`
  const stored = readScanSettings()
  const [devices, setDevices] = useState<ScanDevice[]>([])
  const [scanner, setScanner] = useState(stored.scanner)
  const [duplex, setDuplex] = useState(stored.duplex)
  const [pageSize, setPageSize] = useState<ScanPageSize>(stored.pageSize)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (document.querySelector('[role="listbox"], [data-enter-ignore][aria-expanded="true"]')) return
      event.preventDefault()
      event.stopPropagation()
      if (!scanning) onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose, scanning])

  useEffect(() => {
    let cancelled = false
    listScanDevices()
      .then((items) => {
        if (cancelled) return
        setDevices(items)
        setScanner((current) => {
          if (items.some((item) => item.id === current || item.name === current)) return current
          return items[0]?.id ?? ''
        })
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(scanErrorMessage(error, t))
        onClose()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onClose, t])

  useEffect(() => {
    if (loading || scanning) return
    document.getElementById(submitId)?.focus()
  }, [loading, scanning, submitId])

  async function submit() {
    if (!scanner) {
      toast.error(t('common.scanNoDevices'))
      return
    }
    const options = { scanner, duplex, pageSize }
    writeScanSettings(options)
    setScanning(true)
    try {
      onFile(await scanFromAgent(options))
      onClose()
    } catch (error) {
      toast.error(scanErrorMessage(error, t))
    } finally {
      setScanning(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('common.scanSettings')}
      data-nested-dialog
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink-900/40"
        aria-label={t('common.close')}
        onClick={() => {
          if (!scanning) onClose()
        }}
      />
      <FormCard
        icon={ScanLine}
        title={t('common.scanSettings')}
        subtitle={t('common.scanSettingsSubtitle')}
        className="relative z-10 w-full max-w-lg"
        onDoubleClick={() => undefined}
        action={
          <Button
            type="button"
            variant="ghost"
            icon
            onClick={onClose}
            aria-label={t('common.close')}
            disabled={scanning}
          >
            <X className="size-4" aria-hidden />
          </Button>
        }
      >
        <AppForm onSubmit={submit} autoFocusFirst={false} className={formCardBodyClassName}>
          <FormField icon={Printer} label={t('common.scanDevice')} htmlFor="scan-device">
            <SearchSelect
              id="scan-device"
              value={scanner}
              onChange={setScanner}
              disabled={loading || scanning || devices.length === 0}
              required
              placeholder={t('common.scanDevicePlaceholder')}
              options={devices.map((item) => ({ value: item.id, label: item.name }))}
            />
          </FormField>
          <FormField icon={Copy} label={t('common.scanSides')} htmlFor="scan-duplex">
            <ToggleField
              id="scan-duplex"
              checked={duplex}
              disabled={scanning}
              onChange={setDuplex}
              onLabel={t('common.scanDuplex')}
              offLabel={t('common.scanSimplex')}
            />
          </FormField>
          <FormField icon={FileText} label={t('common.scanPageSize')} htmlFor="scan-page-size">
            <ToggleField
              id="scan-page-size"
              checked={pageSize === 'a4'}
              disabled={scanning}
              onChange={(a4) => setPageSize(a4 ? 'a4' : 'a5')}
              onLabel={t('common.scanA4')}
              offLabel={t('common.scanA5')}
            />
          </FormField>
          <div className="flex justify-center pt-2">
            <Button id={submitId} type="submit" autoFocus disabled={scanning || loading}>
              <ScanLine className="size-4" aria-hidden />
              {t('common.scanNow')}
            </Button>
          </div>
        </AppForm>
      </FormCard>
    </div>,
    document.body,
  )
}

export function scanErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ScanAgentError) {
    const key = scanErrorKey(error.code)
    if (error.code === 'scan-failed' && error.detail) return `${t(key)} (${error.detail.trim()})`
    return t(key)
  }
  return t('common.scanUnavailable')
}

function scanErrorKey(code: ScanAgentError['code']) {
  switch (code) {
    case 'unavailable':
      return 'common.scanUnavailable'
    case 'scanner-not-found':
      return 'common.scanNoScanner'
    case 'no-paper':
      return 'common.scanNoPaper'
    case 'paper-jam':
      return 'common.scanPaperJam'
    case 'busy':
      return 'common.scanBusy'
    case 'cover-open':
      return 'common.scanCoverOpen'
    default:
      return 'common.scanFailed'
  }
}
