
import { ArrowUpRight, BadgePercent, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  activeOffers,
  loadOffers,
  subscribeOffers,
  type ZenOffer,
} from '../data/offerStore'

import OfferArtwork from './OfferArtwork'
import OfferComicBadge from './OfferComicBadge'

const SLIDE_MS = 5200

/* ==========================================
   FORMAT OFFER TIME
========================================== */

function formatOfferTime(dateLike: string) {
  const date = new Date(dateLike)

  if (Number.isNaN(date.getTime())) {
    return 'Live now'
  }

  const now = new Date()
  const diff = Math.max(0, now.getTime() - date.getTime())
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return 'Just added'
  if (mins < 60) return `${mins} min ago`

  const hours = Math.floor(mins / 60)

  if (hours < 24) {
    return `${hours} hr${hours > 1 ? 's' : ''} ago`
  }

  return `Added ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`
}

/* ==========================================
   HOME OFFERS SLIDER
========================================== */

export default function HomeOffersSlider() {
  const [offers, setOffers] = useState<ZenOffer[]>(
    () => activeOffers().filter(offer => offer.active)
  )

  const [index, setIndex] = useState(0)

  /* ==========================================
     LOAD AND SUBSCRIBE TO OFFERS
  ========================================== */

  useEffect(() => {
    let mounted = true

    loadOffers()
      .then(items => {
        if (!mounted) return

        setOffers(items.filter(offer => offer.active))
        setIndex(0)
      })
      .catch(error => {
        console.error('Failed to load Zen Café offers:', error)
      })

    const unsubscribe = subscribeOffers(() => {
      if (!mounted) return

      setOffers(activeOffers().filter(offer => offer.active))
      setIndex(0)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  /* ==========================================
     AUTOMATIC SLIDING
  ========================================== */

  useEffect(() => {
    if (offers.length < 2) return

    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % offers.length)
    }, SLIDE_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [offers.length])

  /* ==========================================
     SAFE ACTIVE INDEX
  ========================================== */

  const safeIndex =
    offers.length > 0
      ? Math.min(index, offers.length - 1)
      : 0

  /* ==========================================
     NO ACTIVE OFFERS
  ========================================== */

  if (!offers.length) {
    return null
  }

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <section
      className="zen-home-offers-band zen-home-offers-bottom-placement"
      aria-label="Live Zen Café offers"
    >
      <div className="zen-home-offers-shell">

        {/* LIVE OFFERS HEADER */}

        <div className="zen-home-offers-topline">

          <div className="zen-home-offers-live">
            <span aria-hidden="true" />

            <BadgePercent size={14} />

            <b>
              Live offer{offers.length === 1 ? '' : 's'}
            </b>
          </div>

          {offers.length > 1 && (
            <span className="zen-home-offers-count">
              {safeIndex + 1} / {offers.length}
            </span>
          )}

        </div>

        {/* OFFER SLIDER */}

        <div className="zen-home-offers-viewport">

          <div
            className="zen-home-offers-track"
            style={{
              transform: `translate3d(-${safeIndex * 100}%, 0, 0)`,
            }}
          >
            {offers.map(offer => (
              <HomeOfferCard
                key={offer.id}
                offer={offer}
              />
            ))}
          </div>

        </div>

        {/* PAGINATION DOTS */}

        {offers.length > 1 && (
          <div
            className="zen-home-offers-dots"
            aria-label="Choose offer"
          >
            {offers.map((offer, i) => (
              <button
                key={offer.id}
                type="button"
                aria-label={`Show offer ${i + 1}: ${offer.title}`}
                aria-current={
                  i === safeIndex ? 'true' : undefined
                }
                className={
                  i === safeIndex ? 'is-active' : ''
                }
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  )
}

/* ==========================================
   INDIVIDUAL OFFER CARD
========================================== */

function HomeOfferCard({
  offer,
}: {
  offer: ZenOffer
}) {
  return (
    <article className="zen-home-offer-slide">

      <div className="zen-home-offer-card">

        {/* OFFER ARTWORK */}

        <div className="zen-home-offer-art-panel">

          <div className="zen-home-offer-media">
            <OfferArtwork
              src={
                offer.image ||
                '/assets/menu-panda-main.png'
              }
              alt=""
              ariaHidden
            />
          </div>

          <OfferComicBadge
            compact
            text={
              offer.badge || 'SPECIAL OFFER'
            }
            className="zen-home-offer-comic-stamp"
          />

        </div>

        {/* OFFER DETAILS */}

        <div className="zen-home-offer-copy">

          <p>
            {offer.subtitle || 'Zen Café special'}
          </p>

          <h2>
            {offer.title}
          </h2>

          <span>
            {offer.description}
          </span>

          <div className="zen-home-offer-meta">
            <Clock3 size={12} />

            <span>
              {formatOfferTime(offer.createdAt)}
            </span>
          </div>

        </div>

        {/* VIEW OFFER */}

        <a
          className="zen-home-offer-link"
          href="/offers.html"
          aria-label={`View ${offer.title}`}
        >
          <span>View offer</span>

          <ArrowUpRight size={17} />
        </a>

      </div>
    </article>
  )
}
