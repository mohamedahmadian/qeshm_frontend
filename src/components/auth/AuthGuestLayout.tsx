import { ArrowLeft, ArrowRight, Home, LogIn, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useBrandDisplay } from '../../hooks/useHeadquartersSummary'
import { AppLogo } from '../brand/AppLogo'
import { AdminFooter } from '../layout/AdminFooter'
import { LocaleSwitcher } from '../layout/LocaleSwitcher'
import { Button } from '../ui/Form'

export function AuthGuestLayout({
  children,
  wide = false,
  full = false,
  fill = false,
  showAuthLinks = false,
  showHeaderLogin = false,
  showHeaderHome = false,
}: {
  children: ReactNode
  wide?: boolean
  full?: boolean
  fill?: boolean
  showAuthLinks?: boolean
  showHeaderLogin?: boolean
  showHeaderHome?: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { title: brandTitle, name: brandName, logoSrc } = useBrandDisplay()

  return (
    <div className={`flex flex-col bg-cream-50 ${fill ? 'h-svh overflow-hidden' : 'min-h-svh'}`}>
      <header className="z-20 shrink-0 border-b border-line/70 bg-white/90 backdrop-blur">
        <div
          className={`mx-auto flex w-full items-center gap-3 px-4 py-3 sm:px-8 ${
            fill ? '' : 'max-w-5xl'
          }`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <AppLogo
              src={logoSrc}
              className={
                logoSrc
                  ? 'h-11 w-11 shrink-0 rounded-2xl bg-white object-cover shadow-[0_8px_18px_rgba(20,40,40,0.16)] ring-1 ring-teal-100 sm:h-12 sm:w-12'
                  : 'h-11 w-auto shrink-0 object-contain sm:h-12'
              }
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900 sm:text-base">{brandTitle}</p>
              {brandName && brandName !== brandTitle ? (
                <p className="truncate text-[11px] text-ink-400 sm:text-xs">{brandName}</p>
              ) : null}
            </div>
          </Link>
          <nav
            className="ms-1 flex min-w-0 flex-wrap items-center gap-1 sm:ms-4"
            aria-label={t('landing.publicNav')}
          >
            <PublicHeaderLink to="/" end>
              {t('landing.homePage')}
            </PublicHeaderLink>
            <PublicHeaderLink to="/singard">{t('landing.singard')}</PublicHeaderLink>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher />
            {showHeaderHome ? (
              <Link to="/">
                <Button type="button" variant="ghost" className="gap-1.5">
                  <Home className="size-4" aria-hidden />
                  {t('landing.homePage')}
                </Button>
              </Link>
            ) : null}
            {showHeaderLogin ? (
              <Link to={user ? '/dashboard' : '/login'}>
                <Button type="button" variant={user ? 'soft' : 'primary'} className="gap-1.5">
                  <LogIn className="size-4" aria-hidden />
                  {user ? t('landing.goToPanel') : t('auth.login')}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main
        className={
          fill
            ? 'flex min-h-0 flex-1 flex-col'
            : `flex flex-1 items-start justify-center px-4 py-8 ${full ? '' : 'sm:items-center'}`
        }
      >
        <div
          className={
            fill
              ? 'flex min-h-0 flex-1 flex-col'
              : `mx-auto w-full ${full ? 'max-w-5xl' : wide ? 'max-w-xl' : 'max-w-md'}`
          }
        >
          {children}
        </div>
      </main>
      {showAuthLinks ? (
        <div className="shrink-0 px-4 pb-5 sm:px-8">
          <div className="mx-auto flex max-w-5xl justify-center">
            <Link
              to={user ? '/dashboard' : '/login'}
              className="group inline-flex min-h-12 items-center gap-3 rounded-2xl bg-teal-500 px-6 py-3 text-white shadow-[0_10px_24px_rgba(46,189,182,0.28)] transition hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-[0_14px_28px_rgba(46,189,182,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
                <LogIn className="size-5 text-white" aria-hidden />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">
                {user ? t('landing.goToPanel') : t('landing.enterSystem')}
              </span>
              <ArrowLeft
                className="size-4 text-white/80 transition group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      ) : null}
      <AdminFooter />
    </div>
  )
}

function PublicHeaderLink({
  to,
  end,
  children,
}: {
  to: string
  end?: boolean
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `inline-flex min-h-10 items-center rounded-2xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
          isActive
            ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_8px_18px_rgba(46,189,182,0.28)]'
            : 'text-ink-700 hover:bg-teal-50 hover:text-teal-800'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export function AuthBackButton({
  to,
  onClick,
}: {
  to?: string
  onClick?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      aria-label={t('common.back')}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl text-teal-700 transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      onClick={() => {
        if (onClick) onClick()
        else if (to) navigate(to)
      }}
    >
      <ArrowRight className="size-5 ltr:rotate-180" aria-hidden />
    </button>
  )
}

export function AuthNotice({
  icon: Icon,
  tone = 'teal',
  children,
}: {
  icon: LucideIcon
  tone?: 'teal' | 'mint' | 'warn'
  children: ReactNode
}) {
  const toneClass =
    tone === 'mint'
      ? 'border-mint-100 bg-gradient-to-b from-mint-50 to-white text-ink-800'
      : tone === 'warn'
        ? 'border-amber-100 bg-gradient-to-b from-amber-50 to-white text-ink-800'
        : 'border-teal-100 bg-gradient-to-b from-teal-50 to-white text-ink-800'
  const iconClass =
    tone === 'mint'
      ? 'bg-mint-500 text-white'
      : tone === 'warn'
        ? 'bg-amber-500 text-white'
        : 'bg-teal-500 text-white'

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm leading-7 ${toneClass}`}>
      <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 pt-1">{children}</div>
    </div>
  )
}
