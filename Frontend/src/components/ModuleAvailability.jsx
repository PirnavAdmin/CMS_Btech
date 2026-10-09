import { useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import PageHeader from './PageHeader'
import EmptyState from './EmptyState'

// Keep existing design prototypes accessible only by explicit development opt-in.
// They must never be mistaken for server-backed institutional operations.
export default function ModuleAvailability({ title, dependency, children }) {
  const [preview, setPreview] = useState(false)
  if (import.meta.env.DEV && preview) return <><div role="status" style={{ padding: '12px 24px', background: 'var(--surface-soft)', color: 'var(--text-primary)' }}>Local design preview only. Records, approvals and publication here are not institutional records. <button type="button" onClick={() => setPreview(false)}>Close preview</button></div>{children}</>
  return <DashboardLayout><PageHeader title={title} subtitle="Institutional integration is not available." /><EmptyState title="Backend integration required" message={dependency} />{import.meta.env.DEV && children && <details><summary>Development preview</summary><p>Uses browser-local data. It does not create official records or publish results.</p><button className="erp-btn erp-btn--secondary" onClick={() => setPreview(true)}>Open local design preview</button></details>}</DashboardLayout>
}
