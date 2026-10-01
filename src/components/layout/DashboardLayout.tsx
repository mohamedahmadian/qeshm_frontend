import { ChevronDown, ChevronsLeft, LogOut, Menu, Search, X } from 'lucide-react'
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
import { filterNavByAccess } from '../../lib/roles'
import type { NavMenu, NavModule } from '../../types/app'
import { AppLogo } from '../brand/AppLogo'
import { FormCardHeaderDecor } from '../ui/FormLayout'
import { PageTransition } from '../ui/PageTransition'
import { AdminFooter } from './AdminFooter'
import { HeaderToday } from './HeaderToday'
import { ImpersonationBanner } from './ImpersonationBanner'
import { PageBreadcrumb } from './PageBreadcrumb'
import { ProjectHeaderProgressButton } from './ProjectHeaderProgressButton'
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

const SIDEBAR_COLLAPSED_KEY = 'template.sidebar-collapsed'
const SIDEBAR_CLOSED_MODULES_KEY = 'template.sidebar-closed-modules'
const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)'

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function writeSidebarCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    /* private mode / quota */
  }
}

function readClosedModules() {
  try {
    const raw = localStorage.getItem(SIDEBAR_CLOSED_MODULES_KEY)
    if (!raw) return new Set<string>()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set<string>()
  }
}

function writeClosedModules(codes: Set<string>) {
  try {
    localStorage.setItem(SIDEBAR_CLOSED_MODULES_KEY, JSON.stringify([...codes]))
  } catch {
    /* private mode / quota */
  }
}

function useDesktopSidebar() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches : false,
  )
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_SIDEBAR_QUERY)
    const onChange = () => setIsDesktop(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

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

function SidebarModuleSection({
  mod,
  mintTone,
  moduleOpen,
  rail,
  allMenuPaths,
  highlightedCode,
  onToggle,
  onHighlight,
  onNavigate,
}: {
  mod: NavModule
  mintTone: boolean
  moduleOpen: boolean
  rail: boolean
  allMenuPaths: string[]
  highlightedCode?: string
  onToggle: () => void
  onHighlight: (code: string) => void
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const ModuleIcon = getNavIcon(mod.icon)
  const moduleActive = mod.menus.some((item) =>
    isSidebarMenuActive(pathname, item.path, allMenuPaths),
  )
  const panelId = `sidebar-module-${mod.code}`

  return (
    <section
      className={`overflow-hidden rounded-2xl border shadow-[0_8px_20px_rgba(46,189,182,0.08)] ${
        moduleActive
          ? 'border-teal-200 bg-gradient-to-b from-teal-50 to-white shadow-[0_12px_26px_rgba(46,189,182,0.16)]'
          : mintTone
            ? 'border-mint-100/90 bg-gradient-to-b from-mint-50/70 to-white'
            : 'border-teal-100/90 bg-gradient-to-b from-white to-teal-50/40'
      }`}
    >
      <header>
        <button
          type="button"
          aria-expanded={moduleOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex w-full cursor-pointer items-center text-start transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400 ${
            rail ? 'justify-center px-1.5 py-2' : 'gap-2.5 px-3 py-2.5'
          } ${
            mintTone
              ? 'bg-gradient-to-e from-mint-50 via-white to-teal-50/50'
              : 'bg-gradient-to-e from-teal-50 via-white to-mint-50/50'
          }`}
        >
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-xl text-white ${
              mintTone
                ? 'bg-mint-500 shadow-[0_6px_14px_rgba(63,214,190,0.32)]'
                : 'bg-teal-500 shadow-[0_6px_14px_rgba(46,189,182,0.32)]'
            }`}
          >
            <ModuleIcon className="size-3.5" aria-hidden />
          </span>
          <p
            className={`truncate text-sm font-semibold ${
              mintTone ? 'text-mint-800' : 'text-teal-800'
            } ${rail ? 'sr-only' : 'min-w-0 flex-1'}`}
          >
            {t(mod.nameKey)}
          </p>
          <span
            className={`ms-auto flex size-6 shrink-0 items-center justify-center rounded-lg ${
              mintTone ? 'bg-mint-100/90 text-mint-700' : 'bg-teal-100/90 text-teal-700'
            } ${rail ? 'hidden' : ''}`}
            aria-hidden
          >
            <ChevronDown
              className={`size-3.5 transition-transform duration-300 motion-reduce:transition-none ${
                moduleOpen ? 'rotate-0' : 'ltr:-rotate-90 rtl:rotate-90'
              }`}
            />
          </span>
        </button>
      </header>
      <div
        id={panelId}
        className="sidebar-module-panel"
        data-open={moduleOpen ? 'true' : 'false'}
        inert={!moduleOpen}
      >
        <div className="sidebar-module-panel-inner">
          <div className="space-y-1 p-1.5">
            {mod.menus.map((item) => (
              <SidebarMenuLink
                key={item.code}
                item={item}
                allMenuPaths={allMenuPaths}
                highlighted={highlightedCode === item.code}
                onHighlight={() => onHighlight(item.code)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [closedModules, setClosedModules] = useState(readClosedModules)
  const isDesktop = useDesktopSidebar()
  const rail = isDesktop && sidebarCollapsed
  const mainRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const menuSearchRef = useRef<HTMLInputElement>(null)
  const focusSearchAfterExpand = useRef(false)
  const menuSearchHintId = 'sidebar-menu-search-hint'
  const menuSearchListId = 'sidebar-menu-list'

  const focusMenuSearch = useCallback(() => {
    setOpen(true)
    if (isDesktop && sidebarCollapsed) {
      focusSearchAfterExpand.current = true
      setSidebarCollapsed(false)
      writeSidebarCollapsed(false)
      return
    }
    const input = menuSearchRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [isDesktop, sidebarCollapsed])

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

  useEffect(() => {
    if (sidebarCollapsed || !focusSearchAfterExpand.current) return
    focusSearchAfterExpand.current = false
    const input = menuSearchRef.current
    input?.focus()
    input?.select()
  }, [sidebarCollapsed])

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

  const navModules = useMemo(() => filterNavByAccess(APP_NAV, user), [user])

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

  const activeModuleCode = useMemo(() => {
    return navModules.find((mod) =>
      mod.menus.some((item) => isSidebarMenuActive(location.pathname, item.path, allMenuPaths)),
    )?.code
  }, [allMenuPaths, location.pathname, navModules])

  useEffect(() => {
    if (!activeModuleCode) return
    setClosedModules((prev) => {
      if (!prev.has(activeModuleCode)) return prev
      const next = new Set(prev)
      next.delete(activeModuleCode)
      writeClosedModules(next)
      return next
    })
  }, [activeModuleCode])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      writeSidebarCollapsed(next)
      return next
    })
  }, [])

  const toggleModule = useCallback(
    (code: string) => {
      if (rail) {
        setSidebarCollapsed(false)
        writeSidebarCollapsed(false)
        setClosedModules((prev) => {
          if (!prev.has(code)) return prev
          const next = new Set(prev)
          next.delete(code)
          writeClosedModules(next)
          return next
        })
        return
      }
      setClosedModules((prev) => {
        const next = new Set(prev)
        if (next.has(code)) next.delete(code)
        else next.add(code)
        writeClosedModules(next)
        return next
      })
    },
    [rail],
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
      if (!searching || event.nativeEvent.isComposing) return
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
      <div className="h-svh w-full overflow-hidden bg-cream-50">
        <div className="flex h-full w-full">
          {open ? (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-ink-900/20 lg:hidden"
              aria-label={t('nav.closeMenu')}
              onClick={() => setOpen(false)}
            />
          ) : null}
          <aside
            className={`fixed inset-y-0 start-0 z-40 flex h-svh w-[308px] shrink-0 flex-col overflow-hidden border-e border-teal-100 bg-gradient-to-b from-white via-teal-50/70 to-cream-50 shadow-[8px_0_28px_rgba(46,189,182,0.08)] transition-[width,transform] duration-300 ease-out motion-reduce:transition-none lg:relative lg:h-full lg:translate-x-0 ${
              rail ? 'lg:w-20' : ''
            } ${
              open
                ? 'translate-x-0'
                : 'ltr:-translate-x-full rtl:translate-x-full lg:ltr:translate-x-0 lg:rtl:translate-x-0'
            }`}
          >
            <div
              className="pointer-events-none absolute -start-16 top-24 size-44 rounded-full bg-teal-200/25 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -end-20 bottom-32 size-48 rounded-full bg-mint-100/70 blur-2xl"
              aria-hidden
            />

            <div
              className={`relative overflow-hidden border-b border-teal-100/80 bg-gradient-to-e from-mint-50 via-white to-teal-50 ${
                rail ? 'px-2 py-3' : 'px-5 py-5'
              }`}
            >
              <FormCardHeaderDecor />
              <div className={`relative flex items-center gap-3 ${rail ? 'flex-col gap-2' : ''}`}>
                <div className={`flex min-w-0 items-center gap-3 ${rail ? '' : 'flex-1'}`}>
                  <NavLink to="/dashboard" onClick={() => setOpen(false)} className="shrink-0">
                    <AppLogo decorative className="h-10 w-auto max-w-10 shrink-0 object-contain" />
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className={`text-sm font-semibold leading-snug text-ink-900 ${
                      rail ? 'sr-only' : 'min-w-0 flex-1'
                    }`}
                  >
                    {t('nav.panel')}
                  </NavLink>
                </div>
                <button
                  type="button"
                  className="hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-teal-300 bg-white text-teal-700 shadow-[0_4px_12px_rgba(46,189,182,0.16)] transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 lg:inline-flex"
                  onClick={toggleSidebar}
                  aria-expanded={!rail}
                  aria-controls={menuSearchListId}
                  aria-label={rail ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
                >
                  <ChevronsLeft
                    className={`size-4 transition-transform duration-300 motion-reduce:transition-none ${
                      rail ? 'ltr:rotate-180' : 'rtl:rotate-180'
                    }`}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-ink-500 lg:hidden"
                  onClick={() => setOpen(false)}
                  aria-label={t('nav.closeMenu')}
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div
              className="sidebar-module-panel"
              data-open={rail ? 'false' : 'true'}
              inert={rail}
            >
              <div className="sidebar-module-panel-inner">
                <div className="relative px-4 pb-3 pt-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-teal-500" />
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
                      className="w-full rounded-2xl border border-teal-100 bg-white/90 py-2.5 ps-10 pe-3 text-sm shadow-[0_6px_16px_rgba(46,189,182,0.08)] placeholder:text-ink-400"
                    />
                  </label>
                  <p id={menuSearchHintId} className="mt-2 px-1 text-[9px] leading-tight text-ink-400">
                    {t('nav.searchMenuHint')}
                  </p>
                </div>
              </div>
            </div>

            <nav
              ref={navRef}
              id={menuSearchListId}
              className="sidebar-nav relative flex-1 space-y-3 overflow-y-auto [overflow-anchor:none] px-2.5 pb-3"
              onScroll={(event) => writeSidebarNavScroll(event.currentTarget.scrollTop)}
            >
              {modules.map((mod, index) => (
                <SidebarModuleSection
                  key={mod.code}
                  mod={mod}
                  mintTone={index % 2 === 1}
                  moduleOpen={!rail && (searching || !closedModules.has(mod.code))}
                  rail={rail}
                  allMenuPaths={allMenuPaths}
                  highlightedCode={highlightedMenu?.code}
                  onToggle={() => toggleModule(mod.code)}
                  onHighlight={highlightMenu}
                  onNavigate={() => {
                    rememberSidebarScroll()
                    setOpen(false)
                  }}
                />
              ))}
            </nav>
            <div className="relative shrink-0 border-t border-teal-100/80 bg-gradient-to-e from-white via-teal-50/40 to-white px-3 py-3">
              <button
                type="button"
                className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl py-2.5 text-sm text-red-600 transition hover:bg-red-50 ${
                  rail ? 'justify-center px-2' : 'px-3'
                }`}
                onClick={() => {
                  const impersonating = Boolean(user?.impersonating)
                  setOpen(false)
                  logout()
                  if (!impersonating) navigate('/')
                }}
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                <span className={rail ? 'sr-only' : undefined}>
                  {user?.impersonating ? t('auth.impersonateEnd') : t('auth.logout')}
                </span>
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
            <ImpersonationBanner />
            <header className="z-20 flex min-w-0 shrink-0 items-center gap-2 bg-cream-50/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-8 sm:py-4">
              <button
                type="button"
                className="shrink-0 rounded-xl p-2 text-ink-700 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label={t('nav.openMenu')}
              >
                <Menu className="size-5" />
              </button>
              <PageBreadcrumb pathname={location.pathname} modules={APP_NAV} />
              <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
                <HeaderToday />
                <ProjectHeaderProgressButton />
                <UserMenu />
              </div>
            </header>
            <main
              ref={mainRef}
              className="min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-4 pb-8 sm:px-8"
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
  return (
    <Link
      id={sidebarMenuItemId(item.code)}
      to={item.path}
      onClick={onNavigate}
      onMouseEnter={onHighlight}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition ${
        isActive
          ? `bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_8px_16px_rgba(46,189,182,0.32)]${highlighted ? ' ring-2 ring-inset ring-white/70' : ''}`
          : highlighted
            ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
            : 'text-ink-700 hover:bg-teal-50 hover:text-teal-800'
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-xl transition ${
          isActive
            ? 'bg-white/20 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]'
            : highlighted
              ? 'bg-teal-100 text-teal-700'
              : 'bg-teal-50 text-teal-600 group-hover:bg-white group-hover:text-teal-700 group-hover:shadow-[0_4px_10px_rgba(46,189,182,0.16)]'
        }`}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{t(item.nameKey)}</span>
    </Link>
  )
}
