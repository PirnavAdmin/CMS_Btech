import { FiFilter } from 'react-icons/fi'
import WorkspaceDrawer from './WorkspaceDrawer'

export default function AcademicContextBar({ children, summary, open, setOpen }) {
  return <div className="tt-context-bar">
    <div className="tt-context-desktop">{children}</div>
    <button type="button" className="tt-button tt-context-toggle" aria-expanded={open} onClick={() => setOpen(true)}><FiFilter /> Academic context</button>
    <p className="tt-context-summary" title={summary}>{summary || 'Select an academic context to begin'}</p>
    {open && <WorkspaceDrawer title="Academic context" close={() => setOpen(false)} footer={<button className="tt-button tt-primary" onClick={() => setOpen(false)}>Apply context</button>}>{children}</WorkspaceDrawer>}
  </div>
}
