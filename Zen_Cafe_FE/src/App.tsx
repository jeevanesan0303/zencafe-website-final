
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
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
  isOfferCurrentlyActive,
  loadOffers,
  subscribeOffers,
  type ZenOffer,
} from './data/offerStore'

/* =========================================================
   TYPES AND CONFIGURATION
========================================================= */

type OverviewCard = {
  title: string
  meta: string
  icon: LucideIcon
}

const OFFER_POPUP_DELAY_MS = 1500
const OFFER_POPUP_SESSION_KEY = 'zen_cafe_offer_popup_dismissed'

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

/* =========================================================
   POPUP SESSION HELPERS
========================================================= */

function wasPopupDismissed(): boolean {
  try {
    return (
      sessionStorage.getItem(OFFER_POPUP_SESSION_KEY) === 'true'
    )
  } catch {
    return false
  }
}

function rememberPopupDismissed(): void {
  try {
    sessionStorage.setItem(OFFER_POPUP_SESSION_KEY, 'true')
  } catch {
    // Session storage may be unavailable.
  }
}

/* =========================================================
   DISCOUNT FORMATTER
========================================================= */

function getOfferDiscount(offer: ZenOffer): string | null {
  const value = offer.discountValue

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null
  }

  if (offer.discountType === 'percentage') {
    return `${value.toLocaleString('en-LK', {
      maximumFractionDigits: 2,
    })}%`
  }

  if (offer.discountType === 'fixed') {
    return `LKR ${value.toLocaleString('en-LK', {
      maximumFractionDigits: 2,
    })}`
  }

  return null
}

/* =========================================================
   PREMIUM PROMOTIONAL POPUP STYLES

   Reference:
   - Ivory / cream background
   - Burgundy and gold details
   - Large promotional food artwork
   - Elegant serif headline
   - Gold outlined savings pill
   - Premium red CTA
========================================================= */

const OFFER_POPUP_CSS = `
.zen-luxury-offer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  overflow-y: auto;
  background: rgba(17, 9, 7, .76);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
  animation: zenOfferFade .3s ease both;
}

.zen-luxury-offer-modal {
  position: relative;
  isolation: isolate;
  width: 100%;
  max-width: 570px;
  max-height: calc(100dvh - 36px);
  margin: auto;
  overflow-x: hidden;
  overflow-y: auto;
  border: 2px solid #d8aa65;
  border-radius: 34px;
  background:
    radial-gradient(ellipse at 50% 12%, #fffdf8 0%, transparent 60%),
    repeating-linear-gradient(
      135deg,
      transparent 0px,
      transparent 28px,
      rgba(185, 132, 75, .022) 29px,
      transparent 30px
    ),
    #fff2e5;
  box-shadow:
    0 35px 100px rgba(0,0,0,.4),
    inset 0 0 0 3px rgba(255,255,255,.65);
  color: #40180f;
  text-align: center;
  animation: zenOfferEnter .45s cubic-bezier(.2,.8,.2,1) both;
  scrollbar-width: thin;
  scrollbar-color: #d8aa65 transparent;
}

.zen-luxury-offer-close {
  position: absolute;
  top: 17px;
  right: 17px;
  z-index: 20;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 2px solid #d6a65e;
  border-radius: 50%;
  background: rgba(255,249,241,.97);
  color: #78110c;
  box-shadow: 0 4px 12px rgba(72,30,13,.17);
  cursor: pointer;
  transition: transform .2s, background .2s;
}

.zen-luxury-offer-close:hover {
  transform: rotate(90deg);
  background: white;
}

.zen-luxury-offer-art {
  position: relative;
  height: 280px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 70%, #e4b98b 0%, transparent 60%),
    linear-gradient(160deg, #fff7ee, #f7dfc6);
}

.zen-luxury-offer-art::before {
  content: "";
  position: absolute;
  z-index: 0;
  left: 16%;
  right: 16%;
  top: 38px;
  bottom: -80px;
  border: 3px solid #c7954e;
  border-radius: 48% 48% 0 0;
  background: radial-gradient(
    ellipse at 50% 30%,
    #92251a 0%,
    #5a130e 80%
  );
  box-shadow: inset 0 0 0 4px #f3d6a4;
}

.zen-luxury-offer-art::after {
  content: "";
  position: absolute;
  z-index: 1;
  left: -10%;
  bottom: -100px;
  width: 120%;
  height: 145px;
  border-radius: 50%;
  background: #fff1e2;
}

.zen-luxury-offer-food {
  position: relative;
  z-index: 3;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 15px 38px 0;
  filter: drop-shadow(0 14px 12px rgba(42,17,8,.2));
}

.zen-luxury-offer-discount {
  position: absolute;
  z-index: 5;
  top: 75px;
  left: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 125px;
  min-height: 105px;
  padding: 12px 8px;
  border: 3px double #f0c578;
  border-radius: 24px;
  background: linear-gradient(145deg, #aa100e, #6c0807);
  color: #ffe7b6;
  box-shadow: 0 7px 15px rgba(63,15,10,.25);
  transform: rotate(-7deg);
}

.zen-luxury-offer-discount strong {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.zen-luxury-offer-discount small {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .08em;
}

.zen-luxury-offer-content {
  position: relative;
  z-index: 4;
  padding: 13px 35px 27px;
}

.zen-luxury-offer-eyebrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
  color: #8e1510;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .24em;
  text-transform: uppercase;
}

.zen-luxury-offer-eyebrow::before,
.zen-luxury-offer-eyebrow::after {
  content: "";
  width: 45px;
  height: 1.5px;
  background: #a41d16;
}

.zen-luxury-offer-title {
  margin: 0;
  color: #48190f;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(37px, 7vw, 66px);
  font-weight: 500;
  line-height: 1.06;
  letter-spacing: -.035em;
  overflow-wrap: anywhere;
}

.zen-luxury-offer-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px auto 15px;
}

.zen-luxury-offer-ornament::before,
.zen-luxury-offer-ornament::after {
  content: "";
  width: 54px;
  height: 1px;
  background: #d3a05b;
}

.zen-luxury-offer-ornament span {
  width: 38px;
  height: 8px;
  border-top: 2px solid #d3a05b;
  border-radius: 50%;
}

.zen-luxury-offer-saving {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  min-height: 51px;
  padding: 8px 25px;
  border: 1.5px solid #dfab60;
  border-radius: 999px;
  background: linear-gradient(#fff8ee, #fbe4ce);
  color: #8b100c;
  box-shadow: 0 4px 0 rgba(191,128,57,.14);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(20px, 4vw, 29px);
  font-weight: 700;
  font-style: italic;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.zen-luxury-offer-subtitle {
  margin: 16px 0 0;
  color: #5b3428;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.zen-luxury-offer-description {
  margin: 8px auto 0;
  max-width: 420px;
  color: #6c4b3c;
  font-size: 14px;
  line-height: 1.6;
}

.zen-luxury-offer-code {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-top: 13px;
  padding: 8px 13px;
  border: 1px dashed #bd8b57;
  border-radius: 10px;
  background: #fff9f0;
  color: #7c2a1b;
  font-size: 12px;
  font-weight: 700;
}

.zen-luxury-offer-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  min-height: 63px;
  margin-top: 22px;
  padding: 14px 22px;
  border: 2px solid #d6a354;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    #b61913 0%,
    #900a08 55%,
    #6e0505 100%
  );
  color: #fffaf1;
  box-shadow:
    0 9px 18px rgba(111,13,8,.23),
    inset 0 2px 0 rgba(255,255,255,.22);
  font-size: 15px;
  font-weight: 900;
  letter-spacing: .1em;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform .2s, box-shadow .2s;
}

.zen-luxury-offer-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 22px rgba(111,13,8,.32);
}

.zen-luxury-offer-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 17px;
}

.zen-luxury-offer-arrow {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #d6aa78;
  border-radius: 50%;
  background: #fff9f2;
  color: #83190f;
  cursor: pointer;
}

.zen-luxury-offer-dots {
  display: flex;
  align-items: center;
  gap: 7px;
}

.zen-luxury-offer-dot {
  width: 8px;
  height: 8px;
  border: 0;
  border-radius: 50%;
  background: #d8b89c;
  cursor: pointer;
  transition: width .2s, background .2s;
}

.zen-luxury-offer-dot.is-active {
  width: 24px;
  border-radius: 10px;
  background: #9d1912;
}

.zen-luxury-offer-bottom {
  position: relative;
  height: 18px;
  overflow: hidden;
  background: #8b110d;
}

.zen-luxury-offer-bottom::before {
  content: "";
  position: absolute;
  top: -16px;
  left: -5%;
  width: 110%;
  height: 23px;
  border-radius: 50%;
  background: #fff2e5;
  border-bottom: 2px solid #d8a85f;
}

@keyframes zenOfferFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zenOfferEnter {
  from {
    opacity: 0;
    transform: translateY(22px) scale(.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .zen-luxury-offer-overlay {
    padding: 12px;
  }

  .zen-luxury-offer-modal {
    max-height: calc(100dvh - 24px);
    border-radius: 26px;
  }

  .zen-luxury-offer-art {
    height: 215px;
  }

  .zen-luxury-offer-food {
    padding: 18px 25px 0;
  }

  .zen-luxury-offer-discount {
    top: 67px;
    left: 10px;
    width: 94px;
    min-height: 82px;
    border-radius: 17px;
  }

  .zen-luxury-offer-discount strong {
    font-size: 16px;
  }

  .zen-luxury-offer-discount small {
    font-size: 10px;
  }

  .zen-luxury-offer-close {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
  }

  .zen-luxury-offer-content {
    padding: 10px 19px 22px;
  }

  .zen-luxury-offer-eyebrow {
    gap: 9px;
    font-size: 9px;
    letter-spacing: .13em;
  }

  .zen-luxury-offer-eyebrow::before,
  .zen-luxury-offer-eyebrow::after {
    width: 24px;
  }

  .zen-luxury-offer-subtitle {
    font-size: 14px;
  }

  .zen-luxury-offer-description {
    font-size: 12px;
  }

  .zen-luxury-offer-cta {
    min-height: 55px;
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zen-luxury-offer-overlay,
  .zen-luxury-offer-modal {
    animation: none !important;
  }

  .zen-luxury-offer-cta,
  .zen-luxury-offer-close {
    transition: none !important;
  }
}
`

/* =========================================================
   SPECIAL OFFERS POPUP
========================================================= */

function SpecialOffersPopup() {
  const [offers, setOffers] = useState<ZenOffer[]>(
    () => activeOffers(),
  )
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const dismissedRef = useRef(false)
  const openedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  /* Load offers from the live API */

  useEffect(() => {
    let mounted = true

    const update = (items: ZenOffer[]) => {
      if (!mounted) return

      setOffers(
        items.filter(offer => isOfferCurrentlyActive(offer)),
      )
    }

    const unsubscribe = subscribeOffers(() => {
      update(activeOffers())
    })

    void loadOffers()
      .then(items => {
        update(items)
      })
      .catch(error => {
        console.error('[Zen Café] Offer popup:', error)
        update(activeOffers())
      })
      .finally(() => {
        if (mounted) setLoaded(true)
      })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  /* Automatic popup, once per session */

  useEffect(() => {
    if (
      !loaded ||
      offers.length === 0 ||
      openedRef.current ||
      dismissedRef.current ||
      wasPopupDismissed()
    ) {
      return
    }

    timerRef.current = window.setTimeout(() => {
      if (
        !dismissedRef.current &&
        !wasPopupDismissed()
      ) {
        openedRef.current = true
        setIndex(0)
        setOpen(true)
      }
    }, OFFER_POPUP_DELAY_MS)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [loaded, offers.length])

  const closePopup = useCallback(() => {
    dismissedRef.current = true
    rememberPopupDismissed()
    setOpen(false)
  }, [])

  /* Escape, arrow keys and focus management */

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement

    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePopup()
        return
      }

      if (event.key === 'ArrowRight' && offers.length > 1) {
        setIndex(current => (current + 1) % offers.length)
      }

      if (event.key === 'ArrowLeft' && offers.length > 1) {
        setIndex(
          current =>
            (current - 1 + offers.length) % offers.length,
        )
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusables =
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          )

        if (!focusables.length) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus()
      }
    }
  }, [open, offers.length, closePopup])

  /* Close automatically if all offers become inactive */

  useEffect(() => {
    if (open && offers.length === 0) {
      closePopup()
    }
  }, [open, offers.length, closePopup])

  if (!open || offers.length === 0) {
    return null
  }

  const safeIndex = index % offers.length
  const offer = offers[safeIndex]

  const discount = getOfferDiscount(offer)
  const displayBadge = offer.badge.trim()
  const subtitle = offer.subtitle.trim()
  const description = offer.description.trim()
  const image = offer.image.trim()
  const code = offer.code?.trim()

  const discountLabel = discount
    ? `Save ${discount}`
    : displayBadge || 'Exclusive Offer'

  return (
    <>
      <style>{OFFER_POPUP_CSS}</style>

      <div
        className="zen-luxury-offer-overlay"
        onMouseDown={event => {
          if (event.target === event.currentTarget) {
            closePopup()
          }
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="zen-luxury-offer-title"
          aria-describedby={
            description
              ? 'zen-luxury-offer-description'
              : undefined
          }
          className="zen-luxury-offer-modal"
        >
          {/* Close button */}

          <button
            ref={closeRef}
            type="button"
            data-no-magnet
            onClick={closePopup}
            className="zen-luxury-offer-close"
            aria-label="Close special offer"
          >
            <X size={24} strokeWidth={2.2} />
          </button>

          {/* Promotional artwork */}

          <div className="zen-luxury-offer-art">
            {image ? (
              <img
                key={offer.id}
                src={image}
                alt={offer.title}
                className="zen-luxury-offer-food"
              />
            ) : (
              <img
                src="/assets/zen-logo.png"
                alt="Zen Café"
                className="zen-luxury-offer-food"
              />
            )}

            {(discount || displayBadge) && (
              <div className="zen-luxury-offer-discount">
                <strong>
                  {discount || displayBadge}
                </strong>

                {discount && <small>OFF</small>}
              </div>
            )}
          </div>

          {/* Offer information */}

          <div className="zen-luxury-offer-content">
            <div className="zen-luxury-offer-eyebrow">
              Zen Café · Exclusive Offers
            </div>

            <h2
              id="zen-luxury-offer-title"
              className="zen-luxury-offer-title"
            >
              {offer.title}
            </h2>

            <div
              className="zen-luxury-offer-ornament"
              aria-hidden="true"
            >
              <span />
            </div>

            <div className="zen-luxury-offer-saving">
              {discountLabel}
            </div>

            {subtitle && (
              <p className="zen-luxury-offer-subtitle">
                {subtitle}
              </p>
            )}

            {description && (
              <p
                id="zen-luxury-offer-description"
                className="zen-luxury-offer-description"
              >
                {description}
              </p>
            )}

            {code && (
              <div className="zen-luxury-offer-code">
                <span>OFFER CODE:</span>
                <strong>{code}</strong>
              </div>
            )}

            {/* CTA */}

            <a
              href="/offers.html"
              className="zen-luxury-offer-cta"
              onClick={closePopup}
            >
              <span>View Special Offer</span>
              <ArrowRight size={22} />
            </a>

            {/* Multiple offers */}

            {offers.length > 1 && (
              <div className="zen-luxury-offer-controls">
                <button
                  type="button"
                  data-no-magnet
                  className="zen-luxury-offer-arrow"
                  onClick={() =>
                    setIndex(
                      current =>
                        (current - 1 + offers.length) %
                        offers.length,
                    )
                  }
                  aria-label="Previous offer"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="zen-luxury-offer-dots">
                  {offers.map((item, itemIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      data-no-magnet
                      className={`zen-luxury-offer-dot ${
                        itemIndex === safeIndex
                          ? 'is-active'
                          : ''
                      }`}
                      aria-label={`Show offer ${itemIndex + 1}`}
                      aria-current={
                        itemIndex === safeIndex
                          ? 'true'
                          : undefined
                      }
                      onClick={() => setIndex(itemIndex)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  data-no-magnet
                  className="zen-luxury-offer-arrow"
                  onClick={() =>
                    setIndex(
                      current =>
                        (current + 1) % offers.length,
                    )
                  }
                  aria-label="Next offer"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>

          <div
            className="zen-luxury-offer-bottom"
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  )
}

/* =========================================================
   MAIN APPLICATION
========================================================= */

export default function App() {
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<number | null>(null)

  /* Toast notification */

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

  /* Preserve original scroll restoration */

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
      'navigation',
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
          requestedHash.slice(1),
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
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)

      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener(
        'beforeunload',
        onBeforeUnload,
      )
    }
  }, [])

  /* Toast cleanup */

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="zen-dark-scope zen-app-shell min-h-screen bg-[#f8f0e8] text-[#201713]">
      {/* Global effects and navigation */}

      <MagneticButtons />
      <GlobalPetals />
      <PageReveal />
      <ScrollToTop />
      <FloatingSocialRail />

      <Header />

      {/* Original hanging panda */}

      <RopePanda />

      {/* New premium promotional popup */}

      <SpecialOffersPopup />

      <main>
        {/* Hero and existing large offers slider */}

        <div className="zen-hero-offers-layout">
          <HeroSection />

          <div className="zen-hero-offers-bottom">
            <HomeOffersSlider />
          </div>
        </div>

        {/* Zen essentials */}

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

              <p className="section-copy" />
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

        {/* Menu section */}

        <MenuCarousel />

        {/* Party room booking */}

        <section
          id="room-booking"
          data-zen-reveal
          aria-labelledby="zen-party-room-heading"
          className="zen-room-section section-shell zen-reveal relative overflow-hidden bg-[#eee1d4]"
        >
          <div className="room-section-inner mx-auto max-w-[1500px] px-5 py-20 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
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

              <p className="section-copy max-w-[420px]" />
            </div>

            {/* Room information strip */}

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

            {/* Existing booking form */}

            <RoomBooking toast={toastNow} />
          </div>

          <div
            className="room-to-gallery-fade"
            aria-hidden="true"
          />
        </section>

        {/* Community gallery */}

        <CommunityGallery toast={toastNow} />
      </main>

      {/* Footer */}

      <PremiumFooter />

      {/* Global toast */}

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
