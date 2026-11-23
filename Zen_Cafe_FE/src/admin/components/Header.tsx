import { useEffect, useRef, useState } from 'react'

import {
  Bell,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
} from 'lucide-react'

import type { AdminPage } from '../AdminApp'

import {
  readCafeSettings,
  subscribeCafeSettings,
} from '../../data/settingsStore'

import {
  readRoomBookings,
  subscribeRoomBookings,
} from '../../data/bookingStore'

import { mockLogout } from '../../admin-auth'
import AdminAlert from '../utils/sweetAlert'

type SettingsDestination = 'profile' | 'security'

type Props = {
  onMenu: () => void
  query: string
  onQuery: (query: string) => void
  page: AdminPage
  onNavigate?: (page: AdminPage) => void
  onOpenSettings?: (tab: SettingsDestination) => void

  // Retained for compatibility with existing AdminLayout.
  // This header uses the authentication logout function directly.
  onLogout?: () => void | Promise<void>
}

export default function Header({
  onMenu,
  query,
  onQuery,
  page,
  onNavigate,
  onOpenSettings,
}: Props) {
  const [settings, setSettings] = useState(() =>
    readCafeSettings()
  )

  const [pendingBookings, setPendingBookings] = useState(
    () =>
      readRoomBookings().filter(
        booking => booking.status === 'pending'
      ).length
  )

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] =
    useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const notificationButtonRef =
    useRef<HTMLButtonElement>(null)
  const profileButtonRef =
    useRef<HTMLButtonElement>(null)

  // Prevent repeated clicks before React updates the button.
  const logoutInProgress = useRef(false)

  useEffect(() => {
    return subscribeCafeSettings(() => {
      setSettings(readCafeSettings())
    })
  }, [])

  useEffect(() => {
    return subscribeRoomBookings(() => {
      setPendingBookings(
        readRoomBookings().filter(
          booking => booking.status === 'pending'
        ).length
      )
    })
  }, [])

  useEffect(() => {
    function handleOutsidePointer(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node)) return

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      const activeElement = document.activeElement

      if (
        activeElement &&
        notificationRef.current?.contains(activeElement)
      ) {
        notificationButtonRef.current?.focus()
      } else if (
        activeElement &&
        profileRef.current?.contains(activeElement)
      ) {
        profileButtonRef.current?.focus()
      }

      setProfileOpen(false)
      setNotificationsOpen(false)
    }

    document.addEventListener(
      'pointerdown',
      handleOutsidePointer
    )
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsidePointer
      )
      document.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [])

  useEffect(() => {
    setProfileOpen(false)
    setNotificationsOpen(false)
  }, [page])

  function closeDropdowns() {
    setProfileOpen(false)
    setNotificationsOpen(false)
  }

  function closeNotifications() {
    setNotificationsOpen(false)
    notificationButtonRef.current?.focus()
  }

  function navigateTo(nextPage: AdminPage) {
    closeDropdowns()
    onNavigate?.(nextPage)
  }

  function openSettingsTab(tab: SettingsDestination) {
    closeDropdowns()

    if (onOpenSettings) {
      onOpenSettings(tab)
    } else {
      onNavigate?.('settings')
    }
  }

  async function handleLogout() {
    if (logoutInProgress.current) return

    logoutInProgress.current = true
    setLoggingOut(true)
    closeDropdowns()

    try {
      const confirmed = await AdminAlert.confirm(
        'Logout Confirmation',
        'Are you sure you want to log out of Zen Café Admin?',
        'Yes, Logout'
      )

      if (!confirmed) return

      // Existing authentication function:
      // POST /api/admin/logout
      // Remove the admin session and token
      // Redirect to /admin/login
      await mockLogout()
    } catch (error) {
      console.error('Header logout failed:', error)

      await AdminAlert.error(
        'Logout Failed',
        'Unable to log out. Please try again.'
      )
    } finally {
      logoutInProgress.current = false
      setLoggingOut(false)
    }
  }

  const adminName =
    settings.adminName?.trim() || 'Admin'

  const adminEmail =
    settings.adminEmail?.trim() || 'admin@zencafe.com'

  const adminAvatar = settings.adminAvatar || ''

  const initials =
    adminName
      .split(/\s+/)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'A'

  return (
    <header
      className="za-header"
      style={{
        position: 'relative',
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      <button
        type="button"
        className="za-icon-button"
        aria-label="Open navigation"
        onClick={onMenu}
      >
        <Menu size={24} />
      </button>

      <label className="za-search">
        <Search size={20} />

        <input
          aria-label="Search dashboard"
          placeholder={
            page === 'dashboard'
              ? 'Search products, offers, or bookings...'
              : 'Search this section...'
          }
          value={query}
          onChange={event => onQuery(event.target.value)}
        />
      </label>

      <div className="za-header-right">
        <div
          className="za-header-dropdown-wrap"
          ref={notificationRef}
        >
          <button
            ref={notificationButtonRef}
            type="button"
            className="za-notification za-notification-button"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            aria-controls={
              notificationsOpen
                ? 'zen-admin-notifications'
                : undefined
            }
            onClick={() => {
              setNotificationsOpen(previous => !previous)
              setProfileOpen(false)
            }}
          >
            <Bell size={23} />

            {pendingBookings > 0 && (
              <span className="za-notification-badge">
                {pendingBookings > 9
                  ? '9+'
                  : pendingBookings}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              id="zen-admin-notifications"
              className="za-header-dropdown za-notification-dropdown"
              aria-label="Notifications"
              role="region"
            >
              <div className="za-dropdown-heading">
                <div>
                  <strong>Notifications</strong>
                  <small>Zen Café Admin</small>
                </div>

                <button
                  type="button"
                  className="za-dropdown-close"
                  aria-label="Close notifications"
                  style={{
                    position: 'relative',
                    flex: '0 0 44px',
                    width: 44,
                    height: 44,
                    padding: 0,
                    touchAction: 'manipulation',
                  }}
                  onClick={event => {
                    event.stopPropagation()
                    closeNotifications()
                  }}
                >
                  <X
                    size={18}
                    style={{ pointerEvents: 'none' }}
                  />
                </button>
              </div>

              <div className="za-notification-content">
                <div className="za-notification-item">
                  <span className="za-notification-item-icon">
                    <CalendarDays size={20} />
                  </span>

                  <div>
                    <strong>
                      {pendingBookings > 0
                        ? `${pendingBookings} Pending Booking${
                            pendingBookings === 1 ? '' : 's'
                          }`
                        : 'No Pending Bookings'}
                    </strong>

                    <p>
                      {pendingBookings > 0
                        ? 'You have room reservations waiting for confirmation.'
                        : 'Your room bookings are up to date.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="za-dropdown-footer-button"
                onClick={() => navigateTo('bookings')}
              >
                View Room Bookings
              </button>
            </div>
          )}
        </div>

        <div
          className="za-header-dropdown-wrap"
          ref={profileRef}
        >
          <button
            ref={profileButtonRef}
            type="button"
            className="za-profile-trigger"
            aria-label="Open admin profile menu"
            aria-expanded={profileOpen}
            aria-controls={
              profileOpen
                ? 'zen-admin-profile'
                : undefined
            }
            onClick={() => {
              setProfileOpen(previous => !previous)
              setNotificationsOpen(false)
            }}
          >
            <span className="za-avatar">
              {adminAvatar ? (
                <img src={adminAvatar} alt={adminName} />
              ) : (
                initials
              )}
            </span>

            <span className="za-user">
              <strong>{adminName}</strong>
              <small>{adminEmail}</small>
            </span>

            <ChevronDown
              size={17}
              className={`za-user-chevron ${
                profileOpen ? 'is-open' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div
              id="zen-admin-profile"
              className="za-header-dropdown za-profile-dropdown"
              role="region"
              aria-label="Administrator options"
            >
              <div className="za-profile-dropdown-top">
                <div className="za-profile-dropdown-avatar">
                  {adminAvatar ? (
                    <img
                      src={adminAvatar}
                      alt={adminName}
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div>
                  <strong>{adminName}</strong>
                  <small>{adminEmail}</small>
                  <span>Administrator</span>
                </div>
              </div>

              <div className="za-profile-dropdown-links">
                <button
                  type="button"
                  onClick={() =>
                    openSettingsTab('profile')
                  }
                >
                  <UserRound size={18} />
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openSettingsTab('security')
                  }
                >
                  <Settings size={18} />
                  Account Settings
                </button>
              </div>

              <div className="za-profile-dropdown-bottom">
                <button
                  type="button"
                  className="za-profile-logout"
                  disabled={loggingOut}
                  aria-busy={loggingOut}
                  onClick={() => void handleLogout()}
                >
                  <LogOut size={18} />

                  {loggingOut
                    ? 'Logging out...'
                    : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}