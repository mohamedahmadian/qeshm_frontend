export function inspectionSubmitPath() {
  return '/inspection/submit'
}

export function inspectionMinePath(id?: string) {
  return id ? `/inspection/mine/${id}` : '/inspection/mine'
}

export function inspectionInboxPath(id?: string) {
  return id ? `/inspection/inbox/${id}` : '/inspection/inbox'
}

export function inspectionInboxReplyPath(id: string) {
  return `/inspection/inbox/${id}/reply`
}

export function inspectionActivitiesPath(feedbackId: string, activityId?: string) {
  return activityId
    ? `/inspection/inbox/${feedbackId}/activities/${activityId}`
    : `/inspection/inbox/${feedbackId}/activities`
}

export function inspectionKindsPath(id?: string) {
  return id ? `/inspection/kinds/${id}` : '/inspection/kinds'
}

export function inspectionCategoriesPath(id?: string) {
  return id ? `/inspection/categories/${id}` : '/inspection/categories'
}

export function inspectionReportsPath() {
  return '/inspection/reports'
}
