import { useEffect, useRef, useState } from 'react'
import { Search, Heart, Plus, ArrowLeft, ArrowRight } from 'lucide-react'
import Header from './Header'
import PremiumFooter from './PremiumFooter'
import PageReveal from './PageReveal'
import FoodVisual from './FoodVisual'
import { getVisibleMenu, loadMenuCatalog, subscribeMenuCatalog } from '../data/menuStore'
import './MenuPage.css'

const readItems = () => ['drink', 'food', 'snacks'].flatMap(kind => getVisibleMenu(kind as 'drink' | 'food' | 'snacks'))

const HERO_SLIDES = [
  {
    "id": "tiger",
    "image": "/assets/menu/characters/tiger.png",
    "name": "Coffee moments",
    "alt": "Tiger carrying a Zen Caf\u00e9 coffee"
  },
  {
    "id": "duck",
    "image": "/assets/menu/characters/duck.png",
    "name": "A little crunch",
    "alt": "Duck carrying a platter of samosas"
  },
  {
    "id": "panda",
    "image": "/assets/menu/characters/panda.png",
    "name": "Bold flavours",
    "alt": "Panda carrying a savoury dish"
  },
  {
    "id": "peacock",
    "image": "/assets/menu/characters/peacock.png",
    "name": "A colourful feast",
    "alt": "Peacock carrying a rice dish"
  },
  {
    "id": "mantis",
    "image": "/assets/menu/characters/mantis.png",
    "name": "Comfort on a plate",
    "alt": "Mantis carrying rice and curry"
  },
  {
    "id": "turtle",
    "image": "/assets/menu/characters/turtle.png",
    "name": "Made for good moments",
    "alt": "Turtle carrying a savoury rice dish"
  }
]

export default function MenuPage() {
  const [active, setActive] = useState(0)
  const swipeStart = useRef<number | null>(null)
  const [items, setItems] = useState(readItems)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('All Items')
  const [query, setQuery] = useState('')
  const [favourites, setFavourites] = useState<string[]>([])
  const refresh = async () => {
    setLoading(true); setError('')
    try { await loadMenuCatalog(); setItems(readItems()) }
    catch { setError('The menu could not refresh. Please try again.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    void refresh()
    return subscribeMenuCatalog(() => setItems(readItems()))
  }, [])
  const currentIndex = active % HERO_SLIDES.length
  const current = HERO_SLIDES[currentIndex]
  const move = (step: number) => setActive(value => (value + step + HERO_SLIDES.length) % HERO_SLIDES.length)
  const categories = ['All Items', ...new Set(items.map(item => item.category).filter(Boolean))]
  const filtered = items.filter(item => (category === 'All Items' || item.category === category) && `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase().trim()))
  return <div id="zen-menu-page" className="zen-dark-scope">
    <Header /><PageReveal />
    <main>
      <section className="zm-compact-carousel" aria-label="Zen Café character carousel" aria-roledescription="carousel">
        <div className="zm-compact-inner">
          <header className="zm-compact-heading"><p>OUR CAFÉ MENU</p><h1>Find your favourite.</h1><a href="#menu-catalog">Browse all items ↓</a></header>
          <>
            <div className="zm-compact-stage" onTouchStart={event => { swipeStart.current = event.touches[0].clientX }} onTouchEnd={event => { if (swipeStart.current === null) return; const distance = event.changedTouches[0].clientX - swipeStart.current; swipeStart.current = null; if (Math.abs(distance) > 40) move(distance < 0 ? 1 : -1) }}>
              {HERO_SLIDES.map((item, index) => {
                const offset = (index - currentIndex + HERO_SLIDES.length) % HERO_SLIDES.length
                const position = offset === 0 ? 'active' : offset === 1 ? 'next' : offset === HERO_SLIDES.length - 1 ? 'previous' : 'hidden'
                if (position === 'hidden') return null
                return <button type="button" key={item.id} className={`zm-slide zm-slide--${position}`} onClick={() => setActive(index)} aria-label={`Show ${item.name}`} aria-current={position === 'active' ? 'true' : undefined}><span className="zm-slide-visual"><img src={item.image} alt={item.alt} className="zm-slide-image" draggable={false} loading={position === 'active' ? 'eager' : 'lazy'} /></span></button>
              })}
              <button className="zm-slide-arrow zm-slide-arrow--left" type="button" disabled={HERO_SLIDES.length < 2} onClick={() => move(-1)} aria-label="Previous character"><ArrowLeft size={21} /></button>
              <button className="zm-slide-arrow zm-slide-arrow--right" type="button" disabled={HERO_SLIDES.length < 2} onClick={() => move(1)} aria-label="Next character"><ArrowRight size={21} /></button>
            </div>
            <div className="zm-compact-caption" aria-live="polite" aria-atomic="true"><div><span>Zen Café characters</span><h2>{current.name}</h2><p>Explore the latest food and drink selection in the menu below.</p></div><span className="zm-slide-count">{currentIndex + 1} / {HERO_SLIDES.length}</span></div>
          </>
          <div className="zm-character-dots" aria-label="Choose a character">{HERO_SLIDES.map((slide, index) => <button key={slide.id} type="button" onClick={() => setActive(index)} aria-label={`Show ${slide.alt}`} aria-pressed={index === currentIndex}><span /></button>)}</div>
        </div>
      </section>
      <section id="menu-catalog" className="zm-catalog" aria-labelledby="zm-menu-title">
        <header><p>FRESH FLAVOURS · WARM MOMENTS</p><h2 id="zm-menu-title">Our Menu</h2><p>Explore our drinks, delicious bites and café favourites.</p></header>
        <div className="zm-categories" aria-label="Menu categories">{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
        <div className="zm-toolbar"><h3>{category} <small>({filtered.length} items)</small></h3><label><Search size={19} /><span className="sr-only">Search menu</span><input type="search" placeholder="Search menu items…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
        {loading && <p role="status">Loading the latest menu…</p>}
        {error && <div role="alert">{error} <button onClick={() => void refresh()}>Try again</button></div>}
        {!loading && !error && !filtered.length && <p>No items found. Try another category or search.</p>}
        <div className="zm-grid">{filtered.map(item => <article className="zm-card" key={item.id}>
          <div className="zm-card-visual"><FoodVisual item={item} className="zm-card-image" imageClassName="zm-product-photo" /><button className="zm-heart" aria-label={`${favourites.includes(item.id) ? 'Remove' : 'Save'} ${item.name} favourite`} aria-pressed={favourites.includes(item.id)} onClick={() => setFavourites(values => values.includes(item.id) ? values.filter(id => id !== item.id) : [...values, item.id])}><Heart fill={favourites.includes(item.id) ? 'currentColor' : 'none'} /></button><span>{item.category}</span></div>
          <div className="zm-card-copy"><h3>{item.name}</h3><p>{item.description || 'Prepared with care at Zen Café.'}</p><div><a aria-label={`Enquire about ${item.name}`} href={`https://wa.me/94705175174?text=${encodeURIComponent(`Hello Zen Café, I would like to enquire about ${item.name}.`)}`} target="_blank" rel="noopener noreferrer"><Plus size={20} /><span>Enquire</span></a></div></div>
        </article>)}</div>
      </section>
    </main>
    <PremiumFooter />
  </div>
}
