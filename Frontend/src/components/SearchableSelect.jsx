import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiSearch } from 'react-icons/fi'
import './SearchableSelect.css'

const normalize = (option, getOptionLabel, getOptionValue) => {
  if (typeof option === 'string' || typeof option === 'number') {
    const value = String(option)
    return { value, label: value, code: '', subLabel: '', fullLabel: value, raw: option }
  }

  const rawValue = getOptionValue(option)
  const label = getOptionLabel(option)
  const code = option?.code || option?.shortCode || option?.shortName || option?.departmentCode || option?.courseCode || option?.branchCode || option?.academicYearCode || ''
  const subLabel = option?.subLabel || option?.subtitle || ''
  const resolvedLabel = label == null || String(label).trim() === '' ? String(option?.name || option?.label || '') : String(label)
  const fullLabel = option?.fullLabel || (resolvedLabel ? (code ? `${resolvedLabel} - ${code}` : resolvedLabel) : '')

  return {
    value: rawValue == null ? '' : String(rawValue),
    label: resolvedLabel,
    code: code == null ? '' : String(code),
    subLabel: String(subLabel || ''),
    fullLabel: String(fullLabel || resolvedLabel),
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
  hideSearch = false,
  disabled = false,
  loading = false,
  error = false,
  required = false,
  className = '',
  menuClassName = '',
  triggerProps = {},
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
    () => value == null || value === '' ? null : normalizedOptions.find((option) => option.value === String(value)) || null,
    [normalizedOptions, value],
  )

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return normalizedOptions
    return normalizedOptions.filter((option) => {
      const haystack = `${option.label} ${option.code} ${option.subLabel} ${option.fullLabel}`.toLowerCase()
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
      setMenuStyle(selectPlacement(rect, {
        top: viewportTop, left: viewportLeft, height: viewportHeight, width: viewportWidth,
      }, window.innerHeight))
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

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
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

  const triggerLabel = selectedOption
    ? (selectedOption.fullLabel || (selectedOption.code ? `${selectedOption.label} - ${selectedOption.code}` : selectedOption.label))
    : placeholder

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
    <div ref={menuRef} id={id} className={`searchable-select__menu ${menuClassName}`} onKeyDown={(event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      if (event.target === inputRef.current && ['Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const buttons = Array.from(menuRef.current.querySelectorAll('[role=option]:not(:disabled)'))
      const current = buttons.indexOf(document.activeElement)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (current + 1) % buttons.length : (current <= 0 ? buttons.length - 1 : current - 1)
      buttons[index]?.focus({ preventScroll: true })
      buttons[index]?.scrollIntoView({ block: 'nearest' })
    }} style={{ position: 'fixed', top: menuStyle.top, bottom: menuStyle.bottom, left: menuStyle.left, width: menuStyle.width, maxHeight: menuStyle.maxHeight, zIndex: 2000 }}>
      {!hideSearch && <label className="searchable-select__search">
        <FiSearch aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </label>}
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
                disabled={Boolean(option.raw?.disabled)}
                tabIndex={-1}
                onClick={() => handleSelect(option)}
              >
                <div className="searchable-select__option-content">
                  <div className="searchable-select__option-top">
                    <span className="searchable-select__option-label">{option.label}</span>
                    {option.code && <span className="searchable-select__option-code">{option.code}</span>}
                  </div>
                  {option.subLabel && <div className="searchable-select__option-sub">{option.subLabel}</div>}
                </div>
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
    <div ref={wrapperRef} className={`searchable-select ${className} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`} data-required={required ? 'true' : undefined} data-empty={!selectedOption ? 'true' : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="searchable-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-controls={id}
        aria-invalid={error}
        aria-label={label || placeholder}
        disabled={disabled}
        onClick={() => { if (!disabled) { setQuery(''); setOpen((current) => !current) } }}
        onKeyDown={handleKeyDown}
      >
        <span className={`searchable-select__trigger-text${selectedOption ? '' : ' is-placeholder'}`}>{triggerLabel}</span>
        <span className="searchable-select__caret" aria-hidden="true">▾</span>
      </button>
      {menu}
      {required && !selectedOption && !placeholder && <span className="searchable-select__required">Required</span>}
    </div>
  )
}

function selectPlacement(rect, viewport, windowHeight) {
  const padding = 8, gap = 4
  const below = Math.max(0, viewport.top + viewport.height - rect.bottom - padding - gap)
  const above = Math.max(0, rect.top - viewport.top - padding - gap)
  const opensAbove = below < 140 && above > below
  const width = Math.min(rect.width, Math.max(0, viewport.width - padding * 2))
  return {
    top: opensAbove ? undefined : Math.round(rect.bottom + gap),
    bottom: opensAbove ? Math.round(windowHeight - rect.top + gap) : undefined,
    left: Math.max(viewport.left + padding, Math.min(rect.left, viewport.left + viewport.width - width - padding)),
    width,
    maxHeight: Math.min(200, opensAbove ? above : below),
  }
}


const optionText = children => Children.toArray(children).map(child =>
  isValidElement(child) ? optionText(child.props.children) : String(child ?? ''),
).join('')

export function selectOptions(children, inheritedDisabled = false) {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return []
    if (child.type === Fragment || child.type === 'optgroup') {
      return selectOptions(child.props.children, inheritedDisabled || Boolean(child.props.disabled))
    }
    if (child.type !== 'option') return []
    const label = child.props.label ?? optionText(child.props.children)
    return [{ value: String(child.props.value ?? label), label,
      disabled: inheritedDisabled || Boolean(child.props.disabled) }]
  })
}

// Retain the native control for form submission and existing React event handlers.
// Small lists and multi-select listboxes keep their existing native behavior.
export function ProjectSelect({ children, ...props }) {
  const nativeRef = useRef(null)
  const wrapperRef = useRef(null)
  const [uncontrolledValue, setUncontrolledValue] = useState(props.defaultValue ?? '')
  const options = selectOptions(children)
  const searchable = !props.multiple && (!props.size || Number(props.size) === 1)
    && options.filter(option => option.value !== '').length >= 8
  const selectedValue = props.value ?? uncontrolledValue
  useEffect(() => {
    const native = nativeRef.current
    if (!native || props.value !== undefined) return
    setUncontrolledValue(native.value)
    const reset = () => queueMicrotask(() => setUncontrolledValue(native.value))
    native.form?.addEventListener('reset', reset)
    return () => native.form?.removeEventListener('reset', reset)
  }, [searchable, props.value, children])

  if (!searchable) return <select {...props}>{children}</select>
  const focusTrigger = () => wrapperRef.current?.querySelector('.searchable-select__trigger')?.focus()
  return <div ref={wrapperRef} className={`project-select ${props.className || ''}`} style={props.style}>
    <SearchableSelect
      label={props['aria-label'] || props.name || options.find(option => !option.value)?.label || 'Select an option'}
      value={selectedValue} options={options} disabled={props.disabled} required={props.required}
      error={props['aria-invalid'] === true || props['aria-invalid'] === 'true'}
      placeholder={options.find(option => !option.value)?.label || 'Select an option'}
      triggerProps={{ id: props.id, name: props.name, 'aria-labelledby': props['aria-labelledby'], 'aria-describedby': props['aria-describedby'], onBlur: props.onBlur }}
      onChange={value => {
        const native = nativeRef.current
        if (!native) return
        native.value = value
        native.dispatchEvent(new Event('change', { bubbles: true }))
      }}
    />
    <select {...props} id={undefined} ref={node => {
      nativeRef.current = node
      if (typeof props.ref === 'function') props.ref(node)
      else if (props.ref) props.ref.current = node
    }} className="project-select__native" style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
      tabIndex={-1} aria-hidden="true" onFocus={focusTrigger}
      onInvalid={event => { props.onInvalid?.(event); focusTrigger() }}
      onChange={event => { setUncontrolledValue(event.target.value); props.onChange?.(event) }}>
      {children}
    </select>
  </div>
}
