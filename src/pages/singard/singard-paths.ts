export function singardSubmitPath() {
  return '/singard/submit'
}

export function singardMinePath(id?: string) {
  return id ? `/singard/mine/${id}` : '/singard/mine'
}

export function singardInboxPath(id?: string) {
  return id ? `/singard/inbox/${id}` : '/singard/inbox'
}

export function singardInboxReplyPath(id: string) {
  return `/singard/inbox/${id}/reply`
}

export function singardActivitiesPath(feedbackId: string, activityId?: string) {
  return activityId
    ? `/singard/inbox/${feedbackId}/activities/${activityId}`
    : `/singard/inbox/${feedbackId}/activities`
}

export function singardKindsPath(id?: string) {
  return id ? `/singard/kinds/${id}` : '/singard/kinds'
}

export function singardCategoriesPath(id?: string) {
  return id ? `/singard/categories/${id}` : '/singard/categories'
}

export function singardReportsPath() {
  return '/singard/reports'
}
