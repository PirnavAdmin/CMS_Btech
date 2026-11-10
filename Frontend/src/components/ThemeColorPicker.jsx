import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiMoon, FiSun } from 'react-icons/fi'
import './ThemeColorPicker.css'

const palettes = [
  ['Butter', '#FFF0AE'], ['Peach', '#FFD9B5'], ['Blush', '#FFD0CC'], ['Rose', '#FFBFC7'], ['Pink', '#FFAFC3'], ['Mauve', '#E8ADD0'],
  ['Lime', '#E3F7A9'], ['Mint', '#AEEFC1'], ['Seafoam', '#A9EBDD'], ['Sage', '#CDE8D9'], ['Aqua', '#A8F0D8'], ['Jade', '#A5E8D1'],
  ['Ice', '#DCE5FF'], ['Orchid', '#F8D6F2'], ['Lavender', '#EBC8FA'], ['Lilac', '#E7B7E6'], ['Periwinkle', '#C9C9F5'], ['Cyan', '#B8F4F0'],
  ['Pool', '#BCEBED'], ['Sky', '#AFE4F5'], ['Turquoise', '#A3F0EF'], ['Ocean', '#86C7DC'], ['Cloud', '#D6E0EE'], ['Slate', '#C3CCD8'],
  ['Cream', '#FFF7D6'], ['Apricot', '#FFE8D1'], ['Coral', '#FFC7B8'], ['Salmon', '#FFB7A8'], ['Watermelon', '#FF9EA5'], ['Berry', '#D99AB8'],
  ['Pistachio', '#ECF6C5'], ['Spring', '#C5F1A8'], ['Celadon', '#B7E3B2'], ['Eucalyptus', '#B8D9C5'], ['Lagoon', '#95E7D2'], ['Teal', '#8EDCCB'],
  ['Mist', '#E7EDFF'], ['Wisteria', '#E8D8FF'], ['Grape', '#D9C2F2'], ['Plum', '#D5ACD6'], ['Iris', '#B9B9EA'], ['Glacier', '#A9E5E8'],
  ['Frost', '#D1F1F1'], ['Breeze', '#C6EAF8'], ['Aqua Blue', '#9CE5E9'], ['Lagoon Blue', '#77BDD0'], ['Silver', '#E2E8EF'], ['Graphite', '#B4C0CE'],
  ['Sunflower', '#F7DB78'], ['Honey', '#F2C67D'], ['Flamingo', '#F299A5'], ['Fuchsia', '#E987BA'], ['Orchid Rose', '#D990C8'], ['Heather', '#B98DC7'],
  ['Chartreuse', '#CDE875'], ['Fern', '#A8D77C'], ['Clover', '#8FCB9A'], ['Forest Mist', '#86BDA4'], ['Sea Glass', '#78D1BD'], ['Lagoon Green', '#72C6B1'],
  ['Cornflower', '#AFC8F4'], ['Bluebell', '#AEB0E7'], ['Violet', '#C6A7E8'], ['Magenta Mist', '#D9A2DA'], ['Lilac Blue', '#AAA9E1'], ['Arctic', '#91DADD'],
  ['Powder', '#A9DCE0'], ['Ice Blue', '#8ED1E8'], ['Aqua Mist', '#7ED8D9'], ['Sea Blue', '#68B7D0'], ['Stone', '#C3CFD9'], ['Charcoal Mist', '#9EAAB8'],
]

const getStoredColor = () => localStorage.getItem('pirnav-accent-color') || palettes[6][1]

function applyColor(color) {
  const root = document.documentElement
  const darkMode = root.dataset.theme === 'dark'
  const rgb = color.match(/[\da-f]{2}/gi).map(part => parseInt(part, 16))
  const max = Math.max(...rgb) / 255, min = Math.min(...rgb) / 255
  const delta = max - min
  let hue = 0
  if (delta) {
    if (max === rgb[0] / 255) hue = ((rgb[1] - rgb[2]) / 255 / delta) % 6
    else if (max === rgb[1] / 255) hue = (rgb[2] - rgb[0]) / 255 / delta + 2
    else hue = (rgb[0] - rgb[1]) / 255 / delta + 4
  }
  hue = Math.round(hue * 60 + 360) % 360
  const saturation = Math.round((max === 0 ? 0 : delta / (1 - Math.abs(2 * max - delta))) * 100)
  const accent = `hsl(${hue} ${Math.max(35, Math.min(76, saturation))}% 38%)`
  const hover = `hsl(${hue} ${Math.max(38, Math.min(80, saturation + 4))}% 31%)`
  root.style.setProperty('--cms-primary', accent)
  root.style.setProperty('--cms-primary-dark', hover)
  root.style.setProperty('--cms-primary-hover', hover)
  root.style.setProperty('--cms-primary-active', hover)
  root.style.setProperty('--cms-primary-soft', `color-mix(in srgb, ${color} 55%, var(--surface))`)
  root.style.setProperty('--cms-primary-border', `color-mix(in srgb, ${color} 68%, var(--border))`)
  root.style.setProperty('--page-gradient', darkMode
    ? `linear-gradient(135deg, color-mix(in srgb, ${color} 14%, #121611) 0%, color-mix(in srgb, ${color} 7%, #192014) 48%, color-mix(in srgb, ${color} 18%, #0f140c) 100%)`
    : `linear-gradient(135deg, color-mix(in srgb, ${color} 28%, #f3f6e9) 0%, color-mix(in srgb, ${color} 10%, #ffffff) 48%, color-mix(in srgb, ${color} 34%, #e9f0da) 100%)`)
  root.style.setProperty('--cms-header', darkMode
    ? `color-mix(in srgb, ${color} 12%, rgba(40, 49, 35, 0.9))`
    : `color-mix(in srgb, ${color} 18%, rgba(231, 236, 213, 0.9))`)
  root.style.setProperty('--cms-sidebar', darkMode
    ? `color-mix(in srgb, ${color} 9%, rgba(32, 40, 29, 0.92))`
    : `color-mix(in srgb, ${color} 12%, rgba(238, 242, 224, 0.9))`)
  root.style.setProperty('--cms-sidebar-active', `linear-gradient(90deg, ${hover}, ${accent})`)
  root.style.setProperty('--cms-sidebar-active-glow', `0 4px 14px color-mix(in srgb, ${accent} 35%, transparent)`)
  root.style.setProperty('--scrollbar-thumb-hover', accent)
}

export default function ThemeColorPicker({ className = '' }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(getStoredColor)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || localStorage.getItem('pirnav-theme') || 'light')
  const pickerRef = useRef(null)

  useEffect(() => {
    applyColor(selected)
    const themeObserver = new MutationObserver(() => {
      applyColor(selected)
      setTheme(document.documentElement.dataset.theme || 'light')
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => themeObserver.disconnect()
  }, [selected])

  useEffect(() => {
    const syncTheme = event => setTheme(event.detail?.theme || document.documentElement.dataset.theme || 'light')
    window.addEventListener('pirnav-theme-change', syncTheme)
    return () => window.removeEventListener('pirnav-theme-change', syncTheme)
  }, [])

  useEffect(() => {
    const close = event => { if (!pickerRef.current?.contains(event.target)) setOpen(false) }
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [])

  const choose = color => {
    localStorage.setItem('pirnav-accent-color', color)
    setSelected(color)
    setOpen(false)
  }

  const chooseTheme = nextTheme => {
    localStorage.setItem('pirnav-theme', nextTheme)
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
    window.dispatchEvent(new CustomEvent('pirnav-theme-change', { detail: { theme: nextTheme } }))
  }

  return <div className="theme-color-picker" ref={pickerRef}>
    <button type="button" className={`theme-toggle theme-color-picker__trigger ${className}`} aria-label="Open theme settings" aria-expanded={open} aria-haspopup="dialog" title="Theme settings" onClick={() => setOpen(value => !value)}>{theme === 'dark' ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}<span className="theme-color-picker__current" style={{ backgroundColor: selected }} /></button>
    {open && <section className="theme-color-picker__popover" role="dialog" aria-label="Choose a theme color">
      <div className="theme-color-picker__heading"><div><strong>Workspace theme</strong><span>Choose a mode and an accent color</span></div><span className="theme-color-picker__preview" style={{ backgroundColor: selected }} /></div>
      <div className="theme-color-picker__modes" aria-label="Color mode"><button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => chooseTheme('light')} aria-pressed={theme === 'light'}><FiSun aria-hidden="true" />Light</button><button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => chooseTheme('dark')} aria-pressed={theme === 'dark'}><FiMoon aria-hidden="true" />Dark</button></div>
      <div className="theme-color-picker__grid">{palettes.map(([name, color]) => <button key={color} type="button" className={`theme-color-picker__swatch${selected === color ? ' is-selected' : ''}`} style={{ '--swatch-color': color }} onClick={() => choose(color)} aria-label={`${name} theme`} aria-pressed={selected === color} title={name}>{selected === color && <FiCheck aria-hidden="true" />}</button>)}</div>
    </section>}
  </div>
}
