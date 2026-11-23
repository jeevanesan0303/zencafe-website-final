
import { useState, useRef, type FormEvent } from 'react'
import {
  MapPin,
  Phone,
  Clock3,
  Instagram,
  ArrowUpRight,
  Send,
  Flower2,
  CheckCircle2,
} from 'lucide-react'

import Header from './Header'
import PremiumFooter from './PremiumFooter'
import './ContactPage.css'

/* ==========================================
   ZEN CAFÉ — CONTACT CONFIGURATION
========================================== */

const MAP = 'https://maps.app.goo.gl/1UiuxUG5MKE6ANDc6'
const INSTAGRAM = 'https://www.instagram.com/zen.srilanka/'
const CONTACT_API = '/api/contact'

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_REGEX = /^07[0-9]{8}$/

/* ==========================================
   ZEN CAFÉ — CONTACT PAGE
========================================== */

export default function ContactPage() {
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [error, setError] = useState('')

  const submittingRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ==========================================
     FORM SUBMISSION
  ========================================== */

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submittingRef.current || status === 'success') return

    const form = event.currentTarget
    const data = new FormData(form)

    const value = (key: string) =>
      String(data.get(key) || '').trim()

    const name = value('name')
    const email = value('email')
    const phone = value('phone')
    const subject = value('subject')
    const message = value('message')

    if (!name || !email || !phone || !subject || message.length < 5) {
      setError('Please complete all required fields.')
      setStatus('error')
      return
    }

    /* Email validation */

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.')
      setStatus('error')
      return
    }

    /* Sri Lankan mobile number validation */

    if (!PHONE_REGEX.test(phone)) {
      setError(
        'Please enter a valid 10-digit mobile number starting with 07.'
      )
      setStatus('error')
      return
    }

    submittingRef.current = true
    setStatus('sending')
    setError('')

    try {
      const response = await fetch(CONTACT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          message,
          website: value('website'),
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          result.message ||
          'Unable to send your message. Please try again.'
        )
      }

      setStatus('success')
      setError('')
      formRef.current?.reset()

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }

      successTimeoutRef.current = setTimeout(() => {
        setStatus(current =>
          current === 'success' ? 'idle' : current
        )
        successTimeoutRef.current = null
      }, 4000)
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send your message. Please try again.'
      )
    } finally {
      submittingRef.current = false
    }
  }

  /* ==========================================
     FORM CHANGE HANDLER
  ========================================== */

  function handleFormChange() {
    if (status === 'error') {
      setError('')
      setStatus('idle')
    }
  }

  /* ==========================================
     CONTACT PAGE UI
  ========================================== */

  return (
    <div className="zen-contact-page">
      <Header />

      <main id="contact-main">
        {/* =====================================
            HERO SECTION
        ===================================== */}

        <section
          className="zc-hero"
          aria-labelledby="zc-title"
        >
          <div className="zc-wrap">
            <p className="zc-eyebrow">
              お問い合わせ · We would love to hear from you
            </p>

            <h1 id="zc-title">
              Get in <em>Touch</em>
            </h1>

            <p>
              Questions, celebrations or your next café visit?
              <br />
              Let’s make it a little more Zen.
            </p>

            <a href="#contact-form" className="zc-link">
              Send an enquiry
              <ArrowUpRight size={18} />
            </a>
          </div>
        </section>

        <div className="zc-wrap zc-content">
          <div className="zc-columns">
            {/* =====================================
                CONTACT INFORMATION
            ===================================== */}

            <aside
              className="zc-info"
              aria-labelledby="zc-info-title"
            >
              <p className="zc-eyebrow">
                Visit · Call · Connect
              </p>

              <h2 id="zc-info-title">
                Contact Information
              </h2>

              <p>Get in touch with us anytime.</p>

              <a
                className="zc-info-card"
                href={MAP}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin />

                <span>
                  <b>Our address</b>
                  Zen Café, Kaladdy Junction,
                  <br />
                  Kokkuvil, Sri Lanka
                </span>

                <ArrowUpRight size={16} />
              </a>

              <a
                className="zc-info-card"
                href="tel:+94705175174"
              >
                <Phone />

                <span>
                  <b>Phone</b>
                  +94 70 517 5174
                </span>
              </a>

              <div className="zc-info-card">
                <Clock3 />

                <span>
                  <b>Opening hours</b>
                  Monday–Sunday
                  <br />
                  9:00 AM–12:00 midnight
                </span>
              </div>

              <img
                className="zc-tea"
                src="/assets/discover-zen/tea-bonsai.png"
                alt="Japanese tea set and bonsai"
                loading="lazy"
                width="1536"
                height="1024"
              />
            </aside>

            {/* =====================================
                CONTACT FORM
            ===================================== */}

            <section
              className="zc-form-card"
              id="contact-form"
              aria-labelledby="zc-form-title"
            >
              <Flower2
                className="zc-flower"
                size={27}
              />

              <h2 id="zc-form-title">
                Send Us a Message
              </h2>

              <p>
                Have a question or a special request?
                <br />
                Send your enquiry directly to our team.
              </p>

              <form
                ref={formRef}
                onSubmit={submit}
                onChange={handleFormChange}
              >
                <div className="zc-fields">
                  {/* NAME */}

                  <label>
                    Your name <span>*</span>

                    <input
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      required
                      maxLength={100}
                      disabled={status === 'sending'}
                    />
                  </label>

                  {/* EMAIL */}

                  <label>
                    Your email <span>*</span>

                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      required
                      maxLength={150}
                      pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                      title="Please enter a valid email address, such as customer@gmail.com"
                      disabled={status === 'sending'}
                    />
                  </label>

                  {/* PHONE NUMBER */}

                  <label>
                    Phone number <span>*</span>

                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      placeholder="0771234567"
                      required
                      minLength={10}
                      maxLength={10}
                      pattern="07[0-9]{8}"
                      title="Enter exactly 10 digits starting with 07, for example 0771234567"
                      disabled={status === 'sending'}
                    />
                  </label>

                  {/* SUBJECT */}

                  <label>
                    Subject <span>*</span>

                    <select
                      name="subject"
                      required
                      defaultValue=""
                      disabled={status === 'sending'}
                    >
                      <option value="" disabled>
                        Select a subject
                      </option>

                      <option>General enquiry</option>
                      <option>Table reservation enquiry</option>
                      <option>Party room enquiry</option>
                      <option>Zen Kitchen delivery</option>
                      <option>Feedback</option>
                    </select>
                  </label>
                </div>

                {/* MESSAGE */}

                <label>
                  Your message <span>*</span>

                  <textarea
                    name="message"
                    placeholder="How can we help?"
                    required
                    minLength={5}
                    maxLength={2000}
                    rows={5}
                    disabled={status === 'sending'}
                  />
                </label>

                {/* SPAM PROTECTION */}

                <div
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                  }}
                  aria-hidden="true"
                >
                  <label>
                    Website

                    <input
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>

                {/* FORM NOTE */}

                <p className="zc-form-note">
                  Your enquiry will be sent directly to the
                  Zen Café team. Enquiries do not confirm
                  a booking.
                </p>

                {/* SUBMIT BUTTON */}

                <button
                  className="zc-button"
                  type="submit"
                  disabled={
                    status === 'sending' ||
                    status === 'success'
                  }
                  aria-busy={status === 'sending'}
                >
                  {status === 'sending' ? (
                    <>
                      <Send size={17} />
                      Sending...
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle2 size={17} />
                      Message Sent!
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      Send Message
                    </>
                  )}
                </button>

                {/* ERROR MESSAGE */}

                {error && (
                  <p
                    role="alert"
                    style={{
                      color: '#b42318',
                      marginTop: '12px',
                      fontSize: '14px',
                    }}
                  >
                    {error}
                  </p>
                )}
              </form>
            </section>
          </div>

          {/* =====================================
              SOCIAL MEDIA
          ===================================== */}

          <section
            className="zc-social"
            aria-label="Social media"
          >
            <div>
              <h2>Connect With Us</h2>

              <p>
                Follow our latest dishes, café moments
                and special offers.
              </p>
            </div>

            <div className="zc-social-links">
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={22} />
                Instagram
              </a>
            </div>
          </section>

          {/* =====================================
              LOCATION SECTION
          ===================================== */}

          <section
            className="zc-location"
            aria-labelledby="zc-map-title"
          >
            <p className="zc-eyebrow">
              A little closer to Zen
            </p>

            <h2 id="zc-map-title">
              Find Us on the Map
            </h2>

            <p>
              Visit us at Kaladdy Junction, Kokkuvil.
            </p>

            <div className="zc-map-grid">
              <iframe
                title="Map search for Zen Café, Kaladdy Junction, Kokkuvil"
                src="https://maps.google.com/maps?q=Zen%20Cafe%2C%20Kaladdy%20Junction%2C%20Kokkuvil%2C%20Sri%20Lanka&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              <article className="zc-branch">
                <img
                  src="/assets/zen-cafe-hero.png"
                  alt="Zen Café Japanese-inspired artwork"
                  loading="lazy"
                />

                <h3>Zen Café</h3>

                <p>
                  Kaladdy Junction
                  <br />
                  Kokkuvil, Sri Lanka
                </p>

                <a
                  href={MAP}
                  className="zc-button"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={17} />
                  Get directions
                </a>
              </article>
            </div>
          </section>
        </div>
      </main>

      <PremiumFooter />
    </div>
  )
}
