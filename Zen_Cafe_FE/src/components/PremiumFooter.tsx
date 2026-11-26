import { Clock3, Instagram, MapPin, Phone, ArrowUpRight } from 'lucide-react'
import WhatsAppIcon from './WhatsAppIcon'
import './PremiumFooter.css'

type Props = { kitchen?: boolean }
const INSTAGRAM_URL = 'https://www.instagram.com/zen.srilanka?xtok=Z2JoNzQ2ZGZzYjc='
const WHATSAPP_URL = 'https://wa.me/94705175174'
const groups = [
  { title: 'Quick links', links: [ ['Home', '/'], ['About Us', '/about'], ['Discover Zen', '/#discover-zen'], ['Menu', '/menu'], ['Reservations', '/#room-booking'], ['Gallery', '/#gallery'], ['Contact', '/contact'] ] },
  { title: 'Our menu', links: [ ['Café Menu', '/menu'], ['Kitchen Menu', '/zen-kitchen#kitchen-menu'], ['Snacks', '/zen-kitchen#kitchen-snacks'], ['Special Offers', '/offers'] ] },
  { title: 'Zen Kitchen', links: [ ['Explore Kitchen', '/zen-kitchen'], ['View Dishes', '/zen-kitchen#kitchen-menu'], ['Order Enquiries', WHATSAPP_URL], ['Contact Kitchen', WHATSAPP_URL] ] },
]

export default function PremiumFooter({ kitchen = false }: Props) {
  return (
    <footer id="contact" className="zen-reference-footer" aria-label="Zen Café footer">
      <div className="zen-reference-footer__inner">
        <div className="zen-reference-footer__grid">
          <div className="zen-reference-footer__brand">
            <a className="zen-reference-footer__logo" href={kitchen ? '/zen-kitchen' : '/'}>
              <img src="/assets/zen-logo.png" alt="" width="60" height="60" loading="lazy" />
              <span><b>{kitchen ? 'ZEN KITCHEN' : 'ZEN CAFE'}</b><small>Jaffna · Sri Lanka</small></span>
            </a>
            <p>Bringing the essence of Japan to your table.<br />A place where tradition meets taste<br />and every moment becomes special.</p>
            <div className="zen-reference-footer__socials">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Visit Zen Café on Instagram"><Instagram size={17} /></a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with Zen Café on WhatsApp"><WhatsAppIcon size={19} /></a>
              <a href="tel:+94705175174" aria-label="Call Zen Café"><Phone size={16} /></a>
            </div>
          </div>
          {groups.map(group => <nav className="zen-reference-footer__column" aria-label={`Footer ${group.title}`} key={group.title}>
            <h2>{group.title}</h2>
            <ul>{group.links.map(([label, href]) => <li key={label}><a href={href} {...(href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a></li>)}</ul>
          </nav>)}
          <div className="zen-reference-footer__column zen-reference-footer__contact">
            <h2>Contact info</h2>
            <address>
              <div><MapPin size={16} aria-hidden="true" /><a href="https://maps.app.goo.gl/1UiuxUG5MKE6ANDc6" target="_blank" rel="noopener noreferrer">Zen Café, Kaladdy Junction,<br />Kokkuvil, Sri Lanka</a></div>
              <div><Phone size={15} aria-hidden="true" /><a href="tel:+94705175174">+94 70 517 5174</a></div>
              <div><Instagram size={15} aria-hidden="true" /><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">zen.srilanka</a></div>
              <div><Clock3 size={16} aria-hidden="true" /><span>Open daily<br />11:00 AM – 12:00 AM</span></div>
            </address>
          </div>
        </div>
        <div className="zen-reference-footer__bottom">
          <p>© {new Date().getFullYear()} Zen Café. All rights reserved.</p>
          <div><a href="/menu">Explore our menu <ArrowUpRight size={12} aria-hidden="true" /></a><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Contact us</a></div>
        </div>
      </div>
    </footer>
  )
}
