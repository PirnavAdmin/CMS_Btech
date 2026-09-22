import { useState, useEffect, useMemo } from 'react'
import { FiLayers, FiUsers, FiPlus, FiSearch, FiCheckCircle, FiEdit2, FiTrash2, FiClock, FiX, FiCheckSquare, FiAward } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import subjectService from '../../services/subjectService'
import { showSuccess, showError } from '../../utils/toast'
import './ElectiveManagement.css'

export default function ElectiveManagement() {
  const [activeTab, setActiveTab] = useState('baskets')
  const [groups, setGroups] = useState([])
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [allocModalOpen, setAllocModalOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState(null)

  const [groupFormData, setGroupFormData] = useState({
    groupCode: '',
    groupName: '',
    type: 'Professional Elective (PE)',
    semester: 'Semester 5',
    branch: 'Computer Science & Engineering',
    totalCapacity: 120,
    minOptionsRequired: 1,
    maxAllowed: 1,
    status: 'Open',
    subjects: [
      { code: '', name: '', capacity: 60, faculty: '' }
    ]
  })

  const [allocFormData, setAllocFormData] = useState({
    rollNumber: '',
    studentName: '',
    branch: 'CSE',
    semester: 'Semester 5',
    groupCode: 'PE-I',
    subjectCode: '',
    preferenceRank: 1,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [groupsData, allocsData] = await Promise.all([
        subjectService.getElectiveGroups(),
        subjectService.getStudentAllocations(),
      ])
      setGroups(groupsData)
      setAllocations(allocsData)
    } catch {
      showError('Failed to load elective data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const kpis = useMemo(() => {
    const totalGroups = groups.length
    const peGroups = groups.filter(g => g.type.includes('Professional')).length
    const oeGroups = groups.filter(g => g.type.includes('Open')).length
    const totalCapacity = groups.reduce((sum, g) => sum + Number(g.totalCapacity || 0), 0)
    const totalEnrolled = allocations.length
    return { totalGroups, peGroups, oeGroups, totalCapacity, totalEnrolled }
  }, [groups, allocations])

  const openCreateGroup = () => {
    setEditingGroupId(null)
    setGroupFormData({
      groupCode: '',
      groupName: '',
      type: 'Professional Elective (PE)',
      semester: 'Semester 5',
      branch: 'Computer Science & Engineering',
      totalCapacity: 120,
      minOptionsRequired: 1,
      maxAllowed: 1,
      status: 'Open',
      subjects: [
        { code: '', name: '', capacity: 60, faculty: '' },
        { code: '', name: '', capacity: 60, faculty: '' }
      ]
    })
    setGroupModalOpen(true)
  }

  const handleSaveGroup = async (e) => {
    e.preventDefault()
    if (!groupFormData.groupCode.trim() || !groupFormData.groupName.trim()) {
      showError('Please provide group code and name.')
      return
    }

    try {
      if (editingGroupId) {
        await subjectService.updateElectiveGroup(editingGroupId, groupFormData)
        showSuccess('Elective basket updated.')
      } else {
        await subjectService.createElectiveGroup(groupFormData)
        showSuccess('Elective basket created.')
      }
      setGroupModalOpen(false)
      loadData()
    } catch {
      showError('Failed to save elective group.')
    }
  }

  const handleDeleteGroup = async (id, code) => {
    if (window.confirm(`Delete elective group ${code}?`)) {
      try {
        await subjectService.deleteElectiveGroup(id)
        showSuccess(`Elective group ${code} deleted.`)
        loadData()
      } catch {
        showError('Failed to delete elective group.')
      }
    }
  }

  const handleSaveAllocation = async (e) => {
    e.preventDefault()
    if (!allocFormData.rollNumber.trim() || !allocFormData.studentName.trim() || !allocFormData.subjectCode) {
      showError('Please complete all allocation fields.')
      return
    }

    try {
      const selectedGroup = groups.find(g => g.groupCode === allocFormData.groupCode)
      const selectedSub = selectedGroup?.subjects.find(s => s.code === allocFormData.subjectCode)
      await subjectService.createAllocation({
        ...allocFormData,
        groupName: selectedGroup?.groupName || allocFormData.groupCode,
        subjectName: selectedSub?.name || allocFormData.subjectCode,
      })
      showSuccess(`Elective assigned to ${allocFormData.studentName}.`)
      setAllocModalOpen(false)
      loadData()
    } catch {
      showError('Failed to record allocation.')
    }
  }

  const handleDeleteAllocation = async (id, studentName) => {
    if (window.confirm(`Remove elective allocation for ${studentName}?`)) {
      try {
        await subjectService.removeAllocation(id)
        showSuccess('Allocation removed.')
        loadData()
      } catch {
        showError('Failed to remove allocation.')
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="em-screen">
        <header className="em-header">
          <div>
            <h1>Elective Courses & Baskets Management</h1>
            <p>Manage Professional Elective (PE) tracks, Open Elective (OE) inter-disciplinary pools, and student choice allocations.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setAllocModalOpen(true)}>
              <FiCheckSquare /> Allocate Student Elective
            </button>
            <button type="button" className="sm-btn sm-btn--primary" onClick={openCreateGroup}>
              <FiPlus /> Create Elective Basket
            </button>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="em-tabs">
          <button
            type="button"
            className={`em-tab-btn ${activeTab === 'baskets' ? 'active' : ''}`}
            onClick={() => setActiveTab('baskets')}
          >
            Elective Baskets & Tracks ({groups.length})
          </button>
          <button
            type="button"
            className={`em-tab-btn ${activeTab === 'allocations' ? 'active' : ''}`}
            onClick={() => setActiveTab('allocations')}
          >
            Student Allocations ({allocations.length})
          </button>
        </div>

        {/* KPI Row */}
        <section className="em-kpi-grid">
          <div className="em-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--blue"><FiLayers /></div>
            <div className="sm-kpi-content">
              <small>Total Baskets</small>
              <strong>{kpis.totalGroups}</strong>
            </div>
          </div>
          <div className="em-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--amber"><FiAward /></div>
            <div className="sm-kpi-content">
              <small>Professional Electives (PE)</small>
              <strong>{kpis.peGroups} Baskets</strong>
            </div>
          </div>
          <div className="em-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--purple"><FiCheckCircle /></div>
            <div className="sm-kpi-content">
              <small>Open Electives (OE)</small>
              <strong>{kpis.oeGroups} Pools</strong>
            </div>
          </div>
          <div className="em-kpi-card">
            <div className="sm-kpi-icon sm-kpi-icon--green"><FiUsers /></div>
            <div className="sm-kpi-content">
              <small>Enrolled Students</small>
              <strong>{kpis.totalEnrolled} / {kpis.totalCapacity}</strong>
            </div>
          </div>
        </section>

        {/* Baskets View */}
        {activeTab === 'baskets' && (
          <div className="em-groups-grid">
            {groups.map(group => {
              const fillPercent = Math.round((group.enrolledStudents / (group.totalCapacity || 1)) * 100)
              return (
                <div className="em-group-card" key={group.id}>
                  <div className="em-group-header">
                    <div>
                      <span className="em-group-code">{group.groupCode}</span>
                      <h3>{group.groupName}</h3>
                    </div>
                    <StatusBadge value={group.status} />
                  </div>

                  <div className="em-group-body">
                    <div className="em-group-meta">
                      <span><strong>Type:</strong> {group.type}</span>
                      <span><strong>Semester:</strong> {group.semester}</span>
                    </div>
                    <div className="em-group-meta">
                      <span><strong>Branch:</strong> {group.branch}</span>
                      <span><strong>Capacity:</strong> {group.enrolledStudents} / {group.totalCapacity} ({fillPercent}%)</span>
                    </div>

                    <div className="cm-progress-bar-wrap" style={{ margin: '0 0 10px 0' }}>
                      <div
                        className="cm-progress-bar-fill"
                        style={{ width: `${Math.min(100, fillPercent)}%`, background: fillPercent > 90 ? '#dc2626' : '#2563eb' }}
                      />
                    </div>

                    <div>
                      <small style={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Offered Courses in this Basket ({group.subjects?.length || 0}):
                      </small>
                      <div className="em-subject-list" style={{ marginTop: '6px' }}>
                        {group.subjects?.map((sub, i) => (
                          <div className="em-subject-item" key={i}>
                            <div>
                              <span className="em-subject-title">{sub.code}: {sub.name}</span>
                              <div className="em-subject-faculty">Instructor: {sub.faculty || 'Department Faculty'}</div>
                            </div>
                            <span className="sm-credit-badge">Max {sub.capacity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="em-group-footer">
                    <button
                      type="button"
                      className="sm-icon-btn"
                      title="Delete Basket"
                      style={{ color: '#dc2626' }}
                      onClick={() => handleDeleteGroup(group.id, group.groupCode)}
                    >
                      <FiTrash2 />
                    </button>
                    <button
                      type="button"
                      className="sm-btn sm-btn--secondary"
                      style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      onClick={() => {
                        setEditingGroupId(group.id)
                        setGroupFormData({ ...group })
                        setGroupModalOpen(true)
                      }}
                    >
                      <FiEdit2 /> Edit Basket
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Allocations View */}
        {activeTab === 'allocations' && (
          <div className="sm-card">
            <div className="sm-card-header">
              <h2>Allocated Student Electives</h2>
              <button type="button" className="sm-btn sm-btn--primary" onClick={() => setAllocModalOpen(true)}>
                <FiPlus /> New Allocation
              </button>
            </div>
            <div className="sm-table-wrap">
              {allocations.length === 0 ? (
                <EmptyState
                  title="No allocations yet"
                  description="Students will appear here once they choose their elective courses."
                  action="Allocate Elective"
                  onAction={() => setAllocModalOpen(true)}
                />
              ) : (
                <table className="em-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Branch & Semester</th>
                      <th>Elective Basket</th>
                      <th>Allocated Subject</th>
                      <th>Preference</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map(al => (
                      <tr key={al.id}>
                        <td><span className="sm-code-badge">{al.rollNumber}</span></td>
                        <td><strong>{al.studentName}</strong></td>
                        <td>{al.branch} · {al.semester}</td>
                        <td><span className="em-group-code">{al.groupCode}</span></td>
                        <td>
                          <strong>{al.subjectCode}</strong>: {al.subjectName}
                        </td>
                        <td><span className="sm-ltp-pill">Choice #{al.preferenceRank}</span></td>
                        <td>{al.allocationDate}</td>
                        <td><StatusBadge value={al.status} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="sm-icon-btn"
                            style={{ color: '#dc2626', display: 'inline-grid' }}
                            title="Remove allocation"
                            onClick={() => handleDeleteAllocation(al.id, al.studentName)}
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Create / Edit Group Modal */}
        {groupModalOpen && (
          <div className="sm-modal-backdrop" onClick={() => setGroupModalOpen(false)}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSaveGroup}>
                <div className="sm-modal-header">
                  <h2>{editingGroupId ? 'Edit Elective Basket' : 'Create New Elective Basket'}</h2>
                  <button type="button" className="sm-icon-btn" onClick={() => setGroupModalOpen(false)}><FiX /></button>
                </div>
                <div className="sm-modal-body">
                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Basket Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. PE-I or OE-II"
                        value={groupFormData.groupCode}
                        onChange={e => setGroupFormData({ ...groupFormData, groupCode: e.target.value })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Elective Type</label>
                      <select
                        value={groupFormData.type}
                        onChange={e => setGroupFormData({ ...groupFormData, type: e.target.value })}
                      >
                        <option>Professional Elective (PE)</option>
                        <option>Open Elective (OE)</option>
                        <option>Value Added Course (VAC)</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm-field">
                    <label>Basket Title / Track Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Professional Elective - I (Track: Intelligent Systems)"
                      value={groupFormData.groupName}
                      onChange={e => setGroupFormData({ ...groupFormData, groupName: e.target.value })}
                    />
                  </div>

                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Applicable Branch</label>
                      <select
                        value={groupFormData.branch}
                        onChange={e => setGroupFormData({ ...groupFormData, branch: e.target.value })}
                      >
                        <option>Computer Science & Engineering</option>
                        <option>Electronics & Communication Engineering</option>
                        <option>Electrical & Electronics Engineering</option>
                        <option>Mechanical Engineering</option>
                        <option>All Branches</option>
                      </select>
                    </div>
                    <div className="sm-field">
                      <label>Semester</label>
                      <select
                        value={groupFormData.semester}
                        onChange={e => setGroupFormData({ ...groupFormData, semester: e.target.value })}
                      >
                        {Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`).map(sem => (
                          <option key={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Total Intake Capacity (Seats)</label>
                      <input
                        type="number"
                        min="10"
                        value={groupFormData.totalCapacity}
                        onChange={e => setGroupFormData({ ...groupFormData, totalCapacity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Enrollment Status</label>
                      <select
                        value={groupFormData.status}
                        onChange={e => setGroupFormData({ ...groupFormData, status: e.target.value })}
                      >
                        <option>Open</option>
                        <option>Closed</option>
                        <option>Upcoming</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>Courses Offered in this Group:</label>
                      <button
                        type="button"
                        className="sm-btn sm-btn--secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => setGroupFormData({
                          ...groupFormData,
                          subjects: [...groupFormData.subjects, { code: '', name: '', capacity: 60, faculty: '' }]
                        })}
                      >
                        + Add Course
                      </button>
                    </div>

                    {groupFormData.subjects.map((sub, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1.5fr 1fr 70px 30px', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Code"
                          style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                          value={sub.code}
                          onChange={e => {
                            const subs = [...groupFormData.subjects]
                            subs[index].code = e.target.value
                            setGroupFormData({ ...groupFormData, subjects: subs })
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Course Title"
                          style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                          value={sub.name}
                          onChange={e => {
                            const subs = [...groupFormData.subjects]
                            subs[index].name = e.target.value
                            setGroupFormData({ ...groupFormData, subjects: subs })
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Faculty"
                          style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                          value={sub.faculty}
                          onChange={e => {
                            const subs = [...groupFormData.subjects]
                            subs[index].faculty = e.target.value
                            setGroupFormData({ ...groupFormData, subjects: subs })
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Seats"
                          style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                          value={sub.capacity}
                          onChange={e => {
                            const subs = [...groupFormData.subjects]
                            subs[index].capacity = Number(e.target.value)
                            setGroupFormData({ ...groupFormData, subjects: subs })
                          }}
                        />
                        {groupFormData.subjects.length > 1 && (
                          <button
                            type="button"
                            className="sm-icon-btn"
                            style={{ color: '#dc2626', width: '28px', height: '28px' }}
                            onClick={() => {
                              const subs = groupFormData.subjects.filter((_, i) => i !== index)
                              setGroupFormData({ ...groupFormData, subjects: subs })
                            }}
                          >
                            <FiX />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sm-modal-footer">
                  <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setGroupModalOpen(false)}>Cancel</button>
                  <button type="submit" className="sm-btn sm-btn--primary">{editingGroupId ? 'Save Basket' : 'Create Basket'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Allocate Student Modal */}
        {allocModalOpen && (
          <div className="sm-modal-backdrop" onClick={() => setAllocModalOpen(false)}>
            <div className="sm-modal" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSaveAllocation}>
                <div className="sm-modal-header">
                  <h2>Allocate Student Elective Choice</h2>
                  <button type="button" className="sm-icon-btn" onClick={() => setAllocModalOpen(false)}><FiX /></button>
                </div>
                <div className="sm-modal-body">
                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Student Roll Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 23BTECHCSE045"
                        value={allocFormData.rollNumber}
                        onChange={e => setAllocFormData({ ...allocFormData, rollNumber: e.target.value })}
                      />
                    </div>
                    <div className="sm-field">
                      <label>Student Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={allocFormData.studentName}
                        onChange={e => setAllocFormData({ ...allocFormData, studentName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="sm-form-grid-2">
                    <div className="sm-field">
                      <label>Branch</label>
                      <select
                        value={allocFormData.branch}
                        onChange={e => setAllocFormData({ ...allocFormData, branch: e.target.value })}
                      >
                        <option>CSE</option>
                        <option>ECE</option>
                        <option>EEE</option>
                        <option>ME</option>
                        <option>Civil</option>
                      </select>
                    </div>
                    <div className="sm-field">
                      <label>Semester</label>
                      <select
                        value={allocFormData.semester}
                        onChange={e => setAllocFormData({ ...allocFormData, semester: e.target.value })}
                      >
                        {Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`).map(sem => (
                          <option key={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm-field">
                    <label>Select Elective Basket *</label>
                    <select
                      value={allocFormData.groupCode}
                      onChange={e => {
                        const code = e.target.value
                        const grp = groups.find(g => g.groupCode === code)
                        setAllocFormData({
                          ...allocFormData,
                          groupCode: code,
                          subjectCode: grp?.subjects?.[0]?.code || '',
                        })
                      }}
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.groupCode}>{g.groupCode}: {g.groupName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm-field">
                    <label>Select Offered Subject *</label>
                    <select
                      value={allocFormData.subjectCode}
                      onChange={e => setAllocFormData({ ...allocFormData, subjectCode: e.target.value })}
                    >
                      <option value="">-- Choose Subject --</option>
                      {groups.find(g => g.groupCode === allocFormData.groupCode)?.subjects?.map(s => (
                        <option key={s.code} value={s.code}>{s.code} - {s.name} ({s.faculty})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="sm-modal-footer">
                  <button type="button" className="sm-btn sm-btn--secondary" onClick={() => setAllocModalOpen(false)}>Cancel</button>
                  <button type="submit" className="sm-btn sm-btn--primary">Confirm Allocation</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
