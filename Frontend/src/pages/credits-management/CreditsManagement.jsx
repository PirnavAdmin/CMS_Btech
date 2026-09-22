import { useState, useEffect } from 'react'
import { FiAward, FiCheckCircle, FiEdit3, FiSave, FiLayers, FiInfo, FiSliders, FiFileText } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import subjectService from '../../services/subjectService'
import { showSuccess, showError } from '../../utils/toast'
import './CreditsManagement.css'

export default function CreditsManagement() {
  const [activeTab, setActiveTab] = useState('framework')
  const [creditStructure, setCreditStructure] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await subjectService.getCreditStructure()
        setCreditStructure(data)
        setEditingData(JSON.parse(JSON.stringify(data)))
      } catch {
        showError('Failed to load credit structure.')
      }
    }
    loadData()
  }, [])

  const handleSave = async () => {
    try {
      await subjectService.updateCreditStructure(editingData)
      setCreditStructure(editingData)
      setIsEditing(false)
      showSuccess('Credit guidelines and limits saved successfully.')
    } catch {
      showError('Failed to save credit structure.')
    }
  }

  if (!creditStructure) {
    return (
      <DashboardLayout>
        <div className="cm-screen" style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading credit management framework...</p>
        </div>
      </DashboardLayout>
    )
  }

  const currentData = isEditing ? editingData : creditStructure
  const totalAllocated = currentData.categories.reduce((sum, c) => sum + Number(c.requiredCredits || 0), 0)

  return (
    <DashboardLayout>
      <div className="cm-screen">
        <header className="cm-header">
          <div>
            <h1>Academic Credits Management</h1>
            <p>AICTE / UGC / NEP 2020 Choice Based Credit System (CBCS) credit matrix and graduation requirements.</p>
          </div>
          <div>
            {isEditing ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="button" className="sm-btn sm-btn--primary" onClick={handleSave}>
                  <FiSave /> Save Framework
                </button>
              </div>
            ) : (
              <button type="button" className="sm-btn sm-btn--primary" onClick={() => setIsEditing(true)}>
                <FiEdit3 /> Configure Credit Rules
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="cm-tabs">
          <button
            type="button"
            className={`cm-tab-btn ${activeTab === 'framework' ? 'active' : ''}`}
            onClick={() => setActiveTab('framework')}
          >
            Curriculum Credit Framework (160 Credits)
          </button>
          <button
            type="button"
            className={`cm-tab-btn ${activeTab === 'semesters' ? 'active' : ''}`}
            onClick={() => setActiveTab('semesters')}
          >
            Semester-wise Credit Matrix
          </button>
          <button
            type="button"
            className={`cm-tab-btn ${activeTab === 'grading' ? 'active' : ''}`}
            onClick={() => setActiveTab('grading')}
          >
            Credit to Grade Points Conversion
          </button>
        </div>

        {/* KPI Row */}
        <section className="cm-kpi-grid">
          <div className="cm-kpi-card">
            <small>Total Graduation Credits</small>
            <strong>{currentData.totalProgramCredits} Credits</strong>
            <p>B.Tech 4-Year Full-Time Standard</p>
          </div>
          <div className="cm-kpi-card">
            <small>Min Credits per Semester</small>
            <strong>{currentData.minCreditsPerSemester} Credits</strong>
            <p>Academic minimum registration</p>
          </div>
          <div className="cm-kpi-card">
            <small>Max Credits per Semester</small>
            <strong>{currentData.maxCreditsPerSemester} Credits</strong>
            <p>Fast-track / overload ceiling</p>
          </div>
          <div className="cm-kpi-card">
            <small>Total Category Allocated</small>
            <strong style={{ color: totalAllocated === currentData.totalProgramCredits ? '#16a34a' : '#d97706' }}>
              {totalAllocated} / {currentData.totalProgramCredits}
            </strong>
            <p>{totalAllocated === currentData.totalProgramCredits ? '✓ 100% Balanced' : '⚠️ Adjust allocation'}</p>
          </div>
        </section>

        {/* Tab 1: Framework */}
        {activeTab === 'framework' && (
          <div className="cm-grid-2col">
            <div className="cm-card">
              <div className="cm-card-header">
                <h2>Curriculum Category Allocations</h2>
              </div>
              <div className="cm-card-body">
                {currentData.categories.map((cat, idx) => {
                  const percent = Math.round((cat.requiredCredits / currentData.totalProgramCredits) * 100) || 0
                  return (
                    <div className="cm-cat-item" key={cat.code}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="cm-cat-info">
                            <span className="cm-cat-code" style={{ background: `${cat.color}15`, color: cat.color }}>
                              {cat.code}
                            </span>
                            <span className="cm-cat-name">{cat.name}</span>
                          </div>
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              value={cat.requiredCredits}
                              onChange={e => {
                                const next = { ...editingData }
                                next.categories[idx].requiredCredits = Number(e.target.value)
                                setEditingData(next)
                              }}
                            />
                          ) : (
                            <span className="cm-cat-credits">{cat.requiredCredits} Credits ({percent}%)</span>
                          )}
                        </div>
                        <div className="cm-progress-bar-wrap">
                          <div
                            className="cm-progress-bar-fill"
                            style={{ width: `${percent}%`, background: cat.color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="cm-card">
              <div className="cm-card-header">
                <h2>Credit Guidelines & NEP 2020 Rules</h2>
              </div>
              <div className="cm-card-body" style={{ lineHeight: 1.7, color: '#334155' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <FiCheckCircle size={20} color="#16a34a" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <strong>1 Theory Hour / Week = 1 Credit</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#64748b' }}>A 3-credit theory course requires 3 lecture hours or 2 lectures + 1 tutorial per week over a 15-week semester.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <FiCheckCircle size={20} color="#16a34a" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <strong>2 Practical / Lab Hours / Week = 1 Credit</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#64748b' }}>A 3-hour practical session per week grants 1.5 credits.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <FiCheckCircle size={20} color="#16a34a" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <strong>Honors & Minor Degree Eligibility</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#64748b' }}>Students completing an additional 18–20 credits in specialized domains earn B.Tech with Honors / Minor specialization.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <FiCheckCircle size={20} color="#16a34a" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <strong>Mandatory Non-Credit Audit Courses</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#64748b' }}>Constitution of India, Environmental Science, and Universal Human Values must be passed without adding to GPA.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Semester Matrix */}
        {activeTab === 'semesters' && (
          <div className="cm-card">
            <div className="cm-card-header">
              <h2>Semester-wise Recommended Credit Distribution</h2>
            </div>
            <div className="cm-card-body" style={{ padding: 0 }}>
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Target Credits</th>
                    <th>Average Course Count</th>
                    <th>Workload Distribution</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.semesterBreakdown.map((item, idx) => (
                    <tr key={item.semester}>
                      <td><strong>{item.semester}</strong></td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            value={item.credits}
                            onChange={e => {
                              const next = { ...editingData }
                              next.semesterBreakdown[idx].credits = Number(e.target.value)
                              setEditingData(next)
                            }}
                          />
                        ) : (
                          <span style={{ fontWeight: 700, color: '#2563eb' }}>{item.credits} Credits</span>
                        )}
                      </td>
                      <td>{item.coursesCount} Courses</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${(item.credits / 26) * 100}%`, height: '100%', background: '#2563eb' }} />
                          </div>
                          <small style={{ color: '#64748b' }}>{Math.round((item.credits / currentData.totalProgramCredits) * 100)}% of Total</small>
                        </div>
                      </td>
                      <td><StatusBadge value={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Grading Conversion */}
        {activeTab === 'grading' && (
          <div className="cm-card">
            <div className="cm-card-header">
              <h2>UGC 10-Point Grading System & Credit Weighting</h2>
            </div>
            <div className="cm-card-body" style={{ padding: 0 }}>
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Letter Grade</th>
                    <th>Grade Points (G)</th>
                    <th>Percentage Marks Range</th>
                    <th>Performance Description</th>
                    <th>Credit Points Earned (C × G)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { grade: 'O', point: 10, marks: '≥ 90%', desc: 'Outstanding', example: 'For 4 Credits: 40 Points' },
                    { grade: 'A+', point: 9, marks: '80% – 89%', desc: 'Excellent', example: 'For 4 Credits: 36 Points' },
                    { grade: 'A', point: 8, marks: '70% – 79%', desc: 'Very Good', example: 'For 4 Credits: 32 Points' },
                    { grade: 'B+', point: 7, marks: '60% – 69%', desc: 'Good', example: 'For 4 Credits: 28 Points' },
                    { grade: 'B', point: 6, marks: '50% – 59%', desc: 'Above Average', example: 'For 4 Credits: 24 Points' },
                    { grade: 'C', point: 5, marks: '40% – 49%', desc: 'Pass', example: 'For 4 Credits: 20 Points' },
                    { grade: 'F', point: 0, marks: '< 40%', desc: 'Fail', example: '0 Points (Reappear required)' },
                    { grade: 'AB', point: 0, marks: 'Absent', desc: 'Absent', example: '0 Points' },
                  ].map(row => (
                    <tr key={row.grade}>
                      <td><strong style={{ fontSize: '1.05rem', color: row.point >= 7 ? '#16a34a' : row.point === 0 ? '#dc2626' : '#2563eb' }}>{row.grade}</strong></td>
                      <td><strong>{row.point}</strong></td>
                      <td>{row.marks}</td>
                      <td>{row.desc}</td>
                      <td><span style={{ color: '#475569' }}>{row.example}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
