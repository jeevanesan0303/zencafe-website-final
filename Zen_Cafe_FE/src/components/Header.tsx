
import {
  DoorOpen,
  Gamepad2,
  Home,
  Images,
  MapPin,
  Menu,
  Sparkles,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import ThemeToggle from './ThemeToggle'
import './HeaderGamesActive.css'

/* ==========================================
   NAVIGATION CONFIGURATION
========================================== */

const links = [
  ['Home', 'home'],
  ['About', 'about'],
  ['Our Menu', 'menu'],
  ['Party Room', 'room-booking'],
  ['Gallery', 'gallery'],
  ['Contact', 'contact'],
] as const

const mobileLinks = [
  {
    label: 'Home',
    id: 'home',
    icon: Home,
  },
  {
    label: 'About',
    id: 'about',
    icon: Home,
  },
  {
    label: 'Our Menu',
    id: 'menu',
    icon: UtensilsCrossed,
  },
  {
    label: 'Party Room',
    id: 'room-booking',
    icon: DoorOpen,
  },
  {
    label: 'Gallery',
    id: 'gallery',
    icon: Images,
  },
  {
    label: 'Contact',
    id: 'contact',
    icon: MapPin,
  },
  {
    label: 'Games',
    href: '/games.html',
    icon: Gamepad2,
  },
  {
    label: 'Customer Register',
    href: '/register.html',
    icon: UserPlus,
  },
] as const

/* ==========================================
   ROUTE HELPERS
========================================== */

const pageRoutes: Record<string, string> = {
  home: '/',
  about: '/about',
  menu: '/menu',
  'room-booking': '/room-booking',
  gallery: '/gallery',
  contact: '/contact',
  games: '/games.html',
  'zen-kitchen': '/zen-kitchen.html',
  register: '/register.html',
}

const isHomePage = () => {
  const path = window.location.pathname
  return path === '/' || path === '/index.html'
}

const getActivePage = () => {
  const path = window.location.pathname
    .replace(/\/+$/, '')
    .replace(/\.html$/, '')

  if (path === '/zen-kitchen') return 'zen-kitchen'
  if (path === '/games') return 'games'
  if (path === '/register') return 'register'

  for (const [, id] of links) {
    if (id !== 'home' && path === `/${id}`) {
      return id
    }
  }

  return 'home'
}

/* ==========================================
   HEADER COMPONENT
========================================== */

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState(getActivePage)

  const activeLabel = useMemo(() => {
    if (active === 'zen-kitchen') return 'Zen Kitchen'
    if (active === 'games') return 'Games'
    if (active === 'register') return 'Customer Register'

    return (
      mobileLinks.find(item =>
        'id' in item && item.id === active
      )?.label || 'Home'
    )
  }, [active])

  /* ==========================================
     SCROLL + ACTIVE SECTION TRACKING
  ========================================== */

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 22)
    }

    onScroll()

    window.addEventListener('scroll', onScroll, {
      passive: true,
    })

    const observer = new IntersectionObserver(
      entries => {
        if (!isHomePage()) return

        const visibleEntry = entries
          .filter(entry => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          )[0]

        if (visibleEntry?.target.id) {
          setActive(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-28% 0px -58% 0px',
        threshold: [0, 0.2, 0.5],
      }
    )

    if (isHomePage()) {
      links.forEach(([, id]) => {
        const element = document.getElementById(id)

        if (element) {
          observer.observe(element)
        }
      })
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  /* ==========================================
     MOBILE MENU BEHAVIOUR
  ========================================== */

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const onResize = () => {
      if (window.innerWidth >= 1280) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  /* ==========================================
     NAVIGATION HANDLER
  ========================================== */

  const go = useCallback((id: string) => {
    setOpen(false)

    if (id === 'home' && !isHomePage()) {
      window.location.assign('/')
      return
    }

    if (id !== 'home' && pageRoutes[id]) {
      window.location.assign(pageRoutes[id])
      return
    }

    if (!isHomePage()) {
      window.location.assign(`/#${id}`)
      return
    }

    setActive(id)

    window.requestAnimationFrame(() => {
      const target = document.getElementById(id)

      if (!target) {
        if (id === 'home') {
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }
        return
      }

      const header =
        document.querySelector<HTMLElement>(
          '.zen-header-fixed'
        )

      const headerHeight =
        header?.getBoundingClientRect().height ?? 90

      const targetTop =
        target.getBoundingClientRect().top +
        window.scrollY

      const offset =
        id === 'home' ? 0 : headerHeight + 12

      window.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior: 'smooth',
      })
    })
  }, [])

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <header
      className={`zen-header-fixed fixed inset-x-0 top-0 z-[90] px-4 sm:px-7 lg:px-12 ${
        scrolled ? 'is-scrolled pt-2' : 'pt-2.5'
      }`}
      aria-label="Zen Café main header"
    >
      <div className="zen-header-glass zen-header-clean zen-header-always zen-mobile-header-bar relative z-[3] mx-auto flex max-w-[1500px] items-center justify-between rounded-full border px-3 py-2">

        {/* BRAND */}

        <button
          type="button"
          data-no-magnet
          onClick={() => go('home')}
          className="zen-mobile-brand-button flex items-center gap-3 rounded-full pr-3 text-left"
          aria-label="Zen Café — Go to home"
        >
          <img
            src="/assets/zen-logo.png"
            alt="Zen Café"
            className="h-12 w-12 rounded-full object-contain sm:h-14 sm:w-14"
          />

          <span className="leading-none">
            <b className="zen-navbar-brand-japan block text-[21px] sm:text-[24px]">
              ZEN CAFE
            </b>

            <small className="mt-1 hidden text-[7px] font-semibold uppercase tracking-[.16em] text-[#76665c] sm:block">
              Jaffna · Café · Party Room
            </small>
          </span>
        </button>

        {/* DESKTOP NAVIGATION */}

        <nav
          className="zen-nav-glass hidden items-center gap-1 rounded-full p-1 xl:flex"
          aria-label="Desktop navigation"
        >
          {links.map(([label, id]) => (
            <button
              type="button"
              key={id}
              onClick={() => go(id)}
              className={`zen-nav-pill rounded-full px-4 py-3 text-[9px] font-semibold uppercase tracking-[.1em] ${
                active === id
                  ? 'is-active text-white'
                  : 'text-[#56473f]'
              }`}
              aria-current={
                active === id ? 'page' : undefined
              }
            >
              {label}
            </button>
          ))}

          {/* GAMES */}

          <a
            href="/games.html"
            aria-current={
              active === 'games' ? 'page' : undefined
            }
            className={`zen-nav-pill zen-games-nav-link inline-flex items-center gap-2 rounded-full px-4 py-3 text-[9px] font-semibold uppercase tracking-[.1em] ${
              active === 'games'
                ? 'is-active text-white'
                : 'text-[#56473f]'
            }`}
          >
            <Gamepad2 size={15} aria-hidden="true" />
            <span>Games</span>
          </a>
        </nav>

        {/* HEADER ACTIONS */}

        <div className="zen-header-actions flex items-center gap-2">

          {/* MOBILE ACTIVE PAGE */}

          <div
            className="zen-mobile-current-chip xl:hidden"
            aria-live="polite"
          >
            <span className="zen-mobile-current-dot" />
            <span>{activeLabel}</span>
          </div>

          {/* THEME TOGGLE */}

          <ThemeToggle />

          {/* CUSTOMER REGISTER */}

          <a
            href="/register.html"
            aria-current={
              active === 'register' ? 'page' : undefined
            }
            className={`zen-register-nav-link zen-customer-register-btn hidden xl:inline-flex ${
              active === 'register' ? 'is-active' : ''
            }`}
            aria-label="Customer registration"
          >
            <UserPlus size={15} />
            <span>Register</span>
          </a>

          {/* ZEN KITCHEN — ACTIVE LINK */}

          <a
            href="/zen-kitchen.html"
            aria-current={
              active === 'zen-kitchen'
                ? 'page'
                : undefined
            }
            className={`zen-glass-light zen-kitchen-nav-btn hidden h-11 items-center gap-2 rounded-full px-3 pr-4 text-[9px] font-semibold uppercase tracking-[.1em] md:inline-flex ${
              active === 'zen-kitchen'
                ? 'is-active zen-kitchen-active'
                : 'text-[#5d4c43]'
            }`}
          >
            <img
              src="/assets/zen-kitchen-nav-panda.png"
              alt="Zen Kitchen panda"
              className="zen-kitchen-nav-panda"
            />
            <span>Zen Kitchen</span>
          </a>

          {/* BOOK ROOM */}

          <button
            type="button"
            onClick={() => go('room-booking')}
            className={`zen-glass-red hidden items-center gap-2 rounded-full px-5 py-3 text-[9px] font-semibold uppercase tracking-[.1em] text-white sm:inline-flex ${
              active === 'room-booking'
                ? 'is-active'
                : ''
            }`}
          >
            <DoorOpen size={15} />
            Book Room
          </button>

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            data-no-magnet
            onClick={() => setOpen(value => !value)}
            className={`zen-glass-icon zen-mobile-menu-trigger grid h-11 w-11 place-items-center rounded-full xl:hidden ${
              open ? 'is-open' : ''
            }`}
            aria-label={
              open
                ? 'Close navigation'
                : 'Open navigation'
            }
            aria-expanded={open}
            aria-controls="zen-mobile-navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE BACKDROP */}

      {open && (
        <button
          type="button"
          data-no-magnet
          className="zen-mobile-nav-backdrop xl:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      {/* MOBILE NAVIGATION PANEL */}

      {open && (
        <div
          id="zen-mobile-navigation"
          className="zen-mobile-nav-sheet zen-mobile-glass zen-mobile-glass-fixed xl:hidden"
          aria-label="Zen Café navigation"
        >
          <div className="zen-mobile-nav-compact-head">
            <span>
              <Sparkles size={12} />
              Menu
            </span>
            <b>{activeLabel}</b>
          </div>

          <nav
            className="zen-mobile-nav-list zen-mobile-nav-list-compact"
            aria-label="Mobile navigation"
          >
            {mobileLinks.map(item => {
              const Icon = item.icon
              const isSection = 'id' in item

              const isActive = isSection
                ? active === item.id
                : item.label === 'Games'
                  ? active === 'games'
                  : active === 'register'

              const content = (
                <>
                  <span className="zen-mobile-nav-icon">
                    <Icon size={17} />
                  </span>

                  <span className="zen-mobile-nav-label">
                    {item.label}
                  </span>

                  {isActive && (
                    <span
                      className="zen-mobile-nav-active-dot"
                      aria-hidden="true"
                    />
                  )}
                </>
              )

              if (isSection) {
                return (
                  <button
                    type="button"
                    data-no-magnet
                    key={item.label}
                    onClick={() => go(item.id)}
                    className={`zen-mobile-link zen-mobile-nav-item zen-mobile-nav-item-compact ${
                      isActive ? 'is-active' : ''
                    }`}
                    aria-current={
                      isActive ? 'page' : undefined
                    }
                  >
                    {content}
                  </button>
                )
              }

              return (
                <a
                  key={item.label}
                  data-no-magnet
                  href={item.href}
                  aria-current={
                    isActive ? 'page' : undefined
                  }
                  onClick={() => setOpen(false)}
                  className={`zen-mobile-link zen-mobile-nav-item zen-mobile-nav-item-compact ${
                    item.label === 'Games'
                      ? 'zen-games-nav-link'
                      : ''
                  } ${
                    isActive ? 'is-active' : ''
                  }`}
                >
                  {content}
                </a>
              )
            })}
          </nav>

          {/* MOBILE QUICK ACTIONS */}

          <div className="zen-mobile-nav-quick-actions">

            {/* ZEN KITCHEN */}

            <a
              href="/zen-kitchen.html"
              data-no-magnet
              aria-current={
                active === 'zen-kitchen'
                  ? 'page'
                  : undefined
              }
              className={`zen-mobile-quick-action zen-mobile-quick-kitchen ${
                active === 'zen-kitchen'
                  ? 'is-active zen-kitchen-active'
                  : ''
              }`}
              onClick={() => setOpen(false)}
            >
              <img
                src="/assets/zen-kitchen-nav-panda.png"
                alt=""
                aria-hidden="true"
              />
              <span>Zen Kitchen</span>
            </a>

            {/* BOOK ROOM */}

            <button
              type="button"
              data-no-magnet
              onClick={() => go('room-booking')}
              className={`zen-mobile-quick-action zen-mobile-quick-book ${
                active === 'room-booking'
                  ? 'is-active'
                  : ''
              }`}
            >
              <DoorOpen size={16} />
              <span>Book Room</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
