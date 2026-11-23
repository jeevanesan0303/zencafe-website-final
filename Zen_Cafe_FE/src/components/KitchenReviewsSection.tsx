
import { useState } from 'react'

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Flower2,
  MessageCircle,
  Quote,
  Star,
} from 'lucide-react'

import {
  deliveryLinks,
  customerReviews,
} from './kitchenReviewsContent'

import './KitchenReviewsSection.css'

/* ==========================================
   WHATSAPP CONTACT
========================================== */

const WHATSAPP = 'https://wa.me/94705175174'

/* ==========================================
   DELIVERY PLATFORM LINKS
========================================== */

const PICKME_LINK =
  'https://pickme-app-sl.onelink.me/Fore/0j8u4z7x'

function orderLink(platform: 'uber' | 'pickme') {
  // PickMe Food — direct ordering link
  if (platform === 'pickme') {
    return {
      href: PICKME_LINK,
      ready: true,
    }
  }

  // Uber Eats — configured URL
  const configured = deliveryLinks[platform].trim()

  if (/^https?:\/\/\S+$/i.test(configured)) {
    return {
      href: configured,
      ready: true,
    }
  }

  // WhatsApp fallback
  const name =
    platform === 'uber' ? 'Uber Eats' : 'PickMe Food'

  return {
    href: `${WHATSAPP}?text=${encodeURIComponent(
      `Hi Zen Café! Please send me your ${name} ordering link.`
    )}`,
    ready: false,
  }
}

/* ==========================================
   KITCHEN REVIEWS SECTION
========================================== */

export default function KitchenReviewsSection() {
  const [index, setIndex] = useState(0)

  /* ==========================================
     VALID CUSTOMER REVIEWS
  ========================================== */

  const reviews = customerReviews.filter(
    review =>
      review.name.trim() &&
      review.text.trim() &&
      review.rating >= 1 &&
      review.rating <= 5
  )

  const review = reviews.length
    ? reviews[index % reviews.length]
    : null

  /* ==========================================
     DELIVERY PLATFORMS
  ========================================== */

  const platforms = [
    {
      key: 'uber' as const,
      label: 'Uber Eats',
      image: '/assets/Uber.png',
      className: 'uber',
    },
    {
      key: 'pickme' as const,
      label: 'PickMe Food',
      image: '/assets/PickMe.jpeg',
      className: 'pickme',
    },
  ]

  /* ==========================================
     REVIEW NAVIGATION
  ========================================== */

  const changeReview = (step: number) => {
    if (!reviews.length) return

    setIndex(current =>
      (current + step + reviews.length) % reviews.length
    )
  }

  return (
    <section
      id="kitchen-and-reviews"
      className="zen-kr"
      aria-label="Zen Kitchen delivery and customer reviews"
    >
      {/* ======================================
          ZEN KITCHEN DELIVERY
      ====================================== */}

      <article
        className="zen-kr__kitchen"
        aria-labelledby="zen-delivery-heading"
      >
        {/* Background image */}

        <img
          className="zen-kr__kitchen-art"
          src="/assets/kitchen-reviews/kitchen-delivery.png"
          alt=""
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
        />

        {/* Background shade */}

        <div
          className="zen-kr__kitchen-shade"
          aria-hidden="true"
        />

        {/* Decorative petals */}

        <div
          className="zen-kr__petals"
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
        </div>

        {/* Kitchen content */}

        <div className="zen-kr__copy">
          <p className="zen-kr__eyebrow">
            Zen Kitchen
          </p>

          <h2 id="zen-delivery-heading">
            Delicious Meals{' '}
            <span>Delivered to You</span>
          </h2>

          <p className="zen-kr__description">
            <strong>
              Fresh. Fast. Authentic.
            </strong>

            <br />

            Enjoy your favorite Japanese dishes

            <br className="zen-kr__desktop-break" />

            {' '}at your home or office.
          </p>

          {/* Explore Zen Kitchen */}

          <a
            className="zen-kr__order"
            href="/zen-kitchen.html"
          >
            Explore our menu

            <ArrowUpRight
              size={18}
              aria-hidden="true"
            />
          </a>

          {/* ==================================
              DELIVERY PLATFORMS
          ================================== */}

          <div
            className="zen-kr__delivery"
            aria-label="Delivery platforms"
          >
            {platforms.map(platform => {
              const link = orderLink(platform.key)

              return (
                <a
                  key={platform.key}
                  className={`zen-kr__platform zen-kr__platform--${platform.className}`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={
                    link.ready
                      ? `Order on ${platform.label}`
                      : `Ask Zen Café for its ${platform.label} ordering link on WhatsApp`
                  }
                >
                  <img
                    src={platform.image}
                    alt=""
                    width={38}
                    height={38}
                    loading="lazy"
                  />

                  <span>
                    <b>{platform.label}</b>

                    <small>
                      {link.ready
                        ? 'Order now'
                        : 'Ask for order link'}
                    </small>
                  </span>

                  <ArrowUpRight
                    size={16}
                    aria-hidden="true"
                  />
                </a>
              )
            })}
          </div>
        </div>
      </article>

      {/* ======================================
          CUSTOMER REVIEWS
      ====================================== */}

      <article
        className="zen-kr__reviews"
        aria-labelledby="zen-reviews-heading"
      >
        {/* Reviews background */}

        <img
          className="zen-kr__umbrella-art"
          src="/assets/kitchen-reviews/umbrella-reviews.png"
          alt=""
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
        />

        {/* Reviews heading */}

        <header className="zen-kr__review-heading">
          <p className="zen-kr__eyebrow">
            What our guests say
          </p>

          <h2 id="zen-reviews-heading">
            Customer Reviews
          </h2>

          <div
            className="zen-kr__ornament"
            aria-hidden="true"
          >
            <Flower2 size={18} />
          </div>
        </header>

        {/* ==================================
            REVIEW CARD
        ================================== */}

        <div className="zen-kr__review-area">
          <div
            className="zen-kr__review-card"
            aria-live="polite"
            aria-atomic="true"
          >
            {review ? (
              <div
                className="zen-kr__review-body"
                key={index}
              >
                {/* Star rating */}

                <div
                  className="zen-kr__stars"
                  role="img"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => (
                      <Star
                        key={i}
                        size={21}
                        aria-hidden="true"
                        fill={
                          i < Math.round(review.rating)
                            ? 'currentColor'
                            : 'none'
                        }
                      />
                    )
                  )}
                </div>

                {/* Review text */}

                <blockquote>
                  {review.text}
                </blockquote>

                {/* Reviewer information */}

                <div className="zen-kr__reviewer">
                  {review.avatar ? (
                    <img
                      src={review.avatar}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="zen-kr__initial"
                      aria-hidden="true"
                    >
                      {review.name.slice(0, 1)}
                    </span>
                  )}

                  <div>
                    <b>{review.name}</b>

                    {review.label && (
                      <small>
                        {review.label}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty reviews fallback */

              <div className="zen-kr__empty">
                <Quote
                  size={28}
                  aria-hidden="true"
                />

                <h3>
                  Your experience matters
                </h3>

                <p>
                  Visited Zen Café? We would love
                  to hear about your favorite dish
                  and your time with us.
                </p>

                <a
                  href={`${WHATSAPP}?text=${encodeURIComponent(
                    'Hi Zen Café! I would like to share feedback about my visit.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle
                    size={17}
                    aria-hidden="true"
                  />

                  Share your feedback
                </a>
              </div>
            )}
          </div>

          {/* ==================================
              PREVIOUS / NEXT REVIEW
          ================================== */}

          {reviews.length > 1 && (
            <>
              <button
                type="button"
                className="zen-kr__arrow zen-kr__arrow--prev"
                data-no-magnet
                onClick={() => changeReview(-1)}
                aria-label="Previous customer review"
              >
                <ChevronLeft size={21} />
              </button>

              <button
                type="button"
                className="zen-kr__arrow zen-kr__arrow--next"
                data-no-magnet
                onClick={() => changeReview(1)}
                aria-label="Next customer review"
              >
                <ChevronRight size={21} />
              </button>
            </>
          )}
        </div>

        {/* ==================================
            REVIEW PAGINATION DOTS
        ================================== */}

        {reviews.length > 1 && (
          <div
            className="zen-kr__dots"
            aria-label="Choose a customer review"
          >
            {reviews.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                type="button"
                data-no-magnet
                aria-label={`Show review ${i + 1} by ${item.name}`}
                aria-current={
                  i === index % reviews.length
                    ? 'true'
                    : undefined
                }
                className={
                  i === index % reviews.length
                    ? 'is-active'
                    : ''
                }
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
