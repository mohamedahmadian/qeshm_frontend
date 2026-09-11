import { useEffect, useRef } from 'react'

const cancelFns = new Set<() => void>()
const backFns = new Set<() => void>()
let attached = false

function lastOf<T>(set: Set<T>): T | undefined {
  let value: T | undefined
  for (const item of set) value = item
  return value
}

function isEscapeBlocked() {
  return Boolean(
    document.querySelector(
      [
        '[aria-modal="true"]',
        '[role="listbox"]',
        '[role="menu"]',
        '[data-enter-ignore]',
        '[data-nested-dialog]',
        '[data-confirm-toast]',
        '.rmdp-wrapper',
      ].join(','),
    ),
  )
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.repeat || event.isComposing) return
  if (event.defaultPrevented) return
  if (isEscapeBlocked()) return
  const cancel = lastOf(cancelFns)
  if (cancel) {
    event.preventDefault()
    cancel()
    return
  }
  const back = lastOf(backFns)
  if (back) {
    event.preventDefault()
    back()
  }
}

function attach() {
  if (attached) return
  attached = true
  document.addEventListener('keydown', onKeyDown)
}

function detachIfIdle() {
  if (cancelFns.size || backFns.size) return
  document.removeEventListener('keydown', onKeyDown)
  attached = false
}

function useEscapeAction(bucket: Set<() => void>, enabled: boolean, fn?: () => void) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    if (!enabled) return
    const run = () => fnRef.current?.()
    attach()
    bucket.add(run)
    return () => {
      bucket.delete(run)
      detachIfIdle()
    }
  }, [bucket, enabled])
}

/** انصراف فرم با Escape — اولویت بالاتر از بازگشت */
export function useEscapeCancel(onCancel?: () => void) {
  useEscapeAction(cancelFns, Boolean(onCancel), onCancel)
}

/** بازگشت صفحه جزئیات با Escape اگر انصراف نباشد */
export function useEscapeBack(enabled: boolean, onBack?: () => void) {
  useEscapeAction(backFns, enabled && Boolean(onBack), onBack)
}
