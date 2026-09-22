import { useState, useEffect, useMemo } from 'react'
import { FiBookOpen, FiPlus, FiSearch, FiFilter, FiEdit2, FiTrash2, FiEye, FiDownload, FiCheckCircle, FiLayers, FiFileText, FiX, FiAward } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import subjectService from '../../services/subjectService'
import { showSuccess, showError } from '../../utils/toast'
import './SubjectManagement.css'

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    department: 'All Departments',
    branch: 'All Branches',
    semester: 'All Semesters',
    subjectType: 'All Types',
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [viewingSubject, setViewingSubject] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    shortName: '',
    department: 'Computer Science and Engineering',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    semester: 'Semester 3',
    subjectType: 'Theory',
    category: 'Professional Core (PCC)',
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 0,
    credits: 3,
    internalMarks: 30,
    externalMarks: 70,
    status: 'Active',
    description: '',
    facultyName: '',
  })

  const fetchSubjects = async () => {
    setLoading(true)
    try {
      const data = await subjectService.getSubjects(filters)
      setSubjects(data)
    } catch {
      showError('Failed to load subjects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [filters])

  const kpis = useMemo(() => {
    const total = subjects.length
    const theory = subjects.filter(s => s.subjectType === 'Theory').length
    const labs = subjects.filter(s => s.subjectType.includes('Practical') || s.subjectType.includes('Lab')).length
    const electives = subjects.filter(s => s.subjectType.includes('Elective')).length
    const totalCredits = subjects.reduce((sum, s) => sum + Number(s.credits || 0), 0)
    return { total, theory, labs, electives, totalCredits }
  }, [subjects])

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      subjectCode: '',
      subjectName: '',
      shortName: '',
      department: 'Computer Science and Engineering',
      course: 'B.Tech',
      branch: 'Computer Science & Engineering',
      semester: 'Semester 3',
      subjectType: 'Theory',
      category: 'Professional Core (PCC)',
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 0,
      credits: 3,
      internalMarks: 30,
      externalMarks: 70,
      status: 'Active',
      description: '',
      facultyName: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (subject) => {
    setEditingId(subject.id)
    setFormData({ ...subject })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.subjectCode.trim() || !formData.subjectName.trim()) {
      showError('Please provide subject code and subject name.')
      return
    }

    try {
      if (editingId) {
        await subjectService.updateSubject(editingId, formData)
        showSuccess(`Subject ${formData.subjectCode} updated successfully.`)
      } else {
        await subjectService.createSubject(formData)
        showSuccess(`Subject ${formData.subjectCode} added successfully.`)
      }
      setModalOpen(false)
      fetchSubjects()
    } catch {
      showError('Failed to save subject.')
    }
  }

  const handleDelete = async (id, code) => {
    if (window.confirm(`Are you sure you want to delete subject ${code}?`)) {
      try {
        await subjectService.deleteSubject(id)
        showSuccess(`Subject ${code} deleted.`)
        fetchSubjects()
      } catch {
        showError('Failed to delete subject.')
      }
    }
  }

  const exportCSV = () => {
    const headers = ['Code,Name,Short Name,Department,Branch,Semester,Type,Credits,L-T-P,Max Marks,Status']
    const rows = subjects.map(s => `"${s.subjectCode}","${s.subjectName}","${s.shortName}","${s.department}","${s.branch}","${s.semester}","${s.subjectType}",${s.credits},"${s.lectureHours}-${s.tutorialHours}-${s.practicalHours}",${s.totalMarks},"${s.status}"`)
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `btech_subjects_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout>
      <div className="sm-screen">
        <header className="sm-header">
          <div>
            <h1>Subject Management</h1>
            <p>Manage courses curriculum, syllabus catalogs, credit distribution, and theory/lab allocations.</p>
          </div>
          <div className="sm-actions">
            <button type="button" className="sm-btn sm-btn--secondary" onClick={exportCSV}>
              <FiDownload /> Export CSV
            </button>
            <button type="button" className="sm-btn sm-btn--primary" onClick={openCreateModal}>
              <FiPlus /> Add Subject
            </button>
          </div>
        </header>

        {/* KPI Row */}
        <section className="sm-kpi-grid">
          <div className="sm-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--blue"><FiBookOpen /></div>
            <div className="sm-kpi-content">
              <small>Total Subjects</small>
              <strong>{kpis.total}</strong>
            </div>
          </div>
          <div className="sm-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--green"><FiFileText /></div>
            <div className="sm-kpi-content">
              <small>Theory Courses</small>
              <strong>{kpis.theory}</strong>
            </div>
          </div>
          <div className="sm-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--purple"><FiLayers /></div>
            <div className="sm-kpi-content">
              <small>Practicals & Labs</small>
              <strong>{kpis.labs}</strong>
            </div>
          </div>
          <div className="sm-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--amber"><FiCheckCircle /></div>
            <div className="sm-kpi-content">
              <small>Elective Offerings</small>
              <strong>{kpis.electives}</strong>
            </div>
          </div>
          <div className="sm-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--cyan"><FiAward /></div>
            <div className="sm-kpi-content">
              <small>Total Credits</small>
              <strong>{kpis.totalCredits}</strong>
            </div>
          </div>
        </section>

        {/* Filters & Table Card */}
        <div className="sm-card">
          <div className="sm-card-header">
            <div className="sm-search-wrap">
              <FiSearch color="#64748b" />
              <input
                type="text"
                placeholder="Search by code, subject name, department..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="sm-filters-row">
              <select
                className="sm-select"
                value={filters.branch}
                onChange={e => setFilters({ ...filters, branch: e.target.value })}
              >
                <option>All Branches</option>
                <option>Computer Science & Engineering</option>
                <option>Electronics & Communication Engineering</option>
                <option>Electrical & Electronics Engineering</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
              </select>

              <select
                className="sm-select"
                value={filters.semester}
                onChange={e => setFilters({ ...filters, semester: e.target.value })}
              >
                <option>All Semesters</option>
                {Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`).map(sem => (
                  <option key={sem}>{sem}</option>
                ))}
              </select>

              <select
                className="sm-select"
                value={filters.subjectType}
                onChange={e => setFilters({ ...filters, subjectType: e.target.value })}
              >
                <option>All Types</option>
                <option>Theory</option>
                <option>Practical / Lab</option>
                <option>Elective (PE)</option>
                <option>Elective (OE)</option>
                <option>Mandatory Non-Credit</option>
              </select>
            </div>
          </div>

          <div className="sm-table-wrap">
            {subjects.length === 0 ? (
              <EmptyState
                title="No subjects found"
                description="Try adjusting your search criteria or add a new subject."
                action="Add Subject"
                onAction={openCreateModal}
              />
            ) : (
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject Name</th>
                    <th>Department & Branch</th>
                    <th>Semester</th>
                    <th>Type</th>
                    <th>L-T-P</th>
                    <th>Credits</th>
                    <th>Max Marks</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id}>
                      <td><span className="sm-code-badge">{s.subjectCode}</span></td>
                      <td>
                        <strong>{s.subjectName}</strong>
                        {s.shortName && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.shortName}</div>}
                      </td>
                      <td>
                        <div>{s.branch}</div>
                        <small style={{ color: '#64748b' }}>{s.department}</small>
                      </td>
                      <td>{s.semester}</td>
                      <td>
                        <span className={`sm-type-tag ${
                          s.subjectType === 'Theory' ? 'sm-type-tag--theory' :
                          s.subjectType.includes('Practical') || s.subjectType.includes('Lab') ? 'sm-type-tag--lab' :
                          s.subjectType.includes('(PE)') ? 'sm-type-tag--pe' :
                          s.subjectType.includes('(OE)') ? 'sm-type-tag--oe' : 'sm-type-tag--mc'
                        }`}>
                          {s.subjectType}
                        </span>
                      </td>
                      <td>
                        <span className="sm-ltp-pill">{s.lectureHours}-{s.tutorialHours}-{s.practicalHours}</span>
                      </td>
                      <td><span className="sm-credit-badge">{s.credits}</span></td>
                      <td>
                        <span title={`Internal: ${s.internalMarks} | External: ${s.externalMarks}`}>
                          {s.totalMarks || (s.internalMarks + s.externalMarks)}
                        </span>
                      </td>
                      <td><StatusBadge value={s.status} /></td>
                      <td>
                        <div className="sm-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="sm-icon-btn"
                            title="View details"
                            onClick={() => setViewingSubject(s)}
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            className="sm-icon-btn"
                            title="Edit subject"
                            onClick={() => openEditModal(s)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="sm-icon-btn"
                            title="Delete subject"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleDelete(s.id, s.subjectCode)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* View Details Modal */}
        {viewingSubject && (
          <div className="sm-modal-backdrop" onClick={() => setViewingSubject(null)}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
              <div className="sm-modal-header">
                <div>
                  <span className="sm-code-badge">{viewingSubject.subjectCode}</span>
                  <h2>{viewingSubject.subjectName}</h2>
                </div>
                <button type="button" className="sm-icon-btn" onClick={() => setViewingSubject(null)}><FiX /></button>
              </div>
              <div className="sm-modal-body">
                <div className="sm-form-grid-2">
                  <div><strong>Department:</strong> <p>{viewingSubject.department}</p></div>
                  <div><strong>Branch:</strong> <p>{viewingSubject.branch}</p></div>
                  <div><strong>Semester:</strong> <p>{viewingSubject.semester}</p></div>
                  <div><strong>Curriculum Category:</strong> <p>{viewingSubject.category}</p></div>
                  <div><strong>Teaching Scheme (L-T-P):</strong> <p>{viewingSubject.lectureHours} Lectures, {viewingSubject.tutorialHours} Tutorials, {viewingSubject.practicalHours} Practicals</p></div>
                  <div><strong>Credits:</strong> <p><span className="sm-credit-badge">{viewingSubject.credits} Credits</span></p></div>
                  <div><strong>Examination Scheme:</strong> <p>Internal: {viewingSubject.internalMarks} Marks | External: {viewingSubject.externalMarks} Marks (Total: {viewingSubject.totalMarks})</p></div>
                  <div><strong>Faculty Coordinator:</strong> <p>{viewingSubject.facultyName || 'Department Faculty'}</p></div>
                </div>
                <div>
                  <strong>Course Overview / Syllabus:</strong>
                  <p style={{ color: '#475569', marginTop: '6px', lineHeight: 1.6 }}>{viewingSubject.description || 'Syllabus details adhere to university guidelines and board of studies specifications.'}</p>
                </div>
              </div>
              <div className="sm-modal-footer">
                <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setViewingSubject(null)}>Close</button>
                <button type="button" className="sm-btn sm-btn--primary" onClick={() => { const s = viewingSubject; setViewingSubject(null); openEditModal(s) }}>Edit Subject</button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Subject Modal */}
        {modalOpen && (
          <div className="sm-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSave}>
                <div className="sm-modal-header">
                  <h2>{editingId ? 'Edit Subject' : 'Add New Subject'}</h2>
                  <button type="button" className="sm-icon-btn" onClick={() => setModalOpen(false)}><FiX /></button>
                </div>
                <div className="sm-modal-body">
                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Subject Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS301PC"
                        value={formData.subjectCode}
                        onChange={e => setFormData({ ...formData, subjectCode: e.target.value })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Short Name / Abbr</label>
                      <input
                        type="text"
                        placeholder="e.g. DSA"
                        value={formData.shortName}
                        onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="sm-field">
                    <label>Subject Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Data Structures & Algorithms"
                      value={formData.subjectName}
                      onChange={e => setFormData({ ...formData, subjectName: e.target.value })}
                    />
                  </div>

                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Branch</label>
                      <select
                        value={formData.branch}
                        onChange={e => setFormData({ ...formData, branch: e.target.value })}
                      >
                        <option>Computer Science & Engineering</option>
                        <option>Electronics & Communication Engineering</option>
                        <option>Electrical & Electronics Engineering</option>
                        <option>Mechanical Engineering</option>
                        <option>Civil Engineering</option>
                        <option>All Branches</option>
                      </select>
                    </div>
                    <div className="sm-field">
                      <label>Semester</label>
                      <select
                        value={formData.semester}
                        onChange={e => setFormData({ ...formData, semester: e.target.value })}
                      >
                        {Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`).map(sem => (
                          <option key={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Subject Type</label>
                      <select
                        value={formData.subjectType}
                        onChange={e => setFormData({ ...formData, subjectType: e.target.value })}
                      >
                        <option>Theory</option>
                        <option>Practical / Lab</option>
                        <option>Elective (PE)</option>
                        <option>Elective (OE)</option>
                        <option>Mandatory Non-Credit</option>
                        <option>Project / Seminar</option>
                      </select>
                    </div>
                    <div className="sm-field">
                      <label>Curriculum Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option>Professional Core (PCC)</option>
                        <option>Professional Core Lab (PCC Lab)</option>
                        <option>Professional Elective (PEC)</option>
                        <option>Open Elective (OEC)</option>
                        <option>Basic Sciences (BSC)</option>
                        <option>Engineering Sciences (ESC)</option>
                        <option>Humanities & Management (HSMC)</option>
                        <option>Mandatory Course (MC)</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm-form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div className="sm-field">
                      <label>Lectures (L)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.lectureHours}
                        onChange={e => setFormData({ ...formData, lectureHours: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Tutorial (T)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.tutorialHours}
                        onChange={e => setFormData({ ...formData, tutorialHours: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Practical (P)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.practicalHours}
                        onChange={e => setFormData({ ...formData, practicalHours: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Credits</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.credits}
                        onChange={e => setFormData({ ...formData, credits: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Internal Max Marks</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.internalMarks}
                        onChange={e => setFormData({ ...formData, internalMarks: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>External Max Marks</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.externalMarks}
                        onChange={e => setFormData({ ...formData, externalMarks: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="sm-field">
                    <label>Description / Syllabus Highlights</label>
                    <textarea
                      rows="3"
                      placeholder="Brief course objectives and syllabus contents..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sm-modal-footer">
                  <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="sm-btn sm-btn--primary">{editingId ? 'Update Subject' : 'Create Subject'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
