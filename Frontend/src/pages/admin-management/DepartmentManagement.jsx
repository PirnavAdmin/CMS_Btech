import { newestFirst, rememberCreated } from '../../utils/newestFirst'
import { showSuccess } from '../../utils/toast'
import useToastState from '../../hooks/useToastState'
import { useEffect, useMemo, useState } from 'react';
import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu';
import { departmentColumns } from '../../utils/exportColumns';
import DashboardLayout from '../../layouts/DashboardLayout';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import FilterPanel from '../../components/FilterPanel';
import StatusConfirmDialog from '../../components/StatusConfirmDialog';
import InfoCard from '../../components/InfoCard';
import {
  createDepartment,
  getColleges,
  getDepartmentById,
  getDepartments,
  searchDepartments,
  updateDepartment,
  updateDepartmentStatus,
} from '../../auth/collegeApi';
import { studentApi } from '../../api/apiEndpoints';
import facultyService, { normalizeFaculty } from '../../services/facultyService';
import { showDeactivationBlocked } from '../../components/DeactivationBlockedDialog';
import {
  FiEye,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiUserPlus,
  FiLayers,
  FiArrowLeft,
  FiBookOpen,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { useAcademic } from '../../context/AcademicContext';
import './DepartmentManagement.css';
import '../../styles/directory-search.css';

const empty = {
  id: null,
  name: '',
  code: '',
  collegeId: '',
  hodUserId: '',
  hodName: '',
  description: '',
  startDate: '',
  endDate: '',
  status: '',
};

const HOD_NAMES_KEY = 'btech-department-hod-names';
const savedHodNames = () => {
  try {
    return JSON.parse(localStorage.getItem(HOD_NAMES_KEY) || '{}');
  } catch {
    return {};
  }
};

const apiError = (error, fallback) => {
  const status = error?.response?.status;
  const raw = error?.response?.data;
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (status >= 500) return 'Unable to save the department right now. Please check your entries and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have permission to manage departments.";
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.entries(data.errors)
      .flatMap(([field, values]) => (Array.isArray(values) ? values : [values]).map((v) => `${field}: ${v}`))
      .filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return data?.message || data?.detail || (data?.title !== 'One or more validation errors occurred.' ? data?.title : '') || error?.message || fallback;
};

const listFrom = (response) => {
  const data = response?.data ?? response;
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : data && typeof data === 'object'
    ? [data]
    : [];
};

const recordFrom = (response) => response?.data?.data ?? response?.data ?? response;

const mapDepartment = (record) => {
  const rawStatus = record.status ?? record.departmentStatus ?? (record.isActive !== undefined ? record.isActive : '');
  const active = rawStatus === true || Number(rawStatus) === 1 || String(rawStatus).toLowerCase() === 'active';
  const inactive = rawStatus === false || Number(rawStatus) === 0 || String(rawStatus).toLowerCase() === 'inactive';
  const hodUserId = record.hodUserId ?? record.hodId ?? '';
  const departmentId = record.id ?? record.departmentId;
  const hodName = record.hodName ?? record.hod?.fullName ?? savedHodNames()[departmentId] ?? '';
  const collegeId = record.collegeId ?? '';
  const collegeName = record.collegeName ?? record.college?.name ?? '';
  return {
    id: departmentId,
    name: record.departmentName ?? record.name ?? '',
    code: record.departmentCode ?? record.code ?? '',
    collegeId: collegeName || collegeId,
    collegeNumericId: collegeId,
    collegeName,
    hodUserId,
    hodName,
    description: record.description ?? '',
    hod: hodName || 'Not assigned',
    status: active ? 'Active' : inactive ? 'Inactive' : 'Active',
  };
};

const payloadFor = (value) => ({
  departmentName: value.name.trim(),
  departmentCode: value.code.trim().toUpperCase() || null,
  ...((value.collegeNumericId ?? value.collegeId) !== '' ? { collegeId: Number(value.collegeNumericId ?? value.collegeId) } : {}),
  ...(value.hodUserId !== '' ? { hodUserId: Number(value.hodUserId) } : {}),
  description: value.description.trim() || null,
});

export default function DepartmentManagement() {
  const { selectedCollegeId, selectedCollege } = useAcademic();
  const [items, setItems] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [screen, setScreen] = useState('list'); // 'list' | 'form' | 'assign-hod' | 'details'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(() => ({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' }));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useToastState('', 'error');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHodSaving, setIsHodSaving] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const itemsPerPage = 5;

  const loadDepartments = async (searchTerm = query) => {
    setIsLoading(true);
    setError('');
    try {
      const response = searchTerm.trim() ? await searchDepartments(searchTerm.trim()) : await getDepartments();
      const mapped = newestFirst('departments', listFrom(response.data)).map(mapDepartment);
      setAllDepartments(mapped);
      setItems(mapped);
    } catch (requestError) {
      setItems([]);
      setError(apiError(requestError, 'Unable to load departments. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments(query);
  }, [query]);

  useEffect(() => {
    getColleges()
      .then((response) => {
        const records = listFrom(response.data);
        setColleges(
          records.map((record) => ({
            id: record.id ?? record.collegeId,
            name: record.name ?? record.collegeName ?? 'Unnamed college',
            active: ['1', 'true', 'active'].includes(String(record.status ?? record.collegeStatus ?? record.isActive ?? '').toLowerCase()),
          }))
        );
      })
      .catch(() => setColleges([]));
  }, []);

  const scopedItems = useMemo(() => {
    if (!selectedCollegeId) return items;
    return items.filter(item => {
      const itemColId = item.collegeNumericId ?? item.collegeId ?? '';
      const itemColName = item.collegeName ?? '';
      const matchById = itemColId && String(itemColId) === String(selectedCollegeId);
      const matchByName = selectedCollege?.name && itemColName && itemColName.trim().toLowerCase() === selectedCollege.name.trim().toLowerCase();
      return Boolean(matchById || matchByName);
    });
  }, [items, selectedCollegeId, selectedCollege]);

  const scopedAllDepartments = useMemo(() => {
    if (!selectedCollegeId) return allDepartments;
    return allDepartments.filter(item => {
      const itemColId = item.collegeNumericId ?? item.collegeId ?? '';
      const itemColName = item.collegeName ?? '';
      const matchById = itemColId && String(itemColId) === String(selectedCollegeId);
      const matchByName = selectedCollege?.name && itemColName && itemColName.trim().toLowerCase() === selectedCollege.name.trim().toLowerCase();
      return Boolean(matchById || matchByName);
    });
  }, [allDepartments, selectedCollegeId, selectedCollege]);

  const visible = useMemo(
    () =>
      scopedItems.filter(
        (item) =>
          `${item.name} ${item.code} ${item.hod}`.toLowerCase().includes(query.toLowerCase()) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [scopedItems, query, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = visible.slice((currentPageClamped - 1) * itemsPerPage, currentPageClamped * itemsPerPage);
  const countSource = scopedAllDepartments.length ? scopedAllDepartments : scopedItems;
  const activeCount = countSource.filter((item) => item.status === 'Active').length;
  const inactiveCount = countSource.filter((item) => item.status === 'Inactive').length;
  const totalCount = countSource.length;

  const closeToList = () => {
    setForm({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' });
    setScreen('list');
    setSelected(null);
    setError('');
  };

  const loadDetail = async (item, nextScreen) => {
    setScreen(nextScreen);
    setSelected(item);
    setForm(nextScreen === 'form' ? { ...item } : item);
    setError('');
    setIsDetailsLoading(true);
    try {
      const response = await getDepartmentById(item.id);
      const detail = mapDepartment(recordFrom(response));
      setSelected(detail);
      setForm({
        ...detail,
        collegeId: detail.collegeNumericId ?? detail.collegeId,
      });
      setItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
      if (nextScreen === 'assign-hod') {
        const records = await facultyService.list({ DepartmentId: Number(detail.id) });
        setFaculty(records.map(normalizeFaculty));
      }
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load department details. Please try again.'));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const hodCandidates = useMemo(() => faculty
    .filter((member) => {
      const memberDepartmentId = member.departmentId ?? member.department?.departmentId ?? member.department?.id;
      const memberDepartmentName = String(member.departmentName ?? member.department ?? '').trim().toLowerCase();
      const departmentName = String(form.name ?? '').trim().toLowerCase();
      // Faculty API deployments differ: some return departmentId, while
      // others return only departmentName. Use IDs when both exist, then the
      // department name as the reliable compatibility fallback.
      const matchesDepartment = memberDepartmentId !== '' && memberDepartmentId !== undefined && memberDepartmentId !== null
        ? String(memberDepartmentId) === String(form.id)
        : Boolean(memberDepartmentName && departmentName && memberDepartmentName === departmentName);
      const unavailable = ['inactive', 'resigned', 'retired'].includes(String(member.employmentStatus || member.status || '').trim().toLowerCase());
      return matchesDepartment && !unavailable;
    })
    .map((member) => ({
      ...member,
      // Department API stores the linked user ID when one exists. Older
      // Faculty responses only expose EmployeeProfileId, which is the ID
      // accepted by the same department linkage in those deployments.
      hodId: member.userId ?? member.employeeProfileId ?? member.facultyId ?? member.id,
    }))
    .filter((member) => member.hodId !== undefined && member.hodId !== null && member.hodId !== ''), [faculty, form.id]);

  const toggleStatus = async (item) => {
    setError('');
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    if (nextStatus === 'Inactive') {
      try {
        const associated = await studentApi.getAll({ DepartmentId: Number(item.id) });
        if (associated.length > 0) {
          showDeactivationBlocked({
            message: `Cannot deactivate ${item.name}. ${associated.length} student${associated.length === 1 ? '' : 's'} are associated with this department.`,
            count: associated.length,
            name: item.name,
            entity: 'department',
          });
          return;
        }
      } catch (requestError) {
        setError(apiError(requestError, 'Unable to verify associated students. The department was not deactivated.'));
        return;
      }
    }
    setPendingStatus({ item, nextStatus });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || isStatusSaving) return;
    const { item, nextStatus: status } = pendingStatus;
    setIsStatusSaving(true);
    setError('');
    try {
      const response = await updateDepartmentStatus(item.id, status === 'Active' ? 1 : 0);
      const result = recordFrom(response);
      if (!form.id) { rememberCreated('departments', result); setQuery(''); setStatusFilter(''); setCurrentPage(1); }
      const updated = result?.id || result?.departmentId ? mapDepartment(result) : { ...item, status };
      showSuccess(`Department ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`);
      await loadDepartments(query);
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      setAllDepartments((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      if (selected?.id === item.id) setSelected(updated);
      setPendingStatus(null);
    } catch (requestError) {
      const message = apiError(requestError, 'Unable to update department status. Please try again.');
      setPendingStatus(null);
      if (/dependent|associated|reassign|cannot deactivate/i.test(message)) {
        showDeactivationBlocked(`Cannot deactivate ${item.name}. Active dependent records exist. Reassign or deactivate them first.`);
      } else {
        setError(message);
      }
    } finally {
      setIsStatusSaving(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Department name is required.');
    if (!form.code.trim()) return setError('Department code is required.');
    const effectiveCollegeId = String(form.collegeNumericId || form.collegeId || selectedCollegeId || colleges[0]?.id || '');
    if (!form.status) return setError('Select a status for this department.');
    if (form.hodUserId !== '' && (!Number.isInteger(Number(form.hodUserId)) || Number(form.hodUserId) < 0))
      return setError('Head / In-Charge user ID must be a valid number.');
    const normalizedName = form.name.trim().toLowerCase();
    const normalizedCode = form.code.trim().toUpperCase();
    const duplicate = allDepartments.find((item) =>
      String(item.id) !== String(form.id) &&
      (!effectiveCollegeId || String(item.collegeNumericId ?? item.collegeId) === effectiveCollegeId) &&
      (String(item.code || '').trim().toUpperCase() === normalizedCode || String(item.name || '').trim().toLowerCase() === normalizedName)
    );
    if (duplicate) {
      return setError(String(duplicate.code || '').trim().toUpperCase() === normalizedCode
        ? 'This department code already exists for this college.'
        : 'This department name already exists for this college.');
    }
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...payloadFor(form),
        ...(effectiveCollegeId ? { collegeId: Number(effectiveCollegeId) } : {}),
      };
      const response = form.id ? await updateDepartment(form.id, payload) : await createDepartment(payload);
      const result = recordFrom(response);
      if (!form.id) { rememberCreated('departments', result); setQuery(''); setStatusFilter(''); setCurrentPage(1); }
      const id = result?.id ?? result?.departmentId ?? form.id;
      if (form.status === 'Inactive' && id) await updateDepartmentStatus(id, 0);
      showSuccess(`Department ${form.id ? 'updated' : 'created'} successfully.`);
      await loadDepartments('');
      closeToList();
    } catch (requestError) {
      setError(apiError(requestError, `Unable to ${form.id ? 'update' : 'create'} this department. Please try again.`));
    } finally {
      setIsSaving(false);
    }
  };

  const saveHod = async (event) => {
    event.preventDefault();
    if (!String(form.hodUserId || '').trim()) return setError('Select a faculty member as Head / In-Charge.');
    setIsHodSaving(true);
    setError('');
    try {
      const names = savedHodNames();
      names[form.id] = form.hodName.trim();
      localStorage.setItem(HOD_NAMES_KEY, JSON.stringify(names));
      let updated = mapDepartment({ ...form, hodName: form.hodName.trim() });
      if (Number(form.hodUserId) > 0) {
        const response = await updateDepartment(form.id, payloadFor({ ...form, hodUserId: Number(form.hodUserId) }));
        const result = recordFrom(response);
      if (!form.id) { rememberCreated('departments', result); setQuery(''); setStatusFilter(''); setCurrentPage(1); }
        updated = mapDepartment({
          ...form,
          ...(result || {}),
          id: form.id,
          hodUserId: result?.hodUserId ?? Number(form.hodUserId),
          hodName: form.hodName.trim(),
        });
      }
      setItems((current) => current.map((item) => (item.id === form.id ? updated : item)));
      setSelected(updated);
      showSuccess('Head / In-Charge assigned successfully.');
      closeToList();
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to assign the Head / In-Charge. Please try again.'));
    } finally {
      setIsHodSaving(false);
    }
  };

  const summaryCards = [
    { label: 'Total Departments', value: totalCount },
    { label: 'Active', value: activeCount, tone: 'active' },
    { label: 'Inactive', value: inactiveCount, tone: 'inactive' },
  ];

  return (
    <DashboardLayout>
      <main className="department-management">
        {(screen === 'list' || screen === 'assign-hod') && (
          <>
            <PageHeader
              title="Department Management"
              subtitle="Organize academic departments, faculty leadership, and institutional branches."
              compactSummary={summaryCards}
            />

            <section className="erp-directory-card">
              <header className="course-directory-heading">
                <div>
                  <span className="cm-eyebrow">Department Directory</span>
                  <p>{visible.length} records</p>
                </div>
                <div className="directory-export-actions">
                  <ExportMenu
                    rows={visible.map((row) => ({
                      ...row,
                      collegeName: row.collegeName || colleges.find((c) => String(c.id) === String(row.collegeNumericId))?.name || '',
                    }))}
                    columns={departmentColumns}
                    title="Departments"
                    filename="departments"
                    loading={isLoading || Boolean(error)}
                  />
                  <button
                    type="button"
                    className="cm-button"
                    onClick={() => {
                      setForm({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' });
                      setSelected(null);
                      setError('');
                      setScreen('form');
                    }}
                  >
                    <FiPlus /> Add Department
                  </button>
                </div>
              </header>

              <FilterPanel
                active={Boolean(query || statusFilter)}
                onClear={() => {
                  setQuery('');
                  setStatusFilter('');
                  setCurrentPage(1);
                }}
              >
                <section className="cm-panel course-toolbar">
                  <label className="course-search">
                    <FiSearch />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search department name, code, or HOD..."
                      aria-label="Search departments"
                    />
                  </label>
                  <select
                    aria-label="Status"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {Boolean(query || statusFilter) && (
                    <button
                      className="course-clear"
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setStatusFilter('');
                        setCurrentPage(1);
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </section>
              </FilterPanel>

              {isLoading ? (
                <p className="department-no-results">Loading departments...</p>
              ) : error ? (
                <div className="department-no-results">
                  <p className="department-error" role="alert">
                    {error}
                  </p>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={() => loadDepartments(query)}>
                    Retry
                  </button>
                </div>
              ) : !items.length ? (
                <div className="department-no-results">
                  <p>No departments have been added yet.</p>
                  <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    onClick={() => {
                      setForm(empty);
                      setScreen('form');
                    }}
                  >
                    Add Department
                  </button>
                </div>
              ) : (
                <>
                  <div className="erp-table-responsive">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: '220px' }}>Department</th>
                          <th className="table-center" style={{ width: '120px' }}>Code</th>
                          <th style={{ minWidth: '180px', maxWidth: '240px' }}>Head / In-Charge</th>
                          <th className="table-center" style={{ width: '120px' }}>Status</th>
                          <th className="table-center" style={{ width: '160px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item) => (
                          <tr key={item.id}>
                            <td style={{ minWidth: '220px' }}>
                              <strong className="table-cell-truncate" title={item.name}>{item.name}</strong>
                            </td>
                            <td className="table-center" style={{ width: '120px' }}>
                              <code>{item.code || '—'}</code>
                            </td>
                            <td style={{ minWidth: '180px', maxWidth: '240px' }}>
                              <span className="table-cell-truncate" title={item.hod || 'Unassigned'}>{item.hod || '—'}</span>
                            </td>
                            <td className="table-center" style={{ width: '120px' }}>
                              <StatusBadge value={item.status} />
                            </td>
                            <td className="table-center" style={{ width: '160px' }}>
                              <div className="erp-row-actions table-actions-group">
                                <button
                                  type="button"
                                  className="table-action-btn action-view erp-action-btn"
                                  title={`View ${item.name}`}
                                  aria-label={`View ${item.name}`}
                                  onClick={() => loadDetail(item, 'details')}
                                >
                                  <FiEye />
                                </button>
                                <button
                                  type="button"
                                  className="table-action-btn action-edit erp-action-btn"
                                  title={`Edit ${item.name}`}
                                  aria-label={`Edit ${item.name}`}
                                  onClick={() => loadDetail(item, 'form')}
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  type="button"
                                  className="table-action-btn action-assign erp-action-btn"
                                  title={`Assign Head / In-Charge for ${item.name}`}
                                  aria-label={`Assign Head for ${item.name}`}
                                  onClick={() => loadDetail(item, 'assign-hod')}
                                >
                                  <FiUserPlus />
                                </button>
                                <button
                                  type="button"
                                  className={`table-action-btn ${item.status === 'Active' ? 'action-deactivate erp-action-btn--danger' : 'action-activate erp-action-btn--success'}`}
                                  title={item.status === 'Active' ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                                  aria-label={item.status === 'Active' ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                                  onClick={() => toggleStatus(item)}
                                >
                                  {item.status === 'Active' ? (
                                    <FiToggleRight />
                                  ) : (
                                    <FiToggleLeft />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!visible.length && (
                    <p className="department-no-results">No departments match your search.</p>
                  )}
                  {!!visible.length && (
                    <div className="erp-table-pagination-wrap">
                      <div className="department-pagination">
                        <div className="pagination-controls">
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage((v) => Math.max(v - 1, 1))}
                            disabled={currentPageClamped === 1}
                          >
                            Previous
                          </button>
                          <span className="pagination-status">
                            Page {currentPageClamped} of {totalPages}
                          </span>
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage((v) => Math.min(v + 1, totalPages))}
                            disabled={currentPageClamped === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {screen === 'form' && (
          <div className="erp-form-page">
            <PageHeader
              title={form.id ? 'Edit Department' : 'Add Department'}
              subtitle="Enter the department information, code, college association, and status."
            >
              <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList}>
                <FiArrowLeft /> Back to List
              </button>
            </PageHeader>

            <section className="erp-directory-card department-form-card-container">
              <form onSubmit={save}>
                <div className="department-form-grid">
                  <label>
                    <span>
                      Department Name <b className="required-mark">*</b>
                    </span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Computer Science & Engineering"
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Department Code <b className="required-mark">*</b>
                    </span>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. CSE"
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Status <b className="required-mark">*</b>
                    </span>
                    <select
                      required
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>

                  <label>
                    <span>Start Date</span>
                    <input
                      type="date"
                      value={form.startDate || ''}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </label>

                  <label>
                    <span>End Date</span>
                    <input
                      type="date"
                      value={form.endDate || ''}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </label>

                  <label className="full-width">
                    <span>Description</span>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe this organizational department..."
                      rows={2}
                    />
                  </label>
                </div>

                {isDetailsLoading && <p className="department-no-results">Loading department details...</p>}
                {error && (
                  <p className="department-error" role="alert" style={{ marginTop: '10px' }}>
                    {error}
                  </p>
                )}

                <div className="erp-form-actions">
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Department'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {screen === 'assign-hod' && (
          <div className="department-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isHodSaving && closeToList()}>
            <section className="erp-directory-card hod-card" role="dialog" aria-modal="true" aria-labelledby="assign-hod-title" style={{ padding: '24px' }}>
              <form onSubmit={saveHod}>
                <header className="course-directory-heading" style={{ marginBottom: '20px' }}>
                  <div>
                    <span className="cm-eyebrow">DEPARTMENT LEADERSHIP</span>
                    <h2 id="assign-hod-title">Assign Head / In-Charge</h2>
                    <p>Choose an active faculty member from {form.name || 'this department'}.</p>
                  </div>
                  <button type="button" className="department-modal-close" onClick={closeToList} disabled={isHodSaving} aria-label="Close assign head dialog" title="Close">
                    <FiX />
                  </button>
                </header>
                <div className="department-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <label>
                    <span>Head / In-Charge <b className="required-mark">*</b></span>
                    <select
                      value={form.hodUserId}
                      onChange={(e) => {
                        const candidate = hodCandidates.find((member) => String(member.hodId) === String(e.target.value));
                        setForm({ ...form, hodUserId: e.target.value, hodName: candidate?.fullName || '' });
                      }}
                      required
                      autoFocus
                    >
                      <option value="">Select faculty member</option>
                      {hodCandidates.map((member) => (
                        <option key={member.hodId} value={member.hodId}>
                          {[member.fullName, member.employeeId, member.designation].filter(Boolean).join(' — ')}
                        </option>
                      ))}
                    </select>
                    {!hodCandidates.length && <small>No active faculty members are available in this department.</small>}
                  </label>
                </div>

                {error && (
                  <p className="department-error" role="alert" style={{ marginTop: '16px' }}>
                    {error}
                  </p>
                )}

                <div className="erp-form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList} disabled={isHodSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary" disabled={isHodSaving}>
                    {isHodSaving ? 'Saving...' : 'Assign Head'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {screen === 'details' && selected && (
          <div className="cm-profile-view" data-export-record>
            <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Department Details" filename={`department_${selected.code || selected.id}`} />
              <button type="button" className="cm-secondary-btn erp-btn erp-btn--secondary" onClick={closeToList}>
                &larr; Back to Departments List
              </button>
            </div>

            <div className="cm-profile-card">
              {/* Header Profile Banner */}
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder">
                    {(selected.code || selected.name).slice(0, 3).toUpperCase()}
                  </div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">Code: {selected.code || '—'}</span>
                    <span className="cm-badge cm-badge-type">Department</span>
                    <span className={`cm-status-badge ${String(selected.status).toLowerCase()}`}>
                      {selected.status}
                    </span>
                  </div>
                  <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{selected.name}</span></h1>
                  <p className="cm-profile-subtitle">
                    {selected.collegeName ? (
                      <>
                        <span style={{ color: '#fff' }}>College: </span>
                        <strong style={{ color: '#fff' }}>{selected.collegeName}</strong>
                      </>
                    ) : (
                      <span style={{ color: '#fff' }}>Academic Department</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Profile Information Cards Grid */}
              <div className="cm-profile-grid">
                <InfoCard
                  title="Department Information"
                  icon={FiLayers}
                  items={[
                    { label: 'Department Name', value: selected.name },
                    { label: 'Department Code', value: selected.code },
                    { label: 'College', value: selected.collegeName || selected.collegeId },
                    { label: 'Status', value: selected.status },
                    { label: 'Description', value: selected.description },
                  ]}
                />

                <InfoCard
                  title="Leadership & Faculty In-Charge"
                  icon={FiUser}
                  items={[
                    { label: 'Head / In-Charge Name', value: selected.hodName || selected.hod },
                    { label: 'Faculty ID', value: selected.hodUserId },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {pendingStatus && (
          <StatusConfirmDialog
            entity="Department"
            name={`${pendingStatus.item.name} (${pendingStatus.item.code})`}
            nextStatus={pendingStatus.nextStatus}
            onCancel={() => setPendingStatus(null)}
            onConfirm={confirmStatusChange}
            busy={isStatusSaving}
            description={
              pendingStatus.nextStatus === 'Active'
                ? 'The department will become active and available for college course configurations.'
                : 'Deactivating this department will mark it inactive in the institutional directory.'
            }
            confirmLabel={pendingStatus.nextStatus === 'Active' ? 'Activate Department' : 'Deactivate Department'}
          />
        )}
      </main>
    </DashboardLayout>
  );
}
