import { useEffect, useRef, useState } from 'react'
import { Search, Heart, Plus, ArrowLeft, ArrowRight } from 'lucide-react'
import Header from './Header'
import PremiumFooter from './PremiumFooter'
import PageReveal from './PageReveal'
import FoodVisual from './FoodVisual'
import { getVisibleMenu, loadMenuCatalog, subscribeMenuCatalog } from '../data/menuStore'
import './KitchenPage.css'

const readItems = () => (['food', 'snacks'] as const).flatMap(kind => getVisibleMenu(kind))

const HERO_SLIDES = [
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
  },
  {
    "id": "duck",
    "image": "/assets/menu/characters/duck.png",
    "name": "A little crunch",
    "alt": "Duck carrying a platter of samosas"
  }
]

export default function KitchenPage() {
  const [active, setActive] = useState(0)
  const swipeStart = useRef<number | null>(null)
  const [items, setItems] = useState(readItems)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<'all' | 'food' | 'snacks'>(() => window.location.hash === '#kitchen-snacks' ? 'snacks' : 'all')
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
  const kindItems = items.filter(item => kind === 'all' || item.kind === kind)
  const categories = ['All Items', ...new Set(kindItems.map(item => item.category).filter(Boolean))]
  const filtered = kindItems.filter(item => (category === 'All Items' || item.category === category) && `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase().trim()))
  return <div id="zen-kitchen-page" className="zen-dark-scope">
    <Header /><PageReveal />
    <main>
      <section className="zk-compact-carousel" aria-label="Zen Kitchen character carousel" aria-roledescription="carousel">
        <div className="zk-compact-inner">
          <header className="zk-compact-heading"><p>ZEN KITCHEN</p><h1>Fresh food. Full of flavour.</h1><a href="#kitchen-menu">Browse all items ↓</a></header>
          <>
            <div className="zk-compact-stage" onTouchStart={event => { swipeStart.current = event.touches[0].clientX }} onTouchEnd={event => { if (swipeStart.current === null) return; const distance = event.changedTouches[0].clientX - swipeStart.current; swipeStart.current = null; if (Math.abs(distance) > 40) move(distance < 0 ? 1 : -1) }}>
              {HERO_SLIDES.map((item, index) => {
                const offset = (index - currentIndex + HERO_SLIDES.length) % HERO_SLIDES.length
                const position = offset === 0 ? 'active' : offset === 1 ? 'next' : offset === HERO_SLIDES.length - 1 ? 'previous' : 'hidden'
                if (position === 'hidden') return null
                return <button type="button" key={item.id} className={`zk-slide zk-slide--${position}`} onClick={() => setActive(index)} aria-label={`Show ${item.name}`} aria-current={position === 'active' ? 'true' : undefined}><span className="zk-slide-visual"><img src={item.image} alt={item.alt} className="zk-slide-image" draggable={false} loading={position === 'active' ? 'eager' : 'lazy'} /></span></button>
              })}
              <button className="zk-slide-arrow zk-slide-arrow--left" type="button" disabled={HERO_SLIDES.length < 2} onClick={() => move(-1)} aria-label="Previous character"><ArrowLeft size={21} /></button>
              <button className="zk-slide-arrow zk-slide-arrow--right" type="button" disabled={HERO_SLIDES.length < 2} onClick={() => move(1)} aria-label="Next character"><ArrowRight size={21} /></button>
            </div>
            <div className="zk-compact-caption" aria-live="polite" aria-atomic="true"><div><span>Zen Kitchen favourites</span><h2>{current.name}</h2><p>Discover freshly prepared food and savoury snacks below.</p></div><span className="zk-slide-count">{currentIndex + 1} / {HERO_SLIDES.length}</span></div>
          </>
          <div className="zk-character-dots" aria-label="Choose a character">{HERO_SLIDES.map((slide, index) => <button key={slide.id} type="button" onClick={() => setActive(index)} aria-label={`Show ${slide.alt}`} aria-pressed={index === currentIndex}><span /></button>)}</div>
        </div>
      </section>
      <section id="kitchen-menu" className="zk-catalog" aria-labelledby="zk-menu-title">
        <header><p>FRESH FLAVOURS · WARM MOMENTS</p><h2 id="zk-menu-title">Our Kitchen Menu</h2><p>Explore our food, savoury bites and kitchen favourites.</p></header>
        <div id="kitchen-snacks" className="zk-kind-tabs" aria-label="Kitchen selection">
          {(['all', 'food', 'snacks'] as const).map(value => <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setCategory('All Items') }}>{value === 'all' ? 'All kitchen items' : value === 'food' ? 'Food' : 'Snacks'}</button>)}
        </div>
        <div className="zk-categories" aria-label="Menu categories">{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
        <div className="zk-toolbar"><h3>{category} <small>({filtered.length} items)</small></h3><label><Search size={19} /><span className="sr-only">Search menu</span><input type="search" placeholder="Search menu items…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
        {loading && <p role="status">Loading the latest menu…</p>}
        {error && <div role="alert">{error} <button onClick={() => void refresh()}>Try again</button></div>}
        {!loading && !error && !filtered.length && <p>No items found. Try another category or search.</p>}
        <div className="zk-grid">{filtered.map(item => <article className="zk-card" key={item.id}>
          <div className="zk-card-visual"><FoodVisual item={item} className="zk-card-image" imageClassName="zk-product-photo" /><button className="zk-heart" aria-label={`${favourites.includes(item.id) ? 'Remove' : 'Save'} ${item.name} favourite`} aria-pressed={favourites.includes(item.id)} onClick={() => setFavourites(values => values.includes(item.id) ? values.filter(id => id !== item.id) : [...values, item.id])}><Heart fill={favourites.includes(item.id) ? 'currentColor' : 'none'} /></button><span>{item.category}</span></div>
          <div className="zk-card-copy"><h3>{item.name}</h3><p>{item.description || 'Prepared with care at Zen Kitchen.'}</p><div><a aria-label={`Enquire about ${item.name}`} href={`https://wa.me/94705175174?text=${encodeURIComponent(`Hello Zen Café, I would like to enquire about ${item.name}.`)}`} target="_blank" rel="noopener noreferrer"><Plus size={20} /><span>Enquire</span></a></div></div>
        </article>)}</div>
      </section>
    </main>
    <PremiumFooter kitchen />
  </div>
}
