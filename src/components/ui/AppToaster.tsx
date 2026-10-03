import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { languages, type AppLanguage } from '../../i18n'

function ToastGlyph({ tone, children }: { tone: 'success' | 'error' | 'warning' | 'info'; children: ReactNode }) {
  return <span className={`app-toast-glyph app-toast-glyph--${tone}`}>{children}</span>
}

export function AppToaster() {
  const { i18n } = useTranslation()
  const lang = (i18n.language.split('-')[0] as AppLanguage) || 'fa'

  return (
    <Toaster
      position="bottom-center"
      className="app-toaster"
      swipeDirections={['bottom', 'left', 'right']}
      dir={languages[lang]?.dir ?? 'rtl'}
      offset={18}
      gap={10}
      icons={{
        success: (
          <ToastGlyph tone="success">
            <CircleCheck strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        error: (
          <ToastGlyph tone="error">
            <CircleX strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        warning: (
          <ToastGlyph tone="warning">
            <TriangleAlert strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        info: (
          <ToastGlyph tone="info">
            <Info strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
      }}
    />
  )
}
