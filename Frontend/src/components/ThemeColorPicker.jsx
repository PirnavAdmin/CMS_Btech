import { useEffect, useId, useRef, useState } from 'react'
import { FiCheck, FiMoon, FiSun } from 'react-icons/fi'
import { appearances, useTheme } from '../hooks/useTheme'
import { themeColors } from './themeColors'
import './ThemeColorPicker.css'

function ThemeOptions({ appearance, color, setAppearance, setColor, resetTheme }) {
  const [draft, setDraft] = useState(null)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()

  function selectColor(value) {
    setColor(value)
    setDraft(null)
    setInvalid(false)
  }

  return (
    <>
      <fieldset className="theme-color-picker__fieldset">
        <legend>Appearance</legend>
        <div className="theme-color-picker__modes">
          {appearances.map(mode => (
            <button key={mode} type="button" aria-pressed={appearance === mode} onClick={() => setAppearance(mode)}>
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="theme-color-picker__fieldset">
        <legend>Theme color</legend>
        <div className="theme-color-picker__grid">
          {themeColors.map(([name, value]) => (
            <button key={value} type="button" className="theme-color-picker__swatch"
              title={name} aria-label={name} aria-pressed={color === value}
              style={{ '--swatch': value }} onClick={() => selectColor(value)}>
              {color === value && <FiCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      </fieldset>
      <form className="theme-color-picker__custom" noValidate onSubmit={event => {
        event.preventDefault()
        if (setColor(draft ?? color)) {
          setDraft(null)
          setInvalid(false)
        } else {
          setInvalid(true)
        }
      }}>
        <input type="color" aria-label="Choose custom color" value={color.toLowerCase()} onChange={event => selectColor(event.target.value)} />
        <label>
          Custom HEX
          <input type="text" value={draft ?? color} spellCheck={false} autoComplete="off"
            aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}
            onChange={event => { setDraft(event.target.value); setInvalid(false) }} />
        </label>
        <button type="submit">Apply</button>
        {invalid && <small id={errorId} role="alert">Enter a 3- or 6-digit HEX color, such as #8042A8.</small>}
      </form>
      <div className="theme-color-picker__footer">
        <div className="theme-color-picker__preview" aria-label="Live theme preview" role="img">
          <span /><span /><span><i /><i /></span>
        </div>
        <button type="button" onClick={() => {
          resetTheme()
          setDraft(null)
          setInvalid(false)
        }}>Reset to default</button>
      </div>
    </>
  )
}

export function ThemeSync() {
  useTheme()
  return null
}

export default function ThemeColorPicker({ className = '' }) {
  const [open, setOpen] = useState(false)
  const theme = useTheme()
  const pickerRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverId = useId()
  const ModeIcon = theme.effectiveTheme === 'dark' ? FiMoon : FiSun

  useEffect(() => {
    if (!open) return
    const closeOutside = event => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    const escape = event => {
      if (event.key === 'Escape' && pickerRef.current?.contains(document.activeElement)) {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="theme-color-picker" ref={pickerRef}>
      <button ref={triggerRef} type="button" className={`theme-toggle theme-color-picker__trigger ${className}`}
        aria-label="Open theme settings" aria-expanded={open} aria-controls={open ? popoverId : undefined}
        aria-haspopup="dialog" title="Theme settings" onClick={() => setOpen(value => !value)}>
        <ModeIcon aria-hidden="true" />
        <span className="theme-color-picker__current" aria-hidden="true" />
      </button>
      {open && (
        <section id={popoverId} className="theme-color-picker__popover" role="dialog" aria-label="Theme settings">
          <strong className="theme-color-picker__heading">Workspace theme</strong>
          <ThemeOptions {...theme} />
        </section>
      )}
    </div>
  )
}
