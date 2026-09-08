import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import i18n, {
  applyUiLanguage,
  getStoredPreferredLocale,
  languages,
  persistPreferredLocale,
  type AppLanguage,
} from '../i18n'

const LOCALE_EVENT = 'template-preferred-locale'

export function usePreferredLocale() {
  const [locale, setLocaleState] = useState<AppLanguage>(getStoredPreferredLocale)

  useEffect(() => {
    function sync() {
      setLocaleState(getStoredPreferredLocale())
    }
    window.addEventListener(LOCALE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(LOCALE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setLocale = useCallback((next: AppLanguage) => {
    const previous = getStoredPreferredLocale()
    persistPreferredLocale(next)
    setLocaleState(next)
    applyUiLanguage(next)
    window.dispatchEvent(new Event(LOCALE_EVENT))
    if (next !== previous && !languages[next].enabled) {
      toast.info(i18n.t('settings.comingSoon'))
    }
  }, [])

  return { locale, setLocale }
}
