import { DateText } from '../../components/ui/DateText'
import { useTranslation } from 'react-i18next'
import type { BoardMinutesResolution } from '../../types/app'
import { boardSignatoryFullName } from './board-paths'

export function BoardResolutionDueValue({
  dueKind,
  dueDate,
}: Pick<BoardMinutesResolution, 'dueKind' | 'dueDate'>) {
  const { t } = useTranslation()
  if (dueKind === 'ASAP') return t('boardResolutions.dueAsap')
  if (dueDate) return <DateText value={dueDate} />
  return '—'
}

export function resolutionProposerLabel(
  item: Pick<BoardMinutesResolution, 'proposerKind' | 'proposerText' | 'proposerUnit'>,
) {
  if (item.proposerKind === 'UNIT') return item.proposerUnit?.name || '—'
  return item.proposerText || '—'
}

export function resolutionSignatoryName(
  item: Pick<Parameters<typeof boardSignatoryFullName>[0], 'firstName' | 'lastName'>,
) {
  return boardSignatoryFullName(item)
}
