import { Download, FileBadge2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { FileName } from '../../components/ui/FileName'
import { Button } from '../../components/ui/Form'
import { FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getFileUrl } from '../../lib/api'
import { formatGroupedNumber } from '../../lib/datetime'
import {
  boardResolutionContractKinds,
  type BoardResolutionContract,
  type BoardResolutionContractList,
} from '../../types/app'
import { BoardResolutionContractFormModal } from './BoardResolutionContractFormModal'

export function BoardResolutionContractsTab({
  minutesId,
  resolutionId,
  readOnly = false,
  className,
}: {
  minutesId: string
  resolutionId: string
  readOnly?: boolean
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const queryKey = ['board-resolution-contracts', minutesId, resolutionId]
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<BoardResolutionContractList>(
        `/board/minutes/${minutesId}/resolutions/${resolutionId}/contracts`,
      )
      return data
    },
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BoardResolutionContract | null>(null)
  const items = query.data?.items ?? []

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row: BoardResolutionContract) {
    setEditing(row)
    setModalOpen(true)
  }

  function kindLabel(row: BoardResolutionContract) {
    if (!row.kind) return null
    if (row.kind === boardResolutionContractKinds.OTHER) {
      return row.kindOther || t('boardResolutions.contractKinds.OTHER')
    }
    return t(`boardResolutions.contractKinds.${row.kind}`)
  }

  return (
    <div className={className ?? formCardBodyClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormSectionTitle icon={FileBadge2} className="mb-0">
          {t('boardResolutions.contractsTitle')}
        </FormSectionTitle>
        {readOnly ? null : (
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            {t('boardResolutions.contractAdd')}
          </Button>
        )}
      </div>
      <TableCard
        loading={query.isLoading}
        empty={t('boardResolutions.contractsEmpty')}
        hasRows={items.length > 0}
        rowClick={!readOnly}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractTitleField')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractNo')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractContractor')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractKind')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractStatus')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractAmount')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractPeriod')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.contractFile')}</th>
              {readOnly ? null : <ActionsTh />}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">{row.contractNo || '—'}</td>
                <td className="px-4 py-3">{row.contractor?.name || '—'}</td>
                <td className="px-4 py-3">{kindLabel(row) || '—'}</td>
                <td className="px-4 py-3">
                  {row.status ? t(`boardResolutions.contractStatuses.${row.status}`) : '—'}
                </td>
                <td className="px-4 py-3">
                  {row.amount != null ? formatGroupedNumber(row.amount, locale) : '—'}
                </td>
                <td className="px-4 py-3">
                  {row.startDate || row.endDate ? (
                    <>
                      {row.startDate ? <DateText value={row.startDate} /> : '—'}
                      {' — '}
                      {row.endDate ? <DateText value={row.endDate} /> : '—'}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.file ? (
                    <a
                      href={getFileUrl(row.file.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700"
                    >
                      <Download className="size-3.5" aria-hidden />
                      <FileName>{row.file.originalName || t('boardResolutions.contractFile')}</FileName>
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                {readOnly ? null : (
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      showView={false}
                      onEdit={() => openEdit(row)}
                      onDelete={() =>
                        confirmDelete({
                          message: t('boardResolutions.contractConfirmDelete'),
                          successMessage: t('boardResolutions.contractDeleted'),
                          path: `/board/minutes/${minutesId}/resolutions/${resolutionId}/contracts/${row.id}`,
                          queryKey,
                          onDeleted: () => {
                            if (editing?.id === row.id) closeModal()
                          },
                        })
                      }
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {readOnly ? null : (
        <BoardResolutionContractFormModal
          open={modalOpen}
          minutesId={minutesId}
          resolutionId={resolutionId}
          initial={editing}
          onClose={closeModal}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey })
          }}
        />
      )}
    </div>
  )
}
