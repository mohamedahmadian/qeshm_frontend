export type StakeholderProject = {
  id: string
  systemName: string
  code: string
  status: string
  progressPercent: number | null
  startDate: string | null
  endDate: string | null
  address: string | null
  description: string | null
  isActive: boolean
  orgUnit?: { id: string; name: string } | null
  reports?: StakeholderProgressListItem[]
  correspondences?: {
    id: string
    subject: string
    kind: StakeholderCorrespondenceKind
    status: StakeholderCorrespondenceStatus
    createdAt: string
  }[]
}

export type StakeholderParty = { id: string; name: string }
export type StakeholderPerson = { id: string; fullName: string }

export type StakeholderAttachment = {
  id: string
  originalName: string | null
  imageId: string | null
  fileId: string | null
  image?: { id: string; mimeType: string; originalName: string | null } | null
  file?: { id: string; mimeType: string; originalName: string | null } | null
}

export type StakeholderProgressListItem = {
  id: string
  occurredAt: string | null
  progressPercent: number | null
  actionsDone: string | null
  nextPlan?: string | null
  blockers?: string | null
  needs?: string | null
  createdAt: string
  project?: { id: string; systemName: string; code: string }
  contractor?: StakeholderParty
  createdBy?: StakeholderPerson
  _count?: { attachments: number }
  attachments?: StakeholderAttachment[]
}

export const stakeholderCorrespondenceKinds = [
  'ACTION_REQUEST',
  'INQUIRY',
  'NOTICE',
  'DOCUMENT',
] as const

export const stakeholderCorrespondenceStatuses = [
  'SENT',
  'IN_REVIEW',
  'ANSWERED',
  'CLOSED',
] as const

export const stakeholderActionResults = ['ACCEPTED', 'REJECTED', 'DONE'] as const

export type StakeholderCorrespondenceKind = (typeof stakeholderCorrespondenceKinds)[number]
export type StakeholderCorrespondenceStatus = (typeof stakeholderCorrespondenceStatuses)[number]
export type StakeholderActionResult = (typeof stakeholderActionResults)[number]

export type StakeholderMessage = {
  id: string
  side: 'CONTRACTOR' | 'ORGANIZATION'
  body: string
  createdAt: string
  author: StakeholderPerson
}

export type StakeholderCorrespondence = {
  id: string
  kind: StakeholderCorrespondenceKind
  status: StakeholderCorrespondenceStatus
  subject: string
  body: string
  dueDate: string | null
  actionResult: StakeholderActionResult | null
  createdAt: string
  project: { id: string; systemName: string; code: string } | null
  contractor: StakeholderParty
  createdBy: StakeholderPerson
  messages?: StakeholderMessage[]
  attachments?: StakeholderAttachment[]
  _count?: { messages: number; attachments: number }
}
