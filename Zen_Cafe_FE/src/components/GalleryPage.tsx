import { useEffect, useState } from 'react'
import Header from './Header'
import PremiumFooter from './PremiumFooter'
import CommunityGallery from './CommunityGallery'
import './GalleryPage.css'

export default function GalleryPage() {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 7000)
    return () => window.clearTimeout(timer)
  }, [notice])
  return <div id="zen-gallery-page">
    <Header />
    <main>
      <header className="zen-gallery-hero">
        <div className="zen-gallery-hero-copy">
          <p className="zen-gallery-eyebrow"><span lang="ja">ギャラリー</span> · Memories made here</p>
          <h1>Our <em>Gallery</em></h1>
          <p>A little warmth. A shared table. A moment worth keeping.<br/>Explore the memories our guests create at Zen Café.</p>
          <div className="zen-gallery-actions"><a href="#gallery">Explore moments ↓</a><a href="#share-moment">Add your Zen moment ↗</a></div>
        </div>
      </header>
      <CommunityGallery grid toast={setNotice} />
    </main>
    <PremiumFooter />
    <div className="zen-gallery-notice" role="status" aria-live="polite">{notice && <span>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></span>}</div>
  </div>
}
