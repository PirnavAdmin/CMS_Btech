import { Children, cloneElement, isValidElement, useState } from 'react'
import { FiChevronDown, FiFilter, FiRotateCcw } from 'react-icons/fi'
import './FilterPanel.css'

export default function FilterPanel({
  children,
  active = false,
  onClear,
  showClearWhenOpen = false,
  className = '',
  actions = null,
  leadingActions = null,
  hideClear = false
}) {
  const [open, setOpen] = useState(false)
  const nodes = Children.toArray(children)
  const primary = nodes[0]
  const primaryChildren = isValidElement(primary) ? Children.toArray(primary.props.children) : []
  const search = isValidElement(primary) && primaryChildren.length
    ? cloneElement(primary, {}, primaryChildren[0])
    : primary
  const filterNodes = [
    ...(isValidElement(primary) && primaryChildren.length > 1
      ? [cloneElement(primary, {}, primaryChildren.slice(1))]
      : []),
    ...nodes.slice(1),
  ]
  const hasFilterFields = filterNodes.length > 0

  return (
    <section className={`filter-disclosure ${open ? 'open' : ''} ${className}`}>
      <div className="filter-disclosure__bar">
        <div className="filter-disclosure__search">{search}</div>
        {leadingActions}
        {hasFilterFields && (
          <button
            type="button"
            className="filter-disclosure__toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <FiFilter /> Filters{active && <i aria-label="Filters applied" />}
            <FiChevronDown className="filter-disclosure__chevron" />
          </button>
        )}
        {actions}
      </div>
      {open && hasFilterFields && (
        <div className="filter-disclosure__content">
          <div className="filter-disclosure__content-inner">
            {filterNodes}
            {!hideClear && onClear && active && (
              <button
                type="button"
                className="filter-disclosure__clear-btn"
                onClick={onClear}
                title="Clear all filters"
              >
                <FiRotateCcw aria-hidden="true" /> Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

