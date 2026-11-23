import { useEffect, useState } from 'react'
import { CalendarDays, Users, Clock3, Heart, Gift, CheckCircle2 } from 'lucide-react'
import Header from './Header'
import PremiumFooter from './PremiumFooter'
import { RoomBooking } from './BookingForms'
import './RoomBookingPage.css'

export default function RoomBookingPage() {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 8000)
    return () => window.clearTimeout(timer)
  }, [notice])
  return <div id="zen-room-page">
    <Header />
    <main>
      <header className="room-page-hero">
        <div className="room-page-hero-inner">
          <p className="room-page-eyebrow"><span lang="ja">ご予約</span> · Private celebrations</p>
          <h1>Party Room<br/><em>Booking</em></h1>
          <p>Bring your favourite people together.<br/>Plan your next celebration at Zen Café.</p>
          <a href="#book-room"><CalendarDays size={18}/> Book your room <span aria-hidden="true">↗</span></a>
        </div>
        <small className="room-art-caption">Japanese-inspired illustration</small>
      </header>
      <section id="book-room" className="room-page-booking" aria-labelledby="room-page-title">
        <div className="room-page-heading"><p className="room-page-eyebrow">A space for your special moments</p><h2 id="room-page-title">Reserve Your Party Room</h2><p>Choose your date, arrival time and guest count, then complete your booking request.</p></div>
        <div className="room-page-facts">
          <div><Users/><span><small>Room capacity</small><b>1–15 guests</b></span></div>
          <div><Clock3/><span><small>Your gathering</small><b>Up to 3 hours</b></span></div>
          <div><CheckCircle2/><span><small>Plan your visit</small><b>Check date availability</b></span></div>
        </div>
        <div className="room-page-form"><RoomBooking toast={setNotice}/></div>
      </section>
      <section className="room-page-occasions" aria-labelledby="room-occasion-title">
        <p className="room-page-eyebrow">Make time for each other</p><h2 id="room-occasion-title">Your Occasion. Your People.</h2>
        <div className="room-page-occasion-grid">
          <article><Gift/><h3>Birthday moments</h3><p>Gather your closest people for a celebration to remember.</p></article>
          <article><Heart/><h3>Family gatherings</h3><p>A shared space for catching up and spending time together.</p></article>
          <article><Users/><h3>Friends together</h3><p>Make your next get-together a little more special.</p></article>
        </div>
        <a href="#book-room">Plan your gathering ↑</a>
      </section>
    </main>
    <PremiumFooter/>
    <div className="room-page-notice" role="status" aria-live="polite">{notice && <span>{notice}<button type="button" onClick={()=>setNotice('')} aria-label="Dismiss message">×</button></span>}</div>
  </div>
}
