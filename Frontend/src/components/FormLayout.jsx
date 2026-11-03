import { cloneElement, useId } from 'react'
import './ScreenComponents.css'

export default function FormLayout({ children, onSubmit, actions, error, busy = false, className = '', bodyClassName = '', ...props }) {
  return <form {...props} onSubmit={onSubmit} aria-busy={busy || undefined} className={`erp-form-layout ${className}`}>
    <div className={`erp-form-scroll-body ${bodyClassName}`}>
      {children}
      {error && <p className="erp-form-layout__error" role="alert">{error}</p>}
    </div>
    {actions && <div className="erp-actions-bar">{actions}</div>}
  </form>
}

export function FormGroup({ title, description, children, className = '' }) {
  return <fieldset className={`erp-form-group ${className}`}>
    {title && <legend>{title}</legend>}
    {description && <p className="erp-form-group__description">{description}</p>}
    <div className="erp-form-group__fields">{children}</div>
  </fieldset>
}

// The child remains caller-controlled: dependent values/options and domain
// validation are not duplicated or hidden in a generic field schema.
export function FormField({ label, required = false, error, hint, children, className = '' }) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  const description = [children.props['aria-describedby'], hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return <div className={`erp-form-field ${className}`}>
    <label htmlFor={id}><span>{label}{required && <> <b className="required-mark" aria-hidden="true">*</b></>}</span></label>
    {cloneElement(children, { id, required: required || children.props.required, 'aria-invalid': error ? true : children.props['aria-invalid'], 'aria-describedby': description })}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small id={`${id}-error`} className="erp-form-layout__error" role="alert">{error}</small>}
  </div>
}
