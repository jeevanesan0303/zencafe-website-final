
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

import Swal from 'sweetalert2'

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

import ThemeToggle from './ThemeToggle'
import './RegisterPage.css'

/* =========================================================
   ZEN CAFÉ — CUSTOMER REGISTRATION

   1. Customer registers once.
   2. Customer verifies their email.
   3. Customer details are stored in PostgreSQL.
   4. Verified customers can access Community Gallery.
   5. Gallery checks verification through the backend.
   6. Gallery upload cooldown remains backend-controlled.

   PHONE NUMBER:
   - Exactly 10 digits
   - Numbers only
   - Maximum 10 digits
   - Sri Lankan local format, starting with 0
========================================================= */

const CUSTOMER_PROFILE_KEY =
  'zen-cafe-customer-registration-v149'

const PHONE_LENGTH = 10

const PHONE_REGEX = /^0\d{9}$/

type Customer = {
  id?: string
  name?: string
  email?: string
  phone?: string
  emailVerified?: boolean
  emailVerifiedAt?: string | null
  galleryEligibleAt?: string | null
}

type ApiResponse = {
  success?: boolean
  error?: string
  message?: string
  token?: string
  customer?: Customer
  delivery?: {
    simulated?: boolean
    devVerificationUrl?: string
  }
}

type SavedCustomerProfile = {
  name: string
  email: string
  phone: string
  verified: boolean
}

/* =========================================================
   VALIDATION HELPERS
========================================================= */

const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase()

const validEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(value),
  )

const validName = (value: string): boolean =>
  value.trim().length >= 2

const normalizePhone = (value: string): string =>
  value.replace(/\D/g, '').slice(0, PHONE_LENGTH)

const validPhone = (value: string): boolean =>
  PHONE_REGEX.test(value)

/* =========================================================
   API RESPONSE
========================================================= */

async function readJson(
  response: Response,
): Promise<ApiResponse> {
  const contentType =
    response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    throw new Error(
      'The registration service is unavailable. Please try again.',
    )
  }

  const data: unknown = await response.json()

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error(
      'The server returned an invalid response.',
    )
  }

  return data as ApiResponse
}

/* =========================================================
   LOCAL PROFILE CACHE

   Local storage is only used for form prefilling.
   PostgreSQL remains the source of truth.
========================================================= */

function saveCustomerProfile(
  profile: SavedCustomerProfile,
): void {
  try {
    localStorage.setItem(
      CUSTOMER_PROFILE_KEY,
      JSON.stringify(profile),
    )
  } catch {
    // Local storage is optional.
  }
}

function readCustomerProfile():
  | SavedCustomerProfile
  | null {
  try {
    const raw = localStorage.getItem(
      CUSTOMER_PROFILE_KEY,
    )

    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return null
    }

    const profile =
      parsed as Partial<SavedCustomerProfile>

    if (
      typeof profile.email !== 'string' ||
      !validEmail(profile.email)
    ) {
      return null
    }

    return {
      name:
        typeof profile.name === 'string'
          ? profile.name
          : '',
      email: normalizeEmail(profile.email),
      phone:
        typeof profile.phone === 'string'
          ? normalizePhone(profile.phone)
          : '',
      verified: profile.verified === true,
    }
  } catch {
    return null
  }
}

/* =========================================================
   VERIFICATION URL
========================================================= */

function clearVerificationTokenFromUrl(): void {
  const url = new URL(window.location.href)

  url.searchParams.delete('verify')

  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  )
}

function redirectToGallery(): void {
  window.location.replace('/#gallery')
}

/* =========================================================
   REGISTER PAGE
========================================================= */

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const [
    registrationSubmitted,
    setRegistrationSubmitted,
  ] = useState(false)

  const [
    verifiedCustomer,
    setVerifiedCustomer,
  ] = useState(false)

  const [devVerifyUrl, setDevVerifyUrl] =
    useState<string | null>(null)

  const verificationProcessed = useRef(false)

  const formDisabled =
    loading || resending || verifying

  /* =======================================================
     LOAD SAVED CUSTOMER DETAILS
  ======================================================= */

  useEffect(() => {
    const profile = readCustomerProfile()

    if (!profile) return

    setName(profile.name)
    setEmail(profile.email)
    setPhone(profile.phone)
  }, [])

  /* =======================================================
     VERIFY EMAIL

     Example: /register?verify=TOKEN
  ======================================================= */

  useEffect(() => {
    if (verificationProcessed.current) return

    verificationProcessed.current = true

    const params = new URLSearchParams(
      window.location.search,
    )

    const verifyToken = params.get('verify')

    if (!verifyToken) return

    clearVerificationTokenFromUrl()

    const verifyEmail = async (): Promise<void> => {
      setVerifying(true)
      setLoading(true)
      setMessage('')
      setIsError(false)

      try {
        const response = await fetch(
          '/api/auth/verify',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              token: verifyToken,
            }),
          },
        )

        const data = await readJson(response)

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
            data.message ||
            'The verification link is invalid or expired.',
          )
        }

        const customer = data.customer

        if (
          !customer ||
          !customer.email ||
          !validEmail(customer.email)
        ) {
          throw new Error(
            'Email verification succeeded, but the customer details were not returned.',
          )
        }

        const savedProfile = readCustomerProfile()

        const verifiedName =
          customer.name ||
          savedProfile?.name ||
          ''

        const verifiedEmail = normalizeEmail(
          customer.email,
        )

        const verifiedPhone =
          customer.phone ||
          savedProfile?.phone ||
          ''

        setName(verifiedName)
        setEmail(verifiedEmail)
        setPhone(normalizePhone(verifiedPhone))

        saveCustomerProfile({
          name: verifiedName,
          email: verifiedEmail,
          phone: normalizePhone(verifiedPhone),
          verified: true,
        })

        setVerifiedCustomer(true)
        setRegistrationSubmitted(false)

        setIsError(false)

        setMessage(
          'Your email has been verified successfully. You can now visit the Community Gallery.',
        )

        const result = await Swal.fire({
          title: 'Email Verified!',
          text:
            'Your Zen Café registration is complete. Open the Community Gallery, check your registered email, and share your photos.',
          icon: 'success',
          confirmButtonColor: '#a32722',
          confirmButtonText: 'Open Gallery',
          timer: 4500,
          timerProgressBar: true,
          allowOutsideClick: false,
        })

        if (result.isConfirmed || result.isDismissed) {
          redirectToGallery()
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unable to verify your email.'

        setIsError(true)
        setMessage(errorMessage)

        await Swal.fire({
          title: 'Email Verification Failed',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#a32722',
          confirmButtonText: 'Understood',
        })
      } finally {
        setVerifying(false)
        setLoading(false)
      }
    }

    void verifyEmail()
  }, [])

  /* =======================================================
     PHONE INPUT HANDLER

     Accept only 0–9.
     Automatically discard extra characters.
     Prevent more than 10 digits.
  ======================================================= */

  function handlePhoneChange(value: string): void {
    const cleaned = normalizePhone(value)

    setPhone(cleaned)
    setMessage('')
    setIsError(false)
  }

  /* =======================================================
     CUSTOMER REGISTRATION
  ======================================================= */

  const submitRegistration = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()

    if (formDisabled) return

    if (!validName(name)) {
      setIsError(true)
      setMessage(
        'Please enter your full name (at least 2 characters).',
      )
      return
    }

    if (!validEmail(email)) {
      setIsError(true)
      setMessage(
        'Please enter a valid email address.',
      )
      return
    }

    if (!validPhone(phone)) {
      setIsError(true)
      setMessage(
        'Please enter a valid 10-digit phone number starting with 0.',
      )
      return
    }

    setLoading(true)
    setIsError(false)
    setMessage('')
    setDevVerifyUrl(null)
    setRegistrationSubmitted(false)

    try {
      const response = await fetch(
        '/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            email: normalizeEmail(email),
            phone,
          }),
        },
      )

      const data = await readJson(response)

      if (!response.ok || !data.success) {
        if (response.status === 409) {
          setIsError(false)

          setMessage(
            'This email is already registered. If verified, you can access the Community Gallery directly.',
          )

          const result = await Swal.fire({
            title: 'Already Registered',
            text:
              'Your email is already registered. If verified, open the Community Gallery and check your email to upload photos.',
            icon: 'info',
            confirmButtonColor: '#a32722',
            confirmButtonText: 'Open Gallery',
            showCancelButton: true,
            cancelButtonText: 'Stay Here',
          })

          if (result.isConfirmed) {
            redirectToGallery()
          }

          return
        }

        throw new Error(
          data.error ||
          data.message ||
          'Registration failed. Please try again.',
        )
      }

      const registeredName = name.trim()
      const registeredEmail = normalizeEmail(email)

      saveCustomerProfile({
        name: registeredName,
        email: registeredEmail,
        phone,
        verified: false,
      })

      setRegistrationSubmitted(true)

      setMessage(
        data.message ||
        'Registration received. Please check your email for the verification link.',
      )

      if (
        import.meta.env.DEV &&
        data.delivery?.devVerificationUrl
      ) {
        setDevVerifyUrl(
          data.delivery.devVerificationUrl,
        )
      }

      await Swal.fire({
        title: 'Registration Received!',
        text:
          'Please check your inbox and click the verification link to activate your Community Gallery access.',
        icon: 'success',
        confirmButtonColor: '#a32722',
        confirmButtonText: 'Understood',
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to contact the registration server.'

      setIsError(true)
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /* =======================================================
     RESEND VERIFICATION EMAIL
  ======================================================= */

  const handleResend = async (): Promise<void> => {
    if (formDisabled) return

    if (!validEmail(email)) {
      setIsError(true)
      setMessage(
        'Enter your registered email address first.',
      )
      return
    }

    setResending(true)
    setIsError(false)
    setMessage('')
    setDevVerifyUrl(null)

    try {
      const response = await fetch(
        '/api/auth/resend-verification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: normalizeEmail(email),
          }),
        },
      )

      const data = await readJson(response)

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          data.message ||
          'Unable to resend the verification email.',
        )
      }

      setMessage(
        data.message ||
        'If your email is awaiting verification, a new verification link will be sent.',
      )

      if (
        import.meta.env.DEV &&
        data.delivery?.devVerificationUrl
      ) {
        setDevVerifyUrl(
          data.delivery.devVerificationUrl,
        )
      }

      await Swal.fire({
        title: 'Request Received',
        text:
          'If your email is awaiting verification, please check your inbox for a new verification link.',
        icon: 'success',
        confirmButtonColor: '#a32722',
        confirmButtonText: 'Understood',
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to resend the verification email.'

      setIsError(true)
      setMessage(errorMessage)
    } finally {
      setResending(false)
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */


  return (
    <main className="zen-register-page">
      <header className="zen-register-header">
        <a href="/" className="zen-register-back">
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </a>

        <a href="/" className="zen-register-brand">
          <img src="/assets/zen-logo.png" alt="Zen Café" />
          <span>ZEN CAFÉ</span>
        </a>

        <ThemeToggle />
      </header>

      <section className="zen-register-layout">
        {/* LEFT: HERO IMAGE */}
        <div className="zen-register-visual">
          <div className="zen-register-visual-overlay" />

          <div className="zen-register-visual-content">
            <div className="zen-register-eyebrow">
              <Sparkles size={15} />
              THE ZEN CAFÉ EXPERIENCE
            </div>

            <h1>
              Every moment
              <br />
              has a <em>story.</em>
            </h1>

            <p>
              Good food, beautiful memories and meaningful
              connections. Become part of our community
              and share your favourite café moments.
            </p>

            <div className="zen-register-visual-bottom">
              <span className="zen-register-japanese">
                禅カフェ
              </span>
              <span>CREATE • CONNECT • SHARE</span>
            </div>
          </div>
        </div>

        {/* RIGHT: REGISTRATION FORM */}
        <div className="zen-register-form-side">
          <div className="zen-register-form-shell">
            <div className="zen-register-form-heading">
              <div className="zen-register-heading-icon">
                {verifiedCustomer ? (
                  <ShieldCheck size={24} />
                ) : (
                  <UserRound size={24} />
                )}
              </div>

              <span className="zen-register-small-heading">
                WELCOME TO OUR COMMUNITY
              </span>

              <h2>
                {verifiedCustomer
                  ? 'Email verified'
                  : registrationSubmitted
                    ? 'Check your inbox'
                    : 'Create your account'}
              </h2>

              <p>
                {verifiedCustomer
                  ? 'Your registration is complete. You can now explore our Community Gallery.'
                  : registrationSubmitted
                    ? 'We have received your registration. Please verify your email address.'
                    : 'Register to share your Zen Café moments with our community.'}
              </p>
            </div>

            {verifiedCustomer && (
              <div className="zen-register-success">
                <CheckCircle2 size={19} />
                <div>
                  <strong>Registration complete</strong>
                  <p>
                    Your email has been verified successfully.
                  </p>
                  <a href="/#gallery">
                    Open Community Gallery
                  </a>
                </div>
              </div>
            )}

            <form
              className="zen-register-form"
              onSubmit={submitRegistration}
              noValidate
            >
              <label className="zen-register-field">
                <span>Full name</span>
                <div className="zen-register-input">
                  <UserRound size={18} />
                  <input
                    type="text"
                    value={name}
                    disabled={formDisabled}
                    onChange={(event) => {
                      setName(event.target.value)
                      setMessage('')
                      setIsError(false)
                    }}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </div>
              </label>

              <label className="zen-register-field">
                <span>Phone number</span>
                <div className="zen-register-input">
                  <Phone size={18} />
                  <input
                    type="tel"
                    value={phone}
                    disabled={formDisabled}
                    onChange={(event) =>
                      handlePhoneChange(event.target.value)
                    }
                    placeholder="0771234567"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    minLength={10}
                    pattern="0[0-9]{9}"
                    title="Enter exactly 10 digits starting with 0"
                    required
                  />
                </div>
                <small>
                  Enter 10 digits, starting with 0.
                </small>
              </label>

              <label className="zen-register-field">
                <span>Email address</span>
                <div className="zen-register-input">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={email}
                    disabled={formDisabled}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setMessage('')
                      setIsError(false)
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </div>
              </label>

              <button
                className="zen-register-submit"
                type="submit"
                disabled={formDisabled}
              >
                <ShieldCheck size={18} />
                {verifying
                  ? 'Verifying email...'
                  : loading
                    ? 'Registering...'
                    : 'Create Account'}
              </button>

              <button
                type="button"
                className="zen-register-resend"
                disabled={formDisabled}
                onClick={() => void handleResend()}
              >
                <RefreshCw
                  size={15}
                  className={
                    resending ? 'animate-spin' : ''
                  }
                />
                {resending
                  ? 'Sending verification link...'
                  : 'Resend verification email'}
              </button>
            </form>

            {message && (
              <div
                className={`zen-register-alert ${isError ? 'is-error' : 'is-success'
                  }`}
                role={isError ? 'alert' : 'status'}
              >
                {isError ? (
                  <ShieldAlert size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>{message}</span>
              </div>
            )}

            {devVerifyUrl && (
              <div className="zen-register-dev-link">
                <strong>Local Email Test</strong>
                <a href={devVerifyUrl}>
                  Open verification link
                </a>
              </div>
            )}

            <div className="zen-register-verification">
              <div className="zen-register-verification-icon">
                {verifiedCustomer ? (
                  <ShieldCheck size={20} />
                ) : (
                  <Clock3 size={20} />
                )}
              </div>
              <div>
                <strong>
                  {verifying
                    ? 'Verifying your email'
                    : verifiedCustomer
                      ? 'Registration completed'
                      : registrationSubmitted
                        ? 'Email verification pending'
                        : 'Secure email verification'}
                </strong>
                <p>
                  {verifying
                    ? 'Please wait while we confirm your verification link.'
                    : verifiedCustomer
                      ? 'You can now access the Community Gallery.'
                      : registrationSubmitted
                        ? 'Click the verification link sent to your email.'
                        : 'Verify your email once to access the Community Gallery.'}
                </p>
              </div>
            </div>

            <div className="zen-register-bottom">
              <span>Already registered?</span>
              <a href="/#gallery">
                Explore Community Gallery
              </a>
            </div>

            <div className="zen-register-footer">
              © {new Date().getFullYear()} Zen Café.
              All rights reserved.
            </div>
          </div>
        </div>
      </section>
    </main>
  )

}
