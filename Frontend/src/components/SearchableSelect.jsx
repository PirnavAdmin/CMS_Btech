import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  const id = useMemo(() => `searchable-select-${Math.random().toString(36).slice(2, 9)}`, [])

  const normalizedOptions = useMemo(
    () => options.map((option) => normalize(option, getOptionLabel, getOptionValue)),
    [options, getOptionLabel, getOptionValue],
  )

  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => {
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
    const rect = triggerRef.current.getBoundingClientRect()
    const gap = 8
    const menuWidth = Math.max(rect.width, 180)
    const maxHeight = 280
    const viewportPadding = 16
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const shouldFlip = spaceBelow < 180 && spaceAbove > 180

    setMenuStyle({
      top: shouldFlip ? Math.max(viewportPadding, rect.top - maxHeight - gap) : Math.min(window.innerHeight - viewportPadding, rect.bottom + gap),
      left: Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
      width: menuWidth,
      maxHeight,
    })
  }, [open, options, query])

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

    const handleScroll = (event) => {
      const target = event.target
      const insideMenu = menuRef.current && (menuRef.current.contains(target) || target === menuRef.current)
      const insideTrigger = wrapperRef.current && wrapperRef.current.contains(target)

      if (!insideMenu && !insideTrigger) {
        setOpen(false)
      }
    }

    const handleResize = () => setOpen(false)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
      if (event.key === 'Tab') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current.focus())
    }
  }, [open])

  const handleSelect = (next) => {
    setOpen(false)
    setQuery('')
    const selectedValue = next?.raw?.value ?? next?.raw?.id ?? next?.raw?.courseId ?? next?.value ?? next?.id ?? next?.courseId ?? ''
    onChange?.(selectedValue)
  }

  const triggerLabel = selectedOption ? selectedOption.label : placeholder

  const handleKeyDown = (event) => {
    if (disabled) return
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      setOpen((current) => !current)
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const menu = open && !disabled ? createPortal(
    <div ref={menuRef} id={id} className="searchable-select__menu" role="listbox" aria-label={label || 'Options'} style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, width: menuStyle.width, maxHeight: menuStyle.maxHeight, zIndex: 1050 }}>
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
      <div className="searchable-select__options" style={{ maxHeight: menuStyle.maxHeight - 50 }}>
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
        onClick={() => !disabled && setOpen((current) => !current)}
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
