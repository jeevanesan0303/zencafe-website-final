
import { useEffect, useRef, useState } from 'react'

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  ClipboardCheck,
  Clock3,
  Images,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

import Header from './components/Header'
import HeroSection from './components/HeroSection'
import HomeOffersSlider from './components/HomeOffersSlider'
import MenuCarousel from './components/MenuCarousel'
import { RoomBooking } from './components/BookingForms'
import PremiumFooter from './components/PremiumFooter'
import GlobalPetals from './components/GlobalPetals'
import MagneticButtons from './components/MagneticButtons'
import ScrollToTop from './components/ScrollToTop'
import FloatingSocialRail from './components/FloatingSocialRail'
import PageReveal from './components/PageReveal'
import RopePanda from './components/RopePanda'
import CommunityGallery from './components/CommunityGallery'

import {
  activeOffers,
  loadOffers,
  subscribeOffers,
  type ZenOffer,
} from './data/offerStore'

/* ==========================================
   TYPES
========================================== */

type OverviewCard = {
  title: string
  meta: string
  icon: LucideIcon
}

/* ==========================================
   SETTINGS
========================================== */

const OFFER_POPUP_DELAY_MS = 1500

const OFFER_POPUP_SESSION_KEY =
  'zen_cafe_offer_popup_dismissed'

/* ==========================================
   OVERVIEW CARDS
========================================== */

const overviewCards: OverviewCard[] = [
  {
    title: 'Signature menu',
    meta: 'Browse favourites',
    icon: UtensilsCrossed,
  },
  {
    title: 'Party room',
    meta: '10–15 guests · max 3h',
    icon: Users,
  },
  {
    title: 'Quick booking',
    meta: 'One simple request',
    icon: ClipboardCheck,
  },
  {
    title: 'Guest gallery',
    meta: 'Upload · browse',
    icon: Images,
  },
]

/* ==========================================
   SESSION HELPERS
========================================== */

function wasOfferPopupDismissed(): boolean {
  try {
    return (
      window.sessionStorage.getItem(
        OFFER_POPUP_SESSION_KEY
      ) === 'true'
    )
  } catch {
    return false
  }
}

function rememberOfferPopupDismissed(): void {
  try {
    window.sessionStorage.setItem(
      OFFER_POPUP_SESSION_KEY,
      'true'
    )
  } catch {
    // Continue without session storage.
  }
}

/* ==========================================
   SPECIAL OFFERS POPUP

   - Loads active offers from offerStore
   - Opens automatically after a short delay
   - Does not open if no offers are active
   - Supports multiple offers
   - Closes using X, Escape or backdrop
   - Shows once per browser session
   - Responsive desktop/mobile design
========================================== */

function SpecialOffersPopup() {
  const [offers, setOffers] = useState<ZenOffer[]>(
    () => activeOffers()
  )

  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const dismissedRef = useRef(false)
  const openedRef = useRef(false)
  const popupTimerRef = useRef<number | null>(null)

  /* ------------------------------------------
     LOAD OFFERS
  ------------------------------------------ */

  useEffect(() => {
    let mounted = true

    const updateOffers = (items: ZenOffer[]) => {
      if (!mounted) return

      setOffers(items.filter(offer => offer.active))
    }

    void loadOffers()
      .then(updateOffers)
      .catch(error => {
        console.error(
          'Unable to load Zen Café offers:',
          error
        )
      })

    const unsubscribe = subscribeOffers(() => {
      updateOffers(activeOffers())
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  /* ------------------------------------------
     SHOW POPUP ONCE PER SESSION
  ------------------------------------------ */

  useEffect(() => {
    if (
      offers.length === 0 ||
      dismissedRef.current ||
      openedRef.current ||
      wasOfferPopupDismissed()
    ) {
      return
    }

    popupTimerRef.current = window.setTimeout(() => {
      if (
        dismissedRef.current ||
        wasOfferPopupDismissed()
      ) {
        return
      }

      openedRef.current = true
      setIndex(0)
      setOpen(true)
    }, OFFER_POPUP_DELAY_MS)

    return () => {
      if (popupTimerRef.current !== null) {
        window.clearTimeout(popupTimerRef.current)
        popupTimerRef.current = null
      }
    }
  }, [offers.length])

  /* ------------------------------------------
     CLOSE POPUP
  ------------------------------------------ */

  const closePopup = () => {
    dismissedRef.current = true

    rememberOfferPopupDismissed()

    if (popupTimerRef.current !== null) {
      window.clearTimeout(popupTimerRef.current)
      popupTimerRef.current = null
    }

    setOpen(false)
  }

  /* ------------------------------------------
     KEYBOARD SUPPORT
  ------------------------------------------ */

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup()
      }

      if (event.key === 'ArrowRight') {
        setIndex(current =>
          offers.length
            ? (current + 1) % offers.length
            : 0
        )
      }

      if (event.key === 'ArrowLeft') {
        setIndex(current =>
          offers.length
            ? (current - 1 + offers.length) %
              offers.length
            : 0
        )
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener(
        'keydown',
        onKeyDown
      )
    }
  }, [open, offers.length])

  /* ------------------------------------------
     LOCK BACKGROUND SCROLL
  ------------------------------------------ */

  useEffect(() => {
    if (!open) return

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [open])

  /* ------------------------------------------
     OFFER NAVIGATION
  ------------------------------------------ */

  const nextOffer = () => {
    setIndex(current =>
      (current + 1) % offers.length
    )
  }

  const previousOffer = () => {
    setIndex(current =>
      (current - 1 + offers.length) %
      offers.length
    )
  }

  if (!open || offers.length === 0) {
    return null
  }

  const safeIndex = index % offers.length
  const offer = offers[safeIndex]

  const offerImage =
    offer.image || '/assets/menu-panda-main.png'

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#130b08]/65 px-4 py-6 backdrop-blur-[7px] sm:px-6"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          closePopup()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zen-offer-popup-title"
        aria-describedby="zen-offer-popup-description"
        className="relative my-auto w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[#f1dfd0] bg-[#fffaf5] shadow-[0_35px_100px_rgba(0,0,0,0.35)] sm:rounded-[34px]"
      >
        {/* CLOSE BUTTON */}

        <button
          type="button"
          data-no-magnet
          onClick={closePopup}
          aria-label="Close special offer"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-[#ead7c9] bg-white/95 text-[#50372d] shadow-md transition hover:scale-105 hover:bg-[#f8ebe1]"
        >
          <X size={19} />
        </button>

        {/* IMAGE SECTION */}

        <div className="relative h-[190px] overflow-hidden bg-gradient-to-br from-[#f5e1cf] via-[#f9ece0] to-[#e8c5ac] sm:h-[240px]">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, #fff 0, transparent 48%)',
            }}
          />

          <img
            src={offerImage}
            alt={offer.title}
            className="relative z-[1] h-full w-full object-contain p-5 drop-shadow-xl sm:p-7"
          />

          <div className="absolute bottom-3 left-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#9e2822] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-lg sm:left-6">
            <BadgePercent size={15} />
            {offer.badge || 'Special Offer'}
          </div>
        </div>

        {/* CONTENT */}

        <div className="px-5 pb-6 pt-6 sm:px-8 sm:pb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-[2px] w-6 bg-[#aa3328]" />

            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#a3382c]">
              Zen Café · Exclusive Offers
            </span>
          </div>

          <h2
            id="zen-offer-popup-title"
            className="font-serif text-[28px] font-semibold leading-tight text-[#2b1912] sm:text-[36px]"
          >
            {offer.title}
          </h2>

          {offer.subtitle && (
            <p className="mt-2 text-[12px] font-bold text-[#a13b2c] sm:text-[13px]">
              {offer.subtitle}
            </p>
          )}

          {offer.description && (
            <p
              id="zen-offer-popup-description"
              className="mt-3 max-h-24 overflow-y-auto text-[13px] leading-6 text-[#746057] sm:text-[14px]"
            >
              {offer.description}
            </p>
          )}

          {offer.code && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#cb8c76] bg-[#f9eae1] px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b5b4d]">
                Offer code
              </span>

              <span className="font-mono text-[13px] font-extrabold text-[#a12e25]">
                {offer.code}
              </span>
            </div>
          )}

          {/* MAIN ACTION */}

          <a
            href="/offers.html"
            onClick={closePopup}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#a52c27] px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_10px_25px_rgba(165,44,39,0.22)] transition hover:-translate-y-0.5 hover:bg-[#84221e]"
          >
            View Special Offer
            <ArrowUpRight size={17} />
          </a>

          {/* MULTIPLE OFFERS */}

          {offers.length > 1 && (
            <div className="mt-5 flex items-center justify-between border-t border-[#eadbd0] pt-4">
              <button
                type="button"
                data-no-magnet
                onClick={previousOffer}
                aria-label="Previous offer"
                className="grid h-9 w-9 place-items-center rounded-full border border-[#e8d5c8] bg-white text-[#744c3d] transition hover:bg-[#f7e8de]"
              >
                <ArrowLeft size={17} />
              </button>

              <div className="flex items-center gap-2">
                {offers.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    data-no-magnet
                    onClick={() => setIndex(itemIndex)}
                    aria-label={`Show offer ${itemIndex + 1}`}
                    aria-current={
                      itemIndex === safeIndex
                        ? 'true'
                        : undefined
                    }
                    className={`h-2 rounded-full transition-all duration-300 ${
                      itemIndex === safeIndex
                        ? 'w-6 bg-[#a52c27]'
                        : 'w-2 bg-[#dfc8b9] hover:bg-[#c9a18e]'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                data-no-magnet
                onClick={nextOffer}
                aria-label="Next offer"
                className="grid h-9 w-9 place-items-center rounded-full border border-[#e8d5c8] bg-white text-[#744c3d] transition hover:bg-[#f7e8de]"
              >
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-[10px] text-[#a28c7e]">
            Discover more delicious moments at Zen Café.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================
   APP
========================================== */

export default function App() {
  const [toast, setToast] = useState('')

  const toastTimerRef = useRef<number | null>(null)

  /* ==========================================
     TOAST NOTIFICATION
  ========================================== */

  const toastNow = (message: string) => {
    setToast(message)

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast('')
      toastTimerRef.current = null
    }, 2500)
  }

  /* ==========================================
     SCROLL RESTORATION
  ========================================== */

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    const scrollTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      })
    }

    const navEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming | undefined

    const isReload = navEntry?.type === 'reload'
    const requestedHash = window.location.hash

    let raf = 0
    let timer = 0

    if (isReload || !requestedHash) {
      scrollTop()

      raf = window.requestAnimationFrame(scrollTop)

      timer = window.setTimeout(scrollTop, 80)
    } else {
      timer = window.setTimeout(() => {
        const targetId = decodeURIComponent(
          requestedHash.slice(1)
        )

        const target = document.getElementById(targetId)

        target?.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        })
      }, 100)
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !window.location.hash) {
        scrollTop()
      }
    }

    const onBeforeUnload = () => {
      if (!window.location.hash || isReload) {
        scrollTop()
      }
    }

    window.addEventListener('pageshow', onPageShow)
    window.addEventListener(
      'beforeunload',
      onBeforeUnload
    )

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf)
      }

      window.clearTimeout(timer)

      window.removeEventListener(
        'pageshow',
        onPageShow
      )

      window.removeEventListener(
        'beforeunload',
        onBeforeUnload
      )
    }
  }, [])

  /* ==========================================
     TOAST CLEANUP
  ========================================== */

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <div className="zen-dark-scope zen-app-shell min-h-screen bg-[#f8f0e8] text-[#201713]">

      {/* ======================================
          GLOBAL WEBSITE COMPONENTS
      ====================================== */}

      <MagneticButtons />
      <GlobalPetals />
      <PageReveal />
      <ScrollToTop />
      <FloatingSocialRail />

      {/* ======================================
          CLEAN NAVIGATION HEADER

          Scrolling promotional banner removed.

          Important:
          Also remove PromotionalBanner
          from Header.tsx to prevent it
          appearing inside the navbar.
      ====================================== */}

      <Header />

      {/* ======================================
          HANGING PANDA

          Original component and animation
          are preserved.
      ====================================== */}

      <RopePanda />

      {/* ======================================
          AUTOMATIC SPECIAL OFFERS POPUP

          Uses existing offerStore.

          Shows once per browsing session.

          No backend modification required.
      ====================================== */}

      <SpecialOffersPopup />

      <main>

        {/* ======================================
            HERO SECTION

            Hero animation is preserved.

            Large offers slider stays below
            the hero section.
        ====================================== */}

        <div className="zen-hero-offers-layout">

          <HeroSection />

          {/* LARGE SPECIAL OFFERS SLIDER */}

          <div className="zen-hero-offers-bottom">
            <HomeOffersSlider />
          </div>

        </div>

        {/* ======================================
            ZEN ESSENTIALS
        ====================================== */}

        <section
          data-zen-reveal
          className="zen-overview-band zen-reveal relative z-10 -mt-[1px] overflow-hidden border-y border-[#5b3c2c]/10 bg-[#efe2d4]"
        >
          <div className="zen-overview-inner mx-auto max-w-[1500px] px-5 sm:px-10 lg:px-12">

            <div className="zen-overview-head">

              <div className="zen-overview-heading-copy">

                <p className="kicker">
                  Zen essentials
                </p>

                <h2 className="section-title">
                  Everything you need.
                  <br />
                  <span>Nothing extra.</span>
                </h2>

              </div>

              <p className="section-copy">
              </p>

            </div>

            <div className="zen-overview-grid">

              {overviewCards.map(item => {
                const Icon = item.icon

                return (
                  <article
                    key={item.title}
                    className="zen-overview-card"
                  >
                    <span className="zen-overview-icon">
                      <Icon size={18} />
                    </span>

                    <div className="zen-overview-card-copy">

                      <h3>{item.title}</h3>

                      <span className="zen-overview-meta">
                        {item.meta}
                      </span>

                    </div>
                  </article>
                )
              })}

            </div>

          </div>
        </section>

        {/* ======================================
            MENU SECTION
        ====================================== */}

        <MenuCarousel />

        {/* ======================================
            PARTY ROOM BOOKING
        ====================================== */}

        <section
          id="room-booking"
          data-zen-reveal
          aria-labelledby="zen-party-room-heading"
          className="zen-room-section section-shell zen-reveal relative overflow-hidden bg-[#eee1d4]"
        >
          <div className="room-section-inner mx-auto max-w-[1500px] px-5 py-20 sm:px-10 sm:py-24 lg:px-12 lg:py-28">

            {/* SECTION INTRO */}

            <div className="room-section-head room-section-head-v121 mb-10 lg:mb-14">

              <div>

                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-[#a83d2b]">
                  Zen Café · Private Celebrations
                </p>

                <h2
                  id="zen-party-room-heading"
                  className="section-title room-booking-title"
                >
                  A space for
                  <br />
                  <span>beautiful moments.</span>
                </h2>

                <div className="mt-5 h-[2px] w-16 bg-[#a83d2b]" />

              </div>

              <p className="section-copy max-w-[420px]">
              </p>

            </div>

            {/* ======================================
                ROOM INFORMATION STRIP
            ====================================== */}

            <div
              className="room-essentials-v121 mb-8 overflow-hidden rounded-2xl border border-[#e3c6b2] bg-[#f7e4d5] shadow-[0_12px_35px_rgba(73,39,25,0.05)]"
              aria-label="Party room essentials"
            >

              <div className="room-essential-v121">

                <Users size={21} strokeWidth={1.6} />

                <span>
                  <small>Room capacity</small>
                  <b>01–15 guests</b>
                </span>

              </div>

              <div className="room-essential-v121">

                <Clock3 size={21} strokeWidth={1.6} />

                <span>
                  <small>Maximum duration</small>
                  <b>Up to 3 hours</b>
                </span>

              </div>

              <div className="room-essential-v121">

                <ClipboardCheck
                  size={21}
                  strokeWidth={1.6}
                />

                <span>
                  <small>Booking confirmation</small>
                  <b>Via email</b>
                </span>

              </div>

            </div>

            {/* EXISTING BOOKING COMPONENT */}

            <RoomBooking toast={toastNow} />

          </div>

          {/* TRANSITION INTO GALLERY */}

          <div
            className="room-to-gallery-fade"
            aria-hidden="true"
          />

        </section>

        {/* ======================================
            COMMUNITY GALLERY
        ====================================== */}

        <CommunityGallery toast={toastNow} />

      </main>

      {/* ======================================
          FOOTER
      ====================================== */}

      <PremiumFooter />

      {/* ======================================
          GLOBAL TOAST
      ====================================== */}

      <div
        role="status"
        aria-live="polite"
        className={
          'fixed bottom-5 left-1/2 z-[200] ' +
          'max-w-[calc(100vw-32px)] -translate-x-1/2 ' +
          'rounded-full bg-[#24140e]/94 px-5 py-3 ' +
          'text-center text-[11px] font-semibold text-white ' +
          'shadow-2xl transition-all duration-300 ' +
          (toast
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0')
        }
      >
        {toast}
      </div>

    </div>
  )
}
