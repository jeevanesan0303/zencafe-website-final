
import { useEffect, useState } from 'react'
import {
  Soup,
  DoorOpen,
  Bike,
  Users,
  Star,
  Store,
  Flower2,
  ArrowUpRight,
} from 'lucide-react'

import {
  getVisibleMenu,
  loadMenuCatalog,
  subscribeMenuCatalog,
} from '../data/menuStore'

import './DiscoverZen.css'

/* ==========================================
   ZEN CAFÉ — SERVICES
========================================== */

const services = [
  {
    title: 'Party Room Booking',
    image: 'private-room.png',
    alt: 'Warm Japanese-inspired private dining room',
    description:
      'Bring your favourite people together for birthdays, gatherings and special moments.',
    icon: DoorOpen,
    href: '/room-booking',
    action: 'Book your room',
  },
  {
    title: 'Foods',
    image: 'cuisine.png',
    alt: 'Japanese-style sushi platter',
    description:
      'Explore our menu of café favourites, delicious bites and refreshing drinks.',
    icon: Soup,
    href: '/menu',
    action: 'Explore our menu',
  },
  {
    title: 'Zen Kitchen',
    image: 'kitchen.png',
    alt: 'Japanese-inspired takeaway meal boxes',
    description:
      'Discover Zen Kitchen and explore the available ordering and delivery options.',
    icon: Bike,
    href: '/zen-kitchen',
    action: 'Visit Zen Kitchen',
  },
]

/* ==========================================
   GET VISIBLE MENU COUNT
   Same data source as MenuPage.tsx
========================================== */

const getMenuItemCount = (): number => {
  const kinds = ['drink', 'food', 'snacks'] as const

  return kinds.reduce(
    (total, kind) => total + getVisibleMenu(kind).length,
    0
  )
}

/* ==========================================
   ZEN CAFÉ — DISCOVER SECTION
========================================== */

export default function DiscoverZen() {
  const [menuCount, setMenuCount] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const updateCount = () => {
      if (mounted) {
        setMenuCount(getMenuItemCount())
      }
    }

    const unsubscribe = subscribeMenuCatalog(updateCount)

    const refreshMenuCount = async () => {
      try {
        await loadMenuCatalog()
        updateCount()
      } catch (error) {
        console.error(
          'Unable to load Zen Café menu count:',
          error
        )

        if (mounted) {
          setMenuCount(null)
        }
      }
    }

    void refreshMenuCount()

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  /* ==========================================
     HOMEPAGE STATISTICS
  ========================================== */

  const metrics = [
    {
      value: menuCount === null ? '—' : String(menuCount),
      label: 'Menu items',
      icon: Soup,
    },
    {
      value: '10K+',
      label: 'Happy customers',
      icon: Users,
    },
    {
      value: '4.8',
      label: 'Customer rating',
      icon: Star,
    },
    {
      value: '1+',
      label: 'Branch / location',
      icon: Store,
    },
  ]

  return (
    <section
      className="zen-discover"
      id="discover-zen"
      aria-labelledby="discover-zen-title"
    >
      <div className="zen-discover__layout">
        {/* ======================================
            INTRODUCTION
        ====================================== */}

        <div className="zen-discover__intro">
          <p className="zen-discover__eyebrow">
            Discover Zen
          </p>

          <h2 id="discover-zen-title">
            More Than a Café{' '}
            <span>
              A Complete Japanese Experience
            </span>
          </h2>

          <div
            className="zen-discover__divider"
            aria-hidden="true"
          >
            <Flower2 size={20} />
          </div>

          <p className="zen-discover__description">
            From authentic flavors to warm hospitality,
            <br />
            we offer more than just food.
            <br />
            <strong>We create memories.</strong>
          </p>

          <img
            className="zen-discover__tea"
            src="/assets/discover-zen/tea-bonsai.png"
            alt="Japanese tea ceremony with a bonsai, teapot and cherry blossom petals"
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* ======================================
            SERVICES
        ====================================== */}

        <div className="zen-discover__services">
          <div className="zen-discover__cards">
            {services.map(
              ({
                title,
                image,
                alt,
                description,
                icon: Icon,
                href,
                action,
              }) => (
                <a
                  className="zen-discover__card"
                  href={href}
                  key={title}
                >
                  <span className="zen-discover__icon">
                    <Icon
                      size={26}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>

                  <h3>{title}</h3>

                  <div className="zen-discover__photo">
                    <img
                      src={`/assets/discover-zen/${image}`}
                      alt={alt}
                      width="1024"
                      height="1024"
                      loading="lazy"
                      decoding="async"
                    />

                    <span aria-hidden="true">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>

                  <p>{description}</p>

                  <span className="zen-discover__action">
                    {action}

                    <ArrowUpRight
                      size={16}
                      aria-hidden="true"
                    />
                  </span>
                </a>
              )
            )}
          </div>

          {/* ==================================
              LIVE HOMEPAGE STATISTICS
          ================================== */}

          <dl
            className="zen-discover__metrics"
            aria-label="Zen Café at a glance"
          >
            {metrics.map(
              ({ value, label, icon: Icon }) => (
                <div
                  className="zen-discover__metric"
                  key={label}
                >
                  <Icon
                    size={29}
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />

                  <div>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                </div>
              )
            )}
          </dl>
        </div>
      </div>
    </section>
  )
}
