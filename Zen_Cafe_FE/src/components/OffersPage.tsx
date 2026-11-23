import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Gift,
  RefreshCw,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import ThemeToggle from './ThemeToggle'
import OfferArtwork from './OfferArtwork'

import {
  activeOffers,
  loadOffers,
  subscribeOffers,
  isOfferCurrentlyActive,
  type ZenOffer,
} from '../data/offerStore'

import './OffersPage.css'

export default function OffersPage() {
  const [offers, setOffers] = useState<ZenOffer[]>(
    () => activeOffers(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let alive = true

    const sync = () => {
      if (alive) {
        setOffers(activeOffers())
      }
    }

    const unsubscribe = subscribeOffers(sync)

    setLoading(true)

    loadOffers()
      .then((items) => {
        if (!alive) return

        setOffers(
          items.filter((offer) =>
            isOfferCurrentlyActive(offer),
          ),
        )
        setError(false)
      })
      .catch(() => {
        if (alive) {
          setError(true)
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
        }
      })

    // Re-check scheduled availability using the existing store.
    const timer = window.setInterval(sync, 30_000)

    return () => {
      alive = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [retry])

  const browseOffers = () => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    document.getElementById('live-offers')?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const statusText = loading
    ? 'Checking specials…'
    : error
      ? 'Could not refresh offers'
      : `${offers.length} ${
          offers.length === 1 ? 'special' : 'specials'
        } available`

  return (
    <div id="zen-specials">
      <header className="zs-header">
        <a
          href="/"
          className="zs-brand"
          aria-label="Zen Café home"
        >
          <img src="/assets/zen-logo.png" alt="" />

          <span>
            <b>ZEN CAFÉ</b>
            <small>Good food. Better moments.</small>
          </span>
        </a>

        <nav aria-label="Offers navigation">
          <a href="/" className="zs-home">
            <ArrowLeft size={16} aria-hidden="true" />
            Home
          </a>

          <a href="/menu" className="zs-menu-link">
            Our menu
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>

          <ThemeToggle />
        </nav>
      </header>

      <main>
        <section
          className="zs-hero"
          aria-labelledby="zs-title"
        >
          <div className="zs-hero-copy">
            <span className="zs-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              A LITTLE EXTRA ZEN
            </span>

            <h1 id="zs-title">
              Good moments.
              <br />
              <em>Lovely little offers.</em>
            </h1>

            <p>
              Make your next café visit a little sweeter.
              Explore the specials waiting for you at Zen Café.
            </p>

            <button
              className="zs-primary"
              type="button"
              onClick={browseOffers}
            >
              Explore specials
              <ArrowDown size={17} aria-hidden="true" />
            </button>
          </div>

          <span className="zs-hero-note">
            <Gift size={18} aria-hidden="true" />
            Something to smile about
          </span>
        </section>

        <section
          id="live-offers"
          className="zs-offers"
          aria-labelledby="zs-offers-title"
          aria-busy={loading}
        >
          <div className="zs-section-heading">
            <div>
              <span className="zs-eyebrow">
                PICK YOUR HAPPY MOMENT
              </span>

              <h2 id="zs-offers-title">Fresh from Zen</h2>
            </div>

            <span className="zs-count" role="status">
              {statusText}
            </span>
          </div>

          {error && (
            <div className="zs-error" role="alert">
              <span>
                We couldn’t refresh the offers.
                {offers.length > 0 &&
                  ' Showing previously loaded specials; please confirm availability.'}
              </span>

              <button
                type="button"
                disabled={loading}
                onClick={() => setRetry((value) => value + 1)}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {loading ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}

          {offers.length > 0 ? (
            <div
              className={`zs-grid ${
                offers.length === 1 ? 'zs-single' : ''
              }`}
            >
              {offers.map((offer, index) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="zs-empty">
              <Gift size={36} aria-hidden="true" />

              <h3>
                {loading
                  ? 'Finding your next treat…'
                  : error
                    ? 'Specials are temporarily unavailable'
                    : 'A fresh special is on its way.'}
              </h3>

              <p>
                {loading
                  ? 'Just a moment while we check our offers.'
                  : 'There’s still plenty to enjoy. Discover your favourites on our café menu.'}
              </p>

              <a href="/menu" className="zs-primary">
                Explore our menu
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
          )}
        </section>

        <section className="zs-invite">
          <div>
            <span className="zs-eyebrow">
              STAY A LITTLE LONGER
            </span>

            <h2>
              Bring your people.
              <br />
              We’ll bring the flavour.
            </h2>
          </div>

          <a href="/room-booking" className="zs-primary">
            Plan a celebration
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </section>
      </main>

      <footer className="zs-footer">
        <a href="/">ZEN CAFÉ</a>

        <span>Kaladdy Junction, Kokkuvil</span>

        <a href="/contact">
          Get in touch
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </footer>
    </div>
  )
}

type OfferCardProps = {
  offer: ZenOffer
  index: number
}

function OfferCard({ offer, index }: OfferCardProps) {
  const end = offer.endDate
    ? new Date(offer.endDate)
    : null

  const expires =
    end && !Number.isNaN(end.getTime())
      ? end.toLocaleDateString('en-LK', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : ''

  return (
    <article
      className="zs-card"
      style={{
        animationDelay: `${Math.min(index, 6) * 70}ms`,
      }}
    >
      <div className="zs-media">
        {offer.image ? (
          <OfferArtwork
            src={offer.image}
            alt={offer.title}
            className="zs-artwork"
          />
        ) : (
          <div className="zs-no-image">
            <Gift size={52} aria-hidden="true" />
            <span>Zen Café special</span>
          </div>
        )}

        <span className="zs-badge">
          <Ticket size={15} aria-hidden="true" />
          {offer.badge || 'ZEN SPECIAL'}
        </span>
      </div>

      <div className="zs-card-copy">
        <span className="zs-eyebrow">
          {offer.subtitle || 'A TREAT FROM ZEN'}
        </span>

        <h3>{offer.title}</h3>

        {offer.description && (
          <p>{offer.description}</p>
        )}

        {offer.code && (
          <div className="zs-code">
            <span>Offer code</span>
            <strong>{offer.code}</strong>
          </div>
        )}

        {expires && (
          <small className="zs-expiry">
            Available until {expires}
          </small>
        )}

        <small className="zs-terms">
          Confirm availability and offer details with our team.
        </small>
      </div>
    </article>
  )
}