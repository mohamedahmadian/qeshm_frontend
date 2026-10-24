import {
  boardPipelineStages,
  boardStages,
  type BoardRequest,
  type BoardStage,
} from '../../types/app'

export function boardWorkflowIndex(
  status: string,
  rejectedStage: BoardStage | null,
  stages: BoardStage[],
) {
  if (status === 'APPROVED') return stages.length
  if (status === 'REJECTED') {
    if (!rejectedStage) return 0
    const index = stages.indexOf(rejectedStage)
    return index < 0 ? 0 : index
  }
  if (status === 'PENDING_REVIEW') return stages.indexOf(boardStages.MANAGEMENT)
  if (status === 'PENDING_LEGAL') return stages.indexOf(boardStages.LEGAL)
  if (status === 'PENDING_BUDGET') return stages.indexOf(boardStages.BUDGET)
  if (status === 'PENDING_SECRETARY') return stages.indexOf(boardStages.SECRETARY)
  if (status === 'PENDING_CEO') return stages.indexOf(boardStages.CEO)
  return 0
}

export function referredAtOf(item: BoardRequest, stage: BoardStage) {
  if (stage === 'REQUEST' || stage === 'MANAGEMENT') return item.createdAt
  if (stage === 'LEGAL') return item.legalReferredAt || item.createdAt
  if (stage === 'BUDGET') return item.budgetReferredAt || item.legalReferredAt || item.createdAt
  if (stage === 'SECRETARY') {
    return item.secretaryReferredAt || item.budgetReferredAt || item.legalReferredAt || item.createdAt
  }
  if (stage === 'CEO') {
    return (
      item.ceoReferredAt ||
      item.secretaryReferredAt ||
      item.budgetReferredAt ||
      item.legalReferredAt ||
      item.createdAt
    )
  }
  return item.createdAt
}

export function recordedHandledAt(item: BoardRequest, stage: BoardStage) {
  if (stage === 'REQUEST') return item.createdAt
  if (item.status === 'REJECTED' && item.rejectedStage === stage) {
    return item.rejectedAt || item.updatedAt
  }
  if (stage === 'MANAGEMENT') return item.managementAt
  if (stage === 'LEGAL') return item.legalAt
  if (stage === 'BUDGET') return item.budgetAt
  if (stage === 'SECRETARY') return item.secretaryAt
  if (stage === 'CEO') return item.ceoAt
  return null
}

export function stageTimingOf(item: BoardRequest, stage: BoardStage) {
  const stages = boardPipelineStages(item.kind)
  const index = stages.indexOf(stage)
  const current = boardWorkflowIndex(item.status, item.rejectedStage, stages)
  const entered = index >= 0 && index <= current
  const completed =
    stage === 'REQUEST' ||
    index < current ||
    (item.status === 'REJECTED' && item.rejectedStage === stage)
  return {
    referredAt: entered ? referredAtOf(item, stage) : null,
    handledAt: completed ? recordedHandledAt(item, stage) : null,
    live: entered && !completed,
  }
}
