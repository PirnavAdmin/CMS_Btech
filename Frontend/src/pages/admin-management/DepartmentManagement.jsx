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
} from 'react-icons/fi';
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
  status: 'Active',
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
  const [items, setItems] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [screen, setScreen] = useState('list'); // 'list' | 'form' | 'assign-hod' | 'details'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHodSaving, setIsHodSaving] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const itemsPerPage = 5;

  const loadDepartments = async (searchTerm = query) => {
    setIsLoading(true);
    setError('');
    try {
      const response = searchTerm.trim() ? await searchDepartments(searchTerm.trim()) : await getDepartments();
      const mapped = listFrom(response.data).map(mapDepartment);
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
          }))
        );
      })
      .catch(() => setColleges([]));
  }, []);

  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          `${item.name} ${item.code} ${item.hod}`.toLowerCase().includes(query.toLowerCase()) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [items, query, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = visible.slice((currentPageClamped - 1) * itemsPerPage, currentPageClamped * itemsPerPage);
  const countSource = allDepartments.length ? allDepartments : items;
  const activeCount = countSource.filter((item) => item.status === 'Active').length;
  const inactiveCount = countSource.filter((item) => item.status === 'Inactive').length;
  const totalCount = countSource.length;

  const closeToList = () => {
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
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load department details. Please try again.'));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const toggleStatus = (item) => {
    setError('');
    setPendingStatus({ item, nextStatus: item.status === 'Active' ? 'Inactive' : 'Active' });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || isStatusSaving) return;
    const { item, nextStatus: status } = pendingStatus;
    setIsStatusSaving(true);
    setError('');
    try {
      const response = await updateDepartmentStatus(item.id, status === 'Active' ? 1 : 0);
      const result = recordFrom(response);
      const updated = result?.id || result?.departmentId ? mapDepartment(result) : { ...item, status };
      await loadDepartments(query);
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      setAllDepartments((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      if (selected?.id === item.id) setSelected(updated);
      setPendingStatus(null);
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to update department status. Please try again.'));
    } finally {
      setIsStatusSaving(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Department name is required.');
    if (!form.code.trim()) return setError('Department code is required.');
    if (!form.collegeId) return setError('Select a college for this department.');
    if (!form.status) return setError('Select a status for this department.');
    if (form.hodUserId !== '' && (!Number.isInteger(Number(form.hodUserId)) || Number(form.hodUserId) < 0))
      return setError('Head / In-Charge user ID must be a valid number.');
    if (items.some((item) => item.code === form.code.trim().toUpperCase() && item.id !== form.id))
      return setError('This department code already exists.');
    setIsSaving(true);
    setError('');
    try {
      const response = form.id ? await updateDepartment(form.id, payloadFor(form)) : await createDepartment(payloadFor(form));
      const result = recordFrom(response);
      const id = result?.id ?? result?.departmentId ?? form.id;
      if (form.status === 'Inactive' && id) await updateDepartmentStatus(id, 0);
      await loadDepartments();
      closeToList();
    } catch (requestError) {
      setError(apiError(requestError, `Unable to ${form.id ? 'update' : 'create'} this department. Please try again.`));
    } finally {
      setIsSaving(false);
    }
  };

  const saveHod = async (event) => {
    event.preventDefault();
    if (!String(form.hodName || '').trim()) return setError('Enter the Head / In-Charge name.');
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
      <div className="management-page department-management">
        {screen === 'list' && (
          <>
            <PageHeader
              breadcrumb="Institution Management / Structure"
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
                      setForm(empty);
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
                          <th>Department</th>
                          <th>Code</th>
                          <th>Head / In-Charge</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.name}</strong>
                            </td>
                            <td>
                              <code>{item.code || '—'}</code>
                            </td>
                            <td>{item.hod}</td>
                            <td>
                              <StatusBadge status={item.status} />
                            </td>
                            <td>
                              <div className="erp-row-actions">
                                <button
                                  type="button"
                                  className="erp-action-btn"
                                  title={`View ${item.name}`}
                                  aria-label={`View ${item.name}`}
                                  onClick={() => loadDetail(item, 'details')}
                                >
                                  <FiEye className="module-action-icon module-action-icon--view" />
                                </button>
                                <button
                                  type="button"
                                  className="erp-action-btn"
                                  title={`Edit ${item.name}`}
                                  aria-label={`Edit ${item.name}`}
                                  onClick={() => loadDetail(item, 'form')}
                                >
                                  <FiEdit2 className="module-action-icon module-action-icon--edit" />
                                </button>
                                <button
                                  type="button"
                                  className="erp-action-btn"
                                  title={`Assign Head / In-Charge for ${item.name}`}
                                  aria-label={`Assign Head for ${item.name}`}
                                  onClick={() => loadDetail(item, 'assign-hod')}
                                >
                                  <FiUserPlus className="module-action-icon" />
                                </button>
                                <button
                                  type="button"
                                  className={`erp-action-btn erp-action-btn--${item.status === 'Active' ? 'success' : 'danger'}`}
                                  title={item.status === 'Active' ? `Mark ${item.name} inactive` : `Mark ${item.name} active`}
                                  aria-label={item.status === 'Active' ? `Mark ${item.name} inactive` : `Mark ${item.name} active`}
                                  onClick={() => toggleStatus(item)}
                                >
                                  {item.status === 'Active' ? (
                                    <FiToggleRight className="module-action-icon" />
                                  ) : (
                                    <FiToggleLeft className="module-action-icon" />
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
              breadcrumb="Institution Management / Departments"
              title={form.id ? 'Edit Department' : 'Add Department'}
              subtitle="Enter the department information, code, college association, and status."
            >
              <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList}>
                <FiArrowLeft /> Back to List
              </button>
            </PageHeader>

            <section className="erp-directory-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
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
                      College <b className="required-mark">*</b>
                    </span>
                    <select
                      value={form.collegeId}
                      onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                      required
                    >
                      <option value="">Select college</option>
                      {colleges.map((college) => (
                        <option key={college.id} value={college.id}>
                          {college.name}
                        </option>
                      ))}
                    </select>
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
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>

                  <label className="full-width">
                    <span>Description</span>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe this organizational department..."
                      rows={3}
                    />
                  </label>
                </div>

                {isDetailsLoading && <p className="department-no-results">Loading department details...</p>}
                {error && (
                  <p className="department-error" role="alert" style={{ marginTop: '16px' }}>
                    {error}
                  </p>
                )}

                <div className="erp-form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
          <div className="erp-form-page">
            <PageHeader
              breadcrumb="Institution Management / Departments"
              title="Assign Head / In-Charge"
              subtitle={`Set the responsible departmental head for ${form.name || 'this department'}.`}
            >
              <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList}>
                <FiArrowLeft /> Back to List
              </button>
            </PageHeader>

            <section className="erp-directory-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
              <form onSubmit={saveHod}>
                <div className="department-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <label>
                    <span>
                      Head / In-Charge Name <b className="required-mark">*</b>
                    </span>
                    <input
                      value={form.hodName}
                      onChange={(e) => setForm({ ...form, hodName: e.target.value })}
                      placeholder="e.g. Dr. Jane Smith"
                      required
                      autoFocus
                    />
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
          <div className="department-profile-view">
            <PageHeader
              breadcrumb="Institution Management / Departments"
              title={selected.name}
              subtitle={`${selected.code || 'No code'} · Organizational Department`}
            >
              <PrintDetailsButton title={`${selected.name} details`} selector=".department-details-body" />
              <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList}>
                <FiArrowLeft /> Back to List
              </button>
              <button
                type="button"
                className="erp-btn erp-btn--primary"
                onClick={() => loadDetail(selected, 'form')}
              >
                <FiEdit2 /> Edit Department
              </button>
            </PageHeader>

            <div className="department-details-body">
              {/* Profile Banner */}
              <div className="cm-profile-banner" style={{ marginBottom: '20px' }}>
                <div className="cm-profile-monogram">
                  {(selected.code || selected.name).slice(0, 3).toUpperCase()}
                </div>
                <div className="cm-profile-identity">
                  <h2>{selected.name}</h2>
                  <p>
                    Code: <code>{selected.code || '—'}</code>
                    {selected.collegeName ? ` · College: ${selected.collegeName}` : ''}
                  </p>
                </div>
                <div className="cm-profile-status">
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {/* InfoCards */}
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
      </div>
    </DashboardLayout>
  );
}
