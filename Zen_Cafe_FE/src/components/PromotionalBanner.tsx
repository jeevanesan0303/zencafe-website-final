
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Sparkles, Tag } from 'lucide-react'
import {
  activeOffers,
  loadOffers,
  subscribeOffers,
  type ZenOffer,
} from '../data/offerStore'

export default function PromotionalBanner() {
  const [offers, setOffers] = useState<ZenOffer[]>(
    () => activeOffers().filter(offer => offer.active)
  )

  useEffect(() => {
    let mounted = true

    loadOffers()
      .then(items => {
        if (mounted) {
          setOffers(items.filter(offer => offer.active))
        }
      })
      .catch(error => {
        console.error('Failed to load promotional offers:', error)
      })

    const unsubscribe = subscribeOffers(() => {
      if (mounted) {
        setOffers(activeOffers().filter(offer => offer.active))
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const loopItems = useMemo(() => {
    return [...offers, ...offers]
  }, [offers])

  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty(
      '--zen-offers-height',
      offers.length > 0 ? '42px' : '0px'
    )

    return () => {
      root.style.removeProperty('--zen-offers-height')
    }
  }, [offers.length])

  if (!offers.length) {
    return null
  }

  return (
    <aside
      className="zen-promotional-banner zen-promo-banner-wrapper"
      aria-label="Live Zen Café promotions and special offers"
    >
      <div className="zen-promo-banner-inner">
        <div className="zen-promo-banner-glass">
          {/* LEFT: SPECIAL OFFERS BADGE */}
          <a
            href="/offers.html"
            className="zen-promo-tag-badge"
            aria-label="Explore all Zen Café special offers"
          >
            <Sparkles
              size={12}
              aria-hidden="true"
            />

            <span>Special Offers</span>
          </a>

          {/* CENTER: CONTINUOUS SCROLLING OFFERS */}
          <div
            className="zen-promo-marquee"
            role="region"
            aria-label="Current special offers"
            tabIndex={0}
          >
            <div className="zen-promo-track">
              {loopItems.map((offer, index) => {
                const duplicate = index >= offers.length

                return (
                  <a
                    key={`${offer.id}-${index}`}
                    href="/offers.html"
                    className="zen-promo-item"
                    aria-hidden={duplicate ? true : undefined}
                    tabIndex={duplicate ? -1 : 0}
                  >
                    {offer.badge && (
                      <span className="zen-promo-offer-badge">
                        <Tag
                          size={10}
                          aria-hidden="true"
                        />
                        {offer.badge}
                      </span>
                    )}

                    <span className="zen-promo-offer-title">
                      {offer.title}
                    </span>

                    {offer.description && (
                      <span className="zen-promo-offer-description">
                        — {offer.description.slice(0, 60)}
                        {offer.description.length > 60 ? '...' : ''}
                      </span>
                    )}

                    {offer.code && (
                      <span className="zen-promo-offer-code">
                        Code: {offer.code}
                      </span>
                    )}

                    <span
                      className="zen-promo-separator"
                      aria-hidden="true"
                    >
                      •
                    </span>
                  </a>
                )
              })}
            </div>
          </div>

          {/* RIGHT: VIEW ALL */}
          <a
            href="/offers.html"
            className="zen-promo-view-all"
            aria-label="View all Zen Café offers"
          >
            <span>View All</span>

            <ArrowRight
              size={14}
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </aside>
  )
}
