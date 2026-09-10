import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch } from 'react-icons/fi'
import './SearchableSelect.css'

const normalize = (option, getOptionLabel, getOptionValue) => {
  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option)
    return { value, label: value, code: '', raw: option }
  }

  const rawValue = getOptionValue(option)
  const label = getOptionLabel(option)
  const code = option?.code || option?.shortCode || option?.shortName || option?.departmentCode || option?.courseCode || option?.branchCode || option?.academicYearCode || ''

  return {
    value: rawValue == null ? '' : String(rawValue),
    label: label == null || String(label).trim() === '' ? String(option?.name || option?.label || '') : String(label),
    code: code == null ? '' : String(code),
    raw: option,
  }
}

export default function SearchableSelect({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  disabled = false,
  loading = false,
  error = false,
  required = false,
  className = '',
  noOptionsMessage = 'No matching options found.',
  getOptionLabel = (option) => typeof option === 'string' || typeof option === 'number' ? String(option) : option?.label || option?.name || option?.title || '',
  getOptionValue = (option) => typeof option === 'string' || typeof option === 'number' ? String(option) : option?.value ?? option?.id ?? option?.code ?? option?.name ?? option?.label ?? '',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 })
  const wrapperRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const inputRef = useRef(null)
  const id = useId()

  const normalizedOptions = useMemo(
    () => options.map((option) => normalize(option, getOptionLabel, getOptionValue)),
    [options, getOptionLabel, getOptionValue],
  )

  const selectedOption = useMemo(
    () => value == null || value === '' ? null : normalizedOptions.find((option) => {
      const candidates = [
        option.value,
        option.raw?.value,
        option.raw?.id,
        option.raw?.courseId,
        option.raw?.code,
        option.raw?.courseCode,
      ]
      return candidates.some((candidate) => String(candidate ?? '') === String(value ?? ''))
    }) || null,
    [normalizedOptions, value],
  )

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return normalizedOptions
    return normalizedOptions.filter((option) => {
      const haystack = `${option.label} ${option.code}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [normalizedOptions, query])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const position = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewport = window.visualViewport
      const viewportTop = viewport?.offsetTop || 0
      const viewportLeft = viewport?.offsetLeft || 0
      const viewportHeight = viewport?.height || window.innerHeight
      const viewportWidth = viewport?.width || window.innerWidth
      const padding = 8, gap = 8
      const below = Math.max(0, viewportTop + viewportHeight - rect.bottom - padding - gap)
      const above = Math.max(0, rect.top - viewportTop - padding - gap)
      const desiredHeight = Math.min(280, (menuRef.current?.querySelector('.searchable-select__search')?.offsetHeight || 50) + (menuRef.current?.querySelector('.searchable-select__options')?.scrollHeight || 40) + 2)
      const flip = below < desiredHeight && above > below
      const maxHeight = Math.min(280, flip ? above : below)
      const width = Math.min(rect.width, viewportWidth - padding * 2)
      setMenuStyle({
        top: flip ? undefined : rect.bottom + gap,
        bottom: flip ? window.innerHeight - rect.top + gap : undefined,
        left: Math.max(viewportLeft + padding, Math.min(rect.left, viewportLeft + viewportWidth - width - padding)),
        width, maxHeight,
      })
    }
    const onScroll = event => {
      if (!menuRef.current?.contains(event.target)) position()
    }
    position()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', position)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
    }
  }, [open, options, query, loading])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      const target = event.target
      const insideMenu = menuRef.current && menuRef.current.contains(target)
      const insideTrigger = wrapperRef.current && wrapperRef.current.contains(target)
      if (!insideMenu && !insideTrigger) {
        setOpen(false)
      }
    }


    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
        triggerRef.current?.focus({ preventScroll: true })
      }
      if (event.key === 'Tab') {
        triggerRef.current?.focus({ preventScroll: true })
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
      return () => cancelAnimationFrame(frame)
    }
  }, [open])

  const handleSelect = (next) => {
    setOpen(false)
    setQuery('')
    const selectedValue = next?.raw?.value ?? next?.raw?.id ?? next?.raw?.courseId ?? next?.value ?? next?.id ?? next?.courseId ?? ''
    onChange?.(selectedValue)
    triggerRef.current?.focus({ preventScroll: true })
  }

  const triggerLabel = selectedOption ? selectedOption.label : placeholder

  const handleKeyDown = (event) => {
    if (disabled) return
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      setQuery('')
      setOpen((current) => !current)
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const menu = open && !disabled ? createPortal(
    <div ref={menuRef} id={id} className="searchable-select__menu" onKeyDown={(event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      if (event.target === inputRef.current && ['Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const buttons = Array.from(menuRef.current.querySelectorAll('[role=option]'))
      const current = buttons.indexOf(document.activeElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (current + 1) % buttons.length : (current <= 0 ? buttons.length - 1 : current - 1)
      buttons[index]?.focus({ preventScroll: true })
      buttons[index]?.scrollIntoView({ block: 'nearest' })
    }} style={{ position: 'fixed', top: menuStyle.top, bottom: menuStyle.bottom, left: menuStyle.left, width: menuStyle.width, maxHeight: menuStyle.maxHeight, zIndex: 2000 }}>
      <label className="searchable-select__search">
        <FiSearch aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </label>
      <div className="searchable-select__options" role="listbox" aria-label={label || 'Options'}>
        {loading ? (
          <div className="searchable-select__empty">Loading options...</div>
        ) : filteredOptions.length ? (
          filteredOptions.map((option) => {
            const active = String(option.value) === String(value ?? '')
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                className={`searchable-select__option ${active ? 'is-active' : ''}`}
                role="option"
                aria-selected={active}
                tabIndex={-1}
                onClick={() => handleSelect(option)}
              >
                <span className="searchable-select__option-label">{option.label}</span>
                {option.code && <span className="searchable-select__option-code">{option.code}</span>}
              </button>
            )
          })
        ) : (
          <div className="searchable-select__empty">{noOptionsMessage}</div>
        )}
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <div ref={wrapperRef} className={`searchable-select ${className} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="searchable-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-invalid={error}
        aria-label={label || placeholder}
        disabled={disabled}
        onClick={() => { if (!disabled) { setQuery(''); setOpen((current) => !current) } }}
        onKeyDown={handleKeyDown}
      >
        <span className="searchable-select__trigger-text">{triggerLabel}</span>
        <span className="searchable-select__caret" aria-hidden="true">▾</span>
      </button>
      {menu}
      {required && !selectedOption && !placeholder && <span className="searchable-select__required">Required</span>}
    </div>
  )
}
