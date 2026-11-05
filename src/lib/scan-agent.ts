export const SCAN_AGENT_URL = 'http://127.0.0.1:17325'
const SETTINGS_KEY = 'negah.scan-settings'

export type ScanAgentErrorCode =
  | 'unavailable'
  | 'scanner-not-found'
  | 'no-paper'
  | 'paper-jam'
  | 'busy'
  | 'cover-open'
  | 'scan-failed'

export type ScanDevice = {
  id: string
  name: string
}

export type ScanPageSize = 'a4' | 'a5'

export type ScanOptions = {
  scanner: string
  duplex: boolean
  pageSize: ScanPageSize
}

export class ScanAgentError extends Error {
  readonly code: ScanAgentErrorCode
  readonly detail?: string

  constructor(code: ScanAgentErrorCode, detail?: string) {
    super(detail || code)
    this.code = code
    this.detail = detail
  }
}

type ScanAgentErrorBody = {
  error?: string
  detail?: string
}

type HealthBody = {
  ok?: boolean
  scanner?: string
  scanners?: ScanDevice[]
}

export function readScanSettings(): ScanOptions {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { scanner: '', duplex: false, pageSize: 'a4' }
    const parsed = JSON.parse(raw) as Partial<ScanOptions>
    return {
      scanner: typeof parsed.scanner === 'string' ? parsed.scanner : '',
      duplex: Boolean(parsed.duplex),
      pageSize: parsed.pageSize === 'a5' ? 'a5' : 'a4',
    }
  } catch {
    return { scanner: '', duplex: false, pageSize: 'a4' }
  }
}

export function writeScanSettings(options: ScanOptions) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(options))
}

export async function listScanDevices(): Promise<ScanDevice[]> {
  try {
    const response = await request('/health', { method: 'GET' }, 2_000)
    if (!response.ok) {
      const body = await readError(response)
      throw new ScanAgentError(errorCode(body.error), body.detail)
    }
    const data = (await response.json()) as HealthBody
    if (Array.isArray(data.scanners) && data.scanners.length) {
      return data.scanners.filter((item) => item.id && item.name)
    }
    if (data.scanner) return [{ id: data.scanner, name: data.scanner }]
    throw new ScanAgentError('scanner-not-found')
  } catch (error) {
    if (error instanceof ScanAgentError) throw error
    throw new ScanAgentError('unavailable')
  }
}

export async function scanFromAgent(options: ScanOptions): Promise<File> {
  const response = await request(
    '/scan',
    {
      method: 'POST',
      body: JSON.stringify(options),
      headers: { 'Content-Type': 'application/json' },
    },
    120_000,
  )
  if (!response.ok) {
    const body = await readError(response)
    throw new ScanAgentError(errorCode(body.error), body.detail)
  }
  const blob = await response.blob()
  const type = blob.type || 'image/jpeg'
  const ext = type.includes('pdf') ? 'pdf' : 'jpg'
  return new File([blob], `scan-${Date.now()}.${ext}`, { type })
}

async function request(path: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${SCAN_AGENT_URL}${path}`, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

async function readError(response: Response): Promise<ScanAgentErrorBody> {
  try {
    return (await response.json()) as ScanAgentErrorBody
  } catch {
    return {}
  }
}

function errorCode(code?: string): ScanAgentErrorCode {
  switch (code) {
    case 'scanner-not-found':
    case 'no-paper':
    case 'paper-jam':
    case 'busy':
    case 'cover-open':
    case 'scan-failed':
      return code
    default:
      return 'scan-failed'
  }
}
