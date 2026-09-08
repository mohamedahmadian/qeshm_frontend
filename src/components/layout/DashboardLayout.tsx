import { LogOut, Menu, Search, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { getNavIcon } from '../../lib/icons'
import { APP_NAV } from '../../lib/nav'
import { isSidebarMenuActive } from '../../lib/nav-path'
import type { NavMenu, NavModule } from '../../types/app'
import { AppLogo } from '../brand/AppLogo'
import { PageTransition } from '../ui/PageTransition'
import { AdminFooter } from './AdminFooter'
import { HeaderToday } from './HeaderToday'
import { ImpersonationBanner } from './ImpersonationBanner'
import { PageBreadcrumb } from './PageBreadcrumb'
import { QuickToolsProvider } from './QuickTools'
import { UserMenu } from './UserMenu'

type SidebarNavMenu = NavMenu & { label?: string }

function flattenVisibleMenus(mods: NavModule[]): SidebarNavMenu[] {
  return mods.flatMap((mod) => mod.menus)
}

function sidebarMenuItemId(code: string) {
  return `sidebar-menu-${code}`
}

const SIDEBAR_NAV_SCROLL_KEY = 'template.sidebar-nav-scroll'

function readSidebarNavScroll() {
  try {
    const value = Number(sessionStorage.getItem(SIDEBAR_NAV_SCROLL_KEY))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function writeSidebarNavScroll(value: number) {
  sidebarNavScrollTop = Math.max(0, value)
  try {
    sessionStorage.setItem(SIDEBAR_NAV_SCROLL_KEY, String(Math.round(sidebarNavScrollTop)))
  } catch {
    /* private mode / quota */
  }
}

let sidebarNavScrollTop = readSidebarNavScroll()

function isElementFullyVisible(container: HTMLElement, item: HTMLElement) {
  const containerRect = container.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  return itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom
}

function scrollItemIntoNav(nav: HTMLElement, item: HTMLElement) {
  const navRect = nav.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  if (itemRect.top < navRect.top) {
    nav.scrollTop -= navRect.top - itemRect.top
  } else if (itemRect.bottom > navRect.bottom) {
    nav.scrollTop += itemRect.bottom - navRect.bottom
  }
}

function nextMenuIndex(current: number, delta: number, count: number) {
  if (count <= 0) return 0
  const index = Math.min(Math.max(current, 0), count - 1)
  return (index + delta + count) % count
}

function menuMatchesSearch(
  mod: NavModule,
  item: SidebarNavMenu,
  needle: string,
  label: (key: string) => string,
) {
  if (item.label?.includes(needle)) return true
  return label(item.nameKey).includes(needle) || label(mod.nameKey).includes(needle)
}

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const menuSearchRef = useRef<HTMLInputElement>(null)
  const menuSearchHintId = 'sidebar-menu-search-hint'
  const menuSearchListId = 'sidebar-menu-list'

  const focusMenuSearch = useCallback(() => {
    setOpen(true)
    const input = menuSearchRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [])

  useEffect(() => {
    const DOUBLE_CTRL_MS = 500
    let lastAt = 0
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.isComposing) return
      if (event.key !== 'Control') {
        lastAt = 0
        return
      }
      const now = Date.now()
      if (now - lastAt >= DOUBLE_CTRL_MS) {
        lastAt = now
        return
      }
      event.preventDefault()
      lastAt = 0
      focusMenuSearch()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [focusMenuSearch])

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  const rememberSidebarScroll = useCallback(() => {
    if (navRef.current) writeSidebarNavScroll(navRef.current.scrollTop)
  }, [])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    nav.scrollTop = sidebarNavScrollTop
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (active && !isElementFullyVisible(nav, active)) {
      scrollItemIntoNav(nav, active)
    }
    writeSidebarNavScroll(nav.scrollTop)
  }, [])

  const navModules = APP_NAV

  const modules = useMemo(() => {
    const needle = query.trim()
    if (!needle) return navModules
    return navModules
      .map((mod) => ({
        ...mod,
        menus: mod.menus.filter((item) => menuMatchesSearch(mod, item, needle, t)),
      }))
      .filter((mod) => mod.menus.length > 0)
  }, [navModules, query, t])

  const visibleMenus = useMemo(() => flattenVisibleMenus(modules), [modules])
  const searching = Boolean(query.trim())
  const highlightedMenu = searching
    ? visibleMenus[
        visibleMenus.length ? Math.min(highlightedIndex, visibleMenus.length - 1) : 0
      ]
    : undefined

  const allMenuPaths = useMemo(
    () => navModules.flatMap((mod) => mod.menus.map((item) => item.path)),
    [navModules],
  )

  const openMenu = useCallback(
    (item: SidebarNavMenu) => {
      rememberSidebarScroll()
      setOpen(false)
      navigate(item.path)
    },
    [navigate, rememberSidebarScroll],
  )

  const highlightMenu = useCallback(
    (code: string) => {
      const index = visibleMenus.findIndex((menu) => menu.code === code)
      if (index >= 0) setHighlightedIndex(index)
    },
    [visibleMenus],
  )

  const onMenuSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!searching || event.isComposing) return
      const count = visibleMenus.length
      if (!count) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightedIndex((current) => nextMenuIndex(current, 1, count))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightedIndex((current) => nextMenuIndex(current, -1, count))
        return
      }
      if (event.key === 'Enter') {
        if (event.repeat) return
        event.preventDefault()
        const index = Math.min(highlightedIndex, count - 1)
        const item = visibleMenus[index] ?? visibleMenus[0]
        if (item) openMenu(item)
      }
    },
    [highlightedIndex, openMenu, searching, visibleMenus],
  )

  useEffect(() => {
    if (!highlightedMenu) return
    const el = document.getElementById(sidebarMenuItemId(highlightedMenu.code))
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightedMenu])

  return (
    <QuickToolsProvider>
      <div className="h-svh overflow-hidden bg-cream-50">
        <div className="flex h-full">
          {open ? (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-ink-900/20 lg:hidden"
              aria-label={t('nav.closeMenu')}
              onClick={() => setOpen(false)}
            />
          ) : null}
          <aside
            className={`fixed inset-y-0 start-0 z-40 flex h-svh w-[280px] flex-col border-e border-line bg-white transition lg:static lg:h-full lg:translate-x-0 ${
              open
                ? 'translate-x-0'
                : 'ltr:-translate-x-full rtl:translate-x-full lg:ltr:translate-x-0 lg:rtl:translate-x-0'
            }`}
          >
            <div className="flex items-center gap-3 px-5 py-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <NavLink to="/" onClick={() => setOpen(false)} className="shrink-0">
                  <AppLogo decorative className="h-10 w-auto max-w-10 shrink-0 object-contain" />
                </NavLink>
                <NavLink
                  to="/"
                  onClick={() => setOpen(false)}
                  className="block truncate font-semibold text-ink-900"
                >
                  {t('nav.panel')}
                </NavLink>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-ink-500 lg:hidden"
                onClick={() => setOpen(false)}
                aria-label={t('nav.closeMenu')}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-4 pb-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  ref={menuSearchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setHighlightedIndex(0)
                  }}
                  onKeyDown={onMenuSearchKeyDown}
                  placeholder={t('nav.searchMenu')}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={searching}
                  aria-controls={menuSearchListId}
                  aria-activedescendant={
                    highlightedMenu ? sidebarMenuItemId(highlightedMenu.code) : undefined
                  }
                  aria-describedby={menuSearchHintId}
                  className="w-full rounded-2xl border border-line bg-cream-50 py-2.5 ps-10 pe-3 text-sm placeholder:text-ink-400"
                />
              </label>
              <p id={menuSearchHintId} className="mt-2 px-1 text-[9px] leading-tight text-ink-300">
                {t('nav.searchMenuHint')}
              </p>
            </div>

            <nav
              ref={navRef}
              id={menuSearchListId}
              className="flex-1 space-y-5 overflow-y-auto [overflow-anchor:none] px-3 pb-3"
              onScroll={(event) => writeSidebarNavScroll(event.currentTarget.scrollTop)}
            >
              {modules.map((mod) => (
                <div key={mod.code}>
                  <p className="mb-1 px-3 text-[11px] font-medium text-ink-400">{t(mod.nameKey)}</p>
                  <div className="space-y-1">
                    {mod.menus.map((item) => (
                      <SidebarMenuLink
                        key={item.code}
                        item={item}
                        allMenuPaths={allMenuPaths}
                        highlighted={highlightedMenu?.code === item.code}
                        onHighlight={() => highlightMenu(item.code)}
                        onNavigate={() => {
                          rememberSidebarScroll()
                          setOpen(false)
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="shrink-0 border-t border-line px-3 py-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                onClick={() => {
                  const impersonating = Boolean(user?.impersonating)
                  setOpen(false)
                  logout()
                  if (!impersonating) navigate('/login')
                }}
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                {user?.impersonating ? t('auth.impersonateEnd') : t('auth.logout')}
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ImpersonationBanner />
            <header className="z-20 flex shrink-0 items-center gap-3 bg-cream-50/90 px-4 py-4 backdrop-blur sm:px-8">
              <button
                type="button"
                className="rounded-xl p-2 text-ink-700 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label={t('nav.openMenu')}
              >
                <Menu className="size-5" />
              </button>
              <PageBreadcrumb pathname={location.pathname} modules={navModules} />
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <HeaderToday />
                <UserMenu />
              </div>
            </header>
            <main
              ref={mainRef}
              className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-8 sm:px-8"
            >
              <PageTransition>{children ?? <Outlet />}</PageTransition>
            </main>
            <AdminFooter />
          </div>
        </div>
      </div>
    </QuickToolsProvider>
  )
}

function SidebarMenuLink({
  item,
  allMenuPaths,
  onNavigate,
  highlighted = false,
  onHighlight,
}: {
  item: SidebarNavMenu
  allMenuPaths: string[]
  onNavigate: () => void
  highlighted?: boolean
  onHighlight?: () => void
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const Icon = getNavIcon(item.icon)
  const isActive = isSidebarMenuActive(pathname, item.path, allMenuPaths)
  const iconClass = isActive
    ? 'text-white'
    : highlighted
      ? 'text-teal-600'
      : 'text-ink-400'
  return (
    <Link
      id={sidebarMenuItemId(item.code)}
      to={item.path}
      onClick={onNavigate}
      onMouseEnter={onHighlight}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
        isActive
          ? `bg-teal-500 text-white shadow-sm${highlighted ? ' ring-2 ring-inset ring-white/70' : ''}`
          : highlighted
            ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
            : 'text-ink-700 hover:bg-cream-50'
      }`}
    >
      <Icon className={`size-4 ${iconClass}`} aria-hidden />
      {item.label ?? t(item.nameKey)}
    </Link>
  )
}
