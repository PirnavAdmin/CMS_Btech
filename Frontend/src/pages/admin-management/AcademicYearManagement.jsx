import { useEffect, useMemo, useState } from 'react';
import ExportMenu, { PrintDetailsButton } from '../../components/ExportMenu';
import { yearColumns } from '../../utils/exportColumns';
import DashboardLayout from '../../layouts/DashboardLayout';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import FilterPanel from '../../components/FilterPanel';
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination';
import StatusConfirmDialog from '../../components/StatusConfirmDialog';
import InfoCard from '../../components/InfoCard';
import { academicYearApi } from '../../api/apiEndpoints';
import { FiCheckCircle, FiEye, FiEdit2, FiToggleLeft, FiXCircle, FiPlus, FiCalendar, FiClock, FiSearch } from 'react-icons/fi';
import './AcademicYearManagement.css';

const DAY = 864e5;
const states = ['UPCOMING', 'ACTIVE', 'ARCHIVED'];
const blank = { name: '', startDate: '', endDate: '', autoActivate: false };

const d = (x) => {
  let z = new Date(`${x}T00:00:00`);
  z.setHours(0, 0, 0, 0);
  return z;
};
const now = () => {
  let z = new Date();
  z.setHours(0, 0, 0, 0);
  return z;
};
const isPresentYear = (x) => x?.startDate && x?.endDate && now() >= d(x.startDate) && now() <= d(x.endDate);
const isPastYear = (x) => x?.endDate && now() > d(x.endDate);
const formatDate = (x) => (x ? d(x).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const days = (x) => Math.ceil((d(x) - now()) / DAY);
const duration = (a, b) => Math.round((d(b) - d(a)) / DAY) + 1;
const progress = (a, b) => Math.max(0, Math.min(100, Math.round(((now() - d(a)) * 100) / (d(b) - d(a)))));
const autoStatus = (a, b) => (now() < d(a) ? 'UPCOMING' : now() > d(b) ? 'ARCHIVED' : 'ACTIVE');

const mapYear = (x) => ({
  id: String(x.academicYearId ?? x.id),
  name: x.academicYearName ?? x.name ?? '',
  startDate: String(x.startDate ?? '').slice(0, 10),
  endDate: String(x.endDate ?? '').slice(0, 10),
  status:
    x.isActive || Number(x.status) === 1
      ? 'ACTIVE'
      : Number(x.isArchived) === 1
      ? 'ARCHIVED'
      : autoStatus(String(x.startDate ?? '').slice(0, 10), String(x.endDate ?? '').slice(0, 10)),
  autoActivate: false,
});

export default function AcademicYear() {
  const [years, setYears] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'view' | 'generate'
  const [confirmStatus, setConfirmStatus] = useState(null); // { year, targetStatus }
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [notice, setNoticeValue] = useState('');
  const [noticeTone, setNoticeTone] = useState('info');
  const [exportLoading, setExportLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const close = () => {
    setModal(null);
    setSelected(null);
    setErrors({});
  };

  const setNotice = (message, tone = 'info') => {
    setNoticeValue(message);
    setNoticeTone(tone);
  };

  const loadYears = async () => {
    setExportLoading(true);
    try {
      const data = await academicYearApi.getAll();
      setYears(data.map(mapYear));
    } catch (error) {
      setNotice(error.message || 'Unable to load academic years.', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const active = years.find((x) => x.status === 'ACTIVE' || isPresentYear(x));
  const next = years
    .filter((x) => x.status === 'UPCOMING')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const shown = useMemo(
    () =>
      years.filter(
        (x) =>
          `${x.name} ${x.status}`.toLowerCase().includes(search.toLowerCase().trim()) &&
          (filter === 'ALL' || x.status === filter)
      ),
    [years, search, filter]
  );

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const count = (s) => years.filter((x) => x.status === s).length;

  useEffect(() => setPage(1), [search, filter]);

  const openAdd = () => {
    setForm(blank);
    setErrors({});
    setModal('add');
  };

  const edit = (x) => {
    if (isPresentYear(x)) {
      setNotice('Present academic year cannot be edited directly.', 'error');
      return;
    }
    setSelected(x);
    setForm({ ...x });
    setErrors({});
    setModal('edit');
  };

  function validate() {
    let e = {},
      others = years.filter((x) => x.id !== selected?.id);
    if (!form.name.trim()) e.name = 'Academic year title is required.';
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.endDate) e.endDate = 'End date is required.';
    if (form.startDate && form.endDate && d(form.endDate) <= d(form.startDate))
      e.endDate = 'End date must be after start date.';
    if (form.name.trim() && others.some((x) => x.name.toLowerCase() === form.name.trim().toLowerCase()))
      e.name = 'This academic year already exists.';
    if (
      form.startDate &&
      form.endDate &&
      others.some((x) => d(form.startDate) <= d(x.endDate) && d(form.endDate) >= d(x.startDate))
    )
      e.range = 'This date range overlaps an existing academic year.';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function save(e) {
    e.preventDefault();
    if (selected && isPresentYear(selected)) {
      setErrors({ form: 'Present academic year cannot be modified.' });
      return;
    }
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const data = selected ? await academicYearApi.update(selected.id, form) : await academicYearApi.create(form);
      const item = data
        ? mapYear(data)
        : {
            ...form,
            id: selected?.id || Date.now().toString(),
            name: form.name.trim(),
            status: autoStatus(form.startDate, form.endDate),
          };
      setYears((x) => (selected ? x.map((y) => (y.id === selected.id ? item : y)) : [...x, item]));
      setNotice(`${item.name} has been ${selected ? 'updated' : 'created'} successfully.`, 'success');
      close();
      await loadYears();
    } catch (error) {
      setErrors({ form: error.message || 'Unable to save the academic year.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusConfirm() {
    if (!confirmStatus || saving) return;
    const { year, targetStatus } = confirmStatus;
    setSaving(true);
    try {
      if (targetStatus === 'ACTIVE') {
        await academicYearApi.activate(year.id);
      } else {
        await academicYearApi.deactivate(year.id);
      }
      setNotice(`${year.name} has been ${targetStatus === 'ACTIVE' ? 'activated' : 'archived'} successfully.`, 'success');
      setConfirmStatus(null);
      await loadYears();
    } catch (error) {
      setNotice(error.message || 'Unable to update academic year status.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    if (!active || saving) return;
    let s = d(active.endDate);
    s.setDate(s.getDate() + 1);
    let end = new Date(s);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    let item = {
      name: `${s.getFullYear()} - ${end.getFullYear()}`,
      startDate: s.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      status: 'UPCOMING',
      autoActivate: false,
    };
    if (years.some((x) => x.name === item.name)) {
      setNotice(`${item.name} already exists, so no duplicate was created.`, 'info');
    } else {
      setSaving(true);
      try {
        await academicYearApi.create(item);
        setNotice(`${item.name} was generated successfully.`, 'success');
        await loadYears();
      } catch (error) {
        setNotice(error.message || 'Unable to generate next academic year.', 'error');
      } finally {
        setSaving(false);
      }
    }
    close();
  }

  const openView = async (x) => {
    setSelected(x);
    setModal('view');
    try {
      const data = await academicYearApi.getById(x.id);
      if (data) setSelected(mapYear(data));
    } catch (error) {
      setNotice(error.message || 'Unable to load academic year details.', 'error');
    }
  };

  const summaryCards = [
    { label: 'Total', value: years.length },
    { label: 'Active', value: count('ACTIVE'), tone: 'active' },
    { label: 'Upcoming', value: count('UPCOMING'), tone: 'upcoming' },
    { label: 'Archived', value: count('ARCHIVED'), tone: 'archived' },
  ];

  return (
    <DashboardLayout>
      <main className="ay">
        <PageHeader
          breadcrumb="Academic Management / Cycles"
          title="Academic Year"
          subtitle="Manage academic cycles, lifecycle status, and rollover transitions."
          compactSummary={summaryCards}
        />

        {notice && (
          <div className={`erp-notice erp-notice--${noticeTone}`} role="status">
            <span>{noticeTone === 'error' ? '⚠' : noticeTone === 'success' ? '✓' : 'ⓘ'}</span>
            <p>{notice}</p>
          </div>
        )}

        {modal === 'view' && selected ? (
          <div className="cm-profile-view" style={{ marginTop: '16px' }}>
            <div className="cm-profile-top-bar">
              <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
                &larr; Back to Academic Years List
              </button>
            </div>

            <div className="cm-profile-card">
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder">
                    <FiCalendar />
                  </div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">Cycle</span>
                    <span className={`cm-status-badge ${String(selected.status).toLowerCase()}`}>
                      {selected.status}
                    </span>
                  </div>
                  <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{selected.name}</span></h1>
                  <p className="cm-profile-subtitle">
                    <span style={{ color: '#fff' }}>Duration: </span>
                    <strong style={{ color: '#fff' }}>{duration(selected.startDate, selected.endDate)} days</strong>
                    <span style={{ color: '#fff' }}> ({formatDate(selected.startDate)} — {formatDate(selected.endDate)})</span>
                  </p>
                </div>
              </div>

              <div className="cm-profile-grid">
                <InfoCard
                  title="Cycle Information"
                  icon={FiCalendar}
                  items={[
                    { label: 'Academic Year', value: selected.name },
                    { label: 'Start Date', value: formatDate(selected.startDate) },
                    { label: 'End Date', value: formatDate(selected.endDate) },
                    { label: 'Duration', value: `${duration(selected.startDate, selected.endDate)} days` },
                    { label: 'Status', value: selected.status },
                    { label: 'Auto Activation', value: selected.autoActivate ? 'Enabled' : 'Manual' },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {active ? (
              <section className="hero">
                <div>
                  <p className="eyebrow">Active Academic Context</p>
                  <h2>{active.name}</h2>
                  <p>
                    {formatDate(active.startDate)} — {formatDate(active.endDate)}
                  </p>
                  <StatusBadge status="ACTIVE" />
                </div>
                <div className="metrics">
                  <p>
                    <b>{Math.max(0, days(active.endDate))}</b>Days remaining
                  </p>
                  <p>
                    <b>{progress(active.startDate, active.endDate)}%</b>Year progress
                  </p>
                </div>
                <div className="bar">
                  <span style={{ width: `${progress(active.startDate, active.endDate)}%` }} />
                </div>
              </section>
            ) : (
              <section className="hero">
                <h2>No active academic year</h2>
                <p>Activate an upcoming academic year to establish current college operations context.</p>
              </section>
            )}

            <section className="cm-panel course-directory">
              <header className="course-directory-heading">
                <div>
                  <span className="cm-eyebrow">Academic Year Directory</span>
                  <p>{shown.length} records</p>
                </div>
                <div className="directory-export-actions">
                  <ExportMenu
                    rows={shown}
                    columns={yearColumns}
                    title="Academic Years"
                    filename="academic-years"
                    loading={exportLoading || noticeTone === 'error'}
                  />
                  <button type="button" className="cm-button secondary" onClick={() => setModal('generate')}>
                    Generate Next Year
                  </button>
                  <button type="button" className="cm-button" onClick={openAdd}>
                    <FiPlus /> Add Academic Year
                  </button>
                </div>
              </header>

              <FilterPanel
                active={Boolean(search || filter !== 'ALL')}
                onClear={() => {
                  setSearch('');
                  setFilter('ALL');
                  setPage(1);
                }}
              >
                <section className="cm-panel course-toolbar">
                  <label className="course-search">
                    <FiSearch />
                    <input
                      aria-label="Search academic years"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search year title or status..."
                    />
                  </label>
                  <div className="erp-filter-buttons">
                    {['ALL', ...states].map((x) => (
                      <button
                        key={x}
                        type="button"
                        className={`erp-pill ${filter === x ? 'active' : ''}`}
                        onClick={() => setFilter(x)}
                      >
                        {x === 'ALL' ? 'All' : x.charAt(0) + x.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  {Boolean(search || filter !== 'ALL') && (
                    <button
                      className="course-clear"
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setFilter('ALL');
                        setPage(1);
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </section>
              </FilterPanel>

              <div className="erp-table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '180px' }}>Academic Year</th>
                      <th className="table-center" style={{ width: '130px' }}>Start Date</th>
                      <th className="table-center" style={{ width: '130px' }}>End Date</th>
                      <th className="table-center" style={{ width: '120px' }}>Status</th>
                      <th className="table-center" style={{ width: '120px' }}>Duration</th>
                      <th className="table-center" style={{ width: '140px' }}>Auto Activation</th>
                      <th className="table-center" style={{ width: '140px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((x) => (
                      <tr key={x.id}>
                        <td style={{ minWidth: '180px' }}>
                          <strong className="table-cell-truncate" title={x.name}>{x.name}</strong>
                        </td>
                        <td className="table-center" style={{ width: '130px' }}>{formatDate(x.startDate)}</td>
                        <td className="table-center" style={{ width: '130px' }}>{formatDate(x.endDate)}</td>
                        <td className="table-center" style={{ width: '120px' }}>
                          <StatusBadge value={x.status} />
                        </td>
                        <td className="table-center" style={{ width: '120px' }}>{duration(x.startDate, x.endDate)} days</td>
                        <td className="table-center" style={{ width: '140px' }}>{x.autoActivate ? 'Enabled' : 'Manual'}</td>
                        <td className="table-center" style={{ width: '140px' }}>
                          <div className="erp-row-actions table-actions-group">
                            <button
                              type="button"
                              className="table-action-btn action-view erp-action-btn"
                              title={`View ${x.name || 'Academic Year'}`}
                              aria-label={`View ${x.name || 'Academic Year'}`}
                              onClick={() => openView(x)}
                            >
                              <FiEye />
                            </button>
                            <button
                              type="button"
                              className="table-action-btn action-edit erp-action-btn"
                              title={`Edit ${x.name || 'Academic Year'}`}
                              aria-label={`Edit ${x.name || 'Academic Year'}`}
                              onClick={() => edit(x)}
                              disabled={x.status === 'ARCHIVED' || isPresentYear(x)}
                            >
                              <FiEdit2 />
                            </button>
                            {x.status === 'UPCOMING' && (
                              <button
                                type="button"
                                className="table-action-btn action-activate erp-action-btn erp-action-btn--success"
                                title={`Activate ${x.name || 'Academic Year'}`}
                                aria-label={`Activate ${x.name || 'Academic Year'}`}
                                onClick={() => setConfirmStatus({ year: x, targetStatus: 'ACTIVE' })}
                              >
                                <FiToggleLeft />
                              </button>
                            )}
                            {isPastYear(x) && x.status !== 'ARCHIVED' && (
                              <button
                                type="button"
                                className="table-action-btn action-deactivate erp-action-btn erp-action-btn--danger"
                                title={`Archive ${x.name || 'Academic Year'}`}
                                aria-label={`Archive ${x.name || 'Academic Year'}`}
                                onClick={() => setConfirmStatus({ year: x, targetStatus: 'ARCHIVED' })}
                              >
                                <FiXCircle />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!shown.length && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                          No academic years match your search or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!!shown.length && (
                <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              )}
            </section>
          </>
        )}

        {/* Add/Edit Modal */}
        {(modal === 'add' || modal === 'edit') && (
          <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
              <button type="button" className="x" aria-label="Close dialog" onClick={close}>
                ×
              </button>
              <h2 id="form-title">{modal === 'add' ? 'Add Academic Year' : 'Edit Academic Year'}</h2>
              <form onSubmit={save} noValidate>
                <label>
                  Academic Year Title
                  <input
                    autoFocus
                    placeholder="e.g. 2025 - 2026"
                    value={form.name}
                    onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
                  />
                  {errors.name && (
                    <em className="field-error" role="alert">
                      {errors.name}
                    </em>
                  )}
                </label>
                <div className="formgrid">
                  <label>
                    Start Date
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((x) => ({ ...x, startDate: e.target.value }))}
                    />
                    {errors.startDate && (
                      <em className="field-error" role="alert">
                        {errors.startDate}
                      </em>
                    )}
                  </label>
                  <label>
                    End Date
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((x) => ({ ...x, endDate: e.target.value }))}
                    />
                    {errors.endDate && (
                      <em className="field-error" role="alert">
                        {errors.endDate}
                      </em>
                    )}
                  </label>
                </div>
                {errors.range && (
                  <em className="field-error" role="alert">
                    {errors.range}
                  </em>
                )}
                {errors.form && (
                  <em className="field-error" role="alert">
                    {errors.form}
                  </em>
                )}
                {modal === 'add' && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={form.autoActivate}
                      onChange={(e) => setForm((x) => ({ ...x, autoActivate: e.target.checked }))}
                    />
                    <span>Enable auto activation</span>
                    <small>Display preference only; manual status confirmation applies.</small>
                  </label>
                )}
                <footer>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
                    {saving ? 'Saving...' : modal === 'add' ? 'Add Academic Year' : 'Save Changes'}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}

        {/* Generate Next Year Modal */}
        {modal === 'generate' && (
          <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="gen-title">
              <button type="button" className="x" aria-label="Close dialog" onClick={close}>
                ×
              </button>
              <h2 id="gen-title">Generate Next Academic Year</h2>
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                This will automatically compute and prepare the next consecutive annual academic cycle following{' '}
                <strong>{active?.name || 'the current active cycle'}</strong>.
              </p>
              <footer>
                <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
                  Cancel
                </button>
                <button type="button" className="erp-btn erp-btn--primary" onClick={generate} disabled={saving}>
                  {saving ? 'Generating...' : 'Generate Cycle'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {/* Status Confirmation Dialog */}
        {confirmStatus && (
          <StatusConfirmDialog
            entity="Academic Year"
            name={confirmStatus.year.name}
            nextStatus={confirmStatus.targetStatus}
            onCancel={() => setConfirmStatus(null)}
            onConfirm={handleStatusConfirm}
            busy={saving}
            description={
              confirmStatus.targetStatus === 'ACTIVE'
                ? 'Activating this academic year sets it as the current active operational cycle for the institution.'
                : 'Archiving marks this academic cycle as historical records.'
            }
          />
        )}
      </main>
    </DashboardLayout>
  );
}
