import { useEffect, useRef } from 'react'
import { Target, Eye, Leaf, Gem, Heart, Flower2, Sprout, MapPin, Clock3, Utensils, ArrowUpRight } from 'lucide-react'
import Header from './Header'
import PremiumFooter from './PremiumFooter'
import './AboutPage.css'

const values = [
  { icon: Leaf, title: 'Inspiration', text: 'Japanese flavours and thoughtful details inspire our café.' },
  { icon: Gem, title: 'Quality', text: 'Care in the dishes we prepare and the moments we create.' },
  { icon: Heart, title: 'Hospitality', text: 'A friendly welcome and a place to feel at home.' },
  { icon: Flower2, title: 'Harmony', text: 'Good food, warm company and time to slow down.' },
  { icon: Sprout, title: 'Mindfulness', text: 'An intention to make thoughtful choices, every day.' },
]

export default function AboutPage() {
  const page = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!page.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('za-arrived')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    page.current.querySelectorAll('[data-za-reveal]').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return <div className="zen-about-page" ref={page}>
    <Header />
    <main>
      <section className="za-hero" aria-labelledby="za-title">
        <div className="za-petals" aria-hidden="true"><i /><i /><i /></div>
        <div className="za-wrap"><p className="za-eyebrow">私たちについて · Our story</p><h1 id="za-title">About <span>Us</span></h1><p>Discover the flavours, warmth and Japanese inspiration<br className="za-desktop" /> behind Zen Café.</p><a href="#our-story">Discover our story <ArrowUpRight size={17} /></a></div>
      </section>
      <div className="za-wrap za-main">
        <section className="za-story" id="our-story" data-za-reveal aria-labelledby="za-story-title">
          <figure><img src="/assets/about/about-story.png" alt="Japanese-inspired dining room illustration with warm lanterns and cherry blossoms" width="1536" height="1024" loading="lazy" /><figcaption>A little Japanese inspiration, here in Kokkuvil.</figcaption></figure>
          <div><p className="za-eyebrow">Good food. Meaningful moments.</p><h2 id="za-story-title">Our Story</h2><p>Zen Café brings a Japanese-inspired café experience to Kaladdy Junction, Kokkuvil—a place to enjoy good food, spend time with friends and make room for a slower moment.</p><p>From a casual café visit to a celebration with your favourite people, our idea is simple: bring flavour, warmth and a welcoming atmosphere together.</p><a className="za-text-link" href="/contact">Come say hello <ArrowUpRight size={17} /></a></div>
        </section>
        <section className="za-purpose" aria-label="Our mission and vision" data-za-reveal>
          <article><span className="za-icon"><Target size={32} /></span><div><h2>Our Mission</h2><p>To make every visit feel welcoming through thoughtfully prepared food, friendly service and a comfortable place to connect.</p></div></article>
          <article><span className="za-icon"><Eye size={32} /></span><div><h2>Our Vision</h2><p>To become a favourite gathering place in our community, where Japanese inspiration and memorable café moments meet.</p></div></article>
        </section>
        <section className="za-values" aria-labelledby="za-values-title" data-za-reveal><p className="za-eyebrow">What matters to us</p><h2 id="za-values-title">Our Values</h2><div className="za-values-grid">{values.map(({icon: Icon,title,text}) => <article key={title}><Icon size={36} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      </div>
      <section className="za-experience" aria-labelledby="za-experience-title">
        <img src="/assets/about/about-experience.png" alt="Panda chef enjoying ramen beside a Japanese tea set" loading="lazy" width="2172" height="724" />
        <div className="za-experience-copy" data-za-reveal><h2 id="za-experience-title">The Zen Café <span>Experience</span></h2><p>More than a café—a little escape to savour good food, enjoy warm company and create your own special memories.</p><a href="/menu.html" className="za-button">Explore our menu <ArrowUpRight size={17} /></a></div>
      </section>
      <section className="za-wrap za-visit" aria-label="Plan your visit" data-za-reveal>
        <a href="https://maps.app.goo.gl/1UiuxUG5MKE6ANDc6" target="_blank" rel="noopener noreferrer"><MapPin /><span><b>Visit Zen Café</b>Kaladdy Junction, Kokkuvil</span></a>
        <div><Clock3 /><span><b>Open daily</b>9 AM–12 midnight</span></div>
        <a href="/zen-kitchen"><Utensils /><span><b>Zen Kitchen</b>Discover our dishes</span></a>
        <a href="/#room-booking"><Heart /><span><b>Celebrate together</b>Explore party room bookings</span></a>
      </section>
    </main>
    <PremiumFooter />
  </div>
}
