import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiEye,
  FiEdit2,
  FiUserPlus,
  FiToggleLeft,
  FiToggleRight,
  FiCheckCircle,
} from 'react-icons/fi'

const DEFAULT_ICONS = {
  view: FiEye,
  edit: FiEdit2,
  assign: FiUserPlus,
  activate: FiToggleLeft,
  deactivate: FiToggleRight,
  review: FiCheckCircle,
}

const DEFAULT_TITLES = {
  view: 'View Details',
  edit: 'Edit',
  assign: 'Assign',
  activate: 'Activate',
  deactivate: 'Deactivate',
  review: 'Review / Approve',
}

/**
 * Standardized compact ERP table action button
 */
export function TableActionButton({
  type = 'view',
  to,
  onClick,
  title,
  ariaLabel,
  disabled = false,
  icon: CustomIcon,
  className = '',
  children,
  ...props
}) {
  const IconComponent = CustomIcon || DEFAULT_ICONS[type] || FiEye
  const actionTitle = title || DEFAULT_TITLES[type] || ''
  const actionAriaLabel = ariaLabel || actionTitle || type

  const classNames = [
    'table-action-btn',
    `action-${type}`,
    className,
  ].filter(Boolean).join(' ')

  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={classNames}
        title={actionTitle}
        aria-label={actionAriaLabel}
        {...props}
      >
        {children || (IconComponent && <IconComponent className="table-action-icon" />)}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      title={actionTitle}
      aria-label={actionAriaLabel}
      disabled={disabled}
      {...props}
    >
      {children || (IconComponent && <IconComponent className="table-action-icon" />)}
    </button>
  )
}

/**
 * Container for grouping table actions with consistent gap and alignment
 */
export function TableActionsGroup({ children, className = '', ...props }) {
  return (
    <div className={`table-actions-group ${className}`} {...props}>
      {children}
    </div>
  )
}

export default TableActionButton
