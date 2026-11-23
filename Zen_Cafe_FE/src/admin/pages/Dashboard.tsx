
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react'

import {
  Moon,
  Sun,
  CalendarDays,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  UtensilsCrossed,
} from 'lucide-react'

import {
  readMenuCatalog,
  refreshMenuCatalog,
  subscribeMenuCatalog,
} from '../../data/menuStore'

import {
  isOfferCurrentlyActive,
  readOffers,
  refreshOffers,
  subscribeOffers,
} from '../../data/offerStore'

import {
  loadAdminBookings,
  readRoomBookings,
  subscribeRoomBookings,
  type RoomBooking,
  type BookingStatus,
} from '../../data/bookingStore'

import type { MenuItem } from '../../data/menu'
import type { ZenOffer } from '../../data/offerStore'
import type { AdminPage } from '../AdminApp'

import StatCard from '../components/StatCard'
import './Dashboard.css'

/* ==========================================
   ZEN CAFÉ — COMPACT ADMIN DASHBOARD
========================================== */

type Props = {
  onNavigate: (page: AdminPage) => void
  query: string
}

type ProductKind = 'all' | 'food' | 'drink'

const FALLBACK_IMAGE = '/assets/menu-panda-main.png'
const REFRESH_INTERVAL_MS = 30_000

const MAX_PRODUCTS = 6
const MAX_BOOKINGS = 3
const MAX_OFFERS = 3

/* ==========================================
   HELPERS
========================================== */

function fallbackImage(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  const image = event.currentTarget

  if (!image.src.endsWith(FALLBACK_IMAGE)) {
    image.src = FALLBACK_IMAGE
  }
}

function productImage(image?: string): string {
  if (!image || image.startsWith('zen-menu-media:')) {
    return FALLBACK_IMAGE
  }

  return image
}

function bookingStatusClass(
  status: BookingStatus,
): string {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return 'za-pill-green'

    case 'rejected':
    case 'cancelled':
      return 'za-pill-gray'

    case 'pending':
    case 'modification_proposed':
    default:
      return 'za-pill-amber'
  }
}

function bookingStatusLabel(
  status: BookingStatus,
): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'confirmed':
      return 'Confirmed'
    case 'rejected':
      return 'Rejected'
    case 'modification_proposed':
      return 'Modification Proposed'
    case 'cancelled':
      return 'Cancelled'
    case 'completed':
      return 'Completed'
    default:
      return status
  }
}

function formatBookingDate(value: string): string {
  if (!value) return '—'

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  )

  if (!match) return value

  const [, year, month, day] = match

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  )

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-LK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatBookingTime(value: string): string {
  if (!value) return '—'

  const match = value.match(/^(\d{1,2}):(\d{2})/)

  if (!match) return value

  const hours = Number(match[1])
  const minutes = match[2]

  if (
    !Number.isInteger(hours) ||
    hours < 0 ||
    hours > 23
  ) {
    return value
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message
  }

  return fallback
}

/* ==========================================
   SCOPED DASHBOARD STYLES

   These override the old tall dashboard
   table/card layout without affecting
   the dedicated Products or Bookings pages.
========================================== */



/* ==========================================
   MAIN COMPONENT
========================================== */

export default function Dashboard({
  onNavigate,
  query,
}: Props) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('zen-admin-dashboard-theme') === 'dark' } catch { return false }
  })
  const toggleTheme = () => {
    setDark(value => {
      try { localStorage.setItem('zen-admin-dashboard-theme', value ? 'light' : 'dark') } catch { /* Storage may be unavailable. */ }
      return !value
    })
  }

  const [products, setProducts] =
    useState<MenuItem[]>(() => readMenuCatalog())

  const [offers, setOffers] =
    useState<ZenOffer[]>(() => readOffers())

  const [bookings, setBookings] =
    useState<RoomBooking[]>([])

  const [bookingsLoaded, setBookingsLoaded] =
    useState(false)

  const [kind, setKind] =
    useState<ProductKind>('all')

  const [productSearch, setProductSearch] =
    useState('')

  const [refreshing, setRefreshing] =
    useState(false)

  const [bookingError, setBookingError] =
    useState('')

  const [offerError, setOfferError] =
    useState('')

  const [productError, setProductError] =
    useState('')

  const mountedRef = useRef(false)
  const refreshInProgressRef = useRef(false)
  const refreshQueuedRef = useRef(false)
  const refreshGenerationRef = useRef(0)

  /* ========================================
     STORE SYNCHRONIZATION
  ======================================== */

  const syncCatalog = useCallback(() => {
    if (!mountedRef.current) return

    setProducts(readMenuCatalog())
    setOffers(readOffers())
  }, [])

  /* ========================================
     REFRESH DATA

     Preserve the existing bookingStore
     API and authentication handling.
  ======================================== */

  const refreshDashboard =
    useCallback(async (): Promise<void> => {
      if (refreshInProgressRef.current) {
        refreshQueuedRef.current = true
        return
      }

      refreshInProgressRef.current = true

      const generation =
        refreshGenerationRef.current

      if (mountedRef.current) {
        setRefreshing(true)
      }

      try {
        syncCatalog()

        const [
          productsResult,
          offersResult,
          bookingsResult,
        ] = await Promise.allSettled([
          refreshMenuCatalog({
            all: true,
            force: true,
          }),
          refreshOffers(true),
          loadAdminBookings(),
        ])

        if (
          !mountedRef.current ||
          generation !== refreshGenerationRef.current
        ) {
          return
        }

        if (productsResult.status === 'fulfilled') {
          setProducts(productsResult.value)
          setProductError('')
        } else {
          setProductError(
            getErrorMessage(
              productsResult.reason,
              'Unable to synchronize products.',
            ),
          )

          console.error(
            '[Zen Café Dashboard] Products:',
            productsResult.reason,
          )
        }

        if (offersResult.status === 'fulfilled') {
          setOffers(offersResult.value)
          setOfferError('')
        } else {
          setOfferError(
            getErrorMessage(
              offersResult.reason,
              'Unable to synchronize offers.',
            ),
          )

          console.error(
            '[Zen Café Dashboard] Offers:',
            offersResult.reason,
          )
        }

        if (bookingsResult.status === 'fulfilled') {
          setBookings(bookingsResult.value)
          setBookingsLoaded(true)
          setBookingError('')
        } else {
          setBookingError(
            getErrorMessage(
              bookingsResult.reason,
              'Unable to load room bookings.',
            ),
          )

          console.error(
            '[Zen Café Dashboard] Bookings:',
            bookingsResult.reason,
          )
        }
      } finally {
        refreshInProgressRef.current = false

        if (
          mountedRef.current &&
          generation === refreshGenerationRef.current
        ) {
          setRefreshing(false)

          if (refreshQueuedRef.current) {
            refreshQueuedRef.current = false
            void refreshDashboard()
          }
        }
      }
    }, [syncCatalog])

  /* ========================================
     SUBSCRIPTIONS AND AUTO REFRESH
  ======================================== */

  useEffect(() => {
    mountedRef.current = true
    refreshGenerationRef.current += 1

    const stopMenu = subscribeMenuCatalog(() => {
      if (!mountedRef.current) return

      setProducts(readMenuCatalog())
    })

    const stopOffers = subscribeOffers(() => {
      if (!mountedRef.current) return

      setOffers(readOffers())
    })

    const stopBookings = subscribeRoomBookings(() => {
      if (!mountedRef.current) return

      setBookings(readRoomBookings())
      setBookingsLoaded(true)
    })

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        void refreshDashboard()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshDashboard()
      }
    }

    const handleStorage = () => {
      syncCatalog()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorage)

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshDashboard()
      }
    }, REFRESH_INTERVAL_MS)

    void refreshDashboard()

    return () => {
      mountedRef.current = false
      refreshGenerationRef.current += 1
      refreshQueuedRef.current = false

      stopMenu()
      stopOffers()
      stopBookings()

      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )

      window.clearInterval(interval)
    }
  }, [refreshDashboard, syncCatalog])

  /* ========================================
     FILTERING
  ======================================== */

  const globalTerm = query.trim().toLowerCase()
  const localTerm = productSearch.trim().toLowerCase()

  const matchingProducts = useMemo(() => {
    return products.filter(product => {
      const matchesKind =
        kind === 'all' || product.kind === kind

      const searchableText = [
        product.name,
        product.category,
        product.description || '',
      ]
        .join(' ')
        .toLowerCase()

      return (
        matchesKind &&
        (!globalTerm ||
          searchableText.includes(globalTerm)) &&
        (!localTerm ||
          searchableText.includes(localTerm))
      )
    })
  }, [products, kind, globalTerm, localTerm])

  const filteredProducts = useMemo(
    () => matchingProducts.slice(0, MAX_PRODUCTS),
    [matchingProducts],
  )

  const matchingOffers = useMemo(() => {
    return offers.filter(offer => {
      const searchableText = [
        offer.title,
        offer.subtitle || '',
        offer.description || '',
      ]
        .join(' ')
        .toLowerCase()

      return (
        !globalTerm ||
        searchableText.includes(globalTerm)
      )
    })
  }, [offers, globalTerm])

  const filteredOffers = useMemo(
    () => matchingOffers.slice(0, MAX_OFFERS),
    [matchingOffers],
  )

  const matchingBookings = useMemo(() => {
    return bookings.filter(booking => {
      const searchableText = [
        booking.customerName,
        booking.email,
        booking.phone,
        booking.roomName,
        booking.bookingDate,
        booking.bookingTime,
        booking.status,
      ]
        .join(' ')
        .toLowerCase()

      return (
        !globalTerm ||
        searchableText.includes(globalTerm)
      )
    })
  }, [bookings, globalTerm])

  const filteredBookings = useMemo(
    () => matchingBookings.slice(0, MAX_BOOKINGS),
    [matchingBookings],
  )

  /* ========================================
     DASHBOARD STATISTICS
  ======================================== */

  const totalProducts = products.length

  const activeOffers = useMemo(() => {
    return offers.filter(offer =>
      isOfferCurrentlyActive(offer),
    ).length
  }, [offers])

  const totalBookings = bookings.length

  /* ========================================
     RENDER
  ======================================== */

  return (
    <div className="za-dashboard za-dashboard-redesign" data-dashboard-theme={dark ? 'dark' : 'light'}>
      <div className="zd-toolbar">
        <div><span className="zd-eyebrow">ZEN CAFÉ / MANAGEMENT</span><h2>Dashboard overview</h2></div>
        <div className="zd-toolbar-actions">
          <button type="button" onClick={() => void refreshDashboard()} disabled={refreshing} aria-label="Refresh all dashboard data"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /><span>{refreshing ? 'Refreshing…' : 'Refresh data'}</span></button>
          <button type="button" onClick={toggleTheme} aria-label={dark ? 'Use light dashboard' : 'Use dark dashboard'} aria-pressed={dark}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
        </div>
      </div>

      {/* ====================================
          HERO BANNER
      ==================================== */}

      <section className="za-hero">
        <div className="za-hero-copy">
          <p className="za-kicker">A LITTLE CALM. A LOT OF POSSIBILITIES.</p>
          <h1 className="za-hero-title">Your café, beautifully managed.</h1>
          <p className="za-hero-description">Keep the menu fresh, welcome your guests and make every Zen moment count.</p>
          <div className="zd-hero-actions">
            <button type="button" className="za-primary" onClick={() => onNavigate('add-product')}><Plus size={17}/> Add menu item</button>
            <button type="button" className="zd-secondary" onClick={() => onNavigate('bookings')}>Manage bookings <ChevronRight size={16}/></button>
          </div>
        </div>
      </section>

      {/* ====================================
          STATISTICS
      ==================================== */}

      <section
        className="za-stats"
        aria-label="Dashboard overview"
      >
        <StatCard
          title="MENU ITEMS"
          value={totalProducts}
          subtitle={
            productError
              ? 'Last loaded products'
              : 'Total products'
          }
          icon={UtensilsCrossed}
          tone="rose"
          onClick={() => onNavigate('products')}
        />

        <StatCard
          title="ACTIVE OFFERS"
          value={activeOffers}
          subtitle={
            offerError
              ? 'Last loaded offers'
              : 'Live promotions'
          }
          icon={Tags}
          tone="amber"
          onClick={() => onNavigate('offers')}
        />

        <StatCard
          title="ROOM BOOKINGS"
          value={totalBookings}
          subtitle={
            bookingError
              ? bookingsLoaded
                ? 'Last loaded requests'
                : 'Bookings unavailable'
              : bookingsLoaded
                ? 'Total requests'
                : 'Loading requests'
          }
          icon={CalendarDays}
          tone="green"
          onClick={() => onNavigate('bookings')}
        />
      </section>

      {/* ====================================
          MANAGEMENT PANELS
      ==================================== */}

      <section className="za-panels">

        {/* ==================================
            COMPACT MENU / PRODUCTS
        ================================== */}

        <article className="za-panel za-products-panel za-compact-panel">
          <div className="za-panel-head">
            <div className="za-panel-heading">
              <h2>
                <UtensilsCrossed />
                <span>Menu / Products</span>
              </h2>

              <p>
                Manage your café menu items.
              </p>
            </div>

            <button
              type="button"
              className="za-primary"
              onClick={() => onNavigate('add-product')}
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>

          <div className="za-product-controls">
            <div
              className="za-filter-pills"
              aria-label="Filter products"
            >
              {(
                ['all', 'food', 'drink'] as const
              ).map(value => (
                <button
                  key={value}
                  type="button"
                  className={
                    kind === value ? 'active' : ''
                  }
                  onClick={() => setKind(value)}
                  aria-pressed={kind === value}
                >
                  {value === 'all'
                    ? 'All'
                    : value === 'food'
                      ? 'Food'
                      : 'Drinks'}
                </button>
              ))}
            </div>

            <label className="za-product-search">
              <Search size={15} />

              <input
                type="search"
                value={productSearch}
                onChange={event =>
                  setProductSearch(event.target.value)
                }
                placeholder="Search products..."
                aria-label="Search products"
              />
            </label>
          </div>

          <div className="za-compact-list">
            {filteredProducts.map(product => (
              <div
                className="za-compact-row"
                key={product.id}
              >
                <img
                  className="za-compact-image"
                  src={productImage(product.image)}
                  alt={product.name}
                  onError={fallbackImage}
                  loading="lazy"
                />

                <div className="za-compact-main">
                  <strong className="za-compact-title">
                    {product.name}
                  </strong>

                  <span className="za-compact-subtitle">
                    {product.category || 'Menu item'}
                  </span>

                  <div className="za-compact-meta">
                    <span>
                      {product.kind === 'drink'
                        ? 'Drink'
                        : 'Food'}
                    </span>
                  </div>
                </div>

                <div className="za-compact-side">
                  <span
                    className={`za-pill ${
                      product.available
                        ? 'za-pill-green'
                        : 'za-pill-gray'
                    }`}
                  >
                    {product.available
                      ? 'Active'
                      : 'Hidden'}
                  </span>

                  <button
                    type="button"
                    className="za-compact-icon-button"
                    title={`Manage ${product.name}`}
                    aria-label={`Manage ${product.name}`}
                    onClick={() => onNavigate('products')}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="za-compact-empty">
                No matching products found.
              </div>
            )}
          </div>

          {productError && (
            <div
              className="za-compact-error"
              role="alert"
            >
              Products synchronization error:{' '}
              {productError}
            </div>
          )}

          <button
            type="button"
            className="za-compact-footer"
            onClick={() => onNavigate('products')}
          >
            <span>View All Products</span>

            <span className="za-compact-count">
              {matchingProducts.length}
            </span>

            <ChevronRight />
          </button>
        </article>

        {/* ==================================
            COMPACT OFFERS & PROMOTIONS
        ================================== */}

        <article className="za-panel za-offers-panel za-compact-panel">
          <div className="za-panel-head">
            <div className="za-panel-heading">
              <h2>
                <Tags />
                <span>Offers &amp; Promotions</span>
              </h2>

              <p>
                Manage your active promotions.
              </p>
            </div>

            <button
              type="button"
              className="za-primary"
              onClick={() => onNavigate('offers')}
            >
              <Plus size={16} />
              Add Offer
            </button>
          </div>

          <div className="za-offer-list">
            {filteredOffers.map(offer => {
              const isActive =
                isOfferCurrentlyActive(offer)

              return (
                <div
                  className="za-offer"
                  key={offer.id}
                >
                  <img
                    src={offer.image || FALLBACK_IMAGE}
                    alt={offer.title}
                    onError={fallbackImage}
                    loading="lazy"
                  />

                  <div className="za-offer-details">
                    <strong>{offer.title}</strong>

                    <small>
                      {offer.subtitle ||
                        'Special café offer'}
                    </small>
                  </div>

                  <span
                    className={`za-pill ${
                      isActive
                        ? 'za-pill-green'
                        : 'za-pill-gray'
                    }`}
                  >
                    {isActive
                      ? 'Active'
                      : 'Inactive'}
                  </span>

                  <button
                    type="button"
                    className="za-offer-more"
                    aria-label={`Manage ${offer.title}`}
                    onClick={() => onNavigate('offers')}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              )
            })}

            {filteredOffers.length === 0 && (
              <div className="za-compact-empty">
                No matching offers found.
              </div>
            )}
          </div>

          {offerError && (
            <div
              className="za-compact-error"
              role="alert"
            >
              Offers synchronization error:{' '}
              {offerError}
            </div>
          )}

          <button
            type="button"
            className="za-compact-footer"
            onClick={() => onNavigate('offers')}
          >
            <span>View All Offers</span>

            <span className="za-compact-count">
              {matchingOffers.length}
            </span>

            <ChevronRight />
          </button>
        </article>

        {/* ==================================
            COMPACT ROOM BOOKINGS
        ================================== */}

        <article className="za-panel za-bookings-panel za-compact-panel">
          <div className="za-panel-head">
            <div className="za-panel-heading">
              <h2>
                <CalendarDays />
                <span>Room Bookings</span>
              </h2>

              <p>
                Latest booking requests.
              </p>
            </div>

            <button
              type="button"
              className="za-compact-icon-button"
              title="Refresh dashboard"
              aria-label="Refresh dashboard data"
              disabled={refreshing}
              onClick={() => {
                void refreshDashboard()
              }}
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? 'animate-spin' : ''
                }
              />
            </button>
          </div>

          {bookingError && (
            <div
              className="za-compact-error"
              role="alert"
            >
              {bookingError}

              <button
                type="button"
                className="za-compact-footer"
                disabled={refreshing}
                onClick={() => {
                  void refreshDashboard()
                }}
              >
                <RefreshCw
                  size={14}
                  className={
                    refreshing ? 'animate-spin' : ''
                  }
                />

                {refreshing
                  ? 'Retrying...'
                  : 'Retry Loading Bookings'}
              </button>
            </div>
          )}

          <div className="za-compact-list">
            {filteredBookings.map(booking => (
              <div
                className="za-compact-row za-compact-booking"
                key={booking.id}
              >
                <div className="za-compact-booking-icon">
                  <CalendarDays size={19} />
                </div>

                <div className="za-compact-main">
                  <strong className="za-compact-title">
                    {booking.customerName || 'Customer'}
                  </strong>

                  <span className="za-compact-subtitle">
                    {formatBookingDate(
                      booking.bookingDate,
                    )}
                    {' · '}
                    {formatBookingTime(
                      booking.bookingTime ||
                        booking.startTime ||
                        '',
                    )}
                  </span>

                  <div className="za-compact-meta">
                    <span>
                      {booking.guests} Guests
                    </span>

                    {booking.roomName && (
                      <span>
                        · {booking.roomName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="za-compact-side">
                  <span
                    className={`za-pill ${bookingStatusClass(
                      booking.status,
                    )}`}
                  >
                    {bookingStatusLabel(
                      booking.status,
                    )}
                  </span>

                  <button
                    type="button"
                    className="za-compact-icon-button"
                    title="View booking"
                    aria-label={`View booking for ${
                      booking.customerName || 'Customer'
                    }`}
                    onClick={() => onNavigate('bookings')}
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 &&
              !bookingError &&
              bookingsLoaded && (
                <div className="za-compact-empty">
                  No booking requests found.
                </div>
              )}

            {filteredBookings.length === 0 &&
              !bookingError &&
              !bookingsLoaded && (
                <div className="za-compact-empty">
                  Loading room bookings...
                </div>
              )}
          </div>

          <button
            type="button"
            className="za-compact-footer"
            onClick={() => onNavigate('bookings')}
          >
            <span>View All Bookings</span>

            <span className="za-compact-count">
              {matchingBookings.length}
            </span>

            <ChevronRight />
          </button>
        </article>
      </section>
    </div>
  )
}
