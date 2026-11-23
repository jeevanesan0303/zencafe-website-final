import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import './ZenStoryVideo.css'

export default function ZenStoryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      if (preference.matches) video.pause()
      else {
        video.muted = true
        void video.play().catch(() => setPlaying(false))
      }
    }
    update()
    preference.addEventListener('change', update)
    return () => {
      preference.removeEventListener('change', update)
      video.pause()
    }
  }, [])

  async function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) video.pause()
    else {
      try { await video.play() }
      catch { setPlaying(false) }
    }
  }

  return (
    <section className="zen-story" aria-labelledby="zen-story-title">
      <video
        ref={videoRef}
        className="zen-story__background"
        muted loop playsInline preload="metadata"
        poster="/assets/videos/zen-team-story-poster.jpg"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => { setFailed(true); setPlaying(false) }}
        style={failed ? { display: 'none' } : undefined}
        aria-hidden="true" tabIndex={-1}
      >
        <source src="/assets/videos/zen-vibes.mp4" type="video/mp4" />
      </video>
      <div className="zen-story__shade" aria-hidden="true" />
      <div className="zen-story__content">
        <p className="zen-story__eyebrow">Zen Café · Kokkuvil</p>
        <h2 id="zen-story-title">Escape the Ordinary.<br /><span>Find Your Zen.</span></h2>
        <p className="zen-story__description">Japanese-inspired flavours. Warm conversations. Moments worth slowing down for. Join us at Zen Café and make yourself at home.</p>
        <div className="zen-story__actions">
          <a className="zen-story__primary" href="/#menu">Explore our menu <ArrowUpRight size={18} /></a>
          <a className="zen-story__secondary" href="/#room-booking">Plan your celebration <ArrowUpRight size={18} /></a>
        </div>
        <p className="zen-story__location">Kaladdy Junction, Kokkuvil · Made for memorable moments</p>
      </div>
      {!failed && <button type="button" className="zen-story__playback" onClick={togglePlayback} aria-label={playing ? 'Pause background video' : 'Play background video'}>
        {playing ? <Pause size={17} /> : <Play size={17} />}<span>{playing ? 'Pause' : 'Play'}</span>
      </button>}
    </section>
  )
}
