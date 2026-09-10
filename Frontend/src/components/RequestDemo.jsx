import { useEffect, useRef, useState } from 'react'
import { FiBookOpen, FiCheckCircle, FiShield, FiTrendingUp, FiX } from 'react-icons/fi'
import { demoRoles, emptyDemo, normalizeDemo, validateDemo, submitDemoRequest } from '../api/demoRequest'
import './RequestDemo.css'

export default function RequestDemo({ onClose }) {
  const dialog = useRef(null), lock = useRef(false), mounted = useRef(true)
  const [values, setValues] = useState(emptyDemo), [errors, setErrors] = useState({}), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [failure, setFailure] = useState('')
  useEffect(() => {
    mounted.current = true
    const previous = document.activeElement, overflow = document.body.style.overflow
    dialog.current.showModal()
    document.body.style.overflow = 'hidden'
    return () => { mounted.current = false; document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  useEffect(() => { if (result) dialog.current.querySelector('[data-success]')?.focus() }, [result])
  const update = e => {
    const { name, value, checked, type } = e.target
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : name === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : value }))
    setErrors(v => ({ ...v, [name]: undefined })); setFailure('')
  }
  const field = (name, label, { required = false, options, ...props } = {}) => <label className="rd-field" key={name} htmlFor={`rd-${name}`}><span>{label}{required && <b> *</b>}</span>{options ? <select id={`rd-${name}`} name={name} value={values[name]} onChange={update} required={required} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `rd-${name}-error` : undefined}><option value="">Select {label.toLowerCase()}</option>{options.map(x => <option key={x}>{x}</option>)}</select> : <input id={`rd-${name}`} name={name} value={values[name]} onChange={update} required={required} maxLength={120} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `rd-${name}-error` : undefined} {...props} />}{errors[name] && <small id={`rd-${name}-error`} className="rd-error">{errors[name]}</small>}</label>
  async function submit(e) {
    e.preventDefault()
    if (lock.current) return
    const next = validateDemo(values); setErrors(next)
    if (Object.keys(next).length) { requestAnimationFrame(() => dialog.current.querySelector('[aria-invalid="true"]')?.focus()); return }
    lock.current = true; setBusy(true); setFailure('')
    try {
      const response = await submitDemoRequest(normalizeDemo(values))
      if (!response || response.success === false) throw new Error('Your request could not be confirmed. Please try again.')
      if (mounted.current) { setResult(response); setValues(emptyDemo) }
    }
    catch (error) { if (mounted.current) setFailure(error.message || 'We couldn’t submit your demo request. Please try again.') }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return <dialog ref={dialog} className={`rd-dialog${result ? " rd-dialog--success" : ""}`} aria-labelledby="rd-title" onCancel={e => { e.preventDefault(); if (!lock.current) onClose() }}>
    <header className="rd-header"><span><FiBookOpen /> Pirnav Digital Campus</span><button type="button" aria-label="Close demo request" onClick={onClose} disabled={busy}><FiX /></button></header>
    <div className="rd-layout"><aside className="rd-brand"><p className="lp-eyebrow">CONNECT WITH THE COLLEGE</p><h2>Your campus.<br />Connected possibilities.</h2><p>Ask about engineering programs, campus life or the digital campus. Share your interests so we can understand your enquiry.</p><ul>{[[FiBookOpen, 'Centralized academic management'], [FiTrendingUp, 'Student lifecycle and promotion tracking'], [FiCheckCircle, 'Admissions, examinations and results'], [FiShield, 'Secure role-based administration']].map(([Icon, text]) => <li key={text}><Icon /><span>{text}</span></li>)}</ul><p className="rd-support">For a digital campus walkthrough, include your organization and the areas you would like to explore.</p></aside>
    <section className="rd-main">{result ? <div className="rd-success" role="status"><FiCheckCircle /><h1 id="rd-title" tabIndex={-1} data-success>Request submitted</h1><p>Thank you for contacting the college.</p><p>Your enquiry has been submitted successfully.</p>{result.reference && <div className="rd-reference"><small>Reference ID</small><strong>{result.reference}</strong></div>}<div className="rd-footer"><button className="lp-button" onClick={() => { onClose(); document.getElementById('home')?.scrollIntoView() }}>Return to Homepage</button><button className="rd-secondary" onClick={onClose}>Close</button></div></div> : <><p className="lp-eyebrow">LET’S EXPLORE YOUR CAMPUS NEEDS</p><h1 id="rd-title">Request information or a demo</h1><p className="rd-intro">Share your contact and institution details. Fields marked <b>*</b> are required.</p>
      <form onSubmit={submit} noValidate aria-busy={busy}><fieldset disabled={busy}><legend>Contact information</legend><div className="rd-grid">{field('fullName', 'Full Name', { required: true, autoComplete: 'name' })}{field('email', 'Email Address', { required: true, type: 'email', autoComplete: 'email' })}{field('mobile', 'Mobile Number (+91)', { required: true, type: 'tel', inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' })}</div></fieldset>
      <fieldset disabled={busy}><legend>Your enquiry</legend><div className="rd-grid">{field('institution', 'Organization / College', { required: true, autoComplete: 'organization', maxLength: 255 })}{field('role', 'Role / Designation', { required: true, options: demoRoles })}{values.role === 'Other' && field('otherRole', 'Your Designation', { required: true, maxLength: 100 })}</div></fieldset>
      <label className="rd-consent"><input type="checkbox" name="consent" checked={values.consent} onChange={update} disabled={busy} required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'rd-consent-error' : undefined} /><span>I agree to be contacted about my enquiry. <b>*</b></span></label>{errors.consent && <p id="rd-consent-error" className="rd-error">{errors.consent}</p>}{failure && <p role="alert" className="rd-error">{failure}</p>}<footer className="rd-footer"><span role="status">{busy ? 'Submitting your request…' : 'A walkthrough shaped around your institution.'}</span><button type="submit" className="lp-button" disabled={busy}>{busy ? 'Submitting Request...' : 'Submit Request'}</button></footer></form></>}</section></div>
  </dialog>
}
