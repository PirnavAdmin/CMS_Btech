import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiAward, FiBookOpen, FiCalendar, FiCheck, FiExternalLink, FiGrid, FiHome, FiMenu, FiUsers, FiTool, FiTrendingUp, FiX } from 'react-icons/fi'
import RequestDemo from '../components/RequestDemo'
import ThemeToggle from '../components/ThemeToggle'
import './LandingPage.css'
const APP_VERSION = 'v1.0.0', APP_RELEASE_YEAR = '2026'
const navigation = [['home','Home'],['about','About'],['academics','Programs'],['benefits','Why Choose Us'],['facilities','Facilities'],['request','Request Information']]
const programmes = [['CSE','Computer Science & Engineering'],['ECE','Electronics & Communication'],['EEE','Electrical & Electronics'],['ME','Mechanical Engineering'],['CE','Civil Engineering'],['AI & DS','Artificial Intelligence & Data Science']]
const benefits = [[FiBookOpen,'Learning with purpose','Connect engineering fundamentals with practical problems and your chosen discipline.'],[FiUsers,'Faculty guidance','Learn through classroom discussion, academic guidance and collaborative work.'],[FiTool,'Practical experience','Build understanding through laboratory work, projects and hands-on exploration.'],[FiTrendingUp,'Career development','Explore how your studies can prepare you for professional opportunities.'],[FiGrid,'Research & innovation','Develop ideas, ask questions and explore solutions to engineering challenges.'],[FiAward,'Student development','Grow through teamwork, communication and participation in college life.']]
function Brand() { return <Link className="lp-brand" to="/"><i><FiBookOpen /></i><span><strong>Pirnav Engineering College</strong><small>Digital Campus</small></span></Link> }
export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false), [menuOpen, setMenuOpen] = useState(false), [active, setActive] = useState('home')
  const menuButton = useRef(null)
  useEffect(() => {
    const update = () => { const current = navigation.map(([id]) => document.getElementById(id)).filter(section => section && section.getBoundingClientRect().top <= 130).at(-1); setActive(current?.id || 'home') }
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
  const links = navigation.map(([id, label]) => <a key={id} href={'#' + id} aria-current={active === id ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)
  return <main className="lp-page lp-public">
    <a className="lp-skip" href="#home">Skip to content</a>
    <nav className="lp-nav" aria-label="Main navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus() } }}><div><Brand /><div className="lp-links">{links}</div><div className="lp-actions"><ThemeToggle /><Link className="lp-button small" to="/login">Login <FiArrowRight /></Link><button ref={menuButton} className="lp-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="lp-mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <FiX /> : <FiMenu />}</button></div></div><div id="lp-mobile-navigation" className="lp-mobile-navigation" hidden={!menuOpen}>{links}</div></nav>
    <section className="lp-hero universal" id="home" tabIndex={-1}><div className="lp-hero-content"><p className="lp-eyebrow">Welcome to Pirnav Engineering College</p><h1>Your engineering journey.<span>A world of possibilities.</span></h1><p className="lp-lead">Explore engineering programs, discover campus life and take the next step in your education. Start with the college, then find the information that matters to you.</p><div className="lp-hero-actions"><a className="lp-button" href="#about">Discover Pirnav <FiArrowRight /></a></div><div className="lp-trust">{['Engineering education','Practical learning','Campus community'].map(text => <span key={text}><FiCheck />{text}</span>)}</div></div></section>
    <section className="lp-section lp-heading" id="about"><div><p className="lp-eyebrow">01 / College overview</p><h2>A place to learn, connect and grow.</h2></div><div><p>Pirnav Engineering College brings engineering education and campus life together. Explore our B.Tech disciplines, learn about the academic experience and connect with the college for information about your next steps.</p></div></section>
    <section className="lp-section lp-hierarchy" id="academics"><div><p className="lp-eyebrow">02 / Academics & programs</p><h2>Find your path in engineering.</h2><p>Explore the disciplines already featured by our college. Request information to learn more about curriculum, admissions and program availability.</p><a className="lp-text-link" href="#request">Ask about a program <FiArrowRight /></a></div><div className="lp-programmes">{programmes.map(([code,name]) => <article key={code}><b>{code}</b><span>{name}</span></article>)}</div></section>
    <section className="lp-section lp-benefits" id="benefits"><header><p className="lp-eyebrow">03 / Why choose us</p><h2>Why Choose Pirnav Engineering College?</h2></header><div>{benefits.map(([Icon,title,text]) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="lp-section lp-facilities" id="facilities"><header className="lp-heading"><div><p className="lp-eyebrow">04 / Campus facilities & services</p><h2>Stay connected to college life.</h2></div><p>Access the existing digital campus services with your college account. Contact the college for physical facilities, transport or accommodation details before planning your visit.</p></header><div className="lp-facility-grid">{[[FiCalendar,'Academic calendar','Keep track of semester schedules, examinations and important dates.'],[FiHome,'Campus updates','Find announcements, notices, events and college activities.'],[FiBookOpen,'Student services','Reach academic information, results, fees and certificate services through the campus portal.']].map(([Icon,title,text]) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="lp-cta" id="request"><div><p className="lp-eyebrow light">05 / Take the next step</p><h2>What would you like to know?</h2><p>Ask about programs or campus life, or request a walkthrough of the digital campus.</p></div><button type="button" className="lp-button inverse" onClick={() => setDemoOpen(true)}>Request Information / Demo <FiArrowRight /></button></section>
    <footer className="lp-footer">
  <div className="lp-footer-top">
    <div className="lp-footer-brand">
      <Brand />
      <p className="lp-footer-tagline">Pirnav Engineering College — Digital Campus &amp; Academic Management System</p>
      <div className="lp-footer-badge">Developed &amp; Engineered by <strong>Pirnav</strong></div>
    </div>
    <div className="lp-footer-info">
      <strong>Product Information</strong>
      <ul className="lp-footer-meta">
        <li><span>Product:</span> <b>College Management System</b></li>
        <li><span>Version:</span> <b>{APP_VERSION}</b></li>
        <li><span>Developed by:</span> <b>Pirnav</b></li>
        <li><span>Release:</span> <b>{APP_RELEASE_YEAR}</b></li>
      </ul>
    </div>
    <div className="lp-footer-website">
      <strong>Official Website &amp; Links</strong>
      <div className="lp-footer-official-site">
        <span>Official Website: </span>
        <a href="https://pirnav.com/" target="_blank" rel="noopener noreferrer" className="lp-pirnav-link">
          Pirnav <FiExternalLink className="lp-ext-icon" />
        </a>
      </div>
      <nav className="lp-footer-nav" aria-label="Footer navigation"><a href="#about">About</a><a href="#academics">Programs</a><a href="#request">Contact</a><Link to="/login">Login</Link></nav>
    </div>
  </div>
  <div className="lp-footer-bottom">
    <p className="lp-footer-copyright">&copy; {APP_RELEASE_YEAR} Pirnav Software Solutions. All Rights Reserved.</p>
    <p className="lp-footer-legal">
      This software and its associated design, source code, architecture, and intellectual property are proprietary to Pirnav. Unauthorized reproduction, distribution, or modification is prohibited.
    </p>
  </div>
</footer>
    {demoOpen && <RequestDemo onClose={() => setDemoOpen(false)} />}
  </main>
}
