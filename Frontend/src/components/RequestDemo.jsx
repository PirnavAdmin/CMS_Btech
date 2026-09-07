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
    try { const response = await submitDemoRequest(normalizeDemo(values)); if (mounted.current) setResult(response) }
    catch (error) { if (mounted.current) setFailure(error.message || 'We couldn’t submit your demo request. Please try again.') }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return <dialog ref={dialog} className="rd-dialog" aria-labelledby="rd-title" onCancel={e => { e.preventDefault(); if (!lock.current) onClose() }}>
    <header className="rd-header"><span><FiBookOpen /> Pirnav Digital Campus</span><button type="button" aria-label="Close demo request" onClick={onClose} disabled={busy}><FiX /></button></header>
    <div className="rd-layout"><aside className="rd-brand"><p className="lp-eyebrow">PERSONALIZED WALKTHROUGH</p><h2>Your campus.<br />Connected possibilities.</h2><p>Discover how Pirnav Engineering College’s Digital Campus brings your institution’s everyday work together.</p><ul>{[[FiBookOpen, 'Centralized academic management'], [FiTrendingUp, 'Student lifecycle and promotion tracking'], [FiCheckCircle, 'Admissions, examinations and results'], [FiShield, 'Secure role-based administration']].map(([Icon, text]) => <li key={text}><Icon /><span>{text}</span></li>)}</ul><p className="rd-support">Tell us what matters to your institution so your demo can focus on the right modules.</p></aside>
    <section className="rd-main">{result ? <div className="rd-success"><FiCheckCircle /><h1 id="rd-title" tabIndex={-1} data-success>Demo Enquiry Preview Ready</h1><p>Thank you, {values.fullName.trim()}.</p><p>Your enquiry details have been validated for this preview. No request has been sent or saved, and no demonstration has been scheduled.</p><small>Preview Reference ID</small><strong>{result.reference}</strong><div className="rd-footer"><button className="lp-button" onClick={() => { onClose(); document.getElementById('home')?.scrollIntoView() }}>Return to Homepage</button><button className="rd-secondary" onClick={onClose}>Close</button></div></div> : <><p className="lp-eyebrow">LET’S EXPLORE YOUR CAMPUS NEEDS</p><h1 id="rd-title">Request a personalized demo</h1><p className="rd-intro">Share your contact and institution details. Fields marked <b>*</b> are required.</p>
      <form onSubmit={submit} noValidate aria-busy={busy}><fieldset disabled={busy}><legend>Contact information</legend><div className="rd-grid">{field('fullName', 'Full Name', { required: true, autoComplete: 'name' })}{field('email', 'Work / College Email', { required: true, type: 'email', autoComplete: 'email' })}{field('mobile', 'Mobile Number (+91)', { required: true, type: 'tel', inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' })}</div></fieldset>
      <fieldset disabled={busy}><legend>Institution information</legend><div className="rd-grid">{field('institution', 'Institution / College Name', { required: true, autoComplete: 'organization' })}{field('role', 'Role / Designation', { required: true, options: demoRoles })}{values.role === 'Other' && field('otherRole', 'Your Designation', { required: true })}{field('city', 'City', { autoComplete: 'address-level2' })}{field('state', 'State', { autoComplete: 'address-level1' })}{field('studentCount', 'Number of Students', { type: 'number', min: 1, step: 1 })}</div></fieldset>
      <label className="rd-consent"><input type="checkbox" name="consent" checked={values.consent} onChange={update} disabled={busy} required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'rd-consent-error' : undefined} /><span>I agree to be contacted about a Pirnav Digital Campus demo. <b>*</b></span></label>{errors.consent && <p id="rd-consent-error" className="rd-error">{errors.consent}</p>}{failure && <p role="alert" className="rd-error">{failure}</p>}<footer className="rd-footer"><span role="status">{busy ? 'Preparing your request preview…' : 'A walkthrough shaped around your institution.'}</span><button type="submit" className="lp-button" disabled={busy}>{busy ? 'Submitting Request...' : 'Request Demo'}</button></footer></form></>}</section></div>
  </dialog>
}
